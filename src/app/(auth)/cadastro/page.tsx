import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { signup } from "../actions";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-navy">Criar conta grátis</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Ative e gerencie suas plaquinhas sem custo de cadastro.</p>

      <ActionForm action={signup} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Seu nome</label>
          <input id="name" name="name" autoComplete="name" required className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="voce@exemplo.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Senha (mínimo 8 caracteres)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <SubmitButton pendingText="Criando…">Criar conta</SubmitButton>
        <p className="text-center text-xs text-muted">
          Ao criar a conta você concorda com os <Link href="/termos" className="underline">Termos de uso</Link> e a{" "}
          <Link href="/privacidade" className="underline">Política de privacidade</Link>.
        </p>
      </ActionForm>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="link">
          Entrar
        </Link>
      </p>
    </>
  );
}
