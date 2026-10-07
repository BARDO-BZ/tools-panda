#!/usr/bin/env node
// Arma los ZIP de ejemplo que se descargan desde /panda/subir.
//   npm run ejemplos   → ejemplos/<tipo>/ → public/ejemplos/<tipo>-ejemplo.zip
// Editar el ejemplo = editar ejemplos/<tipo>/ y volver a correr esto.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const ORIGEN = "ejemplos";
const DESTINO = "public/ejemplos";
await mkdir(DESTINO, { recursive: true });

async function agregar(zip, dir, prefijo = "") {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    if (f.name.startsWith(".")) continue;
    const ruta = path.join(dir, f.name);
    if (f.isDirectory()) await agregar(zip, ruta, `${prefijo}${f.name}/`);
    else zip.file(`${prefijo}${f.name}`, await readFile(ruta));
  }
}

for (const tipo of await readdir(ORIGEN, { withFileTypes: true })) {
  if (!tipo.isDirectory()) continue;
  const zip = new JSZip();
  await agregar(zip, path.join(ORIGEN, tipo.name));
  const salida = path.join(DESTINO, `${tipo.name}-ejemplo.zip`);
  await writeFile(salida, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`✓ ${salida}`);
}
