import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABEL, type PlateStatus } from "@/lib/types";

/** Cabeçalho da tela: contexto (trilha) opcional, título-substantivo de 24px, uma linha de apoio e as ações reais. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {(back || eyebrow) && (
        <p className="mb-1.5 flex items-center gap-1.5 text-[13px] text-muted">
          {back && (
            <Link href={back} className="inline-flex items-center gap-1 hover:text-ink">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {eyebrow ? null : "Voltar"}
            </Link>
          )}
          {eyebrow && <span className="truncate">{eyebrow}</span>}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}

const STATUS_CHIP: Record<PlateStatus, string> = {
  unclaimed: "chip-neutral",
  pending: "chip-warn",
  active: "chip-ok",
  disabled: "chip-neutral",
};

export function StatusChip({ status }: { status: PlateStatus }) {
  return <span className={STATUS_CHIP[status]}>{STATUS_LABEL[status]}</span>;
}

/** Um valor de uma faixa de KPIs: rótulo cinza acima, número em tinta. */
export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 md:px-5">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs leading-4 text-muted">{hint}</p>}
    </div>
  );
}

/** Seção vazia: mantém o quadro e diz o próximo passo numa frase. */
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-control px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Carregando: o layout final com barras cinza no tamanho real, sem brilho animado. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-6 w-48 rounded bg-raised" />
      <div className="h-24 rounded-2xl border border-line bg-surface" />
      <div className="h-16 rounded-2xl border border-line bg-surface" />
      <div className="h-16 rounded-2xl border border-line bg-surface" />
    </div>
  );
}

/** Código da plaquinha (identificador): monoespaçado, como um ID. */
export function PlateCode({ code, className = "" }: { code: string; className?: string }) {
  return <span className={`font-mono text-[13px] font-medium tracking-tight ${className}`}>{code}</span>;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Estrela da nota do Google (contorno, cinza): a nota é dado em tinta, a estrela só identifica. */
export function StarIcon({ className = "size-3.5 text-muted" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block shrink-0 align-[-2px] ${className}`} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" aria-hidden>
      <path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
    </svg>
  );
}

export function CheckIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

const KPI_ICON = {
  bolt: "M13 3 5 13.5h6L10 21l8-10.5h-6z",
  bars: "M5 20V11M12 20V5M19 20v-6",
  money: "M12 3v18M16.5 7.5c-.9-1.2-2.6-2-4.5-2-2.5 0-4.5 1.3-4.5 3.2 0 4.3 9 2.2 9 6.4 0 2-2 3.4-4.5 3.4-2.2 0-4-1-4.8-2.4",
};

/** Indicador em card compacto: ícone discreto em azul, rótulo, número em destaque e descrição menor. */
export function KpiCard({ icon, label, value, hint, muted = false }: { icon: keyof typeof KPI_ICON; label: string; value: ReactNode; hint?: string; muted?: boolean }) {
  return (
    <div className="card-press min-w-0 rounded-2xl border border-line bg-surface p-3 md:p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={KPI_ICON[icon]} />
        </svg>
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-2 truncate text-xl font-bold tabular-nums md:text-2xl ${muted ? "text-muted" : "text-navy"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs leading-4 text-muted">{hint}</p>}
    </div>
  );
}
