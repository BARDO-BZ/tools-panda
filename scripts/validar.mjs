#!/usr/bin/env node
// Revisa un documento antes de subirlo, con el mismo validador que usa la web.
//
//   npm run validar -- planificacion-octubre.zip     → un ZIP listo para soltar en /panda/subir
//   npm run validar -- carpeta/                      → una carpeta con contenido.json + placas
//   npm run validar -- ejemplos                      → los ZIP de ejemplo (public/ejemplos)
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { EXT_IMAGEN, validarDocumento } from "../src/lib/validar.ts";

async function deZip(archivo) {
  const zip = await JSZip.loadAsync(await readFile(archivo));
  const entradas = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith("__MACOSX/"));
  const json = entradas.find((f) => /(^|\/)contenido\.json$/i.test(f.name));
  if (!json) throw new Error("no tiene contenido.json");
  const imagenes = new Set(entradas.map((f) => f.name.split("/").pop()).filter((n) => EXT_IMAGEN.test(n)));
  return { crudo: JSON.parse(await json.async("string")), imagenes };
}

async function deCarpeta(dir) {
  const crudo = JSON.parse(await readFile(path.join(dir, "contenido.json"), "utf8"));
  const imagenes = new Set();
  async function recorrer(d) {
    for (const f of await readdir(d, { withFileTypes: true })) {
      if (f.isDirectory()) await recorrer(path.join(d, f.name));
      else if (EXT_IMAGEN.test(f.name)) imagenes.add(f.name);
    }
  }
  await recorrer(dir);
  return { crudo, imagenes };
}

let objetivos = process.argv.slice(2);
if (!objetivos.length || objetivos[0] === "ejemplos") {
  const dir = "public/ejemplos";
  objetivos = (await readdir(dir)).filter((f) => f.endsWith(".zip")).map((f) => path.join(dir, f));
}

let conErrores = 0;
for (const o of objetivos) {
  try {
    const { crudo, imagenes } = (await stat(o)).isDirectory() ? await deCarpeta(o) : await deZip(o);
    const r = validarDocumento(crudo, imagenes);
    console.log(`\n${o}  →  ${r.errores.length ? "✗" : "✓"} ${crudo.tipo ?? "?"} · ${crudo.titulo ?? "sin título"} · ${r.fecha ?? "sin fecha"} · ${r.placas.length} placas`);
    r.errores.forEach((e) => console.log(`  ✗ ${e}`));
    r.avisos.forEach((a) => console.log(`  · ${a}`));
    if (r.errores.length) conErrores++;
  } catch (e) {
    console.log(`\n${o}  →  ✗ ${e.message}`);
    conErrores++;
  }
}
process.exit(conErrores ? 1 : 0);
