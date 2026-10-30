"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/**
 * Formulário ligado a uma Server Action, mostrando erro/sucesso abaixo.
 * Envia pelo onSubmit (e não por action=) para o React não limpar os campos
 * quando a ação devolve um erro.
 */
export function ActionForm({
  action,
  children,
  className,
  id,
  resetOnSuccess = false,
}: {
  id?: string;
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      id={id}
      className={className}
      // action= garante um POST correto antes do JavaScript carregar;
      // depois disso, o onSubmit assume e evita que o React limpe os campos.
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
      {state?.error && (
        <p role="alert" className="notice-bad mt-3">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="notice-ok mt-3">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "Salvando…",
  className = "btn-primary w-full",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const fromForm = useFormStatus().pending;
  const fromActionForm = useContext(PendingContext);
  const pending = fromForm || fromActionForm;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copie o link:", text);
        }
      }}
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
