import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Cliente, DocGuardado, Perfil } from "@/lib/tipos";
import { metaDe, type Almacen } from "./comun";

// Modo local (solo desarrollo): todo en .data/ — local.json para los datos, archivos/ para las placas.

const RAIZ = path.join(process.cwd(), ".data");
const ARCHIVO = path.join(RAIZ, "local.json");
const ARCHIVOS = path.join(RAIZ, "archivos");

type Datos = {
  clientes: Cliente[];
  perfiles: Perfil[];
  documentos: DocGuardado[];
  /** links de acceso pendientes: token → perfil */
  links: { token: string; perfil: string; vence: number }[];
};

async function leer(): Promise<Datos> {
  try {
    return { clientes: [], perfiles: [], documentos: [], links: [], ...JSON.parse(await readFile(ARCHIVO, "utf8")) };
  } catch {
    return { clientes: [], perfiles: [], documentos: [], links: [] };
  }
}
async function escribir(d: Datos) {
  await mkdir(RAIZ, { recursive: true });
  await writeFile(ARCHIVO, JSON.stringify(d, null, 2));
}

/** evita que una ruta se escape de .data/archivos */
function rutaSegura(ruta: string) {
  const abs = path.resolve(ARCHIVOS, ruta);
  if (!abs.startsWith(ARCHIVOS + path.sep)) throw new Error("ruta inválida");
  return abs;
}

const TIPOS_MIME: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

export function almacenLocal(): Almacen & {
  guardarArchivo(ruta: string, datos: Uint8Array): Promise<void>;
  crearLink(perfil: string): Promise<string>;
  usarLink(token: string): Promise<string | null>;
} {
  return {
    modo: "local",

    async listarClientes() {
      return (await leer()).clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    async cliente(slug) {
      return (await leer()).clientes.find((c) => c.slug === slug) ?? null;
    },
    async crearCliente(c) {
      const d = await leer();
      if (d.clientes.some((x) => x.slug === c.slug)) throw new Error("Ya existe una carpeta con ese nombre.");
      d.clientes.push(c);
      await escribir(d);
    },

    async listarPerfiles() {
      return (await leer()).perfiles.sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    async perfil(id) {
      return (await leer()).perfiles.find((p) => p.id === id) ?? null;
    },
    async perfilPorEmail(email) {
      return (await leer()).perfiles.find((p) => p.email === email.toLowerCase()) ?? null;
    },
    async crearUsuario(p) {
      const d = await leer();
      if (d.perfiles.some((x) => x.email === p.email.toLowerCase())) throw new Error("Ya hay un usuario con ese mail.");
      const nuevo: Perfil = { ...p, email: p.email.toLowerCase(), id: crypto.randomUUID() };
      d.perfiles.push(nuevo);
      await escribir(d);
      return nuevo;
    },
    async actualizarUsuario(id, cambios) {
      const d = await leer();
      const p = d.perfiles.find((x) => x.id === id);
      if (p) Object.assign(p, cambios);
      await escribir(d);
    },
    async borrarUsuario(id) {
      const d = await leer();
      d.perfiles = d.perfiles.filter((p) => p.id !== id);
      await escribir(d);
    },

    async listarDocumentos(cliente) {
      return (await leer()).documentos.filter((x) => x.cliente === cliente).map(metaDe);
    },
    async documento(cliente, slug) {
      return (await leer()).documentos.find((x) => x.cliente === cliente && x.slug === slug) ?? null;
    },
    async guardarDocumento(n) {
      const d = await leer();
      const doc: DocGuardado = {
        id: n.id,
        cliente: n.cliente,
        slug: n.slug,
        tipo: n.contenido.tipo,
        titulo: n.contenido.titulo,
        periodo: n.contenido.periodo,
        fecha: n.fecha,
        version: n.version,
        actualizado: new Date().toISOString(),
        actualizadoPor: n.autor,
        contenido: n.contenido,
      };
      d.documentos = d.documentos.filter((x) => !(x.cliente === n.cliente && x.slug === n.slug));
      d.documentos.push(doc);
      await escribir(d);
      return metaDe(doc);
    },
    async borrarDocumento(cliente, slug) {
      const d = await leer();
      const doc = d.documentos.find((x) => x.cliente === cliente && x.slug === slug);
      d.documentos = d.documentos.filter((x) => x !== doc);
      await escribir(d);
      if (doc) await rm(rutaSegura(`${cliente}/${doc.id}`), { recursive: true, force: true });
    },

    async destinoSubida(ruta) {
      return { tipo: "local", ruta, url: `/api/archivos/${ruta}` };
    },
    async existeArchivo(ruta) {
      return stat(rutaSegura(ruta)).then(() => true, () => false);
    },
    async servirArchivo(ruta) {
      try {
        const datos = await readFile(rutaSegura(ruta));
        return { datos: new Uint8Array(datos), contentType: TIPOS_MIME[path.extname(ruta).toLowerCase()] ?? "application/octet-stream" };
      } catch {
        return null;
      }
    },

    async guardarArchivo(ruta, datos) {
      const abs = rutaSegura(ruta);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, datos);
    },

    async crearLink(perfil) {
      const d = await leer();
      const token = crypto.randomUUID();
      d.links = d.links.filter((l) => l.vence > Date.now());
      d.links.push({ token, perfil, vence: Date.now() + 60 * 60 * 1000 });
      await escribir(d);
      return token;
    },
    async usarLink(token) {
      const d = await leer();
      const l = d.links.find((x) => x.token === token && x.vence > Date.now());
      d.links = d.links.filter((x) => x.token !== token);
      await escribir(d);
      return l?.perfil ?? null;
    },
  };
}
