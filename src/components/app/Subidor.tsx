"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import type { Cliente, Documento } from "@/lib/tipos";
import { EXT_IMAGEN, validarDocumento, type Resultado } from "@/lib/validar";
import s from "./app.module.css";

// Subida de un documento con drag & drop de un ZIP (contenido.json + placas).
// Todo el trabajo pesado pasa en el navegador: abrir el ZIP, validar, pasar las placas a webp
// y subirlas directo al almacenamiento. Al servidor solo van el JSON y la confirmación, así no
// chocamos con el límite de tamaño de las funciones de Vercel.

type Placa = { nombre: string; blob: Blob };
type Preparado = { contenido: Documento; placas: Placa[]; resultado: Resultado; archivo: string };
type Destino = { nombre: string; destino: { tipo: "local"; url: string } | { tipo: "supabase"; ruta: string; token: string } };

const ANCHO = 1080;
const NOMBRE_TIPO: Record<string, string> = { estrategia: "Estrategia", planificacion: "Planificación", reporte: "Reporte" };
const PESO_OK = 600 * 1024;

/** pasa una imagen a webp de 1080 de ancho (si ya es un webp liviano, la deja como está) */
async function aWebp(blob: Blob, nombre: string): Promise<Blob> {
  if (/\.webp$/i.test(nombre) && blob.size <= PESO_OK) return blob;
  const bmp = await createImageBitmap(blob);
  const escala = Math.min(1, ANCHO / bmp.width);
  const canvas = new OffscreenCanvas(Math.round(bmp.width * escala), Math.round(bmp.height * escala));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
}

const nombreWebp = (n: string) => n.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]/g, "-") + ".webp";

async function leerZip(archivo: File): Promise<Preparado> {
  const zip = await JSZip.loadAsync(archivo);
  const entradas = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith("__MACOSX/") && !/(^|\/)\./.test(f.name));
  const jsons = entradas.filter((f) => f.name.toLowerCase().endsWith(".json"));
  const json = jsons.find((f) => /(^|\/)contenido\.json$/i.test(f.name)) ?? (jsons.length === 1 ? jsons[0] : null);
  if (!json) throw new Error(jsons.length ? "Hay varios .json en el ZIP: el principal tiene que llamarse contenido.json." : "El ZIP no tiene contenido.json.");

  let crudo: unknown;
  try {
    crudo = JSON.parse(await json.async("string"));
  } catch (e) {
    throw new Error(`contenido.json no es un JSON válido: ${(e as Error).message}`);
  }

  // las placas se buscan por nombre de archivo, estén en la carpeta que estén dentro del ZIP
  const imagenes = new Map<string, JSZip.JSZipObject>();
  for (const f of entradas) {
    const base = f.name.split("/").pop()!;
    if (EXT_IMAGEN.test(base)) imagenes.set(base, f);
  }
  const resultado = validarDocumento(crudo, new Set(imagenes.keys()));
  if (!resultado.doc) return { contenido: crudo as Documento, placas: [], resultado, archivo: archivo.name };

  // pasar a webp y reescribir los nombres en el contenido
  const contenido = structuredClone(resultado.doc);
  const renombres = new Map<string, string>();
  const placas: Placa[] = [];
  for (const nombre of new Set(resultado.placas)) {
    const nuevo = nombreWebp(nombre);
    if ([...renombres.values()].includes(nuevo)) {
      resultado.errores.push(`"${nombre}" choca con otra placa del mismo nombre y distinta extensión.`);
      continue;
    }
    renombres.set(nombre, nuevo);
    placas.push({ nombre: nuevo, blob: await aWebp(await imagenes.get(nombre)!.async("blob"), nombre) });
  }
  if (contenido.tipo === "planificacion")
    for (const p of [...contenido.publicaciones, ...contenido.stories]) p.placas = p.placas.map((f) => renombres.get(f) ?? f);
  return { contenido, placas, resultado, archivo: archivo.name };
}

async function subirTodas(destinos: Destino[], placas: Placa[], progreso: (n: number) => void) {
  const porNombre = new Map(placas.map((p) => [p.nombre, p.blob]));
  const sb = destinos.some((d) => d.destino.tipo === "supabase")
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    : null;
  let hechas = 0;
  const cola = [...destinos];
  async function trabajador() {
    for (let d = cola.shift(); d; d = cola.shift()) {
      const blob = porNombre.get(d.nombre)!;
      if (d.destino.tipo === "local") {
        const r = await fetch(d.destino.url, { method: "PUT", body: blob, headers: { "Content-Type": "image/webp" } });
        if (!r.ok) throw new Error(`No se pudo subir ${d.nombre}.`);
      } else {
        const r = await sb!.storage.from("documentos").uploadToSignedUrl(d.destino.ruta, d.destino.token, blob, { contentType: "image/webp" });
        if (r.error) throw new Error(`No se pudo subir ${d.nombre}: ${r.error.message}`);
      }
      progreso(++hechas);
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador()]);
}

