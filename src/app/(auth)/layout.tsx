import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/env";

/**
 * Entrada: formulário à esquerda; à direita (computador), painel azul-marinho com a plaquinha
 * desenhada e um QR de verdade apontando para este app.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const qr = await qrSvg(siteUrl());

  return (
    <div className="grid min-h-dvh bg-surface md:grid-cols-2">
      <main className="flex flex-col px-5 py-6 md:px-12 md:py-10">
        <Link href="/login" aria-label="Início" className="self-start">
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-xs text-muted">
          <Link href="/termos" className="hover:text-ink">Termos de uso</Link> · <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
        </p>
      </main>

      <aside className="hidden flex-col justify-center gap-10 bg-navy px-12 text-white md:flex" aria-label="Como funciona">
        <div>
          <p className="text-4xl leading-tight font-bold tracking-tight">Transforme aproximações em vendas.</p>
          <p className="mt-3 max-w-md text-base text-[#c9d6f2]">
            Cada plaquinha tem um código fixo. Você escolhe para onde ela leva: avaliação no Google, WhatsApp, Instagram ou cardápio, e acompanha cada leitura.
          </p>
        </div>
        <figure className="w-full max-w-[280px]">
          <div className="rounded-2xl bg-white p-6 text-ink">
            <div className="flex items-start justify-between">
              <p className="text-lg leading-6 font-semibold">Avalie a gente no Google</p>
              <svg viewBox="0 0 24 24" className="size-8 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <path d="M8 9a5 5 0 0 1 0 6M11.5 6.5a9 9 0 0 1 0 11M15 4a13 13 0 0 1 0 16" />
              </svg>
            </div>
            <div className="mt-5 aspect-square w-full [&>svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qr }} />
            <figcaption className="mt-4 text-sm text-muted">Aproxime o celular ou aponte a câmera</figcaption>
          </div>
        </figure>
      </aside>
    </div>
  );
}
