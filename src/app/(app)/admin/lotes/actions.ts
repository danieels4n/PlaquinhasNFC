"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function createBatch(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const label = String(formData.get("product_label") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) return { error: "Quantidade entre 1 e 1000." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_plate_batch", {
    p_name: name,
    p_product_label: label,
    p_quantity: quantity,
  });
  if (error) return { error: error.message };
  redirect(`/admin/lotes/${data}`);
}
