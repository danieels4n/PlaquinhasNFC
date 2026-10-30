import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Editar produto" };

export default function EditProductPage({ params }: PageProps<"/admin/produtos/[id]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/admin/produtos" eyebrow="Produtos" title="Editar produto" />
      <Suspense fallback={<PageSkeleton />}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/admin/produtos/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_FIELDS).eq("id", id).maybeSingle<Product>();
  if (!data) notFound();
  return <ProductForm product={data} />;
}
