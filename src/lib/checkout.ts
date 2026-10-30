import "server-only";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { createPixCharge, hasMercadoPago } from "@/lib/mercadopago";
import { orderNumber } from "@/lib/orders";
import { siteUrl } from "@/lib/env";

/** Gera (ou gera de novo) a cobrança Pix do pedido. Falhas ficam visíveis na página do pedido. */
export async function createPixForOrder(orderId: string) {
  if (!hasMercadoPago() || !hasAdminKey()) return { error: "Pagamento online não configurado." };
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, number, status, total_cents, recipient_name, recipient_email, recipient_document")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "awaiting_payment") return { error: "Pedido não está aguardando pagamento." };

  try {
    const site = siteUrl();
    const charge = await createPixCharge({
      orderId: order.id,
      description: `Pedido ${orderNumber(order.number)}`,
      amountCents: order.total_cents,
      payerEmail: order.recipient_email,
      payerName: order.recipient_name,
      payerDocument: order.recipient_document,
      notificationUrl: site.startsWith("https://") ? `${site}/api/webhooks/mercadopago` : undefined,
    });
    await admin
      .from("orders")
      .update({
        payment_provider: "mercadopago",
        payment_id: charge.id,
        pix_qr_code: charge.qrCode,
        pix_qr_base64: charge.qrBase64,
        pix_ticket_url: charge.ticketUrl,
        pix_expires_at: charge.expiresAt,
      })
      .eq("id", order.id);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." };
  }
}
