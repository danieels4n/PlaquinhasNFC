"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Blobs } from "@/components/blobs";

const RAYS = [-62, -38, -14, 14, 38, 62, 140, 220];

/**
 * Comemoração ao ativar uma plaquinha: check animado com raios, sobre fundo com gradiente azul.
 * "Configurar destino" fecha e leva ao formulário; a marca ?ativada=1 sai da URL.
 */
export function ActivationCelebration({ code }: { code: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    router.replace(pathname, { scroll: false });
    setTimeout(() => document.getElementById("destino-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  if (!open || !mounted) return null;

  // Portal no <body>: fica acima da barra superior e da navegação inferior
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ativada-titulo"
      className="animate-fade fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#f7f9ff] px-6 text-center"
    >
      <Blobs className="absolute top-0 right-0 h-[260px] w-[80vw] max-w-[420px]" />
      <div className="relative mb-8 grid size-40 place-items-center" aria-hidden>
        {RAYS.map((r, i) => (
          <span
            key={r}
            className="absolute top-1/2 left-1/2 -mt-2 -ml-[3px] h-4 w-1.5 rounded-full"
            style={{
              background: i % 2 ? "#9dbbff" : "#1455d9",
              ["--r" as string]: `${r}deg`,
              animation: `ray 600ms cubic-bezier(0.2,0.8,0.2,1) ${240 + i * 30}ms both`,
            }}
          />
        ))}
        <span className="check-badge animate-pop grid size-28 place-items-center rounded-full">
          <svg viewBox="0 0 48 48" className="size-14 text-white" fill="none" stroke="currentColor" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 25l8 8 16-17" strokeDasharray="40" strokeDashoffset="40" style={{ animation: "draw 420ms ease-out 380ms forwards" }} />
          </svg>
        </span>
      </div>

      <h2 id="ativada-titulo" className="relative animate-rise text-2xl font-bold tracking-tight text-navy" style={{ animationDelay: "300ms" }}>
        Plaquinha ativada!
      </h2>
      <p className="relative animate-rise mt-2 max-w-xs text-base text-muted" style={{ animationDelay: "380ms" }}>
        A <span className="font-mono font-medium text-ink">{code}</span> já é sua. Agora escolha para onde ela leva quem encostar o celular.
      </p>

      <div className="relative animate-rise mt-8 flex w-full max-w-xs flex-col gap-2" style={{ animationDelay: "460ms" }}>
        <button type="button" className="btn-primary h-13 text-base" onClick={close} autoFocus>
          Configurar destino
        </button>
        <Link href="/" className="btn h-11 text-accent hover:bg-raised">
          Voltar para o início
        </Link>
      </div>
    </div>,
    document.body,
  );
}
