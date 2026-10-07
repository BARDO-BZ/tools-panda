import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Perfil } from "@/lib/tipos";
import { urlSitio } from "@/lib/sitio";
import { almacen, conSupabase } from "./almacen";
import { almacenLocal } from "./almacen-local";

// Capa de acceso: quién está logueado y qué puede ver. Toda página, route handler y server
// action verifica acá; el proxy solo refresca la sesión de Supabase.
//
// Login: link mágico por mail (Supabase Auth). En modo local no se mandan mails: el link se
// muestra en pantalla y la sesión es una cookie con el id del perfil (solo desarrollo).

const COOKIE_LOCAL = "panda_local";

/** cliente de Supabase con la sesión del usuario (cookies) */
export async function supabaseSesion() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        // en Server Components no se pueden escribir cookies: el proxy se encarga de refrescarlas
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {}
      },
    },
  });
}

/** el perfil logueado, o null. Memoizado por request. */
export const sesion = cache(async (): Promise<Perfil | null> => {
  if (conSupabase) {
    const sb = await supabaseSesion();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    return almacen().perfil(data.user.id);
  }
  const id = (await cookies()).get(COOKIE_LOCAL)?.value;
  return id ? almacen().perfil(id) : null;
});

export async function requerirSesion() {
  const p = await sesion();
  if (!p) redirect("/entrar");
  return p;
}

/** solo equipo Panda. A un cliente le responde 404, no "prohibido": no confirma que la ruta existe */
export async function requerirPanda() {
  const p = await requerirSesion();
  if (p.rol !== "panda") notFound();
  return p;
}

export function puedeVer(p: Perfil, cliente: string) {
  return p.rol === "panda" || p.clientes.includes(cliente);
}

/** para route handlers: el perfil si puede ver la carpeta, o null */
export async function accesoA(cliente: string) {
  const p = await sesion();
  return p && puedeVer(p, cliente) ? p : null;
}

/** URL base del sitio (para los links de los mails) */
export async function origen() {
  const fija = urlSitio();
  if (fija) return fija;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Manda el link de acceso. Solo a usuarios que existen (no hay registro abierto).
 * Siempre responde igual exista o no el mail, para no revelar quién tiene cuenta.
 * En modo local devuelve el link para mostrarlo en pantalla.
 */
export async function enviarLink(email: string): Promise<{ linkLocal?: string }> {
  const perfil = await almacen().perfilPorEmail(email);
  if (!perfil) return {};
  const base = await origen();
  if (conSupabase) {
    // flujo "implicit": el link sirve aunque se abra en otro dispositivo o navegador (el celular).
    // Con la plantilla de fábrica vuelve con la sesión en el #fragmento → /auth/entrando la toma.
    // Con la plantilla con {{ .TokenHash }} (requiere SMTP propio) vuelve con ?token_hash.
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const r = await sb.auth.signInWithOtp({ email: perfil.email, options: { shouldCreateUser: false, emailRedirectTo: `${base}/auth/confirmar` } });
    if (r.error) throw new Error(r.error.message);
    return {};
  }
  const token = await almacenLocal().crearLink(perfil.id);
  return { linkLocal: `${base}/auth/confirmar?local=${token}` };
}

/** modo local: canjea el token del link por la cookie de sesión */
export async function entrarLocal(token: string) {
  if (conSupabase || process.env.NODE_ENV === "production") return false;
  const id = await almacenLocal().usarLink(token);
  if (!id) return false;
  (await cookies()).set(COOKIE_LOCAL, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return true;
}

export async function cerrarSesion() {
  if (conSupabase) await (await supabaseSesion()).auth.signOut();
  (await cookies()).delete(COOKIE_LOCAL);
}
