"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveLead, searchProspects, type Prospect } from "./actions";
import { CheckIcon, StarIcon } from "@/components/ui";

const SUGGESTIONS = ["Restaurante", "Padaria", "Salão de beleza", "Barbearia", "Pet shop", "Clínica odontológica", "Academia", "Hamburgueria"];
const RATING_FILTERS = [
  { value: 6, label: "Qualquer nota" },
  { value: 4.5, label: "Nota até 4,5" },
  { value: 4.2, label: "Nota até 4,2" },
  { value: 4.0, label: "Nota até 4,0" },
];
const REVIEW_FILTERS = [
  { value: Infinity, label: "Qualquer quantidade" },
  { value: 100, label: "Até 100 avaliações" },
  { value: 50, label: "Até 50 avaliações" },
  { value: 20, label: "Até 20 avaliações" },
];

const fmt = (r: number | null) => (r === null ? "—" : r.toFixed(1).replace(".", ","));

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  // Celular brasileiro: DDD + 9 dígitos começando com 9
  return local.length === 11 && local[2] === "9" ? `https://wa.me/55${local}` : null;
}

export function ProspectClient({ initialUsed, limit }: { initialUsed: number; limit: number }) {
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [maxRating, setMaxRating] = useState(6);
  const [maxReviews, setMaxReviews] = useState(Infinity);
  const [hideSaved, setHideSaved] = useState(true);
  const [results, setResults] = useState<Prospect[] | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [used, setUsed] = useState(initialUsed);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      (results ?? []).filter(
        (p) => (p.rating === null || p.rating <= maxRating) && p.reviews <= maxReviews && !(hideSaved && p.savedId),
      ),
    [results, maxRating, maxReviews, hideSaved],
  );

  const search = (more = false) => {
    setError("");
    start(async () => {
      const r = await searchProspects({ what, where, near, pageToken: more ? nextToken : null });
      if (r.used !== undefined) setUsed(r.used);
      if (r.error) return setError(r.error);
      setResults((prev) => (more && prev ? [...prev, ...(r.results ?? [])] : (r.results ?? [])));
      setNextToken(r.nextPageToken ?? null);
    });
  };

  const locate = () => {
    if (!navigator.geolocation) return setError("Seu navegador não informa a localização.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Não foi possível obter sua localização. Digite a cidade."),
      { timeout: 10000 },
    );
  };

  const save = async (p: Prospect) => {
    setSaving(p.placeId);
    const r = await saveLead(p, what);
    setSaving(null);
    if (r.error) return setError(r.error);
    setResults((prev) => prev?.map((x) => (x.placeId === p.placeId ? { ...x, savedId: r.id ?? "saved" } : x)) ?? null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <form
        className="card space-y-3 lg:sticky lg:top-20 lg:col-span-4"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div>
          <label htmlFor="what" className="label">Tipo de negócio</label>
          <input id="what" className="input" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Ex.: padaria" list="segments" required />
          <datalist id="segments">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label htmlFor="where" className="label">Cidade ou bairro</label>
          <div className="flex gap-2">
            <input id="where" className="input" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Ex.: Moema, São Paulo" />
            <button type="button" className={`btn-ghost shrink-0 ${near ? "border-ink" : ""}`} onClick={() => (near ? setNear(null) : locate())}>
              {near ? <><CheckIcon /> Perto</> : "Perto de mim"}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending || used >= limit}>
          {pending ? "Buscando…" : "Buscar empresas"}
        </button>
        <p className="text-center text-xs text-muted tabular-nums">{used} de {limit} buscas usadas hoje · pesquisas repetidas não contam</p>
      </form>

      <div className="min-w-0 space-y-4 lg:col-span-8">

      {error && <p role="alert" className="notice-bad">{error}</p>}

      {results && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Filtrar por nota" className="input" value={maxRating} onChange={(e) => setMaxRating(Number(e.target.value))}>
              {RATING_FILTERS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
            <select aria-label="Filtrar por avaliações" className="input" value={String(maxReviews)} onChange={(e) => setMaxReviews(Number(e.target.value))}>
              {REVIEW_FILTERS.map((f) => <option key={f.label} value={String(f.value)}>{f.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={hideSaved} onChange={(e) => setHideSaved(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
            Esconder quem já está na minha carteira
          </label>

          <p className="text-sm text-muted">
            {visible.length} de {results.length} empresas · ordenadas pelas melhores oportunidades
          </p>

          <ul className="space-y-3">
            {visible.map((p) => {
              const wa = whatsappLink(p.phone);
              return (
                <li key={p.placeId} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{p.name}</span>
                      <span className="block text-xs text-muted">{p.address}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums"><StarIcon /> {fmt(p.rating)}</span>
                      <span className="block text-xs text-muted tabular-nums">{p.reviews} aval.</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <OpportunityChip score={p.score} />
                    {p.rating !== null && p.rating < 4.2 && <span className="chip-bad">Nota baixa</span>}
                    {p.reviews < 30 && <span className="chip-warn">Poucas avaliações</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {wa ? <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost px-2">WhatsApp</a> : p.phone ? <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost px-2">Ligar</a> : <span className="btn-ghost px-2 opacity-40">Sem fone</span>}
                    {p.mapsUrl ? <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2">Maps</a> : <span />}
                    {p.savedId ? (
                      <Link href={p.savedId === "saved" ? "/clientes?aba=leads" : `/clientes/${p.savedId}`} className="btn-ghost px-2 text-accent"><CheckIcon /> Salvo</Link>
                    ) : (
                      <button type="button" className="btn-primary px-2" disabled={saving === p.placeId} onClick={() => save(p)}>
                        {saving === p.placeId ? "…" : "Salvar lead"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {nextToken && (
            <button type="button" className="btn-ghost w-full" disabled={pending || used >= limit} onClick={() => search(true)}>
              {pending ? "Carregando…" : "Carregar mais (usa 1 busca)"}
            </button>
          )}
        </>
      )}
      {!results && !error && (
        <p className="hidden rounded-2xl border border-dashed border-control px-5 py-8 text-center text-sm text-muted lg:block">Os resultados aparecem aqui, das melhores oportunidades para as já bem avaliadas.</p>
      )}
      </div>
    </div>
  );
}

function OpportunityChip({ score }: { score: number }) {
  // A oportunidade é o dado principal desta tela: leva o azul dos dados; o resto fica neutro.
  const [label, style] =
    score >= 55 ? ["Ótima oportunidade", "chip-info"] : score >= 30 ? ["Boa oportunidade", "chip-neutral"] : ["Já bem avaliada", "chip-neutral text-muted"];
  return <span className={style}>{label}</span>;
}
