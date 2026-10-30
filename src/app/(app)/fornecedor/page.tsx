import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents, orderNumber, type Order, type OrderStatus } from "@/lib/orders";
import { EmptyState, PageHeader, PageSkeleton, formatDate } from "@/components/ui";
import { OrderStatusChip } from "@/components/order-parts";
import { TabsRow } from "@/components/tabs-scroll";
import { SupplierGuide } from "@/components/supplier-guide";

export const metadata: Metadata = { title: "Pedidos" };

const TABS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "novos", label: "Novos", statuses: ["paid"] },
  { key: "producao", label: "Em produção", statuses: ["in_production"] },
  { key: "prontos", label: "Prontos", statuses: ["ready"] },
  { key: "enviados", label: "Enviados", statuses: ["shipped"] },
  { key: "aguardando", label: "Aguardando pgto.", statuses: ["awaiting_payment"] },
  { key: "concluidos", label: "Concluídos", statuses: ["delivered"] },
  { key: "cancelados", label: "Cancelados", statuses: ["canceled"] },
];

export default function SupplierPage({ searchParams }: PageProps<"/fornecedor">) {
  return (
    <>
      <PageHeader eyebrow="Fornecedor" title="Pedidos" subtitle="Produza, imprima os QR Codes e envie com rastreio." />
      <Suspense fallback={<PageSkeleton />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Row = Pick<Order, "id" | "number" | "status" | "total_cents" | "created_at" | "paid_at" | "recipient_name" | "city" | "state"> & {
  order_items: { quantity: number }[];
};

async function Queue({ searchParams }: { searchParams: PageProps<"/fornecedor">["searchParams"] }) {
  const user = await requireStaff();
  const { aba } = await searchParams;
  const tab = TABS.find((t) => t.key === aba) ?? TABS[0];

  const supabase = await createClient();
  const [{ data }, { data: all }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, status, total_cents, created_at, paid_at, recipient_name, city, state, order_items(quantity)")
      .in("status", tab.statuses)
      .order("created_at", { ascending: tab.key === "novos" || tab.key === "producao" || tab.key === "prontos" })
      .limit(100),
    supabase.from("orders").select("status").in("status", ["paid", "in_production", "ready", "shipped", "awaiting_payment"]),
  ]);
  const orders = (data ?? []) as Row[];
  const count = (statuses: OrderStatus[]) => (all ?? []).filter((o) => statuses.includes(o.status as OrderStatus)).length;

  return (
    <>
      {user.onboarding && !user.onboarding.supplier_guide && <SupplierGuide />}
      <TabsRow label="Filtrar pedidos">
        {TABS.map((t) => {
          const n = t.key === "concluidos" || t.key === "cancelados" ? 0 : count(t.statuses);
          const active = t.key === tab.key;
          return (
            <Link
              key={t.key}
              href={`/fornecedor?aba=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`tab ${active ? "tab-active" : ""}`}
            >
              {t.label}
              {n > 0 && <span className={`rounded-full bg-raised px-1.5 text-xs tabular-nums text-ink`}>{n}</span>}
            </Link>
          );
        })}
      </TabsRow>

      {orders.length === 0 ? (
        <EmptyState title="Nenhum pedido aqui" text={tab.key === "novos" ? "Pedidos pagos aparecem aqui automaticamente." : "Nada nesta etapa no momento."} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/fornecedor/pedidos/${o.id}`} className="card card-press block">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-medium tabular-nums">{orderNumber(o.number)}</span>
                    <span className="block truncate text-sm">{o.recipient_name}</span>
                    <span className="block text-xs text-muted">
                      {o.city}/{o.state} · {formatDate(o.paid_at ?? o.created_at)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-semibold tabular-nums">{o.order_items.reduce((s, i) => s + i.quantity, 0)} un.</span>
                    <span className="block text-xs text-muted tabular-nums">{formatCents(o.total_cents)}</span>
                  </span>
                </div>
                <div className="mt-3"><OrderStatusChip status={o.status} /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
