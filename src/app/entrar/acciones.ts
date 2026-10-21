"use server";

import { enviarLink } from "@/lib/servidor/sesion";

export type EstadoEntrar = { enviado?: string; linkLocal?: string; error?: string };

export async function pedirLink(_prev: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisá el mail." };
  try {
    const r = await enviarLink(email);
    // misma respuesta exista o no el usuario: no revela quién tiene cuenta
    return { enviado: email, linkLocal: r.linkLocal };
  } catch (e) {
    // el mail de fábrica de Supabase manda muy pocos por hora (hasta configurar SMTP propio)
    if (/rate limit/i.test((e as Error).message))
      return { error: "Se mandaron demasiados links en la última hora. Esperá un rato y probá de nuevo." };
    return { error: "No pudimos mandar el link. Probá de nuevo en unos minutos." };
  }
}
