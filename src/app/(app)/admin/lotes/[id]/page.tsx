import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { plateUrl } from "@/lib/env";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/forms";
import { PageHeader, PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Lote" };

export default function BatchPage({ params }: PageProps<"/admin/lotes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchSheet params={params} />
    </Suspense>
  );
}

async function BatchSheet({ params }: { params: PageProps<"/admin/lotes/[id]">["params"] }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: batch }, { data: plates }] = await Promise.all([
    supabase.from("plate_batches").select("name, product_label, quantity").eq("id", id).maybeSingle(),
    supabase.from("plates").select("code, token, owner_id").eq("batch_id", id).order("code"),
  ]);
  if (!batch) notFound();

  const items = await Promise.all(
    (plates ?? []).map(async (p) => ({ ...p, url: plateUrl(p.token), svg: await qrSvg(plateUrl(p.token)) })),
  );

  return (
    <>
      <div className="no-print">
        <PageHeader back="/admin/lotes" eyebrow={batch.product_label || "Lote"} title={batch.name} subtitle={`${items.length} plaquinhas`} />
        <div className="mb-3 grid">
          <PrintButton />
        </div>
        <p className="mb-5 text-xs text-muted">
          Imprima um QR em cada plaquinha. Os chips NFC vão virgens: o revendedor grava o link de cada uma depois, pelo app.
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-3 print:grid-cols-4 print:gap-4">
        {items.map((p) => (
          <li key={p.code} className="flex flex-col items-center rounded-lg bg-white p-2 text-center text-black print:break-inside-avoid">
            <div className="w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: p.svg }} />
            <p className="mt-1 text-xs font-medium tabular-nums">{p.code}</p>
            {p.owner_id && <p className="no-print text-[10px] text-ok">ativada</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
