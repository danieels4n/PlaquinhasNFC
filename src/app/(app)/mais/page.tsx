import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import type { ActionState } from "@/lib/types";
import { logout } from "../../(auth)/actions";

export const metadata: Metadata = { title: "Mais" };

async function updateName(_: ActionState, formData: FormData): Promise<ActionState> {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Informe seu nome." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Nome atualizado." };
}

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mais" />
      <Suspense fallback={<PageSkeleton />}>
        <Account />
      </Suspense>
    </div>
  );
}

type Entry = { href: string; title: string; text: string };

/** Ícone por destino (mesmos destinos de antes, só a apresentação mudou). */
const MENU_ICON: Record<string, string> = {
  "/pedidos": "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0",
  "/loja": "M3 4h2l2.4 11h10.2L20 8H7M10 20h.01M17 20h.01",
  "/prospeccao": "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  "/link-avaliacao": "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  "/fornecedor": "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  "/admin/lotes": "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  "/admin/produtos": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "/admin/usuarios": "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.74",
};

function Section({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-navy">{title}</h2>
      <ul className="card divide-y divide-line p-0 md:p-0">
        {entries.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
              <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={MENU_ICON[e.href] ?? "M5 12h14"} />
              </svg>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{e.title}</span>
                <span className="block text-xs text-muted">{e.text}</span>
              </span>
              <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Account() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      {!user.isSupplier && (
        <Section
          title="Revenda"
          entries={[
            { href: "/pedidos", title: "Meus pedidos", text: "Compras de plaquinhas e rastreio" },
            { href: "/loja", title: "Comprar plaquinhas", text: "Loja com pagamento via Pix" },
            { href: "/prospeccao", title: "Buscar clientes", text: "Empresas da região com nota baixa ou poucas avaliações" },
            { href: "/link-avaliacao", title: "Link de avaliação Google", text: "Gere o link para o destino da plaquinha" },
          ]}
        />
      )}

      {user.isStaff && (
        <Section
          title={user.isAdmin ? "Administração" : "Fornecedor"}
          entries={[
            { href: "/fornecedor", title: "Pedidos para produzir", text: "Fila de produção e envio" },
            { href: "/admin/lotes", title: "Lotes de plaquinhas", text: "Imprimir os QR Codes" },
            ...(user.isAdmin
              ? [
                  { href: "/admin/produtos", title: "Produtos", text: "Catálogo, preços e estoque" },
                  { href: "/admin/usuarios", title: "Usuários", text: "Definir fornecedor e administradores" },
                ]
              : []),
          ]}
        />
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Conta</h2>
        <ActionForm action={updateName} className="card space-y-3">
          <p className="text-sm text-muted">{user.email}</p>
          <div>
            <label htmlFor="name" className="label">Seu nome</label>
            <input id="name" name="name" defaultValue={user.name} maxLength={80} className="input" />
          </div>
          <SubmitButton>Salvar</SubmitButton>
        </ActionForm>
      </section>

      <div className="space-y-2">
        <form action={logout}>
          <button className="btn-ghost w-full">Sair da conta</button>
        </form>
        <p className="text-center text-xs text-muted">
          <Link href="/termos" className="underline">Termos de uso</Link> · <Link href="/privacidade" className="underline">Privacidade</Link>
        </p>
      </div>
    </div>
  );
}
