import { CheckIcon } from "@/components/ui";
import { ORDER_STATUS_LABEL, ORDER_STEPS, formatCents, stepIndex, trackingUrl, type Order, type OrderEvent, type OrderItem, type OrderStatus } from "@/lib/orders";

const STATUS_STYLE: Record<OrderStatus, string> = {
  awaiting_payment: "chip-warn",
  paid: "chip-info",
  in_production: "chip-info",
  ready: "chip-info",
  shipped: "chip-info",
  delivered: "chip-ok",
  canceled: "chip-bad",
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <span className={STATUS_STYLE[status]}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "canceled") return null;
  const current = stepIndex(status);
  return (
    <ol className="space-y-2.5" aria-label="Andamento">
      {ORDER_STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium ${
                done ? "bg-accent text-accent-ink" : "border border-line text-muted"
              }`}
            >
              {done ? <CheckIcon className="size-3" /> : i + 1}
            </span>
            <span className={done ? "font-semibold" : "text-muted"}>{ORDER_STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ items, order }: { items: OrderItem[]; order: Order }) {
  return (
    <div className="card space-y-2 text-sm">
      <p className="label">Itens</p>
      {items.map((it) => (
        <div key={it.id} className="flex justify-between gap-3">
          <span>
            <strong className="tabular-nums">{it.quantity}×</strong> {it.product_name}
            <span className="block text-xs text-muted">{formatCents(it.unit_price_cents)}/un.</span>
          </span>
          <span className="tabular-nums">{formatCents(it.unit_price_cents * it.quantity)}</span>
        </div>
      ))}
      <div className="space-y-1 border-t border-line pt-2">
        <div className="flex justify-between text-muted"><span>Produtos</span><span className="tabular-nums">{formatCents(order.subtotal_cents)}</span></div>
        <div className="flex justify-between text-muted">
          <span>Frete {order.shipping_company} {order.shipping_service}</span>
          <span className="tabular-nums">{formatCents(order.shipping_cents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatCents(order.total_cents)}</span></div>
      </div>
    </div>
  );
}

export function OrderAddress({ order }: { order: Order }) {
  return (
    <div className="card text-sm">
      <p className="label">Entrega</p>
      <p className="font-semibold">{order.recipient_name}</p>
      <p className="text-muted">
        {order.street}, {order.address_number}
        {order.complement ? ` – ${order.complement}` : ""}
        {order.district ? ` · ${order.district}` : ""}
        <br />
        {order.city}/{order.state} · CEP {order.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
      </p>
      {order.tracking_code && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-bg p-3">
          <span>
            <span className="block text-xs text-muted">Rastreio {order.carrier}</span>
            <span className="font-medium tabular-nums">{order.tracking_code}</span>
          </span>
          <a href={trackingUrl(order.tracking_code)} target="_blank" rel="noreferrer" className="btn-ghost">Rastrear</a>
        </div>
      )}
    </div>
  );
}

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="card text-sm">
      <p className="label">Histórico</p>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex justify-between gap-3">
            <span>
              {ORDER_STATUS_LABEL[e.status] ?? e.status}
              {e.note && <span className="block text-xs text-muted">{e.note}</span>}
            </span>
            <time className="shrink-0 text-xs text-muted tabular-nums">
              {new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
