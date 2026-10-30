import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { login } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-navy">Entre na sua conta</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Gerencie suas plaquinhas e clientes.</p>

      <Suspense fallback={<div className="h-56" />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="link">
          Criar conta grátis
        </Link>
      </p>
    </>
  );
}

async function LoginForm({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const confirmError = params.erro === "confirmacao";

  return (
    <ActionForm action={login} className="space-y-4">
      {confirmError && (
        <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">O link de confirmação expirou ou é inválido.</p>
      )}
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="voce@exemplo.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      <Link href="/esqueci-senha" className="block text-center text-sm text-muted hover:text-ink">Esqueci minha senha</Link>
    </ActionForm>
  );
}
