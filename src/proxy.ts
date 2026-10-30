import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/cadastro", "/esqueci-senha", "/auth", "/q/", "/p/", "/configurar", "/termos", "/privacidade", "/api/webhooks/", "/api/cron/"];

/** Renova a sessão do Supabase e manda quem não está logado para o login. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isSupabaseConfigured) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/configurar", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (loggedIn && (pathname === "/login" || pathname === "/cadastro")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
