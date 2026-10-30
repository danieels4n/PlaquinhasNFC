import "server-only";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { getPayment, hasMercadoPago } from "@/lib/mercadopago";
import { paidEmails, sendEmail, statusEmail } from "@/lib/email";
import type { Order } from "@/lib/orders";

/**
 * Consulta um pagamento no Mercado Pago e, se aprovado e com o valor certo, marca o pedido como pago.
 * Retorna true se o pedido ficou pago agora.
 */
export async function syncMercadoPagoPayment(paymentId: string): Promise<boolean> {
  if (!hasMercadoPago() || !hasAdminKey()) return false;
  const payment = await getPayment(paymentId);
  if (!payment || payment.status !== "approved" || !payment.externalReference) return false;

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", payment.externalReference).maybeSingle<Order>();
  if (!order) return false;
  if (Math.round(payment.amount * 100) !== order.total_cents) {
    console.error(`Valor pago diferente do pedido ${order.id}: ${payment.amount}`);
    return false;
  }

  const { data: changed, error } = await admin.rpc("mark_order_paid", { p_order: order.id, p_payment_id: payment.id });
  if (error) throw new Error(error.message);
  if (changed) await notifyPaid(order.id);
  return Boolean(changed);
}

/** E-mails de pedido pago: para o comprador e para a equipe (fornecedor/admin). */
export async function notifyPaid(orderId: string) {
  if (!hasAdminKey()) return;
  const admin = createAdminClient();
  const [{ data: order }, { data: staff }] = await Promise.all([
    admin.from("orders").select("*").eq("id", orderId).maybeSingle<Order>(),
    admin.from("profiles").select("email").in("role", ["admin", "supplier"]),
  ]);
  if (!order) return;
  const mails = paidEmails(order);
  await Promise.all([
    sendEmail(order.recipient_email, mails.buyer.subject, mails.buyer.text),
    sendEmail((staff ?? []).map((s) => s.email), mails.staff.subject, mails.staff.text),
  ]);
}

/** E-mail para o comprador quando o fornecedor muda o status. */
export async function notifyStatus(orderId: string) {
  if (!hasAdminKey()) return;
  const { data: order } = await createAdminClient().from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
  if (!order) return;
  const mail = statusEmail(order);
  if (mail) await sendEmail(order.recipient_email, mail.subject, mail.text);
}
