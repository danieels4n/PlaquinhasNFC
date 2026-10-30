import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { StoreClient } from "./store-client";

export const metadata: Metadata = { title: "Comprar plaquinhas" };

export default function StorePage() {
  return (
    <>
      <PageHeader eyebrow="Loja" title="Comprar plaquinhas" subtitle="Escolha os modelos e quantidades e pague tudo em um único pedido." />
      <Suspense fallback={<PageSkeleton />}>
        <Store />
      </Suspense>
    </>
  );
}

async function Store() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("active", true).order("sort").order("name");
  const products = (data ?? []) as Product[];

  if (!products.length) {
    return <EmptyState title="Nenhum produto à venda" text="O catálogo ainda está vazio. Volte em breve." />;
  }
  return <StoreClient products={products} />;
}
