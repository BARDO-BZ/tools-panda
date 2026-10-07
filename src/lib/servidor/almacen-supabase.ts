import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DocGuardado, DocMeta, Perfil, Rol } from "@/lib/tipos";
import type { Almacen } from "./comun";

// Modo Supabase (producción). Todas las consultas van con la service role, del lado del servidor
// y después de verificar la sesión (ver sesion.ts). Las tablas tienen RLS sin policies públicas:
// la anon key no puede leer nada. Esquema: supabase/schema.sql.

export const BUCKET = "documentos";

let cliente: SupabaseClient | null = null;
export function admin() {
  cliente ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

function ok<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

type FilaPerfil = { id: string; email: string; nombre: string; rol: Rol; accesos: { cliente: string }[] };
const aPerfil = (f: FilaPerfil): Perfil => ({ id: f.id, email: f.email, nombre: f.nombre, rol: f.rol, clientes: f.accesos.map((a) => a.cliente) });
const SEL_PERFIL = "id,email,nombre,rol,accesos(cliente)";

type FilaDoc = {
  id: string;
  cliente: string;
  slug: string;
  tipo: DocMeta["tipo"];
  titulo: string;
  periodo: string | null;
  fecha: string;
  version: number;
  actualizado: string;
  actualizado_por: string | null;
  contenido?: DocGuardado["contenido"];
};
const aMeta = (f: FilaDoc): DocMeta => ({
  id: f.id,
  cliente: f.cliente,
  slug: f.slug,
  tipo: f.tipo,
  titulo: f.titulo,
  periodo: f.periodo ?? undefined,
  fecha: f.fecha,
  version: f.version,
  actualizado: f.actualizado,
  actualizadoPor: f.actualizado_por ?? undefined,
});
const SEL_META = "id,cliente,slug,tipo,titulo,periodo,fecha,version,actualizado,actualizado_por";

async function setAccesos(id: string, clientes: string[]) {
  const sb = admin();
  ok(await sb.from("accesos").delete().eq("perfil", id));
  if (clientes.length) ok(await sb.from("accesos").insert(clientes.map((c) => ({ perfil: id, cliente: c }))));
}

export function almacenSupabase(): Almacen {
  const sb = admin();
  return {
    modo: "supabase",

    async listarClientes() {
      return ok(await sb.from("clientes").select("slug,nombre").order("nombre")) ?? [];
    },
    async cliente(slug) {
      return ok(await sb.from("clientes").select("slug,nombre").eq("slug", slug).maybeSingle());
    },
    async crearCliente(c) {
      const r = await sb.from("clientes").insert(c);
      if (r.error?.code === "23505") throw new Error("Ya existe una carpeta con ese nombre.");
      ok(r);
    },

    async listarPerfiles() {
      return (ok(await sb.from("perfiles").select(SEL_PERFIL).order("nombre")) as FilaPerfil[]).map(aPerfil);
    },
    async perfil(id) {
      const f = ok(await sb.from("perfiles").select(SEL_PERFIL).eq("id", id).maybeSingle()) as FilaPerfil | null;
      return f ? aPerfil(f) : null;
    },
    async perfilPorEmail(email) {
      const f = ok(await sb.from("perfiles").select(SEL_PERFIL).eq("email", email.toLowerCase()).maybeSingle()) as FilaPerfil | null;
      return f ? aPerfil(f) : null;
    },
    async crearUsuario(p, redirigirA) {
      const email = p.email.toLowerCase();
      if (await this.perfilPorEmail(email)) throw new Error("Ya hay un usuario con ese mail.");
      // la invitación crea el usuario en Auth y le manda el mail con el link para entrar
      const inv = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: redirigirA, data: { nombre: p.nombre } });
      if (inv.error) throw new Error(`No se pudo mandar la invitación: ${inv.error.message}`);
      const id = inv.data.user.id;
      ok(await sb.from("perfiles").insert({ id, email, nombre: p.nombre, rol: p.rol }));
      await setAccesos(id, p.clientes);
      return { ...p, email, id };
    },
    async actualizarUsuario(id, cambios) {
      const { clientes, ...resto } = cambios;
      if (Object.keys(resto).length) ok(await sb.from("perfiles").update(resto).eq("id", id));
      if (clientes) await setAccesos(id, clientes);
    },
    async borrarUsuario(id) {
      // borra el usuario de Auth; perfiles y accesos caen en cascada
      const r = await sb.auth.admin.deleteUser(id);
      if (r.error) throw new Error(r.error.message);
    },

    async listarDocumentos(cliente) {
      return (ok(await sb.from("documentos").select(SEL_META).eq("cliente", cliente)) as FilaDoc[]).map(aMeta);
    },
    async documento(cliente, slug) {
      const f = ok(await sb.from("documentos").select(`${SEL_META},contenido`).eq("cliente", cliente).eq("slug", slug).maybeSingle()) as FilaDoc | null;
      return f ? { ...aMeta(f), contenido: f.contenido! } : null;
    },
    async guardarDocumento(n) {
      const fila = {
        id: n.id,
        cliente: n.cliente,
        slug: n.slug,
        tipo: n.contenido.tipo,
        titulo: n.contenido.titulo,
        periodo: n.contenido.periodo ?? null,
        fecha: n.fecha,
        version: n.version,
        contenido: n.contenido,
        actualizado: new Date().toISOString(),
        actualizado_por: n.autor,
      };
      const f = ok(await sb.from("documentos").upsert(fila, { onConflict: "id" }).select(SEL_META).single()) as FilaDoc;
      // las placas de versiones anteriores ya no se usan: se borran (best effort)
      if (n.version > 1) void borrarVersionesViejas(n.cliente, n.id, n.version);
      return aMeta(f);
    },
    async borrarDocumento(cliente, slug) {
      const doc = await this.documento(cliente, slug);
      if (!doc) return;
      ok(await sb.from("documentos").delete().eq("id", doc.id));
      await borrarCarpeta(`${cliente}/${doc.id}`);
    },

    async destinoSubida(ruta) {
      const r = ok(await sb.storage.from(BUCKET).createSignedUploadUrl(ruta, { upsert: true }));
      if (!r) throw new Error("No se pudo preparar la subida.");
      return { tipo: "supabase", ruta: r.path, token: r.token };
    },
    async existeArchivo(ruta) {
      const dir = ruta.slice(0, ruta.lastIndexOf("/"));
      const nombre = ruta.slice(ruta.lastIndexOf("/") + 1);
      const r = await sb.storage.from(BUCKET).list(dir, { search: nombre, limit: 100 });
      return Boolean(r.data?.some((f) => f.name === nombre));
    },
    async servirArchivo(ruta) {
      const r = await sb.storage.from(BUCKET).createSignedUrl(ruta, 60 * 60);
      return r.data ? { redirigir: r.data.signedUrl } : null;
    },
  };
}

async function listarRecursivo(prefijo: string): Promise<string[]> {
  const sb = admin();
  const r = await sb.storage.from(BUCKET).list(prefijo, { limit: 1000 });
  const salida: string[] = [];
  for (const f of r.data ?? []) {
    const ruta = `${prefijo}/${f.name}`;
    if (f.id === null) salida.push(...(await listarRecursivo(ruta))); // carpeta
    else salida.push(ruta);
  }
  return salida;
}
async function borrarCarpeta(prefijo: string) {
  const rutas = await listarRecursivo(prefijo);
  if (rutas.length) await admin().storage.from(BUCKET).remove(rutas);
}
async function borrarVersionesViejas(cliente: string, id: string, actual: number) {
  for (let v = 1; v < actual; v++) await borrarCarpeta(`${cliente}/${id}/v${v}`).catch(() => {});
}
