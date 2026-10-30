import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_FIELDS, type Product } from "@/lib/products";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { CheckoutClient, type SavedAddress } from "./checkout-client";

export const metadata: Metadata = { title: "Finalizar compra" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back="/loja" eyebrow="Loja" title="Finalizar compra" />
      <Suspense fallback={<PageSkeleton />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: products }, { data: last }] = await Promise.all([
    supabase.from("products").select(PRODUCT_FIELDS).eq("active", true),
    supabase
      .from("orders")
      .select("recipient_name, recipient_phone, recipient_document, cep, street, address_number, complement, district, city, state")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const saved: SavedAddress = last
    ? {
        name: last.recipient_name,
        phone: last.recipient_phone,
        document: last.recipient_document,
        cep: last.cep,
        street: last.street,
        number: last.address_number,
        complement: last.complement,
        district: last.district,
        city: last.city,
        state: last.state,
      }
    : { name: user.name, phone: "", document: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

  return <CheckoutClient products={(products ?? []) as Product[]} saved={saved} />;
}
