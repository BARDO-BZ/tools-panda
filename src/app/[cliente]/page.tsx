import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/almacen";
import { puedeVer, requerirSesion } from "@/lib/servidor/sesion";
import type { DocMeta } from "@/lib/tipos";
import Barra from "@/components/app/Barra";
import s from "@/components/app/app.module.css";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const TIPO: Record<DocMeta["tipo"], string> = { estrategia: "estrategia", planificacion: "planificación", reporte: "reporte" };

export async function generateMetadata({ params }: PageProps<"/[cliente]">): Promise<Metadata> {
  const c = await almacen().cliente((await params).cliente);
  return { title: c ? `${c.nombre} × Panda` : "Panda" };
}

// Index de la carpeta de un cliente: todos sus documentos, por año y mes (lo más nuevo arriba).
export default async function IndexCliente({ params }: PageProps<"/[cliente]">) {
  const { cliente: slug } = await params;
  const p = await requerirSesion();
  // a quien no tiene acceso le respondemos 404: no confirma que la carpeta existe
  if (!puedeVer(p, slug)) notFound();
  const db = almacen();
  const cliente = await db.cliente(slug);
  if (!cliente) notFound();

  const docs = (await db.listarDocumentos(slug)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.actualizado.localeCompare(a.actualizado));
  const porAnio = new Map<string, Map<string, DocMeta[]>>();
  for (const d of docs) {
    const [anio, mes] = d.fecha.split("-");
    if (!porAnio.has(anio)) porAnio.set(anio, new Map());
    const meses = porAnio.get(anio)!;
    if (!meses.has(mes)) meses.set(mes, []);
    meses.get(mes)!.push(d);
  }
  const esPanda = p.rol === "panda";

  return (
    <>
      <Barra perfil={p} actual={esPanda ? "clientes" : undefined} />
      <header className={s.cabecera}>
        <div className="tex suave" />
        <div className={s.cabeceraIn}>
          <span className="tag">carpeta</span>
          <h1 className={`bleed glow-rojo ${s.sangrado}`} style={{ "--len": Math.max(cliente.nombre.length, 5) } as CSSProperties}>
            {cliente.nombre}
          </h1>
          <p className="serif">
            _ / {docs.length} {docs.length === 1 ? "documento" : "documentos"} /
          </p>
          {esPanda && (
            <div className={s.acciones}>
              <Link href={`/panda/subir?cliente=${slug}`} className="btn">
                Subir documento
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className={s.pagina}>
        {docs.length === 0 && <p className={s.vacio}>Todavía no hay documentos en esta carpeta.</p>}
        {[...porAnio].map(([anio, meses]) => (
          <section key={anio} className={s.anio}>
            <h2 className={s.anioNumero}>{anio}</h2>
            <div className={s.meses}>
              {[...meses].map(([mes, lista]) => (
                <div key={mes} className={s.mes}>
                  <h3 className={s.mesNombre}>{MESES[Number(mes) - 1]}</h3>
                  <ul className={s.docs}>
                    {lista.map((d) => (
                      <li key={d.id} className={s.doc}>
                        <Link href={`/${slug}/${d.slug}`} className={s.docLink}>
                          <span className="tag hueco">{TIPO[d.tipo]}</span>
                          <span className={s.docTitulo}>{d.titulo}</span>
                          {d.periodo && <span className={s.suave}>{d.periodo}</span>}
                        </Link>
                        <div className={s.docPie}>
                          <span className="rotulo">
                            Actualizado {new Date(d.actualizado).toLocaleDateString("es-AR")}
                            {d.version > 1 ? ` · v${d.version}` : ""}
                          </span>
                          {esPanda && (
                            <Link href={`/panda/subir?cliente=${slug}&doc=${d.slug}`} className="btn ghost chico">
                              Editar
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
