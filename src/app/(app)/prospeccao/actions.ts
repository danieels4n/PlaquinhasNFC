"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAILY_SEARCHES, hasPlacesKey, opportunity, searchBusinessesCached, searchesToday, type GooglePlace } from "@/lib/places";

export type Prospect = GooglePlace & { score: number; savedId: string | null };
export type SearchResponse = {
  results?: Prospect[];
  nextPageToken?: string | null;
  used?: number;
  limit?: number;
  error?: string;
};

export async function searchProspects(input: {
  what: string;
  where: string;
  near?: { lat: number; lng: number } | null;
  pageToken?: string | null;
}): Promise<SearchResponse> {
  const user = await requireUser();
  if (!hasPlacesKey()) return { error: "A busca precisa da chave GOOGLE_PLACES_API_KEY." };

  const what = input.what.trim().slice(0, 80);
  const where = input.where.trim().slice(0, 80);
  if (what.length < 2) return { error: "Diga o tipo de negócio (ex.: padaria, salão de beleza)." };
  if (!where && !input.near) return { error: "Informe a cidade/bairro ou use “perto de mim”." };
  const near =
    input.near && Number.isFinite(input.near.lat) && Number.isFinite(input.near.lng) && Math.abs(input.near.lat) <= 90 && Math.abs(input.near.lng) <= 180
      ? input.near
      : undefined;

  const supabase = await createClient();
  const used = await searchesToday(supabase, user.id);
  if (used >= DAILY_SEARCHES) {
    return { error: `Limite de ${DAILY_SEARCHES} buscas por dia atingido. Amanhã libera de novo.`, used, limit: DAILY_SEARCHES };
  }

  let result;
  try {
    result = await searchBusinessesCached(where ? `${what} em ${where}` : what, { near, pageToken: input.pageToken ?? undefined });
  } catch (err) {
    return { error: (err as Error).message, used, limit: DAILY_SEARCHES };
  }
  if (!result.cached) await supabase.from("places_usage").insert({ user_id: user.id, kind: "search" });

  const ids = result.places.map((p) => p.placeId);
  const { data: saved } = ids.length
    ? await supabase.from("customers").select("id, google_place_id").in("google_place_id", ids)
    : { data: [] };
  const savedById = new Map((saved ?? []).map((s) => [s.google_place_id as string, s.id as string]));

  const results = result.places
    .filter((p) => p.open)
    .map((p) => ({ ...p, score: opportunity(p), savedId: savedById.get(p.placeId) ?? null }))
    .sort((a, b) => b.score - a.score);

  return { results, nextPageToken: result.nextPageToken, used: used + (result.cached ? 0 : 1), limit: DAILY_SEARCHES };
}

/** Salva a empresa como lead (sem nova consulta ao Google: usa os dados da busca). */
export async function saveLead(place: GooglePlace, segment: string): Promise<{ id?: string; error?: string }> {
  await requireUser();
  if (!/^[\w-]{10,300}$/.test(place.placeId)) return { error: "Empresa inválida." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const rating = typeof place.rating === "number" && place.rating >= 1 && place.rating <= 5 ? place.rating : null;
  const reviews = Number.isInteger(place.reviews) && place.reviews >= 0 ? place.reviews : null;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: place.name.slice(0, 120) || "Empresa",
      segment: segment.slice(0, 60),
      phone: place.phone.slice(0, 30),
      stage: "lead",
      google_place_id: place.placeId,
      google_name: place.name.slice(0, 200),
      google_address: place.address.slice(0, 300),
      google_maps_url: place.mapsUrl.startsWith("https://") ? place.mapsUrl.slice(0, 500) : "",
      google_phone: place.phone.slice(0, 30),
      google_rating: rating,
      google_reviews: reviews,
      google_checked_at: now,
      google_baseline_rating: rating,
      google_baseline_reviews: reviews,
      google_baseline_at: now,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Esta empresa já está na sua carteira." };
    return { error: error.message };
  }
  await supabase.from("customer_google_history").insert({ customer_id: data.id, rating, reviews, checked_at: now });
  return { id: data.id };
}
