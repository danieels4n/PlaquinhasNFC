import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/** Cliente do navegador (usa a sessão dos cookies). Usado só para enviar fotos ao Storage. */
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
