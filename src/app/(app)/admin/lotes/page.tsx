import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, PageSkeleton, formatDate } from "@/components/ui";
import { createBatch } from "./actions";

export const metadata: Metadata = { title: "Lotes" };

export default function BatchesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/mais" eyebrow="Equipe" title="Lotes de plaquinhas" subtitle="Cada plaquinha recebe um código e um link permanentes." />
      <Suspense fallback={<PageSkeleton />}>
        <Batches />
      </Suspense>
    </div>
  );
}

type Batch = { id: string; name: string; product_label: string; quantity: number; created_at: string; plates: { owner_id: string | null }[] };

async function Batches() {
  const user = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("plate_batches")
    .select("id, name, product_label, quantity, created_at, plates(owner_id)")
    .order("created_at", { ascending: false });
  const batches = (data ?? []) as Batch[];

  return (
    <>
      {user.isAdmin && (
      <ActionForm action={createBatch} className="card mb-5 space-y-3">
        <p className="font-medium">Novo lote</p>
        <div>
          <label htmlFor="name" className="label">Nome do lote</label>
          <input id="name" name="name" className="input" placeholder="Lote novembro" />
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div>
            <label htmlFor="product_label" className="label">Produto</label>
            <input id="product_label" name="product_label" className="input" placeholder="Placa Google 10 cm" />
          </div>
          <div>
            <label htmlFor="quantity" className="label">Quantidade</label>
            <input id="quantity" name="quantity" type="number" min={1} max={1000} defaultValue={20} required className="input" />
          </div>
        </div>
        <SubmitButton pendingText="Gerando…">Gerar plaquinhas</SubmitButton>
      </ActionForm>
      )}

      {batches.length === 0 ? (
        <EmptyState title="Nenhum lote ainda" text="Gere um lote para imprimir os QR Codes e gravar os chips NFC." />
      ) : (
        <ul className="space-y-3">
          {batches.map((b) => {
            const claimed = b.plates.filter((p) => p.owner_id).length;
            return (
              <li key={b.id}>
                <Link href={`/admin/lotes/${b.id}`} className="card card-press flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{b.name}</span>
                    <span className="block truncate text-xs text-muted">{b.product_label || "Sem produto"} · {formatDate(b.created_at)}</span>
                  </span>
                  <span className="text-right text-xs text-muted">
                    <span className="block text-base font-semibold text-ink tabular-nums">{claimed}/{b.quantity}</span>
                    ativadas
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
