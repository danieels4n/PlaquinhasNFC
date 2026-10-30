import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ONBOARDING_KEYS = ["welcome", "checklist_done", "checklist_hidden", "supplier_guide"] as const;
export type OnboardingKey = (typeof ONBOARDING_KEYS)[number];
export type Onboarding = Partial<Record<OnboardingKey, string>>; // chave → data em que foi vista

/**
 * Avisos que a pessoa já viu. Retorna null se a coluna ainda não existe no banco
 * (SQL 0004 não aplicado): aí não mostramos avisos que dependem de "já vi", para não repetir sem parar.
 */
export async function getOnboarding(supabase: SupabaseClient, userId: string): Promise<Onboarding | null> {
  const { data, error } = await supabase.from("profiles").select("onboarding").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return (data.onboarding ?? {}) as Onboarding;
}
