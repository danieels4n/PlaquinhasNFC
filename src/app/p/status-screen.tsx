import { APP_NAME } from "@/lib/env";

/** Tela pública mostrada a quem escaneia uma plaquinha que não está redirecionando. */
export function StatusScreen({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="mb-6 size-14" />
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <p className="mt-10 text-xs text-muted/70">{APP_NAME}</p>
    </main>
  );
}
