"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

function fields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
    segment: String(formData.get("segment") ?? "").trim().slice(0, 60),
    phone: String(formData.get("phone") ?? "").trim().slice(0, 30),
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000),
  };
}

export async function createCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const values = fields(formData);
  if (!values.name) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert(values);
  if (error) return { error: error.message };
  refresh();
  return { ok: `${values.name} adicionado.` };
}

export async function updateCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const values = fields(formData);
  if (!values.name) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(values).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Cliente atualizado." };
}

export async function setCustomerArchived(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  const supabase = await createClient();
  await supabase.from("customers").update({ archived }).eq("id", id);
  redirect(archived ? "/clientes" : `/clientes/${id}`);
}
