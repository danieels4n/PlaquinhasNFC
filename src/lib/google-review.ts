import "server-only";

/**
 * Gera o link "escrever avaliação" do Google a partir de um link do Maps.
 *
 * Sem chave de API, funciona quando o link já traz o Place ID (ChIJ…) ou é um link g.page/r/….
 * Com GOOGLE_PLACES_API_KEY, também resolve links comuns do Maps (busca a empresa pelo nome).
 */

export type PlaceResult = { placeId: string; name: string; address: string };
export type ReviewLinkResult = { url: string; place?: PlaceResult } | { error: string };

const PLACE_ID = /(ChIJ[A-Za-z0-9_-]{10,})/;
const ALLOWED_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|app\.goo\.gl|g\.co|g\.page)$/i;

export function reviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export const hasPlacesKey = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

export async function buildReviewLink(input: string): Promise<ReviewLinkResult> {
  const text = input.trim();
  if (!text) return { error: "Cole o link da empresa no Google Maps." };

  const direct = text.match(PLACE_ID);
  if (direct) return { url: reviewUrl(direct[1]) };

  let url: URL;
  try {
    url = new URL(text.match(/https?:\/\/\S+/)?.[0] ?? text);
  } catch {
    return { error: "Não reconhecemos esse link. Copie o link de compartilhamento da empresa no Google Maps." };
  }
  if (!ALLOWED_HOSTS.test(url.hostname)) return { error: "O link precisa ser do Google Maps." };

  // g.page/r/<id> já é um link de avaliação pronto
  if (url.hostname.endsWith("g.page") && url.pathname.startsWith("/r/")) {
    const id = url.pathname.split("/")[2];
    return { url: `https://g.page/r/${id}/review` };
  }

  // Links curtos (maps.app.goo.gl) — segue o redirecionamento para achar o link completo
  const expanded = await expand(url);
  const fromExpanded = expanded.href.match(PLACE_ID) ?? decodeURIComponent(expanded.href).match(PLACE_ID);
  if (fromExpanded) return { url: reviewUrl(fromExpanded[1]) };

  if (!hasPlacesKey()) {
    return {
      error:
        "Este link não traz o identificador da empresa. Configure GOOGLE_PLACES_API_KEY para buscar automaticamente, ou use a busca por nome.",
    };
  }

  const name = placeNameFrom(expanded);
  if (!name) return { error: "Não conseguimos identificar a empresa nesse link. Use a busca por nome." };
  const [first] = await searchPlaces(name, coordsFrom(expanded));
  if (!first) return { error: "Empresa não encontrada. Tente a busca por nome." };
  return { url: reviewUrl(first.placeId), place: first };
}

/** Descobre o Place ID a partir de um link do Google Maps (para vincular um cliente). */
export async function resolvePlaceId(input: string): Promise<{ placeId: string } | { error: string }> {
  const text = input.trim();
  const direct = text.match(PLACE_ID);
  if (direct) return { placeId: direct[1] };

  let url: URL;
  try {
    url = new URL(text.match(/https?:\/\/\S+/)?.[0] ?? text);
  } catch {
    return { error: "Link inválido." };
  }
  if (!ALLOWED_HOSTS.test(url.hostname)) return { error: "O link precisa ser do Google Maps." };

  const expanded = await expand(url);
  const found = expanded.href.match(PLACE_ID) ?? decodeURIComponent(expanded.href).match(PLACE_ID);
  if (found) return { placeId: found[1] };

  const name = placeNameFrom(expanded);
  if (!name || !hasPlacesKey()) return { error: "Não conseguimos identificar a empresa por esse link. Busque pelo nome." };
  const [first] = await searchPlaces(name, coordsFrom(expanded));
  return first ? { placeId: first.placeId } : { error: "Empresa não encontrada. Busque pelo nome." };
}

async function expand(url: URL): Promise<URL> {
  let current = url;
  for (let i = 0; i < 5; i++) {
    if (!/goo\.gl$|g\.co$/.test(current.hostname)) break;
    try {
      const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const location = res.headers.get("location");
      if (!location) break;
      const next = new URL(location, current);
      if (!ALLOWED_HOSTS.test(next.hostname)) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function placeNameFrom(url: URL) {
  const match = url.pathname.match(/\/place\/([^/]+)/);
  if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  return url.searchParams.get("q") ?? url.searchParams.get("query");
}

function coordsFrom(url: URL) {
  const m = url.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : undefined;
}

/** Busca empresas pelo nome na Places API (New). */
export async function searchPlaces(query: string, near?: { lat: number; lng: number }): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const body: Record<string, unknown> = { textQuery: query, languageCode: "pt-BR", regionCode: "BR", pageSize: 5 };
  if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 2000 } };

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    places?: { id: string; displayName?: { text: string }; formattedAddress?: string }[];
  };
  return (json.places ?? []).map((p) => ({ placeId: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "" }));
}
