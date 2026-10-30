import Link from "next/link";
import { APP_NAME } from "@/lib/env";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="size-7" />
        {APP_NAME}
      </Link>
      <article className="space-y-4 text-sm leading-relaxed text-muted [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-ink [&_h2]:pt-2 [&_h2]:font-medium [&_h2]:text-ink">
        {children}
      </article>
    </main>
  );
}
