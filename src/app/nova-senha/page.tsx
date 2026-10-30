import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { setNewPassword } from "../(auth)/actions";

export const metadata: Metadata = { title: "Nova senha" };

/** Aberta pelo link do e-mail de recuperação (o link já faz login). */
export default function NewPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-navy">Criar nova senha</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Mínimo de 8 caracteres.</p>
      <ActionForm action={setNewPassword} className="card space-y-4">
        <div>
          <label htmlFor="password" className="label">Nova senha</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Repita a senha</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <SubmitButton>Salvar nova senha</SubmitButton>
      </ActionForm>
    </main>
  );
}
