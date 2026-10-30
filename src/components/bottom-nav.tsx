"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand";

type Item = { href: string; label: string; icon: string };

const ICON = {
  home: "M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1H15v-5.5H9V20H4.5a1 1 0 0 1-1-1z",
  people: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.74",
  plate: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 8h3v3H8zM13.5 13.5a2.5 2.5 0 0 1 0 3.5M16 11.5a5.5 5.5 0 0 1 0 7.5",
  bag: "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0",
  more: "M4 7h16M4 12h16M4 17h16",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
};

const NAV: Record<"user" | "supplier", Item[]> = {
  user: [
    { href: "/", label: "Início", icon: ICON.home },
    { href: "/plaquinhas", label: "Plaquinhas", icon: ICON.plate },
    { href: "/clientes", label: "Clientes", icon: ICON.people },
    { href: "/loja", label: "Comprar", icon: ICON.bag },
    { href: "/mais", label: "Mais", icon: ICON.more },
  ],
  supplier: [
    { href: "/fornecedor", label: "Pedidos", icon: ICON.box },
    { href: "/admin/lotes", label: "Lotes", icon: ICON.print },
    { href: "/mais", label: "Mais", icon: ICON.more },
  ],
};

export type NavVariant = keyof typeof NAV;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Barra superior (marca + links no computador) e barra inferior no celular. Precisa de <Suspense> (lê a URL). */
export function AppNav({ variant = "user" }: { variant?: NavVariant }) {
  return <Nav pathname={usePathname()} items={NAV[variant]} home={variant === "supplier" ? "/fornecedor" : "/"} />;
}

export function AppNavFallback() {
  return <Nav pathname="" items={NAV.user} home="/" />;
}

function Nav({ pathname, items, home }: { pathname: string; items: Item[]; home: string }) {
  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-transparent bg-white/25 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-6 px-4 md:px-8">
          <Link href={home} aria-label="Início">
            <Wordmark />
          </Link>
          <nav aria-label="Navegação principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-raised text-accent" : "text-muted hover:text-ink"}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <nav
        aria-label="Navegação principal"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`}
                >
                  <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
