import { createClient } from "@/lib/supabase/server";
import { plateUrl } from "@/lib/env";

/** CSV com código e link de cada plaquinha do lote, para gravar os chips NFC. */
export async function GET(_: Request, ctx: RouteContext<"/admin/lotes/[id]/csv">) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return new Response("Acesso negado", { status: 403 });

  const { data } = await supabase.from("plates").select("code, token").eq("batch_id", id).order("code");
  const rows = (data ?? []).map((p) => `${p.code},${plateUrl(p.token)}`);
  const csv = ["codigo,link", ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lote-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
