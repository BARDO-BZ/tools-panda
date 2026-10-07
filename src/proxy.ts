import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refresca la sesión de Supabase en cada navegación (los tokens vencen y hay que reescribir
// las cookies, cosa que un Server Component no puede hacer). No decide permisos: eso lo hace
// lib/servidor/sesion.ts en cada página y endpoint.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, headers) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // todo menos assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|logos/|ejemplos/|.*\\.(?:svg|png|jpg|jpeg|webp|zip)$).*)"],
};
