"use client";

import { useCallback, useEffect, useState } from "react";

/** Carrinho guardado no navegador: { idDoProduto: quantidade }. Os preços são sempre recalculados no servidor. */
export type Cart = Record<string, number>;

const KEY = "placalink-cart";
const EVENT = "placalink-cart-change";

function read(): Cart {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, q]) => Number.isInteger(q) && (q as number) > 0),
    ) as Cart;
  } catch {
    return {};
  }
}

function write(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // navegador sem armazenamento: o carrinho vale só nesta página
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setCart(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    const next = { ...read() };
    if (qty > 0) next[productId] = Math.min(1000, Math.floor(qty));
    else delete next[productId];
    write(next);
  }, []);

  const clear = useCallback(() => write({}), []);

  return { cart, ready, setQty, clear };
}
