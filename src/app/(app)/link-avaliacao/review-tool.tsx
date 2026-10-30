"use client";

import { useActionState, useState } from "react";
import { CopyButton, SubmitButton } from "@/components/forms";
import { generateFromLink, searchBusiness, type ReviewState } from "./actions";

export function ReviewTool({ searchEnabled }: { searchEnabled: boolean }) {
  const [tab, setTab] = useState<"link" | "search">("link");
  const [linkState, linkAction] = useActionState(generateFromLink, null);
  const [searchState, searchAction] = useActionState(searchBusiness, null);

  return (
    <div className="card">
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
        {(
          [
            ["link", "Colar link do Maps"],
            ["search", "Buscar empresa"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`h-9 rounded-lg text-xs font-semibold ${tab === value ? "bg-surface-2 text-ink" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "link" ? (
        <form action={linkAction} className="space-y-3">
          <label htmlFor="link" className="label">Link copiado do Google Maps</label>
          <input id="link" name="link" required className="input" placeholder="https://maps.app.goo.gl/…" autoComplete="off" />
          <p className="text-xs text-muted">Aceita links do Maps (Android, iPhone, maps.app.goo.gl) e links de avaliação prontos.</p>
          <SubmitButton pendingText="Gerando…">Gerar link de avaliação</SubmitButton>
          <Result state={linkState} />
        </form>
      ) : (
        <form action={searchAction} className="space-y-3">
          <label htmlFor="query" className="label">Nome da empresa e cidade</label>
          <input id="query" name="query" required className="input" placeholder="Padaria Central, Campinas" autoComplete="off" />
          {!searchEnabled && <p className="text-xs text-warn">Disponível depois de configurar a chave do Google Places.</p>}
          <SubmitButton pendingText="Buscando…">Buscar</SubmitButton>
          <Result state={searchState} />
        </form>
      )}
    </div>
  );
}

function Result({ state }: { state: ReviewState }) {
  if (!state) return null;
  if (state.error) {
    return <p role="alert" className="notice-bad">{state.error}</p>;
  }
  const items = state.results ?? (state.url ? [{ name: state.place?.name ?? "Link gerado", address: state.place?.address ?? "", url: state.url }] : []);
  return (
    <ul className="space-y-2 pt-2">
      {items.map((item) => (
        <li key={item.url} className="rounded-lg border callout p-3">
          <p className="font-semibold">{item.name}</p>
          {item.address && <p className="text-xs text-muted">{item.address}</p>}
          <p className="mt-2 text-xs break-all text-muted">{item.url}</p>
          <div className="mt-3 flex gap-2">
            <CopyButton text={item.url} label="Copiar link" />
            <a href={item.url} target="_blank" rel="noreferrer" className="btn-ghost">Testar</a>
          </div>
        </li>
      ))}
    </ul>
  );
}
