import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Onboarding } from "@/lib/onboarding";

export type Role = "user" | "supplier" | "admin";
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isAdmin: boolean;
  isSupplier: boolean;
  isStaff: boolean;
  /** Avisos de orientação já vistos; null se a coluna ainda não existe no banco. */
  onboarding: Onboarding | null;
};

/**
 * Usuário logado + perfil. Redireciona para o login se não houver sessão.
 * getClaims() confere a assinatura do token localmente (chaves ES256 do projeto), sem ida ao
 * servidor de autenticação; só o perfil é buscado no banco (uma consulta, cacheada por requisição).
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const id = claims.sub as string;
  const email = (claims.email as string | undefined) ?? "";

  let { data: profile, error } = await supabase
    .from("profiles")
    .select("name, role, onboarding")
    .eq("id", id)
    .maybeSingle();
  let onboardingAvailable = true;
  if (error) {
    // Coluna "onboarding" ainda não criada (SQL 0004 pendente): busca só o essencial
    onboardingAvailable = false;
    ({ data: profile } = await supabase.from("profiles").select("name, role").eq("id", id).maybeSingle());
  }

  const role = ((profile?.role as Role | undefined) ?? "user") as Role;
  return {
    id,
    email,
    name: (profile?.name as string | undefined) || email.split("@")[0] || "",
    role,
    isAdmin: role === "admin",
    isSupplier: role === "supplier",
    isStaff: role === "admin" || role === "supplier",
    onboarding: onboardingAvailable ? (((profile as { onboarding?: Onboarding } | null)?.onboarding ?? {}) as Onboarding) : null,
  };
});

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** Admin ou fornecedor. */
export async function requireStaff() {
  const user = await requireUser();
  if (!user.isStaff) redirect("/");
  return user;
}
