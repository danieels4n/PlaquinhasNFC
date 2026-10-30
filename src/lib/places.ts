import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

/**
 * Google Places API (New) — dados com nota e avaliações (SKU "Enterprise").
 * Preço (out/2026): 1.000 consultas grátis/mês em cada tipo; depois US$ 20/1.000 (detalhes) e US$ 35/1.000 (busca).
 */

export type GooglePlace = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviews: number;
  mapsUrl: string;
  phone: string;
  open: boolean;
};

export const hasPlacesKey = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

/** Quantas buscas de prospecção cada usuário pode fazer por dia. */
export const DAILY_SEARCHES = Number(process.env.PLACES_DAILY_SEARCHES || 15);
/** De quantos em quantos dias a nota de cada cliente é atualizada automaticamente. */
export const REFRESH_DAYS = Number(process.env.GOOGLE_REFRESH_DAYS || 7);

type RawPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  businessStatus?: string;
};

const FIELDS = "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri,nationalPhoneNumber,internationalPhoneNumber,businessStatus";

function toPlace(p: RawPlace): GooglePlace {
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: typeof p.rating === "number" ? p.rating : null,
    reviews: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri ?? "",
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? "",
    open: !p.businessStatus || p.businessStatus === "OPERATIONAL",
  };
}

function headers(fieldMask: string) {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
    "X-Goog-FieldMask": fieldMask,
  };
}

/** Nota, avaliações e contato de uma empresa (1 consulta "Place Details Enterprise"). */
export async function getPlace(placeId: string): Promise<GooglePlace | null> {
  if (!hasPlacesKey() || !/^[\w-]{10,300}$/.test(placeId)) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`, {
    headers: headers(FIELDS),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return toPlace((await res.json()) as RawPlace);
}

export type SearchResult = { places: GooglePlace[]; nextPageToken: string | null };

/** Busca empresas por texto (1 consulta "Text Search Enterprise", até 20 resultados). */
export async function searchBusinesses(
  query: string,
  opts: { near?: { lat: number; lng: number }; pageToken?: string } = {},
): Promise<SearchResult> {
  if (!hasPlacesKey()) return { places: [], nextPageToken: null };
  const body: Record<string, unknown> = { textQuery: query, languageCode: "pt-BR", regionCode: "BR", pageSize: 20 };
  if (opts.near) body.locationBias = { circle: { center: { latitude: opts.near.lat, longitude: opts.near.lng }, radius: 5000 } };
  if (opts.pageToken) body.pageToken = opts.pageToken;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: headers(FIELDS.split(",").map((f) => `places.${f}`).join(",") + ",nextPageToken"),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.error("Places searchText", res.status, await res.text().catch(() => ""));
    throw new Error("A busca no Google falhou. Tente novamente em instantes.");
  }
  const json = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string };
  return { places: (json.places ?? []).map(toPlace), nextPageToken: json.nextPageToken ?? null };
}

/** Busca com cache de 24h: a mesma pesquisa não gasta outra consulta. */
export async function searchBusinessesCached(
  query: string,
  opts: { near?: { lat: number; lng: number }; pageToken?: string } = {},
): Promise<SearchResult & { cached: boolean }> {
  const near = opts.near ? `${opts.near.lat.toFixed(2)},${opts.near.lng.toFixed(2)}` : "";
  const key = createHash("sha256").update(`${query.trim().toLowerCase()}|${near}|${opts.pageToken ?? ""}`).digest("hex");

  if (hasAdminKey()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("places_search_cache")
      .select("results, next_page_token, created_at")
      .eq("key", key)
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .maybeSingle();
    if (data) return { places: data.results as GooglePlace[], nextPageToken: data.next_page_token, cached: true };

    const fresh = await searchBusinesses(query, opts);
    await admin.from("places_search_cache").upsert({ key, results: fresh.places, next_page_token: fresh.nextPageToken, created_at: new Date().toISOString() });
    return { ...fresh, cached: false };
  }
  return { ...(await searchBusinesses(query, opts)), cached: false };
}

/** Quantas buscas o usuário já fez hoje (fuso de Brasília). */
export async function searchesToday(supabase: SupabaseClient, userId: string) {
  // Brasília = UTC-3 (sem horário de verão): meia-noite local = 03:00 UTC
  const local = new Date(Date.now() - 3 * 3600 * 1000);
  const since = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 3)).toISOString();
  const { count } = await supabase
    .from("places_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "search")
    .gte("created_at", since);
  return count ?? 0;
}

/** "Oportunidade": quanto menor a nota e menos avaliações, melhor alvo para a plaquinha. */
export function opportunity(p: Pick<GooglePlace, "rating" | "reviews">) {
  // Oportunidade = nota baixa OU poucas avaliações (o que for pior)
  const ratingGap = p.rating === null ? 1 : Math.min(1, Math.max(0, 4.7 - p.rating) / 1.4); // 4,7+ → 0 · 3,3 → 1
  const fewReviews = Math.max(0, 1 - Math.log10(p.reviews + 1) / Math.log10(200)); // 200+ → 0 · nenhuma → 1
  return Math.round(Math.max(ratingGap, fewReviews) * 100);
}

/** Atualiza nota/avaliações de um cliente e grava no histórico. Retorna o lugar atualizado. */
export async function refreshCustomerGoogle(
  supabase: SupabaseClient,
  customer: { id: string; google_place_id: string; google_baseline_at: string | null },
) {
  const place = await getPlace(customer.google_place_id);
  if (!place) return null;
  const now = new Date().toISOString();
  await supabase
    .from("customers")
    .update({
      google_name: place.name,
      google_address: place.address,
      google_maps_url: place.mapsUrl,
      google_phone: place.phone,
      google_rating: place.rating,
      google_reviews: place.reviews,
      google_checked_at: now,
      ...(customer.google_baseline_at
        ? {}
        : { google_baseline_rating: place.rating, google_baseline_reviews: place.reviews, google_baseline_at: now }),
    })
    .eq("id", customer.id);
  await supabase.from("customer_google_history").insert({ customer_id: customer.id, rating: place.rating, reviews: place.reviews, checked_at: now });
  return place;
}
