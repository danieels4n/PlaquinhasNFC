"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function cents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Math.round(Number(raw) * 100);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function intOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

export async function saveProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const price = cents(formData.get("price"));
  const promo = cents(formData.get("promo_price"));
  const minQty = intOrNull(formData.get("min_qty"));
  const stock = intOrNull(formData.get("stock"));
  const weight = intOrNull(formData.get("weight_g"));
  const image = String(formData.get("image_url") ?? "").trim();

  const values = {
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
    description: String(formData.get("description") ?? "").trim().slice(0, 4000),
    size_label: String(formData.get("size_label") ?? "").trim().slice(0, 40),
    badge: String(formData.get("badge") ?? "").trim().slice(0, 30),
    image_url: image || null,
    price_cents: price,
    promo_price_cents: promo,
    min_qty: minQty ?? 1,
    stock,
    weight_g: weight ?? 60,
    sort: intOrNull(formData.get("sort")) ?? 0,
    active: formData.get("active") === "on",
  };

  if (!values.name) return { error: "Informe o nome do produto." };
  if (price === null || Number.isNaN(price)) return { error: "Preço inválido." };
  if (Number.isNaN(promo)) return { error: "Preço promocional inválido." };
  if (promo !== null && promo >= price) return { error: "O preço promocional precisa ser menor que o preço normal." };
  if (Number.isNaN(minQty) || Number.isNaN(stock) || Number.isNaN(weight) || values.min_qty < 1 || values.weight_g < 1) {
    return { error: "Confira quantidade mínima, estoque e peso (números inteiros)." };
  }
  if (image && !/^https:\/\//.test(image)) return { error: "Foto inválida." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("products").update(values).eq("id", id)
    : await supabase.from("products").insert(values);
  if (error) return { error: error.message };
  redirect("/admin/produtos");
}
