import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/orders";
import { PRODUCT_FIELDS, unitPrice, type Product } from "@/lib/products";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Produtos" };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back="/mais"
        eyebrow="Administrador"
        title="Produtos"
        subtitle="O que aparece na loja, com preço, mínimo e estoque."
        action={<Link href="/admin/produtos/novo" className="btn-primary">Novo</Link>}
      />
      <Suspense fallback={<PageSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).order("sort").order("name");
  const products = (data ?? []) as Product[];
  if (!products.length) return <EmptyState title="Nenhum produto" text="Crie o primeiro produto da loja." />;

  return (
    <ul className="space-y-3">
      {products.map((p) => (
        <li key={p.id}>
          <Link href={`/admin/produtos/${p.id}`} className={`card card-press flex items-center gap-3  ${p.active ? "" : "opacity-60"}`}>
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover" />
            ) : (
              <div className="size-14 shrink-0 rounded-lg bg-surface-2" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="block text-xs text-muted">
                {formatCents(unitPrice(p))}/un. · mín. {p.min_qty} · {p.stock === null ? "estoque livre" : `${p.stock} em estoque`}
              </span>
            </span>
            {!p.active && <span className="chip-neutral">Oculto</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
