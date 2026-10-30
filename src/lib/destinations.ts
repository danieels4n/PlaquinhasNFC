import type { DestinationType } from "@/lib/types";

/**
 * Transforma o que o usuário digitou numa URL https válida.
 * Aceita atalhos: número de WhatsApp, @usuario do Instagram, domínio sem https.
 */
export function normalizeDestination(type: DestinationType, raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (type === "whatsapp" && /^[\d\s()+-]+$/.test(value)) {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = "55" + digits; // número brasileiro sem DDI
    if (digits.length < 10) return null;
    return `https://wa.me/${digits}`;
  }

  if (type === "instagram" && /^@?[\w.]{1,30}$/.test(value)) {
    return `https://instagram.com/${value.replace(/^@/, "")}`;
  }

  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const DESTINATION_HINT: Record<DestinationType, string> = {
  google_review: "Link de avaliação do Google (use o gerador de link).",
  whatsapp: "Número com DDD (ex.: 11 91234-5678) ou link wa.me.",
  instagram: "@perfil ou link do Instagram.",
  website: "Endereço do site.",
  menu: "Link do cardápio digital.",
  other: "Qualquer link https.",
};
