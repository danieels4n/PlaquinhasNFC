import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { hasPlacesKey, refreshCustomerGoogle, REFRESH_DAYS } from "@/lib/places";

/**
 * Atualiza a nota/avaliações dos clientes vinculados ao Google.
 * Chame 1x por dia (vercel.json já agenda). Só atualiza quem não foi checado há REFRESH_DAYS dias,
 * para caber nas 1.000 consultas grátis/mês. Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!hasPlacesKey() || !hasAdminKey()) return NextResponse.json({ error: "faltam chaves" }, { status: 503 });

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REFRESH_DAYS * 24 * 3600 * 1000).toISOString();
  const limit = Number(process.env.GOOGLE_REFRESH_MAX_PER_RUN || 100);
  const { data: due } = await admin
    .from("customers")
    .select("id, google_place_id, google_baseline_at")
    .not("google_place_id", "is", null)
    .eq("archived", false)
    .or(`google_checked_at.is.null,google_checked_at.lt.${cutoff}`)
    .order("google_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  let updated = 0;
  let failed = 0;
  for (const c of due ?? []) {
    const place = await refreshCustomerGoogle(admin, c as { id: string; google_place_id: string; google_baseline_at: string | null });
    if (place) updated++;
    else failed++;
  }
  return NextResponse.json({ checked: due?.length ?? 0, updated, failed });
}
