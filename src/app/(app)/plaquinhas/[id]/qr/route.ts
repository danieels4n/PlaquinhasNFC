import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { plateUrl } from "@/lib/env";

/** PNG do QR da plaquinha, gerado só quando alguém toca em "Baixar QR". Só o dono acessa. */
export async function GET(_: Request, ctx: RouteContext<"/plaquinhas/[id]/qr">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return new Response("Faça login", { status: 401 });

  const { data: plate } = await supabase.from("plates").select("code, token").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (!plate) return new Response("Plaquinha não encontrada", { status: 404 });

  const png = await QRCode.toBuffer(plateUrl(plate.token), { width: 1024, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${plate.code}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
