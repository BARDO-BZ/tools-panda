import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Comentario, Feedback } from "./tipos";

// Comentarios, aprobaciones y cierre de feedback.
// En producción viven en Supabase (proyecto propio de Panda, ver supabase/schema.sql).
// Sin variables de Supabase, en desarrollo se guardan en .data/feedback.json para poder
// probar el flujo completo sin base de datos. En producción sin variables, falla.

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const conSupabase = Boolean(URL_SB && KEY_SB);

function sb(ruta: string, init: RequestInit = {}) {
  return fetch(`${URL_SB}/rest/v1/${ruta}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: KEY_SB!,
      Authorization: `Bearer ${KEY_SB}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
}

async function ok(r: Response) {
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

/* ─────────────── almacenamiento local (solo desarrollo) ─────────────── */

type Local = Record<string, Feedback>;
const ARCHIVO = path.join(process.cwd(), ".data", "feedback.json");

async function leerLocal(): Promise<Local> {
  try {
    return JSON.parse(await readFile(ARCHIVO, "utf8"));
  } catch {
    return {};
  }
}
async function guardarLocal(d: Local) {
  await mkdir(path.dirname(ARCHIVO), { recursive: true });
  await writeFile(ARCHIVO, JSON.stringify(d, null, 2));
}
function vacio(): Feedback {
  return { comentarios: [], aprobaciones: [], cierre: null };
}
function sinBase() {
  if (process.env.NODE_ENV === "production") throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

/* ──────────────────────────── API ──────────────────────────── */

export async function leerFeedback(doc: string): Promise<Feedback> {
  if (!conSupabase) {
    sinBase();
    return (await leerLocal())[doc] ?? vacio();
  }
  const d = encodeURIComponent(doc);
  const [c, a, k] = await Promise.all([
    sb(`comentarios?doc=eq.${d}&order=creado.asc`).then(ok),
    sb(`aprobaciones?doc=eq.${d}`).then(ok),
    sb(`cierres?doc=eq.${d}`).then(ok),
  ]);
  return {
    comentarios: c,
    aprobaciones: a.map((x: { pieza: string; autor: string; fecha: string }) => ({ pieza: x.pieza, autor: x.autor, fecha: x.fecha })),
    cierre: k[0] ? { autor: k[0].autor, fecha: k[0].fecha } : null,
  };
}

export async function comentar(doc: string, pieza: string, autor: string, texto: string): Promise<Comentario> {
  const nuevo: Comentario = {
    id: crypto.randomUUID(),
    pieza,
    autor,
    texto,
    estado: "pendiente",
    creado: new Date().toISOString(),
    resuelto: null,
  };
  if (!conSupabase) {
    sinBase();
    const db = await leerLocal();
    const f = (db[doc] ??= vacio());
    f.comentarios.push(nuevo);
    // comentar una pieza aprobada la vuelve a revisión
    f.aprobaciones = f.aprobaciones.filter((a) => a.pieza !== pieza);
    await guardarLocal(db);
    return nuevo;
  }
  const [fila] = await sb("comentarios", { method: "POST", body: JSON.stringify({ ...nuevo, doc }) }).then(ok);
  await sb(`aprobaciones?doc=eq.${encodeURIComponent(doc)}&pieza=eq.${encodeURIComponent(pieza)}`, { method: "DELETE" }).then(ok);
  return fila;
}

export async function cambiarComentario(doc: string, id: string, estado: "pendiente" | "resuelto") {
  const resuelto = estado === "resuelto" ? new Date().toISOString() : null;
  if (!conSupabase) {
    sinBase();
    const db = await leerLocal();
    const c = db[doc]?.comentarios.find((x) => x.id === id);
    if (c) Object.assign(c, { estado, resuelto });
    await guardarLocal(db);
    return;
  }
  await sb(`comentarios?doc=eq.${encodeURIComponent(doc)}&id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado, resuelto }),
  }).then(ok);
}

export async function aprobar(doc: string, pieza: string, autor: string, aprobada: boolean) {
  const fecha = new Date().toISOString();
  if (!conSupabase) {
    sinBase();
    const db = await leerLocal();
    const f = (db[doc] ??= vacio());
    f.aprobaciones = f.aprobaciones.filter((a) => a.pieza !== pieza);
    if (aprobada) f.aprobaciones.push({ pieza, autor, fecha });
    await guardarLocal(db);
    return;
  }
  const filtro = `aprobaciones?doc=eq.${encodeURIComponent(doc)}&pieza=eq.${encodeURIComponent(pieza)}`;
  await sb(filtro, { method: "DELETE" }).then(ok);
  if (aprobada) await sb("aprobaciones", { method: "POST", body: JSON.stringify({ doc, pieza, autor, fecha }) }).then(ok);
}

export async function cerrarFeedback(doc: string, autor: string) {
  const fecha = new Date().toISOString();
  if (!conSupabase) {
    sinBase();
    const db = await leerLocal();
    (db[doc] ??= vacio()).cierre = { autor, fecha };
    await guardarLocal(db);
  } else {
    await sb("cierres", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ doc, autor, fecha }),
    }).then(ok);
  }
  // Aviso al equipo (fase 2: mail / ClickUp). Si hay un webhook configurado (n8n), se dispara.
  const hook = process.env.AVISO_WEBHOOK_URL;
  if (hook) {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: "feedback_cerrado", doc, autor, fecha }),
    }).catch(() => {});
  }
}
