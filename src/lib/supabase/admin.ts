import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Cliente com a chave secreta (ignora as regras de segurança).
 * Usado só no servidor, para criar pedidos e confirmar pagamentos.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY não configurada no .env.local");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const hasAdminKey = () => Boolean(process.env.SUPABASE_SECRET_KEY);
