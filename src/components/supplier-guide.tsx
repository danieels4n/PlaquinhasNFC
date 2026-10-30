"use client";

import { useState, useTransition } from "react";
import { markOnboarding } from "@/app/(app)/onboarding-actions";

const STEPS = [
  { title: "Pedido pago chega em “Novos”", text: "Você recebe um e-mail e o pedido aparece aqui, já com as plaquinhas geradas." },
  { title: "Produza e imprima", text: "Toque em Iniciar produção, imprima os QR Codes e grave o mesmo link em cada chip NFC (CSV)." },
  { title: "Envie com rastreio", text: "Marque como pronto e, ao despachar, informe o código de rastreio. O cliente é avisado." },
  { title: "Confirme a entrega", text: "Quando chegar, marque como entregue. O revendedor ativa cada plaquinha escaneando o QR." },
];

/** Guia rápido mostrado no primeiro acesso do fornecedor ao painel. */
export function SupplierGuide() {
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  if (gone) return null;

  return (
    <section className="card glow-celebrate animate-rise mb-5 border-transparent" aria-labelledby="guia-fornecedor">
      <h2 id="guia-fornecedor" className="text-base font-bold text-navy">Como funciona o seu painel</h2>
      <p className="mt-0.5 text-sm text-muted">Cada pedido passa por 4 etapas. É só seguir o botão azul de cada pedido.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-xl bg-white/80 p-3">
            <span className="check-badge grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white">{i + 1}</span>
            <span>
              <span className="block font-semibold">{s.title}</span>
              <span className="block text-xs text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn-primary mt-4 w-full sm:w-auto"
        disabled={pending}
        onClick={() => start(async () => { await markOnboarding("supplier_guide"); setGone(true); })}
      >
        Entendi
      </button>
    </section>
  );
}
