import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/** Cliente com a sessão do usuário (lê/grava os cookies de login). */
export async function createClient() {
  // Dados do usuário são sempre lidos na hora (o cliente Supabase usa o relógio internamente).
  await connection();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado durante a renderização: o proxy cuida de renovar a sessão.
        }
      },
    },
  });
}

/** Cliente anônimo, sem cookies. Usado no redirecionamento público /q/[token]. */
export function createAnonClient() {
  return createPlainClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
