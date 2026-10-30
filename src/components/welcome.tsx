"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { markOnboarding } from "@/app/(app)/onboarding-actions";
import { Blobs } from "@/components/blobs";

type Slide = { title: string; text: string; art: ReactNode };

const tap = (
  <svg viewBox="0 0 24 24" className="size-12 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 9a5 5 0 0 1 0 6M11.5 6.5a9 9 0 0 1 0 11M15 4a13 13 0 0 1 0 16" />
  </svg>
);
const coins = (
  <svg viewBox="0 0 24 24" className="size-12 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 17l5-5 4 4 8-8M15 8h5v5" />
  </svg>
);
const qr = (
  <svg viewBox="0 0 24 24" className="size-12 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
  </svg>
);

const SLIDES: Slide[] = [
  {
    title: "Bem-vindo ao PlacaLink",
    text: "Cada plaquinha tem um QR Code e um chip NFC. Um toque do celular leva o cliente para onde você escolher: avaliação no Google, WhatsApp, Instagram ou cardápio.",
    art: tap,
  },
  {
    title: "Como você ganha",
    text: "Compre as plaquinhas na loja, venda e instale nas empresas da sua região. O app acompanha cada leitura e as avaliações ganhas, para você mostrar o resultado ao cliente.",
    art: coins,
  },
  {
    title: "Seu primeiro passo",
    text: "Já tem uma plaquinha em mãos? Ative escaneando o QR dela. Ainda não tem? Comece comprando um lote na loja.",
    art: qr,
  },
];

/** Boas-vindas em 3 telas, mostradas uma única vez no primeiro acesso. */
export function Welcome() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((n) => Math.min(SLIDES.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function finish(go?: string) {
    setOpen(false);
    void markOnboarding("welcome");
    if (go) router.push(go);
  }

  if (!open || !mounted) return null;
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="boas-vindas-titulo" className="animate-fade fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f7f9ff] px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Blobs className="absolute top-0 right-0 h-[260px] w-[80vw] max-w-[420px]" />
      <div className="relative flex justify-end">
        <button type="button" className="btn h-10 px-3 text-muted hover:text-ink" onClick={() => finish()}>
          Pular
        </button>
      </div>

      <div key={i} className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
        <span className="check-badge animate-pop mb-8 grid size-28 place-items-center rounded-[2rem]">{slide.art}</span>
        <h2 id="boas-vindas-titulo" className="animate-rise text-2xl font-bold tracking-tight text-navy" style={{ animationDelay: "120ms" }}>
          {slide.title}
        </h2>
        <p className="animate-rise mt-3 text-base leading-6 text-muted" style={{ animationDelay: "200ms" }}>
          {slide.text}
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center gap-2" aria-label={`Tela ${i + 1} de ${SLIDES.length}`}>
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              aria-label={`Ir para a tela ${n + 1}`}
              aria-current={n === i ? "step" : undefined}
              onClick={() => setI(n)}
              className={`h-2 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-accent" : "w-2 bg-[#c7d6f5]"}`}
            />
          ))}
        </div>

        {last ? (
          <div className="flex flex-col gap-2">
            <button type="button" className="btn-primary h-13 text-base" onClick={() => finish("/plaquinhas")}>
              Ativar minha plaquinha
            </button>
            <button type="button" className="btn-ghost h-12" onClick={() => finish("/loja")}>
              Comprar plaquinhas
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" className="btn-ghost h-13 flex-1" onClick={() => setI(i - 1)}>
                Voltar
              </button>
            )}
            <button type="button" className="btn-primary h-13 flex-[2] text-base" onClick={() => setI(i + 1)} autoFocus>
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
