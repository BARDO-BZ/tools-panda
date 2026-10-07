// Validación del contenido de un documento. Es código puro (sin imports de Next ni de Node):
// lo usan el navegador al soltar el ZIP, el servidor antes de guardar y `npm run validar`.
// Sin alias "@/": Node lo importa directo desde scripts/ (type stripping).
import type { Documento, TipoDocumento } from "./tipos.ts";

export const TIPOS: TipoDocumento[] = ["estrategia", "planificacion", "reporte"];

export const BLOQUES = new Set([
  "portada", "semestre-anterior", "columnas", "metricas", "desafio", "territorios",
  "seccion", "lista", "comparacion", "grilla", "tabla", "cita", "cierre",
]);
const FORMATOS = new Set(["carrusel", "posteo", "reel", "story"]);
export const EXT_IMAGEN = /\.(webp|png|jpe?g)$/i;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export type Resultado = {
  errores: string[];
  avisos: string[];
  /** el documento, si no hay errores */
  doc: Documento | null;
  /** yyyy-mm para el index */
  fecha: string | null;
  /** nombres de archivo de todas las placas referenciadas */
  placas: string[];
};

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown) => typeof v === "string" && v.trim().length > 0;

/**
 * @param crudo  el JSON ya parseado
 * @param archivos  nombres de archivo disponibles junto al JSON (para chequear las placas).
 *                  Pasar null para no chequearlos.
 */
export function validarDocumento(crudo: unknown, archivos: Set<string> | null): Resultado {
  const errores: string[] = [];
  const avisos: string[] = [];
  const placas: string[] = [];
  const r = (): Resultado => ({ errores, avisos, placas, doc: errores.length ? null : (crudo as Documento), fecha: errores.length ? null : fecha });
  let fecha: string | null = null;

  if (!esObj(crudo)) {
    errores.push("El archivo no tiene un objeto JSON en la raíz.");
    return r();
  }
  const d = crudo;
  if (!TIPOS.includes(d.tipo as TipoDocumento)) errores.push(`"tipo" tiene que ser ${TIPOS.map((t) => `"${t}"`).join(", ")}.`);
  if (!texto(d.titulo)) errores.push('Falta "titulo".');
  // "cliente" es opcional: al subir se usa siempre el nombre de la carpeta
  if (!texto(d.periodo)) avisos.push('Falta "periodo" (ej. "2° semestre 2026").');
  if (d.tema) avisos.push('"tema" ya no se usa: todo sale con la paleta de Panda.');

  // planificaciones: ordena el "mes"; el resto: "fecha"
  const campo = d.tipo === "planificacion" && d.fecha === undefined ? "mes" : "fecha";
  fecha = typeof d[campo] === "string" ? (d[campo] as string) : null;
  if (!fecha || !MES.test(fecha)) {
    errores.push(
      fecha
        ? `"${campo}" tiene que ser año-mes válido, como "2026-10" (dice "${fecha}").`
        : `Falta "${campo}" con el año y mes del documento, como "2026-10" (ordena la carpeta del cliente).`,
    );
    fecha = null;
  }

  if (d.tipo === "estrategia" || d.tipo === "reporte") {
    const bloques = d.bloques;
    if (!Array.isArray(bloques) || !bloques.length) errores.push('No tiene "bloques".');
    else {
      bloques.forEach((b, i) => {
        if (!esObj(b) || !BLOQUES.has(b.tipo as string)) {
          errores.push(`Bloque ${i + 1}: tipo desconocido "${esObj(b) ? String(b.tipo) : "?"}".`);
          return;
        }
        const t = JSON.stringify(b);
        if (/\{\{|TODO|XXX|lorem/i.test(t)) errores.push(`Bloque ${i + 1} (${b.tipo}): quedó un texto de relleno.`);
        if (/bardo/i.test(t)) avisos.push(`Bloque ${i + 1} (${b.tipo}): menciona "Bardo". ¿Es correcto en un documento de Panda?`);
        if (/–/.test(t) && /bajada|periodo|frase/.test(t)) avisos.push(`Bloque ${i + 1} (${b.tipo}): el guion largo (–) no existe en la tipografía serif.`);
      });
      if (esObj(bloques[0]) && bloques[0].tipo !== "portada") avisos.push("No arranca con una portada.");
      const ult = bloques.at(-1);
      if (esObj(ult) && ult.tipo !== "cierre") avisos.push("No termina con un cierre.");
    }
  } else if (d.tipo === "planificacion") {
    if (campo !== "mes" && !MES.test(String(d.mes ?? ""))) errores.push('"mes" tiene que ser año-mes, como "2026-10".');
    if (!d.feedbackHasta) avisos.push('Sin "feedbackHasta": no se muestra fecha límite de feedback.');
    const ids = new Set<string>();
    for (const grupo of ["publicaciones", "stories"] as const) {
      const lista = d[grupo];
      if (!Array.isArray(lista)) {
        errores.push(`Falta "${grupo}" (puede ser una lista vacía []).`);
        continue;
      }
      lista.forEach((p, i) => {
        if (!esObj(p)) {
          errores.push(`${grupo} ${i + 1}: no es un objeto.`);
          return;
        }
        const n = `${grupo === "stories" ? "Story" : "Pieza"} ${String(p.id ?? i + 1)}`;
        if (!texto(p.id)) errores.push(`${n}: falta "id".`);
        else if (ids.has(p.id as string)) errores.push(`${n}: "id" repetido.`);
        else ids.add(p.id as string);
        if (!FORMATOS.has(p.formato as string)) errores.push(`${n}: formato "${String(p.formato)}" inválido (carrusel, posteo, reel o story).`);
        if (grupo === "stories" && p.formato !== "story") errores.push(`${n}: en stories el formato es "story".`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha ?? ""))) errores.push(`${n}: "fecha" tiene que ser "aaaa-mm-dd".`);
        else if (typeof d.mes === "string" && !String(p.fecha).startsWith(d.mes)) avisos.push(`${n}: la fecha ${p.fecha} no es del mes ${d.mes}.`);
        if (!texto(p.titulo)) errores.push(`${n}: falta "titulo".`);
        const ps = p.placas;
        if (!Array.isArray(ps) || !ps.length) errores.push(`${n}: no tiene placas.`);
        else
          for (const f of ps) {
            if (typeof f !== "string" || !EXT_IMAGEN.test(f)) errores.push(`${n}: "${String(f)}" no es una imagen (webp, png o jpg).`);
            else if (archivos && !archivos.has(f)) errores.push(`${n}: no está la imagen "${f}" en el ZIP.`);
            else placas.push(f);
          }
        if (grupo === "publicaciones" && !texto(p.copy)) avisos.push(`${n}: sin copy.`);
        if (p.formato === "reel" && !(Array.isArray(p.links) && p.links.length)) avisos.push(`${n}: reel sin link al video.`);
      });
    }
  }
  return r();
}
