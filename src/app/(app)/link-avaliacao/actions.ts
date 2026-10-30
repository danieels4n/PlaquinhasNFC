"use server";

import { requireUser } from "@/lib/auth";
import { buildReviewLink, reviewUrl, searchPlaces, type PlaceResult } from "@/lib/google-review";

export type ReviewState = {
  error?: string;
  url?: string;
  place?: PlaceResult;
  results?: { name: string; address: string; url: string }[];
} | null;

export async function generateFromLink(_: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireUser();
  const result = await buildReviewLink(String(formData.get("link") ?? ""));
  return "error" in result ? { error: result.error } : result;
}

export async function searchBusiness(_: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireUser();
  const query = String(formData.get("query") ?? "").trim();
  if (query.length < 3) return { error: "Digite o nome da empresa e a cidade." };
  if (!process.env.GOOGLE_PLACES_API_KEY) return { error: "A busca por nome precisa da chave GOOGLE_PLACES_API_KEY." };

  const places = await searchPlaces(query);
  if (!places.length) return { error: "Nenhuma empresa encontrada." };
  return { results: places.map((p) => ({ name: p.name, address: p.address, url: reviewUrl(p.placeId) })) };
}
