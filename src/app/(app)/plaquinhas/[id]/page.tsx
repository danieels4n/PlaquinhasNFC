import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { plateUrl } from "@/lib/env";
import { qrSvg } from "@/lib/qr";
import { DESTINATION_HINT } from "@/lib/destinations";
import { ActionForm, CopyButton, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton, StatusChip, formatDate } from "@/components/ui";
import { DESTINATION_LABEL, STATUS_LABEL, type Customer, type Plate } from "@/lib/types";
import { updatePlate } from "../actions";
import { ScanChart } from "./scan-chart";
import { ActivationCelebration } from "@/components/activation-celebration";
export const metadata: Metadata = { title: "Gerenciar plaquinha" };

export default function PlatePage({ params, searchParams }: PageProps<"/plaquinhas/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlateDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PlateDetail({ params, searchParams }: { params: PageProps<"/plaquinhas/[id]">["params"]; searchParams: PageProps<"/plaquinhas/[id]">["searchParams"] }) {
  const user = await requireUser();
  const { id } = await params;
  const { ativada } = await searchParams;
  const supabase = await createClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: plate }, { data: customers }, { data: recent }] = await Promise.all([
    supabase.from("plates").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle<Plate>(),
    supabase.from("customers").select("id, name, segment").eq("archived", false).order("name"),
    supabase.from("plate_scans").select("scanned_at").eq("plate_id", id).gte("scanned_at", since).order("scanned_at", { ascending: false }).limit(5000),
  ]);
  if (!plate) notFound();

  const url = plateUrl(plate.token);
  // QR em vetor (instantâneo e nítido); o PNG para baixar só é gerado ao tocar em "Baixar QR"
  const qr = await qrSvg(url);
  const scans30 = (recent ?? []).length;
  const customerList = (customers ?? []) as Pick<Customer, "id" | "name" | "segment">[];

  return (
    <>
      <PageHeader
        back="/plaquinhas"
        eyebrow={plate.product_label || "Plaquinha"}
        title={plate.code}
        action={<StatusChip status={plate.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <section className="card flex flex-col items-center gap-3 text-center lg:col-span-5">
        <div role="img" aria-label={`QR Code da plaquinha ${plate.code}`} className="size-48 rounded-lg bg-white p-2 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-xs break-all text-muted">{url}</p>
        <div className="flex gap-2">
          <CopyButton text={url} label="Copiar link" />
          <a href={`/plaquinhas/${plate.id}/qr`} download={`${plate.code}.png`} className="btn-ghost">
            Baixar QR
          </a>
        </div>
        <div className="grid w-full grid-cols-2 border-t border-line pt-3">
          <div>
            <p className="text-xl font-semibold tabular-nums">{plate.scans}</p>
            <p className="text-xs text-muted">leituras no total</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">{scans30 ?? 0}</p>
            <p className="text-xs text-muted">últimos 30 dias</p>
          </div>
        </div>
        <ScanChart dates={(recent ?? []).map((r) => r.scanned_at as string)} />
        <p className="text-xs text-muted">O código é permanente: mudar o destino não muda o QR impresso.</p>
      </section>

      <ActionForm action={updatePlate} className="card scroll-mt-20 space-y-4 lg:col-span-7" id="destino-form">
        <h2 className="text-base font-semibold">Para onde ela leva</h2>
        <input type="hidden" name="id" value={plate.id} />

        <div>
          <label htmlFor="customer_id" className="label">Cliente</label>
          <select id="customer_id" name="customer_id" defaultValue={plate.customer_id ?? ""} className="input">
            <option value="">Sem cliente</option>
            {customerList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.segment ? `${c.name} · ${c.segment}` : c.name}
              </option>
            ))}
          </select>
          {customerList.length === 0 && <p className="mt-1.5 text-xs text-muted">Cadastre clientes na aba Clientes.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="destination_type" className="label">Tipo de destino</label>
            <select id="destination_type" name="destination_type" defaultValue={plate.destination_type} className="input">
              {Object.entries(DESTINATION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="label">Status</label>
            <select id="status" name="status" defaultValue={plate.status} className="input">
              {(["pending", "active", "disabled"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="label">Destino</label>
          <input id="destination" name="destination" defaultValue={plate.destination_url ?? ""} className="input" placeholder="https://…" autoComplete="off" />
          <p className="mt-1.5 text-xs text-muted">{DESTINATION_HINT[plate.destination_type]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nickname" className="label">Apelido</label>
            <input id="nickname" name="nickname" defaultValue={plate.nickname} maxLength={60} className="input" placeholder="Balcão" />
          </div>
          <div>
            <label htmlFor="sale_value" className="label">Valor da venda (R$)</label>
            <input
              id="sale_value"
              name="sale_value"
              inputMode="decimal"
              defaultValue={plate.sale_value != null ? String(plate.sale_value).replace(".", ",") : ""}
              className="input"
              placeholder="0,00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">Anotações</label>
          <textarea id="notes" name="notes" defaultValue={plate.notes} rows={3} className="input" />
        </div>

        <SubmitButton>Salvar alterações</SubmitButton>
      </ActionForm>
      </div>

      {plate.claimed_at && <p className="mt-4 text-xs text-muted">Ativada em {formatDate(plate.claimed_at)}</p>}
      {ativada === "1" && <ActivationCelebration code={plate.code} />}
    </>
  );
}
