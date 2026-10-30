import "server-only";
import { onlyDigits } from "@/lib/orders";

export type ShippingOption = {
  id: string;
  service: string;
  company: string;
  priceCents: number;
  days: number | null;
};

export type CartLine = { weightG: number; quantity: number; unitPriceCents: number };

export type Address = { cep: string; street: string; district: string; city: string; state: string };

/** Consulta o endereço pelo CEP (ViaCEP, gratuito). */
export async function lookupCep(cep: string): Promise<Address | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (json.erro) return null;
    return { cep: digits, street: json.logradouro ?? "", district: json.bairro ?? "", city: json.localidade ?? "", state: json.uf ?? "" };
  } catch {
    return null;
  }
}

export const shippingMode = () => (process.env.MELHOR_ENVIO_TOKEN ? "melhor_envio" : "fixed");

/** Cota o frete. Com MELHOR_ENVIO_TOKEN usa o Melhor Envio; sem ele, um valor fixo. */
export async function quoteShipping(toCep: string, lines: CartLine[]): Promise<ShippingOption[]> {
  const to = onlyDigits(toCep);
  if (to.length !== 8 || lines.length === 0) return [];

  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    const price = Number(process.env.SHIPPING_FIXED_CENTS ?? 2500);
    return [{ id: "fixed", service: "Frete padrão", company: "Correios", priceCents: price, days: null }];
  }

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const weightKg = Math.max(0.1, (lines.reduce((s, l) => s + l.weightG * l.quantity, 0) + 150) / 1000);
  const insurance = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0) / 100;
  const base = process.env.MELHOR_ENVIO_SANDBOX === "false" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";

  try {
    const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": process.env.MELHOR_ENVIO_EMAIL ? `PlacaLink (${process.env.MELHOR_ENVIO_EMAIL})` : "PlacaLink",
      },
      body: JSON.stringify({
        from: { postal_code: onlyDigits(process.env.SHIPPING_ORIGIN_CEP || "") },
        to: { postal_code: to },
        package: { width: 16, length: 16, height: Math.min(100, Math.max(2, Math.ceil(totalQty * 0.4) + 1)), weight: weightKg },
        options: { insurance_value: insurance, receipt: false, own_hand: false },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      id: number;
      name: string;
      price?: string;
      custom_price?: string;
      delivery_time?: number;
      custom_delivery_time?: number;
      error?: string;
      company?: { name: string };
    }[];
    return json
      .filter((s) => !s.error && (s.custom_price ?? s.price))
      .map((s) => ({
        id: String(s.id),
        service: s.name,
        company: s.company?.name ?? "",
        priceCents: Math.round(Number(s.custom_price ?? s.price) * 100),
        days: s.custom_delivery_time ?? s.delivery_time ?? null,
      }))
      .sort((a, b) => a.priceCents - b.priceCents);
  } catch {
    return [];
  }
}
