"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markOnboarding } from "@/app/(app)/onboarding-actions";
import { CheckIcon } from "@/components/ui";

export type Step = { key: string; title: string; text: string; href: string; done: boolean };

/**
 * "Primeiros passos": cada item se marca sozinho a partir dos dados da conta.
 * Concluído tudo, vira uma comemoração; "Ocultar" esconde de vez.
 */
export function GettingStarted({ steps, canHide }: { steps: Step[]; canHide: boolean }) {
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const next = steps.find((s) => !s.done);

  if (gone) return null;

  if (!next) {
    return (
      <section className="card glow-celebrate animate-rise mb-5 flex flex-col items-center gap-3 border-transparent py-8 text-center">
        <span className="check-badge animate-pop grid size-16 place-items-center rounded-full">
          <CheckIcon className="size-8 text-white" />
        </span>
        <h2 className="text-xl font-bold text-navy">Tudo pronto!</h2>
        <p className="max-w-sm text-sm text-muted">Você concluiu os primeiros passos. Agora é vender mais plaquinhas e acompanhar os resultados por aqui.</p>
        <button
          type="button"
          className="btn-primary mt-1"
          disabled={pending}
          onClick={() => start(async () => { await markOnboarding("checklist_done"); setGone(true); })}
        >
          Fechar
        </button>
      </section>
    );
  }

  return (
    <section className="card animate-rise mb-5" aria-labelledby="primeiros-passos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="primeiros-passos" className="text-base font-bold text-navy">Primeiros passos</h2>
          <p className="mt-0.5 text-sm text-muted tabular-nums">{done} de {steps.length} concluídos</p>
        </div>
        {canHide && (
          <button
            type="button"
            className="btn h-9 px-3 text-xs text-muted hover:text-ink"
            disabled={pending}
            onClick={() => start(async () => { await markOnboarding("checklist_hidden"); setGone(true); })}
          >
            Ocultar
          </button>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso dos primeiros passos">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg,#3b7bff,#1455d9)" }} />
      </div>

      <ol className="mt-4 space-y-1">
        {steps.map((s) => {
          const isNext = s.key === next.key;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 ${isNext ? "bg-raised" : "hover:bg-surface-2"}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    s.done ? "bg-ok text-white" : isNext ? "border-2 border-accent bg-white" : "border-2 border-control bg-white"
                  }`}
                  aria-hidden
                >
                  {s.done && <CheckIcon className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold ${s.done ? "text-muted line-through decoration-control" : "text-ink"}`}>
                    {s.title}
                    <span className="sr-only">{s.done ? " (concluído)" : ""}</span>
                  </span>
                  {!s.done && <span className="block text-xs text-muted">{s.text}</span>}
                </span>
                {isNext && <span className="chip-info shrink-0">Próximo</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
