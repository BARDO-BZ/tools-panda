import { revalidatePath } from "next/cache";
import { almacen, carpetaVersion, slugPara } from "@/lib/servidor/almacen";
import { sesion } from "@/lib/servidor/sesion";
import type { Documento } from "@/lib/tipos";
import { validarDocumento } from "@/lib/validar";

// Subida y edición de documentos (solo equipo Panda), en dos pasos para no publicar a medias:
//
//  POST { accion: "preparar", cliente, doc?, contenido, archivos }
//    valida, reserva id/versión y devuelve a dónde sube el navegador cada placa.
//  POST { accion: "confirmar", cliente, doc?, id, slug, version, contenido }
//    vuelve a validar, chequea que las placas estén subidas y recién ahí guarda el documento.
//
//  `doc` (slug) presente = editar ese documento: se re-sube completo y sube la versión.

const NOMBRE = /^[A-Za-z0-9._-]{1,80}$/;
const SLUG = /^[a-z0-9-]{3,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const error = (mensaje: string, status = 400) => Response.json({ error: mensaje }, { status });

export async function POST(req: Request) {
  const perfil = await sesion();
  if (!perfil || perfil.rol !== "panda") return error("No encontrado", 404);
  const b = await req.json().catch(() => null);
  if (!b || typeof b.cliente !== "string") return error("Faltan datos.");

  const db = almacen();
  const carpeta = await db.cliente(b.cliente);
  if (!carpeta) return error("No existe esa carpeta.");

  const archivos: string[] = Array.isArray(b.archivos) ? b.archivos.filter((a: unknown) => typeof a === "string") : [];
  if (archivos.some((a) => !NOMBRE.test(a))) return error("Hay nombres de archivo inválidos.");

  const v = validarDocumento(b.contenido, b.accion === "preparar" ? new Set(archivos) : null);
  if (!v.doc || !v.fecha) return Response.json({ error: "El contenido tiene errores.", errores: v.errores }, { status: 422 });
  // el nombre visible del cliente es siempre el de la carpeta
  const contenido: Documento = { ...v.doc, cliente: carpeta.nombre };

  const existente = typeof b.doc === "string" && b.doc ? await db.documento(carpeta.slug, b.doc) : null;
  if (b.doc && !existente) return error("No existe el documento a editar.", 404);
  if (existente && existente.tipo !== contenido.tipo)
    return error(`El documento es una ${existente.tipo} y el archivo es una ${contenido.tipo}. Subilo como documento nuevo.`);

  if (b.accion === "preparar") {
    const id = existente?.id ?? crypto.randomUUID();
    const version = existente ? existente.version + 1 : 1;
    const ocupados = new Set((await db.listarDocumentos(carpeta.slug)).map((d) => d.slug));
    const slug = existente?.slug ?? slugPara(contenido.tipo, v.fecha, ocupados);
    const base = carpetaVersion(carpeta.slug, id, version);
    const destinos = await Promise.all(v.placas.map(async (nombre) => ({ nombre, destino: await db.destinoSubida(`${base}/${nombre}`) })));
    return Response.json({ id, slug, version, destinos, avisos: v.avisos });
  }

  if (b.accion === "confirmar") {
    const { id, slug, version } = b;
    if (typeof id !== "string" || !UUID.test(id) || typeof slug !== "string" || !SLUG.test(slug) || !Number.isInteger(version))
      return error("Faltan datos.");
    // los ids y la versión los decide el servidor: se revalidan contra lo que hay guardado
    if (existente) {
      if (existente.id !== id || existente.slug !== slug || version !== existente.version + 1)
        return error("El documento cambió mientras subías. Volvé a intentar.", 409);
    } else if (version !== 1 || (await db.documento(carpeta.slug, slug))) {
      return error("Ya existe un documento con ese nombre. Volvé a intentar.", 409);
    }
    const base = carpetaVersion(carpeta.slug, id, version);
    const faltan = [];
    for (const p of v.placas) if (!(await db.existeArchivo(`${base}/${p}`))) faltan.push(p);
    if (faltan.length) return error(`No llegaron a subirse: ${faltan.join(", ")}.`);

    const meta = await db.guardarDocumento({ id, cliente: carpeta.slug, slug, version, fecha: v.fecha, contenido, autor: perfil.nombre });
    revalidatePath(`/${carpeta.slug}`);
    return Response.json({ ok: true, url: `/${carpeta.slug}/${meta.slug}` });
  }

  return error("Acción desconocida.");
}
