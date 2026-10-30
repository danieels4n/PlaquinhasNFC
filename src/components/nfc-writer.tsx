"use client";

import { useEffect, useRef, useState } from "react";

/* Web NFC (só Chrome no Android). Tipagem mínima, pois ainda não vem no TypeScript padrão. */
type NdefWriter = { write: (msg: { records: { recordType: "url"; data: string }[] }, opts?: { signal?: AbortSignal }) => Promise<void> };
declare global {
  interface Window {
    NDEFReader?: new () => NdefWriter;
  }
}

type State = "idle" | "waiting" | "done" | "error";

/** Grava o link da plaquinha no chip NFC virgem, direto pelo navegador quando o celular permite. */
export function NfcWriter({ url }: { url: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "NDEFReader" in window);
    return () => abortRef.current?.abort();
  }, []);

  async function write() {
    if (!window.NDEFReader) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("waiting");
    setMessage("");
    try {
      await new window.NDEFReader().write({ records: [{ recordType: "url", data: url }] }, { signal: controller.signal });
      setState("done");
    } catch (err) {
      if (controller.signal.aborted) {
        setState("idle");
        return;
      }
      const name = (err as { name?: string })?.name;
      setState("error");
      setMessage(
        name === "NotAllowedError"
          ? "Permita o uso de NFC para este site e tente de novo."
          : name === "NotSupportedError"
            ? "Ative o NFC nas configurações do celular e tente de novo."
            : "Não deu para gravar. Mantenha o chip encostado no celular e tente de novo.",
      );
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setState("idle");
  }

  return (
    <div className="w-full border-t border-line pt-3 text-left">
      <p className="text-sm font-semibold">Chip NFC</p>
      <p className="mt-0.5 text-xs text-muted">Grave no chip o mesmo link do QR, para o toque do celular levar ao mesmo destino.</p>

      {supported && (
        <div className="mt-3 space-y-2">
          {state === "waiting" ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-raised px-3 py-2.5" role="status">
              <p className="text-sm font-medium text-accent">Encoste o chip na parte de trás do celular…</p>
              <button type="button" onClick={cancel} className="link text-sm">Cancelar</button>
            </div>
          ) : (
            <button type="button" onClick={write} className="btn-primary w-full">
              {state === "done" ? "Gravar outro chip com este link" : "Gravar no chip NFC"}
            </button>
          )}
          {state === "done" && <p className="notice-ok" role="status">Chip gravado! Aproxime um celular para testar.</p>}
          {state === "error" && <p className="notice-bad" role="alert">{message}</p>}
        </div>
      )}

      {supported === false && (
        <p className="mt-2 text-xs text-muted">Neste aparelho, grave o chip com um app de NFC usando o link acima (botão Copiar link).</p>
      )}
    </div>
  );
}
