"use client";

import { useState, useTransition } from "react";
import type { GooglePlace } from "@/lib/places";
import { StarIcon } from "@/components/ui";
import { convertLead, findPlaceToLink, linkGooglePlace, refreshGooglePlace, unlinkGooglePlace } from "../google-actions";

export type GoogleInfo = {
  placeId: string | null;
  name: string;
  address: string;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
  checkedAt: string | null;
  baselineRating: number | null;
  baselineReviews: number | null;
  baselineAt: string | null;
};

export type HistoryPoint = { rating: number | null; reviews: number | null; checked_at: string };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted">sem nota</span>;
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      <StarIcon className="size-[0.8em] text-muted" />
      {rating.toFixed(1).replace(".", ",")}
    </span>
  );
}

export function GoogleCard({
  customerId,
  info,
  history,
  suggestion,
  isLead,
  enabled,
}: {
  customerId: string;
  info: GoogleInfo;
  history: HistoryPoint[];
  suggestion: { placeId: string; plateCode: string } | null;
  isLead: boolean;
  enabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ error?: string } | { ok: boolean }>) => {
    setError("");
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) setError(r.error);
    });
  };

  return (
    <section className="card mb-4 space-y-3">
      {isLead && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-warn-bg p-3 text-sm">
          <span className="text-ink">Lead: ainda não comprou.</span>
          <button type="button" className="btn-ghost h-9" disabled={pending} onClick={() => run(() => convertLead(customerId))}>
            Virou cliente
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="label mb-0">Avaliações no Google</p>
        {info.mapsUrl && <a href={info.mapsUrl} target="_blank" rel="noreferrer" className="link text-xs">Ver no Maps</a>}
      </div>

      {info.placeId ? (
        <Linked info={info} history={history} pending={pending}
          onRefresh={() => run(() => refreshGooglePlace(customerId))}
          onUnlink={() => confirm("Desvincular a empresa do Google? O histórico será apagado.") && run(() => unlinkGooglePlace(customerId))}
        />
      ) : !enabled ? (
        <p className="text-sm text-muted">Disponível depois de configurar a chave do Google Places.</p>
      ) : (
        <LinkForm customerId={customerId} suggestion={suggestion} onError={setError} />
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}

function Linked({ info, history, pending, onRefresh, onUnlink }: {
  info: GoogleInfo; history: HistoryPoint[]; pending: boolean; onRefresh: () => void; onUnlink: () => void;
}) {
  const gainedReviews = info.reviews !== null && info.baselineReviews !== null ? info.reviews - info.baselineReviews : null;
  const ratingDelta = info.rating !== null && info.baselineRating !== null ? +(info.rating - info.baselineRating).toFixed(1) : null;
  const tracked = info.baselineAt && info.checkedAt && new Date(info.checkedAt).getTime() - new Date(info.baselineAt).getTime() > 3600 * 1000;

  return (
    <>
      <div>
        <p className="truncate font-medium">{info.name}</p>
        <p className="truncate text-xs text-muted">{info.address}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-bg p-3">
          <p className="text-2xl"><Stars rating={info.rating} /></p>
          <p className="text-xs text-muted">nota atual</p>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-2xl font-semibold tabular-nums">{info.reviews ?? 0}</p>
          <p className="text-xs text-muted">avaliações</p>
        </div>
      </div>

      {tracked && info.baselineAt ? (
        <div className="rounded-lg border callout p-3 text-sm">
          <p className="font-semibold">Desde {fmtDate(info.baselineAt)}</p>
          <p className="text-muted">
            <strong className="font-medium text-data tabular-nums">{gainedReviews !== null && gainedReviews >= 0 ? "+" : ""}{gainedReviews ?? 0}</strong> avaliações ·{" "}
            nota {info.baselineRating?.toFixed(1).replace(".", ",") ?? "—"} → {info.rating?.toFixed(1).replace(".", ",") ?? "—"}
            {ratingDelta ? <span className={ratingDelta > 0 ? "text-ok" : "text-danger"}> ({ratingDelta > 0 ? "+" : ""}{ratingDelta.toFixed(1).replace(".", ",")})</span> : null}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">Ponto de partida registrado. A evolução aparece a partir da próxima atualização.</p>
      )}

      {history.length >= 2 && <ReviewsChart history={history} />}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">{info.checkedAt ? `Atualizado em ${new Date(info.checkedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        <span className="flex gap-2">
          <button type="button" className="btn-ghost h-9 px-3 text-xs" disabled={pending} onClick={onRefresh}>{pending ? "…" : "Atualizar"}</button>
          <button type="button" className="h-9 px-2 text-xs text-muted hover:text-danger" disabled={pending} onClick={onUnlink}>Desvincular</button>
        </span>
      </div>
    </>
  );
}

function ReviewsChart({ history }: { history: HistoryPoint[] }) {
  const points = history.filter((h) => h.reviews !== null);
  const min = Math.min(...points.map((p) => p.reviews!));
  const max = Math.max(...points.map((p) => p.reviews!));
  const range = Math.max(1, max - min);
  const w = 300, h = 64;
  const xy = points.map((p, i) => [points.length === 1 ? w : (i / (points.length - 1)) * w, h - 4 - ((p.reviews! - min) / range) * (h - 8)] as const);
  return (
    <figure>
      <figcaption className="mb-1 text-xs text-muted">Avaliações ao longo do tempo</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label={`De ${min} para ${points.at(-1)!.reviews} avaliações`} preserveAspectRatio="none">
        <polyline points={xy.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="var(--color-data)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{fmtDate(points[0].checked_at)} · {points[0].reviews}</span>
        <span>{fmtDate(points.at(-1)!.checked_at)} · {points.at(-1)!.reviews}</span>
      </div>
    </figure>
  );
}

function LinkForm({ customerId, suggestion, onError }: { customerId: string; suggestion: { placeId: string; plateCode: string } | null; onError: (e: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GooglePlace[] | null>(null);
  const [pending, start] = useTransition();

  const search = () => {
    onError("");
    start(async () => {
      const r = await findPlaceToLink(query);
      if (r.error) onError(r.error);
      setResults(r.places ?? null);
    });
  };
  const link = (placeId: string) => {
    onError("");
    start(async () => {
      const r = await linkGooglePlace(customerId, placeId);
      if ("error" in r && r.error) onError(r.error);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Vincule a empresa para acompanhar a nota e quantas avaliações ela ganhou depois da plaquinha.</p>
      {suggestion && (
        <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => link(suggestion.placeId)}>
          Usar a empresa da plaquinha {suggestion.plateCode}
        </button>
      )}
      <div className="flex gap-2">
        <input
          aria-label="Link do Google Maps ou nome da empresa"
          className="input"
          placeholder="Link do Maps ou nome + cidade"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
        />
        <button type="button" className="btn-ghost shrink-0" disabled={pending || query.trim().length < 3} onClick={search}>
          {pending ? "…" : "Buscar"}
        </button>
      </div>
      {results && (
        <ul className="space-y-2">
          {results.map((p) => (
            <li key={p.placeId} className="flex items-center justify-between gap-3 rounded-lg bg-bg p-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block truncate text-xs text-muted">{p.address}</span>
                <span className="text-xs"><Stars rating={p.rating} /> <span className="text-muted">({p.reviews})</span></span>
              </span>
              <button type="button" className="btn-primary h-9 shrink-0 px-3" disabled={pending} onClick={() => link(p.placeId)}>
                É esta
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
