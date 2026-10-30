import { Suspense } from "react";
import { AppNav, AppNavFallback } from "@/components/bottom-nav";
import { requireUser } from "@/lib/auth";
import { Blobs } from "@/components/blobs";

/*
 * Coluna única de 1120px centrada (gutter 32px no computador, 16px no celular).
 * Atrás do topo, formas orgânicas em azul-claro (decorativas).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate min-h-dvh">
      <Blobs className="absolute top-0 right-0 -z-10 h-[190px] w-[88vw] max-w-[380px] md:h-[260px] md:w-[60vw] md:max-w-[680px]" />
      <Suspense fallback={<AppNavFallback />}>
        <RoleNav />
      </Suspense>
      <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-16">{children}</main>
    </div>
  );
}

/** Fornecedor vê só Pedidos, Lotes e Mais; os demais veem a navegação completa. */
async function RoleNav() {
  const user = await requireUser();
  return <AppNav variant={user.isSupplier ? "supplier" : "user"} />;
}
