import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAILY_SEARCHES, hasPlacesKey, searchesToday } from "@/lib/places";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { ProspectClient } from "./prospect-client";

export const metadata: Metadata = { title: "Buscar clientes" };

export default function ProspectPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prospecção"
        title="Buscar clientes"
        subtitle="Empresas com nota baixa ou poucas avaliações no Google são os melhores alvos para a plaquinha."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Prospect />
      </Suspense>
    </>
  );
}

async function Prospect() {
  const user = await requireUser();
  if (!hasPlacesKey()) {
    return (
      <div className="card text-sm text-muted">
        A busca de clientes ainda não está ativa. O administrador precisa configurar a chave do Google Places.
      </div>
    );
  }
  const used = await searchesToday(await createClient(), user.id);
  return <ProspectClient initialUsed={used} limit={DAILY_SEARCHES} />;
}
