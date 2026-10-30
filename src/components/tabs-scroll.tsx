"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Linha de abas que rola sozinha até a aba ativa (no celular, as abas da direita ficam fora da tela). */
export function TabsRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [children]);
  return (
    <nav ref={ref} aria-label={label} className="tabs mb-4">
      {children}
    </nav>
  );
}
