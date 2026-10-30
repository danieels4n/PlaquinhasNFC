"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart";
import { QtyStepper } from "@/components/qty-stepper";
import { formatCents } from "@/lib/orders";
import { unitPrice, type Product } from "@/lib/products";
import { CheckIcon } from "@/components/ui";

export function StoreClient({ products }: { products: Product[] }) {
  const { cart, ready, setQty } = useCart();
  const items = products.filter((p) => cart[p.id]);
  const count = items.reduce((s, p) => s + cart[p.id], 0);
  const total = items.reduce((s, p) => s + unitPrice(p) * cart[p.id], 0);

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} inCart={cart[p.id] ?? 0} onSet={(q) => setQty(p.id, q)} />
        ))}
      </ul>

      {ready && count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 px-4 pb-3 md:bottom-4">
          <Link
            href="/loja/checkout"
            className="mx-auto flex max-w-lg items-center justify-between rounded-2xl bg-accent px-4 py-3 text-accent-ink shadow-lg shadow-black/20" /* taste-skill-ignore: barra fixa flutuante */
          >
            <span className="text-sm font-semibold">
              Carrinho · {count} un.
              <span className="block text-lg font-semibold tabular-nums">{formatCents(total)}</span>
            </span>
            <span className="font-medium">Finalizar →</span>
          </Link>
        </div>
      )}
    </>
  );
}

function ProductCard({ product: p, inCart, onSet }: { product: Product; inCart: number; onSet: (q: number) => void }) {
  const [qty, setQty] = useState(Math.max(p.min_qty, inCart || p.min_qty));
  const [open, setOpen] = useState(false);
  const price = unitPrice(p);
  const max = p.stock ?? 1000;
  const soldOut = p.stock !== null && p.stock < p.min_qty;

  return (
    <li className="card flex flex-col overflow-hidden p-0 md:p-0">
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt="" className="aspect-[4/3] w-full bg-surface-2 object-cover" loading="lazy" />
      ) : (
        <PlateSize label={p.size_label} />
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {p.badge && <span className="chip-neutral mb-2">{p.badge}</span>}
          <h2 className="font-medium text-balance">{p.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {p.size_label}
            {p.size_label ? " · " : ""}
            {soldOut ? "Esgotado" : p.stock !== null ? `${p.stock} em estoque` : "Disponível"}
          </p>
        </div>

        {p.description && (
          <div>
            <p className={`text-sm text-muted ${open ? "" : "line-clamp-2"}`}>{p.description}</p>
            {p.description.length > 90 && (
              <button type="button" className="link mt-1 text-xs" onClick={() => setOpen(!open)}>
                {open ? "Mostrar menos" : "Descrição completa"}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            {p.promo_price_cents !== null && (
              <p className="text-xs text-muted line-through tabular-nums">{formatCents(p.price_cents)}</p>
            )}
            <p className="text-xl font-semibold tabular-nums">
              {formatCents(price)}
              <span className="text-xs font-semibold text-muted">/un.</span>
            </p>
            <p className="text-xs text-muted">Mín. {p.min_qty} un.</p>
          </div>
          <QtyStepper value={qty} min={p.min_qty} max={max} onChange={setQty} label={p.name} />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">
            Subtotal <strong className="text-ink tabular-nums">{formatCents(price * qty)}</strong>
          </span>
          {inCart ? (
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => onSet(0)}>Remover</button>
              {inCart !== qty && (
                <button type="button" className="btn-primary" onClick={() => onSet(qty)} disabled={qty < p.min_qty}>
                  Atualizar
                </button>
              )}
            </div>
          ) : (
            <button type="button" className="btn-primary" disabled={soldOut || qty < p.min_qty} onClick={() => onSet(qty)}>
              Adicionar
            </button>
          )}
        </div>
        {inCart > 0 && <p className="flex items-center gap-1 text-xs font-medium text-ok"><CheckIcon /> {inCart} no carrinho</p>}
      </div>
    </li>
  );
}

/** Sem foto: a plaquinha desenhada no tamanho proporcional real (cm), sobre a mesma régua para todos. */
function PlateSize({ label }: { label: string }) {
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/);
  const w = m ? Number(m[1].replace(",", ".")) : 10;
  const h = m ? Number(m[2].replace(",", ".")) : 10;
  const scale = 6; // px por cm
  return (
    <div className="flex h-28 w-full items-center justify-center gap-3 bg-surface-2" aria-hidden>
      <div className="flex items-start justify-between rounded-md border border-control bg-white p-1.5" style={{ width: w * scale, height: h * scale }}>
        <span className="size-3.5 border-[3px] border-ink" />
        <svg viewBox="0 0 24 24" className="size-4 text-data" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M9 9a5 5 0 0 1 0 6M13 6.5a9 9 0 0 1 0 11" />
        </svg>
      </div>
      {m && <span className="text-xs text-muted tabular-nums">{label}</span>}
    </div>
  );
}
