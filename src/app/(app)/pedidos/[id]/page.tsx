import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasMercadoPago } from "@/lib/mercadopago";
import { orderNumber, type Order, type OrderEvent, type OrderItem } from "@/lib/orders";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { OrderAddress, OrderItems, OrderProgress, OrderStatusChip, OrderTimeline } from "@/components/order-parts";
import { CancelOrderButton, PixPanel } from "./pix-panel";

export const metadata: Metadata = { title: "Pedido" };

export default function OrderPage({ params }: PageProps<"/pedidos/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/pedidos/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: events }, { count: toActivate }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).eq("buyer_id", user.id).maybeSingle<Order>(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("order_events").select("id, status, note, created_at").eq("order_id", id).order("created_at"),
    supabase.from("plates").select("id", { count: "exact", head: true }).eq("order_id", id).is("owner_id", null),
  ]);
  if (!order) notFound();

  const waiting = order.status === "awaiting_payment";

  return (
    <>
      <PageHeader back="/pedidos" eyebrow="Pedido" title={orderNumber(order.number)} action={<OrderStatusChip status={order.status} />} />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-7">
        {waiting && <PixPanel order={order} onlineEnabled={hasMercadoPago()} />}

        {!waiting && order.status !== "canceled" && (
          <div className="card">
            <p className="label">Andamento</p>
            <OrderProgress status={order.status} />
          </div>
        )}

        {(order.status === "shipped" || order.status === "delivered") && (toActivate ?? 0) > 0 && (
          <div className="card callout text-sm">
            <p className="font-medium">{toActivate} plaquinhas para ativar</p>
            <p className="mt-1 text-muted">Quando receber, escaneie o QR de cada uma com a câmera do celular para adicioná-las à sua conta.</p>
            <Link href="/plaquinhas" className="btn-primary mt-3">Minhas plaquinhas</Link>
          </div>
        )}

        <OrderItems items={(items ?? []) as OrderItem[]} order={order} />
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-5">
        <OrderAddress order={order} />
        <OrderTimeline events={(events ?? []) as OrderEvent[]} />

        {waiting && <CancelOrderButton orderId={order.id} />}
        </div>
      </div>
    </>
  );
}
