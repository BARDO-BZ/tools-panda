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
  } catch {
    return { error: "No pudimos mandar el link. Probá de nuevo en unos minutos." };
  }
}
