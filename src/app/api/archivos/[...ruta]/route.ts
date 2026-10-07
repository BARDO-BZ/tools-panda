import { almacen, conSupabase } from "@/lib/servidor/almacen";
import { almacenLocal } from "@/lib/servidor/almacen-local";
import { accesoA } from "@/lib/servidor/sesion";
import { EXT_IMAGEN } from "@/lib/validar";

// GET /api/archivos/<cliente>/<doc-id>/v<n>/<archivo>
//   Las placas son privadas: solo las ve quien tiene acceso a la carpeta del cliente.
//   En Supabase redirige a un link firmado que dura una hora; en local las sirve del disco.
// PUT (solo modo local): destino de las subidas del equipo. En Supabase el navegador sube
//   directo al bucket con un link firmado (ver /api/documentos/preparar).

const RUTA = /^[a-z0-9-]+\/[0-9a-f-]{36}\/v\d+\/[A-Za-z0-9._-]+$/;

async function validar(ctx: RouteContext<"/api/archivos/[...ruta]">) {
  const ruta = (await ctx.params).ruta.join("/");
  if (!RUTA.test(ruta) || !EXT_IMAGEN.test(ruta)) return null;
  const perfil = await accesoA(ruta.split("/")[0]);
  return perfil ? { ruta, perfil } : null;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/archivos/[...ruta]">) {
  const v = await validar(ctx);
  if (!v) return new Response("No encontrado", { status: 404 });
  const archivo = await almacen().servirArchivo(v.ruta);
  if (!archivo) return new Response("No encontrado", { status: 404 });
  if ("redirigir" in archivo) return Response.redirect(archivo.redirigir, 302);
  return new Response(archivo.datos as BodyInit, {
    // privado: se cachea en el navegador del usuario, nunca en una CDN compartida
    headers: { "Content-Type": archivo.contentType, "Cache-Control": "private, max-age=3600" },
  });
}

const MAX = 15 * 1024 * 1024;

export async function PUT(req: Request, ctx: RouteContext<"/api/archivos/[...ruta]">) {
  if (conSupabase) return new Response("No disponible", { status: 405 });
  const v = await validar(ctx);
  if (!v || v.perfil.rol !== "panda") return new Response("No encontrado", { status: 404 });
  const datos = new Uint8Array(await req.arrayBuffer());
  if (!datos.length || datos.length > MAX) return new Response("Archivo vacío o muy pesado", { status: 413 });
  await almacenLocal().guardarArchivo(v.ruta, datos);
  return new Response(null, { status: 204 });
}
