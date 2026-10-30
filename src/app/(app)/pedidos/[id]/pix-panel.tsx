"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CopyButton } from "@/components/forms";
import { formatCents, type Order } from "@/lib/orders";
import { cancelOrder, checkPayment, regeneratePix } from "../actions";

export function PixPanel({ order, onlineEnabled }: { order: Order; onlineEnabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const expired = order.pix_expires_at ? new Date(order.pix_expires_at).getTime() < Date.now() : false;

  // Confere o pagamento a cada 5 segundos enquanto a tela estiver aberta.
  useEffect(() => {
    if (!order.payment_id) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const status = await checkPayment(order.id);
      if (status && status !== "awaiting_payment") {
        clearInterval(timer);
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [order.id, order.payment_id, router]);

  if (!onlineEnabled) {
    return (
      <div className="card border-[#fde68a] text-sm">
        <p className="font-medium">Aguardando pagamento</p>
        <p className="mt-1 text-muted">O pagamento online ainda não está ativo. O vendedor vai entrar em contato para combinar o pagamento de {formatCents(order.total_cents)}.</p>
      </div>
    );
  }

  if (!order.pix_qr_code || expired) {
    return (
      <div className="card space-y-3 text-center">
        <p className="font-medium">{expired ? "O Pix expirou" : "Pix ainda não gerado"}</p>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await regeneratePix(order.id);
              setMessage(r && "error" in r && r.error ? r.error : "");
            })
          }
        >
          {pending ? "Gerando…" : "Gerar Pix"}
        </button>
        {message && <p className="text-sm text-danger">{message}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-4 text-center">
      <div>
        <p className="text-sm text-muted">Total a pagar via Pix</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatCents(order.total_cents)}</p>
      </div>
      {order.pix_qr_base64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${order.pix_qr_base64}`} alt="QR Code Pix" className="mx-auto size-56 rounded-lg bg-white p-2" />
      )}
      <div className="rounded-lg bg-bg p-3 text-left">
        <p className="label">Pix copia e cola</p>
        <p className="line-clamp-3 font-mono text-xs break-all text-muted">{order.pix_qr_code}</p>
      </div>
      <CopyButton text={order.pix_qr_code} label="Copiar código Pix" />
      <p className="text-xs text-muted">
        A confirmação é automática. Esta tela atualiza sozinha.
        {order.pix_expires_at && ` Válido até ${new Date(order.pix_expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.`}
      </p>
      <button
        type="button"
        className="btn-ghost w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const status = await checkPayment(order.id);
            if (status === "awaiting_payment") setMessage("Ainda não recebemos o pagamento. Pode levar alguns segundos.");
            else router.refresh();
          })
        }
      >
        {pending ? "Verificando…" : "Já paguei"}
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="btn-danger w-full"
        disabled={pending}
        onClick={() => {
          if (!confirm("Cancelar este pedido?")) return;
          start(async () => {
            const r = await cancelOrder(orderId);
            if (r.error) setError(r.error);
          });
        }}
      >
        {pending ? "Cancelando…" : "Cancelar pedido"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
