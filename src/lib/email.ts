import "server-only";
import { APP_NAME, siteUrl } from "@/lib/env";
import { formatCents, orderNumber, trackingUrl, type Order } from "@/lib/orders";

/** Envia e-mail pelo Resend. Sem RESEND_API_KEY, não faz nada (só registra no log). */
export async function sendEmail(to: string | string[], subject: string, text: string) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email desativado] para ${recipients.join(", ")}: ${subject}`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`,
        to: recipients,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("Falha ao enviar e-mail", err);
  }
}

const link = (path: string) => `${siteUrl()}${path}`;

export function paidEmails(order: Order) {
  const n = orderNumber(order.number);
  return {
    buyer: {
      subject: `${n}: pagamento confirmado`,
      text: `Olá, ${order.recipient_name}!\n\nRecebemos o pagamento do pedido ${n} (${formatCents(order.total_cents)}). Ele já foi para produção.\n\nAcompanhe: ${link(`/pedidos/${order.id}`)}`,
    },
    staff: {
      subject: `Novo pedido pago: ${n}`,
      text: `Pedido ${n} pago — ${formatCents(order.total_cents)}.\nCliente: ${order.recipient_name}\nEntrega: ${order.city}/${order.state}\n\nAbra o painel: ${link(`/fornecedor/pedidos/${order.id}`)}`,
    },
  };
}

export function statusEmail(order: Order) {
  const n = orderNumber(order.number);
  if (order.status === "shipped") {
    return {
      subject: `${n} foi enviado`,
      text: `Seu pedido ${n} foi enviado${order.carrier ? ` por ${order.carrier}` : ""}.\nCódigo de rastreio: ${order.tracking_code}\nRastrear: ${trackingUrl(order.tracking_code)}\n\nQuando chegar, escaneie o QR de cada plaquinha para ativá-la.`,
    };
  }
  if (order.status === "delivered") {
    return {
      subject: `${n} foi entregue`,
      text: `Seu pedido ${n} foi entregue. Escaneie o QR de cada plaquinha com a câmera do celular para ativá-la na sua conta.\n\n${link("/plaquinhas")}`,
    };
  }
  if (order.status === "canceled") {
    return { subject: `${n} foi cancelado`, text: `O pedido ${n} foi cancelado. Em caso de dúvida, responda este e-mail.` };
  }
  return null;
}
