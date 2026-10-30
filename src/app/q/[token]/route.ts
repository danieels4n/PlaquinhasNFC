import { NextResponse, type NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Endereço gravado no QR Code e no chip NFC: /q/ABCD2345
 * Conta a leitura e redireciona para o destino configurado.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/q/[token]">) {
  const { token } = await ctx.params;
  const go = (path: string) => noStore(NextResponse.redirect(new URL(path, request.url), 302));

  if (!isSupabaseConfigured || !/^[A-Za-z0-9]{8}$/.test(token)) return go("/p/nao-encontrada");

  const { data, error } = await createAnonClient().rpc("register_scan", { p_token: token.toUpperCase() });
  const row = (data as { status: string; destination_url: string | null }[] | null)?.[0];
  if (error || !row) return go("/p/nao-encontrada");

  switch (row.status) {
    case "unclaimed":
      return go(`/ativar?token=${encodeURIComponent(token.toUpperCase())}`);
    case "pending":
      return go("/p/aguardando");
    case "disabled":
      return go("/p/desativada");
  }

  const dest = row.destination_url ?? "";
  if (!/^https?:\/\//i.test(dest)) return go("/p/aguardando");
  return noStore(NextResponse.redirect(dest, 302));
}

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}
