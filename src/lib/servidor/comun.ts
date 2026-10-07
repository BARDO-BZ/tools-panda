// Tipos y utilidades que comparten el selector (almacen.ts) y las dos implementaciones.
import type { Cliente, DocGuardado, DocMeta, Documento, Perfil, TipoDocumento } from "@/lib/tipos";

export type DestinoSubida =
  | { tipo: "local"; ruta: string; url: string }
  | { tipo: "supabase"; ruta: string; token: string };

export type ArchivoServido = { redirigir: string } | { datos: Uint8Array; contentType: string };

export type NuevoDocumento = {
  id: string;
  cliente: string;
  slug: string;
  version: number;
  fecha: string;
  contenido: Documento;
  autor: string;
};

export interface Almacen {
  modo: "local" | "supabase";

  listarClientes(): Promise<Cliente[]>;
  cliente(slug: string): Promise<Cliente | null>;
  crearCliente(c: Cliente): Promise<void>;

  listarPerfiles(): Promise<Perfil[]>;
  perfil(id: string): Promise<Perfil | null>;
  perfilPorEmail(email: string): Promise<Perfil | null>;
  /** crea el usuario y le manda la invitación (en local no hay mail: entra desde /entrar) */
  crearUsuario(p: Omit<Perfil, "id">, redirigirA: string): Promise<Perfil>;
  actualizarUsuario(id: string, cambios: Partial<Pick<Perfil, "nombre" | "rol" | "clientes">>): Promise<void>;
  borrarUsuario(id: string): Promise<void>;

  listarDocumentos(cliente: string): Promise<DocMeta[]>;
  documento(cliente: string, slug: string): Promise<DocGuardado | null>;
  guardarDocumento(d: NuevoDocumento): Promise<DocMeta>;
  borrarDocumento(cliente: string, slug: string): Promise<void>;

  /** a dónde sube el navegador cada placa (directo, sin pasar por el servidor de Next) */
  destinoSubida(ruta: string): Promise<DestinoSubida>;
  existeArchivo(ruta: string): Promise<boolean>;
  servirArchivo(ruta: string): Promise<ArchivoServido | null>;
}

/* ───────────── utilidades compartidas por las dos implementaciones ───────────── */

/** carpeta de archivos de una versión del documento */
export const carpetaVersion = (cliente: string, id: string, version: number) => `${cliente}/${id}/v${version}`;

/** URL desde la que la web pide las placas (pasa por /api/archivos, que chequea el acceso) */
export const urlAssets = (d: Pick<DocMeta, "cliente" | "id" | "version">) => `/api/archivos/${carpetaVersion(d.cliente, d.id, d.version)}`;

/** slug legible: planificacion-2026-10, estrategia-2026-07… (con sufijo si ya existe) */
export function slugPara(tipo: TipoDocumento, fecha: string, ocupados: Set<string>) {
  const base = `${tipo}-${fecha}`;
  if (!ocupados.has(base)) return base;
  for (let i = 2; ; i++) if (!ocupados.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const SLUG_CLIENTE = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/;
/** rutas propias de la app: no pueden ser nombre de carpeta de cliente */
export const RESERVADOS = new Set(["panda", "entrar", "salir", "auth", "api", "ejemplos", "brand", "logos", "_next"]);

export function slugCliente(nombre: string) {
  return nombre
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export function metaDe(d: DocGuardado): DocMeta {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contenido, ...meta } = d;
  return meta;
}
