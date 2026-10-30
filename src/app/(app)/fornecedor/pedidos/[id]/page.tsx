import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NEXT_ACTION, onlyDigits, orderNumber, type Order, type OrderEvent, type OrderItem } from "@/lib/orders";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { OrderAddress, OrderItems, OrderProgress, OrderStatusChip, OrderTimeline } from "@/components/order-parts";
import { advanceOrder, confirmPaymentManually } from "../../actions";

export const metadata: Metadata = { title: "Pedido" };

export default function SupplierOrderPage({ params }: PageProps<"/fornecedor/pedidos/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupplierOrder params={params} />
    </Suspense>
  );
}

async function SupplierOrder({ params }: { params: PageProps<"/fornecedor/pedidos/[id]">["params"] }) {
  const user = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: events }, { count: plateCount }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle<Order>(),
    supabase.from("order_items").select("*").eq("order_id", id).order("product_name"),
    supabase.from("order_events").select("id, status, note, created_at").eq("order_id", id).order("created_at"),
    supabase.from("plates").select("id", { count: "exact", head: true }).eq("order_id", id),
  ]);
  if (!order) notFound();

  const next = NEXT_ACTION[order.status];
  const canCancel = ["awaiting_payment", "paid", "in_production", "ready"].includes(order.status);
  const showPrint = order.batch_id && ["paid", "in_production", "ready"].includes(order.status);
  const phone = onlyDigits(order.recipient_phone);
  const label = [
    order.recipient_name,
    `${order.street}, ${order.address_number}${order.complement ? ` – ${order.complement}` : ""}`,
    order.district,
    `${order.city}/${order.state}`,
    `CEP ${order.cep}`,
  ].filter(Boolean).join("\n");

  return (
    <>
      <PageHeader back="/fornecedor" eyebrow="Pedido" title={orderNumber(order.number)} action={<OrderStatusChip status={order.status} />} />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-7">
        {order.status === "awaiting_payment" && (
          <div className="card border-[#fde68a] text-sm">
            <p className="font-medium">Aguardando pagamento</p>
            <p className="mt-1 text-muted">O pedido entra na fila de produção assim que o Pix for aprovado.</p>
            {user.isAdmin && (
              <ActionForm action={confirmPaymentManually} className="mt-3">
                <input type="hidden" name="order_id" value={order.id} />
                <SubmitButton className="btn-ghost w-full" pendingText="Confirmando…">Confirmar pagamento manualmente</SubmitButton>
              </ActionForm>
            )}
          </div>
        )}

        {showPrint && (
          <div className="card callout">
            <p className="font-medium">1. Produza as {plateCount} plaquinhas</p>
            <p className="mt-1 text-sm text-muted">Imprima os QR Codes e grave o mesmo link em cada chip NFC (CSV para gravação em lote).</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`/admin/lotes/${order.batch_id}`} className="btn-primary">Imprimir QR</a>
              <a href={`/admin/lotes/${order.batch_id}/csv`} className="btn-ghost">CSV para NFC</a>
            </div>
          </div>
        )}

        {next && (
          <ActionForm action={advanceOrder} className="card space-y-3">
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="status" value={next.to} />
            <p className="font-medium">{showPrint ? "2. " : ""}Próxima etapa</p>
            {next.to === "shipped" && (
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <div>
                  <label htmlFor="tracking" className="label">Código de rastreio</label>
                  <input id="tracking" name="tracking" required className="input uppercase" placeholder="AA123456789BR" autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="carrier" className="label">Transportadora</label>
                  <input id="carrier" name="carrier" defaultValue={order.shipping_company || "Correios"} className="input" />
                </div>
              </div>
            )}
            <SubmitButton pendingText="Atualizando…">{next.label}</SubmitButton>
          </ActionForm>
        )}

        <div className="card">
          <p className="label">Andamento</p>
          <OrderProgress status={order.status} />
        </div>

        <OrderItems items={(items ?? []) as OrderItem[]} order={order} />

        </div>
        <div className="min-w-0 space-y-4 lg:col-span-5">
        <OrderAddress order={order} />
        <div className="card space-y-3 text-sm">
          <p className="label">Contato do cliente</p>
          <p>
            {order.recipient_phone}
            <br />
            {order.recipient_email}
            <br />
            <span className="text-muted">Documento: {order.recipient_document}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {phone && (
              <a href={`https://wa.me/${phone.length <= 11 ? "55" + phone : phone}`} target="_blank" rel="noreferrer" className="btn-ghost">
                WhatsApp
              </a>
            )}
            <CopyButton text={label} label="Copiar etiqueta" />
          </div>
        </div>

        <OrderTimeline events={(events ?? []) as OrderEvent[]} />

        {canCancel && (
          <details className="card">
            <summary className="cursor-pointer text-sm font-semibold text-danger">Cancelar pedido</summary>
            <ActionForm action={advanceOrder} className="mt-3 space-y-3">
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="status" value="canceled" />
              <div>
                <label htmlFor="note" className="label">Motivo</label>
                <input id="note" name="note" required className="input" />
              </div>
              {order.status !== "awaiting_payment" && (
                <p className="text-xs text-warn">O pedido já foi pago: faça o estorno no Mercado Pago.</p>
              )}
              <SubmitButton className="btn-danger w-full" pendingText="Cancelando…">Confirmar cancelamento</SubmitButton>
            </ActionForm>
          </details>
        )}
        </div>
      </div>
    </>
  );
}
