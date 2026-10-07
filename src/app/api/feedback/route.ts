import { almacen } from "@/lib/servidor/almacen";
import { accesoA } from "@/lib/servidor/sesion";
import { aprobar, cambiarComentario, cerrarFeedback, comentar, leerFeedback } from "@/lib/feedback";

// GET  /api/feedback?doc=<cliente>/<slug>          → comentarios, aprobaciones y cierre
// POST /api/feedback { doc, accion, ... }           → comentar | resolver | reabrir | aprobar | desaprobar | cerrar
//
// Hace falta sesión con acceso a la carpeta del cliente. El autor sale de la sesión (no del
// navegador) y solo se aceptan piezas que existen en ese documento.

async function validar(doc: unknown) {
  if (typeof doc !== "string") return null;
  const [cliente, slug, ...resto] = doc.split("/");
  if (!cliente || !slug || resto.length) return null;
  const perfil = await accesoA(cliente);
  if (!perfil) return null;
  const d = await almacen().documento(cliente, slug);
  return d?.contenido.tipo === "planificacion" ? { plan: d.contenido, perfil } : null;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(req: Request) {
  const doc = new URL(req.url).searchParams.get("doc");
  if (!(await validar(doc))) return Response.json({ error: "doc" }, { status: 404 });
  try {
    return Response.json(await leerFeedback(doc!));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const v = await validar(b.doc);
  if (!v) return Response.json({ error: "doc" }, { status: 404 });
  const { plan, perfil } = v;
  const doc = b.doc as string;
  const autor = perfil.nombre;
  const piezas = new Set([...plan.publicaciones, ...plan.stories].map((p) => p.id));

  try {
    const actual = await leerFeedback(doc);
    const cerrado = Boolean(actual.cierre);

    switch (b.accion) {
      case "comentar": {
        const t = texto(b.texto, 4000);
        if (cerrado) return Response.json({ error: "feedback cerrado" }, { status: 409 });
        if (!t || !piezas.has(b.pieza)) return Response.json({ error: "faltan datos" }, { status: 400 });
        await comentar(doc, b.pieza, autor, t);
        break;
      }
      case "resolver":
      case "reabrir":
        if (typeof b.id !== "string") return Response.json({ error: "id" }, { status: 400 });
        await cambiarComentario(doc, b.id, b.accion === "resolver" ? "resuelto" : "pendiente");
        break;
      case "aprobar":
      case "desaprobar":
        if (cerrado) return Response.json({ error: "feedback cerrado" }, { status: 409 });
        if (!piezas.has(b.pieza)) return Response.json({ error: "faltan datos" }, { status: 400 });
        await aprobar(doc, b.pieza, autor, b.accion === "aprobar");
        break;
      case "cerrar":
        if (!cerrado) await cerrarFeedback(doc, autor);
        break;
      default:
        return Response.json({ error: "accion" }, { status: 400 });
    }
    return Response.json(await leerFeedback(doc));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 503 });
  }
}
