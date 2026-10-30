import { APP_NAME } from "@/lib/env";

/** Marca: quadrado azul com a plaquinha em branco (moldura, olho de QR e o arco do toque NFC). */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--color-accent)" />
      <rect x="14" y="14" width="36" height="36" rx="8" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="21" y="21" width="11" height="11" rx="2" fill="#fff" />
      <rect x="24.5" y="24.5" width="4" height="4" fill="var(--color-accent)" />
      <rect x="21" y="37" width="4.5" height="4.5" fill="#fff" />
      <path d="M36 37a5 5 0 0 1 0 6.5M40 33.5a10 10 0 0 1 0 13.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight ${inverted ? "text-white" : "text-navy"}`}>
      <BrandMark className="size-8" />
      {APP_NAME}
    </span>
  );
}
