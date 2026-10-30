import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/admin/produtos" eyebrow="Produtos" title="Novo produto" />
      <Suspense fallback={<PageSkeleton />}>
        <Guard />
      </Suspense>
    </div>
  );
}

async function Guard() {
  await requireAdmin();
  return <ProductForm />;
}