async function api(cuerpo: Record<string, unknown>) {
  const r = await fetch("/api/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error ?? "Algo falló."), { errores: d.errores as string[] | undefined });
  return d;
}

export default function Subidor({
  clientes,
  clienteInicial,
  editar,
}: {
  clientes: Cliente[];
  clienteInicial?: string;
  editar?: { slug: string; titulo: string; tipo: string };
}) {
  const [cliente, setCliente] = useState(clienteInicial ?? "");
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [prep, setPrep] = useState<Preparado | null>(null);
  const [fallo, setFallo] = useState<{ mensaje: string; errores?: string[] } | null>(null);
  const [subiendo, setSubiendo] = useState<{ hechas: number; total: number } | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function tomar(archivo: File | undefined) {
    if (!archivo) return;
    setFallo(null);
    setPrep(null);
    setListo(null);
    if (!/\.zip$/i.test(archivo.name)) {
      setFallo({ mensaje: "Tiene que ser un .zip con contenido.json y las placas. Descargá el ejemplo para ver cómo armarlo." });
      return;
    }
    setLeyendo(true);
    try {
      setPrep(await leerZip(archivo));
    } catch (e) {
      setFallo({ mensaje: (e as Error).message });
    } finally {
      setLeyendo(false);
    }
  }

  async function publicar() {
    if (!prep || !cliente) return;
    setFallo(null);
    try {
      const base = { cliente, doc: editar?.slug, contenido: prep.contenido };
      const r = await api({ ...base, accion: "preparar", archivos: prep.placas.map((p) => p.nombre) });
      setSubiendo({ hechas: 0, total: r.destinos.length });
      await subirTodas(r.destinos, prep.placas, (hechas) => setSubiendo({ hechas, total: r.destinos.length }));
      const c = await api({ ...base, accion: "confirmar", id: r.id, slug: r.slug, version: r.version });
      setListo(c.url);
      setPrep(null);
    } catch (e) {
      setFallo({ mensaje: (e as Error).message, errores: (e as { errores?: string[] }).errores });
    } finally {
      setSubiendo(null);
    }
  }

  const res = prep?.resultado;
  const ok = res && res.errores.length === 0;
  const c = prep?.contenido;
  const nPlacas = prep?.placas.length ?? 0;

  return (
    <div className={s.subidor}>
      {!editar && (
        <label className={s.campoGrupo}>
          <span className="rotulo">Carpeta</span>
          <select className={s.campo} value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Elegí un cliente…</option>
            {clientes.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <div
        className={s.zona}
        data-activa={arrastrando}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          tomar(e.dataTransfer.files[0]);
        }}
      >
        <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={(e) => tomar(e.target.files?.[0] ?? undefined)} />
        <p className={s.zonaTitulo}>{leyendo ? "Leyendo el ZIP…" : prep ? prep.archivo : "Soltá acá el ZIP"}</p>
        <p className={s.suave}>{prep ? "Soltá otro para reemplazarlo" : "o hacé click para elegirlo · contenido.json + placas"}</p>
      </div>

      {fallo && (
        <div className={s.errores}>
          <p>
            <b>{fallo.mensaje}</b>
          </p>
          {fallo.errores && (
            <ul>
              {fallo.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {res && c && (
        <div className={s.revision}>
          <dl className={s.resumen}>
            <dt className="rotulo">Tipo</dt>
            <dd>{NOMBRE_TIPO[c.tipo] ?? String(c.tipo ?? "—")}</dd>
            <dt className="rotulo">Título</dt>
            <dd>{c.titulo ?? "—"}</dd>
            <dt className="rotulo">Período</dt>
            <dd>{c.periodo ?? "—"}</dd>
            <dt className="rotulo">Fecha</dt>
            <dd>{res.fecha ?? "—"}</dd>
            {c.tipo === "planificacion" && (
              <>
                <dt className="rotulo">Piezas</dt>
                <dd>
                  {c.publicaciones?.length ?? 0} publicaciones · {c.stories?.length ?? 0} stories · {nPlacas} placas
                </dd>
              </>
            )}
            {(c.tipo === "estrategia" || c.tipo === "reporte") && (
              <>
                <dt className="rotulo">Placas</dt>
                <dd>{c.bloques?.length ?? 0} bloques</dd>
              </>
            )}
          </dl>

          {res.errores.length > 0 && (
            <div className={s.errores}>
              <p>
                <b>Hay que corregir esto antes de subir:</b>
              </p>
              <ul>
                {res.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {res.avisos.length > 0 && (
            <div className={s.avisos}>
              <p>
                <b>Para revisar (no impide subir):</b>
              </p>
              <ul>
                {res.avisos.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={s.acciones}>
            <button className="btn" disabled={!ok || !cliente || Boolean(subiendo)} onClick={publicar}>
              {subiendo ? `Subiendo ${subiendo.hechas}/${subiendo.total}…` : editar ? "Guardar cambios" : "Publicar"}
            </button>
            {!cliente && <span className={s.suave}>Elegí la carpeta.</span>}
          </div>
          {subiendo && subiendo.total > 0 && (
            <div className={s.progreso}>
              <span style={{ width: `${(subiendo.hechas / subiendo.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {listo && (
        <div className={s.exito}>
          <p>
            <b>{editar ? "Listo, quedó actualizado." : "Listo, quedó publicado."}</b>
          </p>
          <div className={s.acciones}>
            <a href={listo} className="btn">
              Ver documento
            </a>
            <a href={`/${cliente}`} className="btn ghost">
              Ir a la carpeta
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
