#!/usr/bin/env node
// Tareas de administración (local o Supabase, según haya variables en .env.local).
//
//   npm run admin -- crear-usuario --mail vos@panda.bz --nombre "Lara" --rol panda
//   npm run admin -- crear-usuario --mail x@cliente.com --nombre "Matías" --carpeta sumatoria
//   npm run admin -- migrar migracion          (sube los documentos de migracion/clientes/…)
//
// crear-usuario sirve sobre todo para el PRIMER usuario del equipo: después se crean desde
// /panda/usuarios. En Supabase manda la invitación por mail; en local, se entra desde /entrar.
import { readFile, readdir, mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { validarDocumento } from "../src/lib/validar.ts";

const [cmd, ...resto] = process.argv.slice(2);
const flag = (n) => {
  const i = resto.indexOf(`--${n}`);
  return i >= 0 ? resto[i + 1] : undefined;
};

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = URL_SB && KEY_SB ? createClient(URL_SB, KEY_SB, { auth: { persistSession: false } }) : null;
const SITIO = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
console.log(sb ? `Supabase: ${URL_SB}` : "Modo local: .data/");

/* ── modo local: el mismo formato que src/lib/servidor/almacen-local.ts ── */
const LOCAL = path.join(".data", "local.json");
async function leerLocal() {
  try {
    return { clientes: [], perfiles: [], documentos: [], links: [], ...JSON.parse(await readFile(LOCAL, "utf8")) };
  } catch {
    return { clientes: [], perfiles: [], documentos: [], links: [] };
  }
}
async function escribirLocal(d) {
  await mkdir(".data", { recursive: true });
  await writeFile(LOCAL, JSON.stringify(d, null, 2));
}
const ok = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

async function asegurarCliente(slug, nombre) {
  if (sb) {
    const r = await sb.from("clientes").upsert({ slug, nombre }, { onConflict: "slug", ignoreDuplicates: true });
    ok(r);
  } else {
    const d = await leerLocal();
    if (!d.clientes.some((c) => c.slug === slug)) d.clientes.push({ slug, nombre });
    await escribirLocal(d);
  }
}

async function crearUsuario() {
  const email = flag("mail")?.toLowerCase();
  const nombre = flag("nombre");
  const rol = flag("rol") === "panda" ? "panda" : "cliente";
  const carpeta = flag("carpeta");
  if (!email || !nombre || (rol === "cliente" && !carpeta)) {
    console.error('Uso: crear-usuario --mail <mail> --nombre "<nombre>" [--rol panda] [--carpeta <slug>]');
    process.exit(1);
  }
  const clientes = rol === "panda" ? [] : [carpeta];
  if (sb) {
    const inv = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITIO}/auth/confirmar`, data: { nombre } });
    if (inv.error) throw new Error(inv.error.message);
    const id = inv.data.user.id;
    ok(await sb.from("perfiles").upsert({ id, email, nombre, rol }));
    for (const c of clientes) ok(await sb.from("accesos").upsert({ perfil: id, cliente: c }));
    console.log(`✓ ${nombre} <${email}> (${rol}). Le llegó la invitación por mail.`);
  } else {
    const d = await leerLocal();
    if (d.perfiles.some((p) => p.email === email)) return console.log(`Ya existe ${email}.`);
    d.perfiles.push({ id: crypto.randomUUID(), email, nombre, rol, clientes });
    await escribirLocal(d);
    console.log(`✓ ${nombre} <${email}> (${rol}). Entrá desde ${SITIO}/entrar con ese mail.`);
  }
}

// migracion/clientes/<cliente>/<slug>.json + migracion/clientes/<cliente>/<slug>/<placas>
async function migrar() {
  const raiz = path.join(resto[0] ?? "migracion", "clientes");
  for (const cliente of await readdir(raiz)) {
    const dir = path.join(raiz, cliente);
    for (const f of (await readdir(dir)).filter((x) => x.endsWith(".json"))) {
      const slugViejo = f.slice(0, -5);
      const contenido = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      const carpetaPlacas = path.join(dir, slugViejo);
      const placasDisp = new Set(await readdir(carpetaPlacas).catch(() => []));
      const v = validarDocumento(contenido, placasDisp);
      if (!v.doc) {
        console.log(`✗ ${cliente}/${slugViejo}:\n  - ${v.errores.join("\n  - ")}`);
        continue;
      }
      await asegurarCliente(cliente, contenido.cliente ?? cliente);
      const slug = `${contenido.tipo}-${v.fecha}`;
      const id = crypto.randomUUID();
      const base = `${cliente}/${id}/v1`;
      for (const p of v.placas) {
        if (sb) {
          const datos = await readFile(path.join(carpetaPlacas, p));
          ok(await sb.storage.from("documentos").upload(`${base}/${p}`, datos, { contentType: "image/webp", upsert: true }));
        } else {
          const destino = path.join(".data", "archivos", base, p);
          await mkdir(path.dirname(destino), { recursive: true });
          await copyFile(path.join(carpetaPlacas, p), destino);
        }
      }
      const ahora = new Date().toISOString();
      const fila = { id, cliente, slug, tipo: contenido.tipo, titulo: contenido.titulo, periodo: contenido.periodo, fecha: v.fecha, version: 1, actualizado: ahora };
      if (sb) {
        ok(await sb.from("documentos").upsert({ ...fila, periodo: fila.periodo ?? null, contenido, actualizado_por: "migración" }, { onConflict: "cliente,slug" }));
      } else {
        const d = await leerLocal();
        d.documentos = d.documentos.filter((x) => !(x.cliente === cliente && x.slug === slug));
        d.documentos.push({ ...fila, actualizadoPor: "migración", contenido });
        await escribirLocal(d);
      }
      console.log(`✓ ${cliente}/${slug} (${v.placas.length} placas)`);
    }
  }
}

if (cmd === "crear-usuario") await crearUsuario();
else if (cmd === "migrar") await migrar();
else {
  console.error("Comandos: crear-usuario, migrar");
  process.exit(1);
}
