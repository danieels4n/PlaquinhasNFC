"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { lookupCep, quoteShipping, type Address, type CartLine, type ShippingOption } from "@/lib/shipping";
import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/orders";
import { createPixForOrder } from "@/lib/checkout";
import { unitPrice, type Product } from "@/lib/products";

export type CartInput = { productId: string; quantity: number }[];

export async function findCep(cep: string): Promise<Address | null> {
  await requireUser();
  return lookupCep(cep);
}

async function cartLines(items: CartInput): Promise<CartLine[]> {
  const ids = items.map((i) => i.productId).filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, weight_g, price_cents, promo_price_cents").in("id", ids);
  const byId = new Map((data ?? []).map((p) => [p.id as string, p as Pick<Product, "weight_g" | "price_cents" | "promo_price_cents">]));
  return items.flatMap((i) => {
    const p = byId.get(i.productId);
    return p ? [{ weightG: p.weight_g, quantity: i.quantity, unitPriceCents: unitPrice(p) }] : [];
  });
}

export async function getShippingOptions(cep: string, items: CartInput): Promise<ShippingOption[]> {
  await requireUser();
  return quoteShipping(cep, await cartLines(items));
}

export type CheckoutInput = {
  items: CartInput;
  address: {
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
  shippingId: string;
};

export async function placeOrder(input: CheckoutInput): Promise<{ orderId?: string; error?: string }> {
  const user = await requireUser();
  if (!hasAdminKey()) return { error: "A loja ainda não está configurada (falta SUPABASE_SECRET_KEY)." };

  const a = input.address;
  const doc = onlyDigits(a.document);
  if (a.name.trim().length < 3) return { error: "Informe o nome completo de quem vai receber." };
  if (onlyDigits(a.phone).length < 10) return { error: "Informe um telefone com DDD." };
  if (!(isValidCpf(doc) || isValidCnpj(doc))) return { error: "CPF ou CNPJ inválido." };
  if (onlyDigits(a.cep).length !== 8) return { error: "CEP inválido." };
  if (!a.street.trim() || !a.number.trim() || !a.city.trim() || !/^[A-Za-z]{2}$/.test(a.state.trim())) {
    return { error: "Preencha o endereço completo." };
  }
  const items = input.items.filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
  if (!items.length) return { error: "Seu carrinho está vazio." };

  // O frete é cotado de novo aqui: o valor que vale é sempre o do servidor.
  const options = await quoteShipping(a.cep, await cartLines(items));
  const shipping = options.find((o) => o.id === input.shippingId);
  if (!shipping) return { error: "O frete mudou. Calcule novamente e escolha uma opção." };

  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc("create_order", {
    p_buyer: user.id,
    p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_address: {
      name: a.name.trim(),
      email: user.email,
      phone: a.phone.trim(),
      document: doc,
      cep: onlyDigits(a.cep),
      street: a.street.trim(),
      number: a.number.trim(),
      complement: a.complement.trim(),
      district: a.district.trim(),
      city: a.city.trim(),
      state: a.state.trim().toUpperCase(),
    },
    p_shipping: {
      service_id: shipping.id,
      service: shipping.service,
      company: shipping.company,
      days: shipping.days,
      price_cents: shipping.priceCents,
    },
  });
  if (error || !orderId) return { error: error?.message ?? "Não foi possível criar o pedido." };

  await createPixForOrder(orderId as string);
  return { orderId: orderId as string };
}
