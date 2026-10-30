"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPixForOrder } from "@/lib/checkout";
import { syncMercadoPagoPayment } from "@/lib/payments";
import type { OrderStatus } from "@/lib/orders";

/** Lê o pedido com a sessão do usuário (as regras do banco garantem que é dele ou da equipe). */
async function ownOrder(orderId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, status, payment_id").eq("id", orderId).maybeSingle();
  return data as { id: string; status: OrderStatus; payment_id: string } | null;
}

/** Chamado a cada poucos segundos pela tela do Pix. */
export async function checkPayment(orderId: string): Promise<OrderStatus | null> {
  const order = await ownOrder(orderId);
  if (!order) return null;
  if (order.status === "awaiting_payment" && order.payment_id) {
    const paid = await syncMercadoPagoPayment(order.payment_id).catch(() => false);
    if (paid) {
      refresh();
      return "paid";
    }
  }
  return order.status;
}

export async function regeneratePix(orderId: string) {
  const order = await ownOrder(orderId);
  if (!order) return { error: "Pedido não encontrado." };
  const result = await createPixForOrder(order.id);
  refresh();
  return result;
}

export async function cancelOrder(orderId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order: orderId });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
