import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton, StatusChip, formatBRL } from "@/components/ui";
import type { Customer, Plate } from "@/lib/types";
import { setCustomerArchived, updateCustomer } from "../actions";
import { hasPlacesKey } from "@/lib/places";
import { GoogleCard, type HistoryPoint } from "./google-card";

export const metadata: Metadata = { title: "Cliente" };

export default function CustomerPage({ params }: PageProps<"/clientes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: PageProps<"/clientes/[id]">["params"] }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: plates }, { data: history }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle<Customer>(),
    supabase.from("plates").select("id, code, status, scans, nickname, sale_value, destination_url").eq("customer_id", id).order("code"),
    supabase.from("customer_google_history").select("rating, reviews, checked_at").eq("customer_id", id).order("checked_at").limit(200),
  ]);
  if (!customer) notFound();

  const list = (plates ?? []) as Pick<Plate, "id" | "code" | "status" | "scans" | "nickname" | "sale_value">[];
  const revenue = list.reduce((sum, p) => sum + (p.sale_value ?? 0), 0);
  // Se alguma plaquinha deste cliente já aponta para uma avaliação no Google, sugere vincular essa empresa
  const fromPlate = (plates ?? [])
    .map((p) => ({ code: p.code as string, m: String(p.destination_url ?? "").match(/placeid=(ChIJ[\w-]+)/) }))
    .find((p) => p.m);

  return (
    <>
      <PageHeader back="/clientes" eyebrow={customer.segment || "Cliente"} title={customer.name} />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <div className="min-w-0 lg:col-span-7">
      <section className="card mb-4 grid grid-cols-3 divide-x divide-line text-center">
        <div><p className="text-xl font-semibold tabular-nums">{list.length}</p><p className="text-xs text-muted">plaquinhas</p></div>
        <div><p className="text-xl font-semibold tabular-nums">{list.reduce((s, p) => s + p.scans, 0)}</p><p className="text-xs text-muted">leituras</p></div>
        <div><p className="text-xl font-semibold tabular-nums">{formatBRL(revenue)}</p><p className="text-xs text-muted">vendido</p></div>
      </section>

      <GoogleCard
        customerId={customer.id}
        isLead={customer.stage === "lead"}
        enabled={hasPlacesKey()}
        suggestion={fromPlate?.m ? { placeId: fromPlate.m[1], plateCode: fromPlate.code } : null}
        history={(history ?? []) as HistoryPoint[]}
        info={{
          placeId: customer.google_place_id,
          name: customer.google_name,
          address: customer.google_address,
          mapsUrl: customer.google_maps_url,
          rating: customer.google_rating === null ? null : Number(customer.google_rating),
          reviews: customer.google_reviews,
          checkedAt: customer.google_checked_at,
          baselineRating: customer.google_baseline_rating === null ? null : Number(customer.google_baseline_rating),
          baselineReviews: customer.google_baseline_reviews,
          baselineAt: customer.google_baseline_at,
        }}
      />

      <h2 className="mb-2 text-sm font-medium text-muted">Plaquinhas deste cliente</h2>
      {list.length === 0 ? (
        <p className="card mb-6 text-sm text-muted">Nenhuma ainda. Abra uma plaquinha e escolha este cliente.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/plaquinhas/${p.id}`} className="card card-press flex items-center justify-between gap-3 py-3">
                <span className="font-medium tabular-nums">{p.code}{p.nickname ? <span className="font-normal text-muted"> · {p.nickname}</span> : null}</span>
                <span className="flex items-center gap-3"><span className="text-xs text-muted">{p.scans} leituras</span><StatusChip status={p.status} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      </div>
      <div className="min-w-0 lg:col-span-5">
      <h2 className="mb-2 text-sm font-medium text-muted">Dados</h2>
      <ActionForm action={updateCustomer} className="card space-y-3">
        <input type="hidden" name="id" value={customer.id} />
        <div>
          <label htmlFor="name" className="label">Nome</label>
          <input id="name" name="name" defaultValue={customer.name} required maxLength={120} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="segment" className="label">Segmento</label>
            <input id="segment" name="segment" defaultValue={customer.segment} maxLength={60} className="input" />
          </div>
          <div>
            <label htmlFor="phone" className="label">Telefone</label>
            <input id="phone" name="phone" type="tel" defaultValue={customer.phone} maxLength={30} className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="label">Anotações</label>
          <textarea id="notes" name="notes" defaultValue={customer.notes} rows={3} className="input" />
        </div>
        <SubmitButton>Salvar</SubmitButton>
      </ActionForm>

      <form action={setCustomerArchived} className="mt-4">
        <input type="hidden" name="id" value={customer.id} />
        <input type="hidden" name="archived" value={String(!customer.archived)} />
        <button className={customer.archived ? "btn-ghost w-full" : "btn-danger w-full"}>
          {customer.archived ? "Desarquivar cliente" : "Arquivar cliente"}
        </button>
      </form>
      </div>
      </div>
    </>
  );
}
