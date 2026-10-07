import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/almacen";
import { requerirPanda } from "@/lib/servidor/sesion";
import Barra from "@/components/app/Barra";
import Subidor from "@/components/app/Subidor";
import s from "@/components/app/app.module.css";

export const metadata: Metadata = { title: "Subir documento — Panda" };

const EJEMPLOS = [
  { archivo: "/ejemplos/estrategia-ejemplo.zip", nombre: "Estrategia", detalle: "contenido.json con todos los tipos de bloque" },
  { archivo: "/ejemplos/planificacion-ejemplo.zip", nombre: "Planificación", detalle: "contenido.json + placas 3:4 y stories 9:16" },
];

// Subir un documento nuevo (?cliente=…) o editar uno existente (?cliente=…&doc=…): en los dos casos
// se suelta un ZIP. Editar reemplaza el contenido completo y sube la versión.
export default async function Subir({ searchParams }: PageProps<"/panda/subir">) {
  const p = await requerirPanda();
  const q = await searchParams;
  const clienteQ = typeof q.cliente === "string" ? q.cliente : undefined;
  const docQ = typeof q.doc === "string" ? q.doc : undefined;
  const db = almacen();
  const clientes = await db.listarClientes();

  let editar: { slug: string; titulo: string; tipo: string } | undefined;
  if (clienteQ && docQ) {
    const d = await db.documento(clienteQ, docQ);
    if (!d) notFound();
    editar = { slug: d.slug, titulo: d.titulo, tipo: d.tipo };
  }
  const carpeta = clientes.find((c) => c.slug === clienteQ);

  return (
    <>
      <Barra perfil={p} actual="subir" />
      <main className={s.pagina}>
        <span className="tag">{editar ? "editar" : "subir"}</span>
        <h1 className={s.h1}>{editar ? editar.titulo : "Subir documento"}</h1>
        <p className={s.bajada}>
          {editar ? (
            <>
              Soltá el ZIP con la versión nueva de esta {editar.tipo} de <Link href={`/${clienteQ}`}>{carpeta?.nombre}</Link>. Reemplaza el
              contenido completo; los comentarios de las piezas que mantengan su <code>id</code> se conservan.
            </>
          ) : (
            "Estrategias y planificaciones se suben como un ZIP con contenido.json y las placas. Las propuestas llegan en la próxima etapa."
          )}
        </p>

        <div className={s.columnas}>
          <Subidor clientes={clientes} clienteInicial={clienteQ} editar={editar} />
          <aside className={s.ejemplos}>
            <p className="rotulo">Ejemplos para descargar</p>
            <ul>
              {EJEMPLOS.map((e) => (
                <li key={e.archivo}>
                  <a href={e.archivo} download className={s.ejemplo}>
                    <b>{e.nombre} ↓</b>
                    <span className={s.suave}>{e.detalle}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className={s.suave}>
              Cada ZIP trae un <b>LEEME.txt</b> con qué va en cada campo. Las placas se pasan solas a webp al subir: pueden ir en PNG o JPG.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
