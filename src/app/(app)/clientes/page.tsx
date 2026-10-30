import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import type { Customer } from "@/lib/types";
import { StarIcon } from "@/components/ui";
import { createCustomer } from "./actions";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  return (
    <>
      <PageHeader eyebrow="Sua carteira" title="Clientes" subtitle="Organize as empresas e as plaquinhas de cada uma." action={<Link href="/prospeccao" className="btn-ghost shrink-0">Buscar</Link>} />

      <details className="card group mb-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          Novo cliente
          <span className="text-lg text-muted transition-transform group-open:rotate-45">+</span>
        </summary>
        <ActionForm action={createCustomer} resetOnSuccess className="mt-4 space-y-3">
          <div>
            <label htmlFor="name" className="label">Nome da empresa</label>
            <input id="name" name="name" required maxLength={120} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="segment" className="label">Segmento</label>
              <input id="segment" name="segment" maxLength={60} className="input" placeholder="Restaurante" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Telefone</label>
              <input id="phone" name="phone" type="tel" maxLength={30} className="input" />
            </div>
          </div>
          <SubmitButton>Adicionar cliente</SubmitButton>
        </ActionForm>
      </details>

      <Suspense fallback={<PageSkeleton />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Row = Customer & { plates: { status: string; scans: number }[] };

const TABS = [
  { key: "", label: "Clientes" },
  { key: "leads", label: "Leads" },
  { key: "arquivados", label: "Arquivados" },
];

async function CustomerList({ searchParams }: { searchParams: PageProps<"/clientes">["searchParams"] }) {
  await requireUser();
  const { aba } = await searchParams;
  const tab = TABS.find((t) => t.key === aba)?.key ?? "";

  const supabase = await createClient();
  let query = supabase.from("customers").select("*, plates(status, scans)").order("name");
  if (tab === "arquivados") query = query.eq("archived", true);
  else query = query.eq("archived", false).eq("stage", tab === "leads" ? "lead" : "client");
  const { data } = await query;
  const customers = (data ?? []) as Row[];

  return (
    <>
      <nav aria-label="Filtrar" className="tabs mb-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/clientes?aba=${t.key}` : "/clientes"}
            className={`tab ${tab === t.key ? "tab-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {customers.length === 0 ? (
        tab === "leads" ? (
          <EmptyState title="Nenhum lead ainda" text="Use a prospecção para encontrar empresas com nota baixa ou poucas avaliações." action={<Link href="/prospeccao" className="btn-primary">Buscar empresas</Link>} />
        ) : (
          <EmptyState title={tab === "arquivados" ? "Nenhum cliente arquivado" : "Nenhum cliente ainda"} text="Clientes são as empresas onde você instala as plaquinhas." />
        )
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {customers.map((c) => {
            const active = c.plates.filter((p) => p.status === "active").length;
            const scans = c.plates.reduce((sum, p) => sum + p.scans, 0);
            const gained = c.google_reviews !== null && c.google_baseline_reviews !== null ? c.google_reviews - c.google_baseline_reviews : null;
            return (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="card card-press block">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      {c.segment && <span className="block text-xs text-muted">{c.segment}</span>}
                    </span>
                    {c.google_place_id && (
                      <span className="shrink-0 text-right text-sm">
                        <span className="font-semibold tabular-nums"><StarIcon /> {c.google_rating !== null ? Number(c.google_rating).toFixed(1).replace(".", ",") : "—"}</span>
                        <span className="block text-xs text-muted tabular-nums">
                          {c.google_reviews ?? 0} aval.{gained ? <span className="font-medium text-data"> +{gained}</span> : null}
                        </span>
                      </span>
                    )}
                  </div>
                  {c.stage === "client" && (
                    <div className="mt-3 grid grid-cols-3 border-t border-line pt-3 text-center text-xs text-muted">
                      <p><span className="block text-base font-semibold text-ink tabular-nums">{c.plates.length}</span>plaquinhas</p>
                      <p><span className="block text-base font-semibold text-ink tabular-nums">{active}</span>ativas</p>
                      <p><span className="block text-base font-semibold text-ink tabular-nums">{scans}</span>leituras</p>
                    </div>
                  )}
                  {c.stage === "lead" && c.google_phone && <p className="mt-2 text-xs text-muted">{c.google_phone}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
