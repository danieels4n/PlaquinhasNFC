export type OrderStatus = "awaiting_payment" | "paid" | "in_production" | "ready" | "shipped" | "delivered" | "canceled";

export type Order = {
  id: string;
  number: number;
  buyer_id: string;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_service: string;
  shipping_company: string;
  shipping_days: number | null;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_document: string;
  cep: string;
  street: string;
  address_number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  tracking_code: string;
  carrier: string;
  payment_provider: string;
  payment_id: string;
  pix_qr_code: string | null;
  pix_qr_base64: string | null;
  pix_ticket_url: string | null;
  pix_expires_at: string | null;
  batch_id: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  product_name: string;
  size_label: string;
  unit_price_cents: number;
  quantity: number;
};

export type OrderEvent = { id: number; status: OrderStatus; note: string; created_at: string };

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  in_production: "Em produção",
  ready: "Pronto para envio",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
};

/** Etapas mostradas na linha do tempo do pedido. */
export const ORDER_STEPS: OrderStatus[] = ["paid", "in_production", "ready", "shipped", "delivered"];

export function stepIndex(status: OrderStatus) {
  if (status === "awaiting_payment") return -1;
  return ORDER_STEPS.indexOf(status);
}

/** Próxima ação do fornecedor para cada status. */
export const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "in_production", label: "Iniciar produção" },
  in_production: { to: "ready", label: "Marcar como pronto" },
  ready: { to: "shipped", label: "Marcar como enviado" },
  shipped: { to: "delivered", label: "Marcar como entregue" },
};

export function orderNumber(n: number) {
  return `PED-${String(n).padStart(6, "0")}`;
}

export function trackingUrl(code: string) {
  return `https://melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`;
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(cpf[len])) return false;
  }
  return true;
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(cnpj[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
