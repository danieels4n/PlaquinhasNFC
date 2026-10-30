"use server";

import { refresh } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notifyPaid, notifyStatus } from "@/lib/payments";
import type { ActionState } from "@/lib/types";

export async function advanceOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff();
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order: orderId,
    p_status: status,
    p_tracking: String(formData.get("tracking") ?? ""),
    p_carrier: String(formData.get("carrier") ?? ""),
    p_note: String(formData.get("note") ?? "").slice(0, 500),
  });
  if (error) return { error: error.message };
  await notifyStatus(orderId);
  refresh();
  return { ok: "Pedido atualizado." };
}

export async function confirmPaymentManually(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderId = String(formData.get("order_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_order_paid", { p_order: orderId, p_payment_id: "" });
  if (error) return { error: error.message };
  await notifyPaid(orderId);
  refresh();
  return { ok: "Pagamento confirmado. As plaquinhas do pedido foram geradas." };
}
