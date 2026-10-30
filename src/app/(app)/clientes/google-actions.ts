"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { resolvePlaceId } from "@/lib/google-review";
import { DAILY_SEARCHES, getPlace, hasPlacesKey, refreshCustomerGoogle, searchBusinessesCached, searchesToday, type GooglePlace } from "@/lib/places";

type Found = { places?: GooglePlace[]; error?: string };

/** Acha a empresa no Google por link do Maps ou por nome (nome conta como 1 busca do limite diário). */
export async function findPlaceToLink(query: string): Promise<Found> {
  const user = await requireUser();
  if (!hasPlacesKey()) return { error: "Configure a chave GOOGLE_PLACES_API_KEY para usar esta função." };
  const q = query.trim();
  if (q.length < 3) return { error: "Cole o link do Maps ou digite o nome e a cidade." };
  const supabase = await createClient();

  if (/^https?:\/\//i.test(q) || /ChIJ/.test(q)) {
    const resolved = await resolvePlaceId(q);
    if ("error" in resolved) return { error: resolved.error };
    const place = await getPlace(resolved.placeId);
    await supabase.from("places_usage").insert({ user_id: user.id, kind: "details" });
    return place ? { places: [place] } : { error: "Empresa não encontrada." };
  }

  if ((await searchesToday(supabase, user.id)) >= DAILY_SEARCHES) {
    return { error: `Você atingiu o limite de ${DAILY_SEARCHES} buscas de hoje. Amanhã libera de novo.` };
  }
  try {
    const result = await searchBusinessesCached(q);
    if (!result.cached) await supabase.from("places_usage").insert({ user_id: user.id, kind: "search" });
    return result.places.length ? { places: result.places.slice(0, 6) } : { error: "Nenhuma empresa encontrada." };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function ownCustomer(customerId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, google_place_id, google_baseline_at, google_checked_at")
    .eq("id", customerId)
    .maybeSingle();
  return { supabase, customer: data as { id: string; google_place_id: string | null; google_baseline_at: string | null; google_checked_at: string | null } | null };
}

export async function linkGooglePlace(customerId: string, placeId: string) {
  const user = await requireUser();
  const { supabase, customer } = await ownCustomer(customerId);
  if (!customer) return { error: "Cliente não encontrado." };

  const { data: dup } = await supabase
    .from("customers")
    .select("name")
    .eq("google_place_id", placeId)
    .neq("id", customerId)
    .maybeSingle();
  if (dup) return { error: `Esta empresa já está vinculada ao cliente "${dup.name}".` };

  // Vínculo novo: zera o "antes" e o histórico antigo
  if (customer.google_place_id !== placeId) {
    if (hasAdminKey()) await createAdminClient().from("customer_google_history").delete().eq("customer_id", customerId);
    await supabase
      .from("customers")
      .update({ google_place_id: placeId, google_baseline_at: null, google_baseline_rating: null, google_baseline_reviews: null })
      .eq("id", customerId);
  }
  const place = await refreshCustomerGoogle(supabase, { id: customerId, google_place_id: placeId, google_baseline_at: null });
  await supabase.from("places_usage").insert({ user_id: user.id, kind: "details" });
  if (!place) return { error: "Não foi possível ler os dados no Google agora." };
  refresh();
  return { ok: true };
}

export async function refreshGooglePlace(customerId: string) {
  const user = await requireUser();
  const { supabase, customer } = await ownCustomer(customerId);
  if (!customer?.google_place_id) return { error: "Cliente sem empresa vinculada." };
  if (customer.google_checked_at && Date.now() - new Date(customer.google_checked_at).getTime() < 12 * 3600 * 1000) {
    return { error: "Já atualizado nas últimas 12 horas." };
  }
  const place = await refreshCustomerGoogle(supabase, { id: customer.id, google_place_id: customer.google_place_id, google_baseline_at: customer.google_baseline_at });
  await supabase.from("places_usage").insert({ user_id: user.id, kind: "details" });
  if (!place) return { error: "Não foi possível ler os dados no Google agora." };
  refresh();
  return { ok: true };
}

export async function unlinkGooglePlace(customerId: string) {
  const { supabase, customer } = await ownCustomer(customerId);
  if (!customer) return { error: "Cliente não encontrado." };
  if (hasAdminKey()) await createAdminClient().from("customer_google_history").delete().eq("customer_id", customerId);
  await supabase
    .from("customers")
    .update({
      google_place_id: null,
      google_name: "",
      google_address: "",
      google_maps_url: "",
      google_phone: "",
      google_rating: null,
      google_reviews: null,
      google_checked_at: null,
      google_baseline_rating: null,
      google_baseline_reviews: null,
      google_baseline_at: null,
    })
    .eq("id", customerId);
  refresh();
  return { ok: true };
}

export async function convertLead(customerId: string) {
  const { supabase, customer } = await ownCustomer(customerId);
  if (!customer) return { error: "Cliente não encontrado." };
  await supabase.from("customers").update({ stage: "client" }).eq("id", customerId);
  refresh();
  return { ok: true };
}
