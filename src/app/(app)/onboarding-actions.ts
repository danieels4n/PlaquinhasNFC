"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_KEYS, getOnboarding, type OnboardingKey } from "@/lib/onboarding";

/** Marca um aviso de orientação como visto pela pessoa logada. */
export async function markOnboarding(key: OnboardingKey) {
  const user = await requireUser();
  if (!ONBOARDING_KEYS.includes(key)) return { error: "Aviso inválido." };
  const supabase = await createClient();
  const current = await getOnboarding(supabase, user.id);
  if (current === null) return { error: "indisponível" };
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding: { ...current, [key]: new Date().toISOString() } })
    .eq("id", user.id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
