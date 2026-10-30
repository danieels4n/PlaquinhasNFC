export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PlacaLink";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Endereço público do app. É o que vai gravado no QR e no chip NFC. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function plateUrl(token: string) {
  return `${siteUrl()}/q/${token}`;
}
