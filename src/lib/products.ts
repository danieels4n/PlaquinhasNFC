export type Product = {
  id: string;
  name: string;
  description: string;
  size_label: string;
  image_url: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  badge: string;
  min_qty: number;
  stock: number | null;
  weight_g: number;
  active: boolean;
  sort: number;
};

export const unitPrice = (p: Pick<Product, "price_cents" | "promo_price_cents">) => p.promo_price_cents ?? p.price_cents;

export const PRODUCT_FIELDS =
  "id, name, description, size_label, image_url, price_cents, promo_price_cents, badge, min_qty, stock, weight_g, active, sort";
