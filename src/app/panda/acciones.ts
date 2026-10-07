"use server";

import { revalidatePath } from "next/cache";
import { almacen, RESERVADOS, SLUG_CLIENTE, slugCliente } from "@/lib/servidor/almacen";
import { origen, sesion } from "@/lib/servidor/sesion";
import type { Rol } from "@/lib/tipos";

// Acciones del panel del equipo. Las server actions se pueden llamar con un POST directo,
// así que cada una verifica por su cuenta que quien la llama sea del equipo Panda.

export type EstadoForm = { ok?: string; error?: string };

async function soloPanda() {
  const p = await sesion();
  if (!p || p.rol !== "panda") throw new Error("No autorizado");
  return p;
}

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function crearCliente(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  await soloPanda();
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 80);
  const slug = slugCliente(String(form.get("slug") || nombre));
  if (!nombre) return { error: "Poné el nombre del cliente." };
  if (!SLUG_CLIENTE.test(slug) || RESERVADOS.has(slug)) return { error: "Ese nombre de carpeta no se puede usar. Probá con otro." };
  try {
    await almacen().crearCliente({ slug, nombre });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/panda");
  return { ok: `Carpeta "${nombre}" creada (/${slug}).` };
}

export async function crearUsuario(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  await soloPanda();
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rol: Rol = form.get("rol") === "panda" ? "panda" : "cliente";
  const clientes = form.getAll("clientes").map(String).filter(Boolean);
  if (!nombre) return { error: "Poné el nombre." };
  if (!MAIL.test(email)) return { error: "Revisá el mail." };
  if (rol === "cliente" && !clientes.length) return { error: "Asignale al menos una carpeta." };

  const db = almacen();
  const existentes = new Set((await db.listarClientes()).map((c) => c.slug));
  if (clientes.some((c) => !existentes.has(c))) return { error: "Una de las carpetas no existe." };
  try {
    await db.crearUsuario({ nombre, email, rol, clientes: rol === "panda" ? [] : clientes }, `${await origen()}/auth/confirmar`);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/panda/usuarios");
  return {
    ok:
      db.modo === "supabase"
        ? `Listo: le mandamos la invitación a ${email}.`
        : `Usuario creado. En modo local no se mandan mails: entra desde /entrar con ${email}.`,
  };
}

export async function actualizarCarpetas(form: FormData) {
  const yo = await soloPanda();
  const id = String(form.get("id") ?? "");
  const clientes = form.getAll("clientes").map(String).filter(Boolean);
  const db = almacen();
  const u = await db.perfil(id);
  if (!u || u.id === yo.id) return;
  const existentes = new Set((await db.listarClientes()).map((c) => c.slug));
  await db.actualizarUsuario(id, { clientes: clientes.filter((c) => existentes.has(c)) });
  revalidatePath("/panda/usuarios");
}

export async function borrarUsuario(form: FormData) {
  const yo = await soloPanda();
  const id = String(form.get("id") ?? "");
  // nadie se borra a sí mismo (así siempre queda al menos un usuario del equipo)
  if (!id || id === yo.id) return;
  await almacen().borrarUsuario(id);
  revalidatePath("/panda/usuarios");
}
