import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, PageSkeleton, PlateCode, StatusChip } from "@/components/ui";
import type { Plate, PlateStatus } from "@/lib/types";
import { QrScanner } from "@/components/qr-scanner";
import { qrSvg } from "@/lib/qr";
import { plateUrl } from "@/lib/env";
import { claimPlate } from "./actions";

export const metadata: Metadata = { title: "Plaquinhas" };

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "pending", label: "Aguardando" },
  { value: "disabled", label: "Desativadas" },
];

export default function PlatesPage({ searchParams }: PageProps<"/plaquinhas">) {
  return (
    <>
      <PageHeader title="Plaquinhas" subtitle="Cada plaquinha tem um código fixo; o destino você troca quando quiser." />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <ActionForm action={claimPlate} className="card lg:sticky lg:top-20 lg:order-2 lg:col-span-4">
          <h2 className="mb-1 text-base font-semibold">Ativar plaquinha</h2>
          <p className="mb-3 text-sm text-muted">Aponte a câmera do celular para o QR, ou digite o código impresso.</p>
          <label htmlFor="token" className="sr-only">Código ou link do QR</label>
          <div className="flex gap-2">
            <input id="token" name="token" required className="input font-mono uppercase" placeholder="Ex.: 4KPRADL7" autoComplete="off" />
            <SubmitButton className="btn-primary shrink-0" pendingText="…">Ativar</SubmitButton>
          </div>
          <div className="mt-3"><QrScanner /></div>
        </ActionForm>

        <div className="min-w-0 lg:order-1 lg:col-span-8">
          <Suspense fallback={<PageSkeleton />}>
            <PlateList searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

type Row = Plate & { customers: { name: string } | null };

async function PlateList({ searchParams }: { searchParams: PageProps<"/plaquinhas">["searchParams"] }) {
  const user = await requireUser();
  const { status } = await searchParams;
  const filter = typeof status === "string" && ["active", "pending", "disabled"].includes(status) ? (status as PlateStatus) : "";

  const supabase = await createClient();
  let query = supabase
    .from("plates")
    .select("*, customers(name)")
    .eq("owner_id", user.id)
    .order("claimed_at", { ascending: false });
  if (filter) query = query.eq("status", filter);
  const [{ data }, { data: reservedData }] = await Promise.all([
    query,
    supabase.from("plates").select("code, product_label, orders(number, status)").eq("reserved_for", user.id).is("owner_id", null).order("code"),
  ]);
  const plates = (data ?? []) as Row[];
  const rows = await Promise.all(plates.map(async (p) => ({ ...p, qr: await qrSvg(plateUrl(p.token)) })));
  const reserved = (reservedData ?? []) as unknown as { code: string; product_label: string; orders: { number: number; status: string } | null }[];

  return (
    <>
      {reserved.length > 0 && !filter && (
        <details className="card callout mb-4">
          <summary className="cursor-pointer font-medium">{reserved.length} plaquinhas compradas para ativar</summary>
          <p className="mt-2 text-sm text-muted">
            Elas já são suas. Quando chegarem, escaneie o QR de cada uma para escolher o destino.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {reserved.map((r) => (
              <li key={r.code} className="rounded-md bg-surface px-3 py-2">
                <PlateCode code={r.code} className="block" />
                <span className="block truncate text-xs text-muted">{r.product_label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <nav aria-label="Filtrar" className="tabs mb-4">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/plaquinhas?status=${f.value}` : "/plaquinhas"}
            className={`tab ${filter === f.value ? "tab-active" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {plates.length === 0 ? (
        <EmptyState
          title={filter ? "Nada neste filtro" : "Nenhuma plaquinha ainda"}
          text={filter ? "Tente outro filtro." : "Escaneie o QR de uma plaquinha ou digite o código acima para adicioná-la à sua conta."}
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted tabular-nums">{plates.length} {plates.length === 1 ? "plaquinha" : "plaquinhas"}</p>
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.map((p) => (
              <li key={p.id}>
                <Link href={`/plaquinhas/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  {/* A própria plaquinha, reconhecível pelo QR */}
                  <span className="size-11 shrink-0 rounded-md border border-line bg-white p-1 [&>svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: p.qr }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <PlateCode code={p.code} />
                      <StatusChip status={p.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {p.nickname || p.customers?.name || "Sem cliente"}
                      {p.product_label ? ` · ${p.product_label}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-medium tabular-nums">{p.scans}</span>
                    <span className="block text-xs text-muted">leituras</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
