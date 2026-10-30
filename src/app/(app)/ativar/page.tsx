import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { claimPlate } from "../plaquinhas/actions";

export const metadata: Metadata = { title: "Ativar plaquinha" };

export default function ActivatePage({ searchParams }: PageProps<"/ativar">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Nova plaquinha" title="Ativar plaquinha" />
      <Suspense fallback={<PageSkeleton />}>
        <Activate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Activate({ searchParams }: { searchParams: PageProps<"/ativar">["searchParams"] }) {
  await requireUser();
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken.trim().toUpperCase() : "";

  const supabase = await createClient();
  const { data } = token ? await supabase.rpc("lookup_plate", { p_token: token }) : { data: null };
  const plate = (data as { code: string; product_label: string; status: string; mine: boolean; reserved_other: boolean }[] | null)?.[0];

  if (!plate) {
    return (
      <div className="card text-center">
        <p className="font-medium">Plaquinha não encontrada</p>
        <p className="mt-1 text-sm text-muted">Confira o código ou escaneie o QR novamente.</p>
        <Link href="/plaquinhas" className="btn-ghost mt-4">Ir para minhas plaquinhas</Link>
      </div>
    );
  }

  if (plate.mine) {
    return (
      <div className="card text-center">
        <p className="font-medium">{plate.code} já está na sua conta</p>
        <Link href="/plaquinhas" className="btn-primary mt-4">Ver minhas plaquinhas</Link>
      </div>
    );
  }

  if (plate.reserved_other) {
    return (
      <div className="card text-center">
        <p className="font-medium">Esta plaquinha é do pedido de outra conta</p>
        <p className="mt-1 text-sm text-muted">Entre com a conta que fez a compra para ativá-la.</p>
      </div>
    );
  }

  if (plate.status !== "unclaimed") {
    return (
      <div className="card text-center">
        <p className="font-medium">Esta plaquinha já foi ativada</p>
        <p className="mt-1 text-sm text-muted">Ela pertence a outra conta. Se acha que é um engano, fale com o suporte.</p>
      </div>
    );
  }

  return (
    <ActionForm action={claimPlate} className="card text-center">
      <input type="hidden" name="token" value={token} />
      <p className="text-3xl font-semibold tabular-nums">{plate.code}</p>
      {plate.product_label && <p className="mt-1 text-sm text-muted">{plate.product_label}</p>}
      <p className="mt-4 mb-5 text-sm text-muted">Adicione esta plaquinha à sua conta para escolher para onde ela vai apontar.</p>
      <SubmitButton pendingText="Ativando…">Adicionar à minha conta</SubmitButton>
    </ActionForm>
  );
}
