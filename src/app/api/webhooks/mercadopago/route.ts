import { NextResponse, type NextRequest } from "next/server";
import { validWebhookSignature } from "@/lib/mercadopago";
import { syncMercadoPagoPayment } from "@/lib/payments";

/** Notificações do Mercado Pago. Configure a URL: SEU_SITE/api/webhooks/mercadopago */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const dataId = String(body.data?.id ?? request.nextUrl.searchParams.get("data.id") ?? "");
  const type = body.type ?? request.nextUrl.searchParams.get("type");

  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true });
  if (!validWebhookSignature(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  try {
    await syncMercadoPagoPayment(dataId);
  } catch (err) {
    console.error("Webhook Mercado Pago", err);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
