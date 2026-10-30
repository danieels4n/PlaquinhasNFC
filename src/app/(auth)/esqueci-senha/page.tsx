import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-navy">Esqueci minha senha</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Enviamos um link para você criar uma senha nova.</p>
      <ActionForm action={requestPasswordReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">E-mail da conta</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <SubmitButton pendingText="Enviando…">Enviar link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="link">Voltar ao login</Link>
      </p>
    </>
  );
}
