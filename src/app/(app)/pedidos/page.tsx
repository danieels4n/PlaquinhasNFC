import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, orderNumber, type Order } from "@/lib/orders";
import { EmptyState, PageHeader, PageSkeleton, formatDate } from "@/components/ui";
import { OrderStatusChip } from "@/components/order-parts";

export const metadata: Metadata = { title: "Meus pedidos" };

export default function OrdersPage() {
  return (
    <>
      <PageHeader eyebrow="Suas compras" title="Meus pedidos" subtitle="Acompanhe seus pedidos de plaquinhas." />
      <Suspense fallback={<PageSkeleton />}>
        <OrderList />
      </Suspense>
    </>
  );
}

type Row = Pick<Order, "id" | "number" | "status" | "total_cents" | "created_at"> & { order_items: { quantity: number }[] };

async function OrderList() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, number, status, total_cents, created_at, order_items(quantity)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Row[];

  if (!orders.length) {
    return <EmptyState title="Nenhum pedido ainda" text="Compre plaquinhas na loja para revender." action={<Link href="/loja" className="btn-primary">Ir para a loja</Link>} />;
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pedidos/${o.id}`} className="card card-press flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">{orderNumber(o.number)}</span>
              <span className="block text-xs text-muted">
                {formatDate(o.created_at)} · {o.order_items.reduce((s, i) => s + i.quantity, 0)} un.
              </span>
              <span className="mt-2 block"><OrderStatusChip status={o.status} /></span>
            </span>
            <span className="font-semibold tabular-nums">{formatCents(o.total_cents)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
