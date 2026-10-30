import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

export const hasMercadoPago = () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type PixCharge = {
  id: string;
  qrCode: string;
  qrBase64: string;
  ticketUrl: string;
  expiresAt: string;
};

export async function createPixCharge(input: {
  orderId: string;
  description: string;
  amountCents: number;
  payerEmail: string;
  payerName: string;
  payerDocument: string;
  notificationUrl?: string;
}): Promise<PixCharge> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [firstName, ...rest] = input.payerName.trim().split(/\s+/);
  const doc = input.payerDocument.replace(/\D/g, "");

  const res = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: headers({ "X-Idempotency-Key": `order-${input.orderId}` }),
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.orderId,
      date_of_expiration: expiresAt.toISOString().replace("Z", "-00:00"),
      notification_url: input.notificationUrl,
      payer: {
        email: input.payerEmail,
        first_name: firstName,
        last_name: rest.join(" ") || firstName,
        identification: doc ? { type: doc.length === 14 ? "CNPJ" : "CPF", number: doc } : undefined,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json()) as {
    id?: number;
    message?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  };
  const data = json.point_of_interaction?.transaction_data;
  if (!res.ok || !json.id || !data?.qr_code) {
    throw new Error(`Mercado Pago: ${json.message ?? res.status}`);
  }
  return {
    id: String(json.id),
    qrCode: data.qr_code,
    qrBase64: data.qr_code_base64 ?? "",
    ticketUrl: data.ticket_url ?? "",
    expiresAt: expiresAt.toISOString(),
  };
}

export type MpPayment = { id: string; status: string; externalReference: string; amount: number };

export async function getPayment(id: string): Promise<MpPayment | null> {
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(`${API}/v1/payments/${id}`, { headers: headers(), signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const json = (await res.json()) as { id: number; status: string; external_reference: string; transaction_amount: number };
  return { id: String(json.id), status: json.status, externalReference: json.external_reference, amount: json.transaction_amount };
}

/**
 * Confere a assinatura do webhook (cabeçalho x-signature), quando MERCADOPAGO_WEBHOOK_SECRET está definido.
 * Mesmo sem segredo o webhook é seguro: o pagamento é sempre consultado de novo na API do Mercado Pago.
 */
export function validWebhookSignature(signature: string | null, requestId: string | null, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ""};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
