"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { normalizeDestination } from "@/lib/destinations";
import { DESTINATION_LABEL, type ActionState, type DestinationType } from "@/lib/types";

/** Aceita o token puro (8 caracteres) ou a URL completa gravada na plaquinha. */
function extractToken(input: string) {
  const value = input.trim();
  const fromUrl = value.match(/\/q\/([A-Za-z0-9]{8})(?:[/?#]|$)/);
  if (fromUrl) return fromUrl[1].toUpperCase();
  if (/^[A-Za-z0-9]{8}$/.test(value)) return value.toUpperCase();
  return null;
}

export async function claimPlate(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const token = extractToken(String(formData.get("token") ?? ""));
  if (!token) return { error: "Código inválido. Use os 8 caracteres do link ou cole o link inteiro." };

  const supabase = await createClient();
  // Para comemorar só ativações novas (não quando a plaquinha já era desta conta)
  const { data: before } = await supabase.rpc("lookup_plate", { p_token: token });
  const alreadyMine = Boolean((before as { mine: boolean }[] | null)?.[0]?.mine);
  const { data, error } = await supabase.rpc("claim_plate", { p_token: token });
  if (error) return { error: error.message };
  redirect(alreadyMine ? `/plaquinhas/${data}` : `/plaquinhas/${data}?ativada=1`);
}

const EDITABLE_STATUS = new Set(["pending", "active", "disabled"]);

export async function updatePlate(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  const type = String(formData.get("destination_type") ?? "google_review") as DestinationType;
  const rawDestination = String(formData.get("destination") ?? "");
  const customerId = String(formData.get("customer_id") ?? "") || null;
  const saleRaw = String(formData.get("sale_value") ?? "").replace(/\./g, "").replace(",", ".").trim();

  if (!EDITABLE_STATUS.has(status)) return { error: "Status inválido." };
  if (!(type in DESTINATION_LABEL)) return { error: "Tipo de destino inválido." };

  const destination = rawDestination.trim() ? normalizeDestination(type, rawDestination) : null;
  if (rawDestination.trim() && !destination) return { error: "Destino inválido. Confira o link ou número." };
  if (status === "active" && !destination) return { error: "Para ativar, informe o destino da plaquinha." };

  let saleValue: number | null = null;
  if (saleRaw) {
    saleValue = Number(saleRaw);
    if (!Number.isFinite(saleValue) || saleValue < 0) return { error: "Valor da venda inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plates")
    .update({
      status,
      destination_type: type,
      destination_url: destination,
      customer_id: customerId,
      nickname: String(formData.get("nickname") ?? "").trim().slice(0, 60),
      notes: String(formData.get("notes") ?? "").trim().slice(0, 2000),
      sale_value: saleValue,
    })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: "Plaquinha não encontrada." };
  refresh();
  return { ok: status === "active" ? "Salvo! A plaquinha já está redirecionando." : "Alterações salvas." };
}
