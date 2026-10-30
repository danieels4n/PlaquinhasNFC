"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useCart } from "@/components/cart";
import { QtyStepper } from "@/components/qty-stepper";
import { formatCents, onlyDigits } from "@/lib/orders";
import { unitPrice, type Product } from "@/lib/products";
import type { ShippingOption } from "@/lib/shipping";
import { findCep, getShippingOptions, placeOrder } from "../actions";

export type SavedAddress = {
  name: string;
  phone: string;
  document: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const STEPS = ["Carrinho", "Entrega", "Revisão", "Pagamento"] as const;

export function CheckoutClient({ products, saved }: { products: Product[]; saved: SavedAddress }) {
  const router = useRouter();
  const { cart, ready, setQty, clear } = useCart();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<SavedAddress>(saved);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);
  const [shippingId, setShippingId] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const lines = useMemo(
    () => products.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id] })),
    [products, cart],
  );
  const items = lines.map((l) => ({ productId: l.product.id, quantity: l.quantity }));
  const subtotal = lines.reduce((s, l) => s + unitPrice(l.product) * l.quantity, 0);
  const shipping = options?.find((o) => o.id === shippingId) ?? null;
  const belowMin = lines.filter((l) => l.quantity < l.product.min_qty);

  if (!ready) return null;
  if (!lines.length) {
    return (
      <div className="card text-center">
        <p className="font-medium">Seu carrinho está vazio</p>
        <Link href="/loja" className="btn-primary mt-4">Ver produtos</Link>
      </div>
    );
  }

  const set = (field: keyof SavedAddress) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((a) => ({ ...a, [field]: e.target.value }));
    if (field === "cep") {
      setOptions(null);
      setShippingId("");
    }
  };

  const fillCep = () => {
    if (onlyDigits(address.cep).length !== 8) return;
    start(async () => {
      const found = await findCep(address.cep);
      if (found) setAddress((a) => ({ ...a, street: found.street || a.street, district: found.district || a.district, city: found.city, state: found.state }));
      else setError("CEP não encontrado.");
    });
  };

  const calcShipping = () => {
    setError("");
    start(async () => {
      const result = await getShippingOptions(address.cep, items);
      setOptions(result);
      setShippingId(result[0]?.id ?? "");
      if (!result.length) setError("Não conseguimos calcular o frete para este CEP.");
    });
  };

  const goReview = () => {
    setError("");
    const missing = [
      address.name.trim().length < 3 && "nome",
      onlyDigits(address.phone).length < 10 && "telefone com DDD",
      ![11, 14].includes(onlyDigits(address.document).length) && "CPF ou CNPJ",
      onlyDigits(address.cep).length !== 8 && "CEP",
      !address.street.trim() && "rua",
      !address.number.trim() && "número",
      !address.city.trim() && "cidade",
      address.state.trim().length !== 2 && "UF",
      !shipping && "opção de frete",
    ].filter(Boolean);
    if (missing.length) return setError(`Falta preencher: ${missing.join(", ")}.`);
    setStep(2);
  };

  const pay = () => {
    setError("");
    start(async () => {
      const result = await placeOrder({ items, address, shippingId });
      if (result.error || !result.orderId) {
        setError(result.error ?? "Não foi possível criar o pedido.");
        return;
      }
      clear();
      router.push(`/pedidos/${result.orderId}`);
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <ol className="grid grid-cols-4 gap-1" aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li key={label} className="text-center">
            <span className={`mx-auto mb-1 block h-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
            <span className={`text-[11px] font-semibold ${i === step ? "text-ink" : "text-muted"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-3">
          {lines.map(({ product: p, quantity }) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{formatCents(unitPrice(p))}/un. · mín. {p.min_qty}</p>
                </div>
                <button type="button" className="text-xs font-semibold text-danger" onClick={() => setQty(p.id, 0)}>
                  Remover
                </button>
              </div>
              <div className="flex items-center justify-between">
                <QtyStepper value={quantity} min={p.min_qty} max={p.stock ?? 1000} onChange={(q) => setQty(p.id, q)} label={p.name} />
                <span className="font-medium tabular-nums">{formatCents(unitPrice(p) * quantity)}</span>
              </div>
            </div>
          ))}
          <Totals subtotal={subtotal} shipping={null} />
          <button type="button" className="btn-primary w-full" disabled={belowMin.length > 0} onClick={() => setStep(1)}>
            Continuar para entrega
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card space-y-3">
          <Field label="Nome de quem recebe" value={address.name} onChange={set("name")} autoComplete="name" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone (WhatsApp)" value={address.phone} onChange={set("phone")} type="tel" autoComplete="tel" />
            <Field label="CPF ou CNPJ" value={address.document} onChange={set("document")} inputMode="numeric" />
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="CEP" value={address.cep} onChange={set("cep")} onBlur={fillCep} inputMode="numeric" autoComplete="postal-code" />
            <button type="button" className="btn-ghost" onClick={fillCep} disabled={pending}>Buscar</button>
          </div>
          <Field label="Rua" value={address.street} onChange={set("street")} autoComplete="address-line1" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número" value={address.number} onChange={set("number")} />
            <Field label="Complemento" value={address.complement} onChange={set("complement")} />
          </div>
          <Field label="Bairro" value={address.district} onChange={set("district")} />
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field label="Cidade" value={address.city} onChange={set("city")} />
            <Field label="UF" value={address.state} onChange={set("state")} maxLength={2} />
          </div>

          <div className="border-t border-line pt-3">
            <p className="label">Frete</p>
            {options === null ? (
              <button type="button" className="btn-ghost w-full" onClick={calcShipping} disabled={pending || onlyDigits(address.cep).length !== 8}>
                {pending ? "Calculando…" : "Calcular frete"}
              </button>
            ) : (
              <div className="space-y-2" role="radiogroup">
                {options.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${shippingId === o.id ? "border-ink bg-surface-2" : "border-line"}`}>
                    <span className="flex items-center gap-3">
                      <input type="radio" name="shipping" className="accent-[var(--color-accent)]" checked={shippingId === o.id} onChange={() => setShippingId(o.id)} />
                      <span>
                        <span className="block text-sm font-semibold">{o.company} {o.service}</span>
                        {o.days && <span className="text-xs text-muted">até {o.days} dias úteis</span>}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">{formatCents(o.priceCents)}</span>
                  </label>
                ))}
                <button type="button" className="link text-xs" onClick={calcShipping}>Recalcular</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setStep(0)}>Voltar</button>
            <button type="button" className="btn-primary" onClick={goReview}>Revisar pedido</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <div className="card space-y-2 text-sm">
            <p className="label">Itens</p>
            {lines.map(({ product: p, quantity }) => (
              <div key={p.id} className="flex justify-between gap-3">
                <span>{quantity}× {p.name}</span>
                <span className="tabular-nums">{formatCents(unitPrice(p) * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="card text-sm">
            <p className="label">Entrega</p>
            <p className="font-semibold">{address.name}</p>
            <p className="text-muted">
              {address.street}, {address.number}{address.complement ? ` – ${address.complement}` : ""} · {address.district}
              <br />
              {address.city}/{address.state.toUpperCase()} · CEP {address.cep}
            </p>
            {shipping && <p className="mt-2">{shipping.company} {shipping.service}{shipping.days ? ` · até ${shipping.days} dias úteis` : ""}</p>}
          </div>
          <Totals subtotal={subtotal} shipping={shipping?.priceCents ?? 0} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Voltar</button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>Ir para pagamento</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card space-y-3 text-center">
          <p className="text-sm text-muted">Total a pagar via Pix</p>
          <p className="text-3xl font-semibold tabular-nums">{formatCents(subtotal + (shipping?.priceCents ?? 0))}</p>
          <p className="text-sm text-muted">
            Ao confirmar, geramos o QR Code Pix. O pedido vai para produção assim que o pagamento for aprovado.
          </p>
          <button type="button" className="btn-primary w-full" onClick={pay} disabled={pending}>
            {pending ? "Criando pedido…" : "Confirmar e gerar Pix"}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => setStep(2)} disabled={pending}>Voltar</button>
        </section>
      )}

      {error && (
        <p role="alert" className="notice-bad">{error}</p>
      )}
    </div>
  );
}

function Totals({ subtotal, shipping }: { subtotal: number; shipping: number | null }) {
  return (
    <div className="card space-y-1 text-sm">
      <div className="flex justify-between"><span className="text-muted">Produtos</span><span className="tabular-nums">{formatCents(subtotal)}</span></div>
      <div className="flex justify-between"><span className="text-muted">Frete</span><span className="tabular-nums">{shipping === null ? "calculado na entrega" : formatCents(shipping)}</span></div>
      {shipping !== null && (
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatCents(subtotal + shipping)}</span></div>
      )}
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );
}
