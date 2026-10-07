import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { almacen, urlAssets } from "@/lib/servidor/almacen";
import { puedeVer, requerirSesion, sesion } from "@/lib/servidor/sesion";
import EstrategiaVista from "@/components/estrategia/EstrategiaVista";
import PlanificacionVista from "@/components/planificacion/PlanificacionVista";
import s from "@/components/app/app.module.css";

export async function generateMetadata({ params }: PageProps<"/[cliente]/[doc]">): Promise<Metadata> {
  const { cliente, doc } = await params;
  const p = await sesion();
  if (!p || !puedeVer(p, cliente)) return {};
  const d = await almacen().documento(cliente, doc);
  if (!d) return {};
  const c = d.contenido;
  return { title: `${c.cliente} × Panda · ${c.titulo}${c.periodo ? ` · ${c.periodo}` : ""}` };
}

export default async function Documento({ params }: PageProps<"/[cliente]/[doc]">) {
  const { cliente, doc } = await params;
  const p = await requerirSesion();
  if (!puedeVer(p, cliente)) notFound();
  const d = await almacen().documento(cliente, doc);
  if (!d) notFound();

  return (
    <>
      {d.contenido.tipo === "planificacion" ? (
        <PlanificacionVista plan={d.contenido} docId={`${cliente}/${doc}`} assets={urlAssets(d)} />
      ) : (
        <EstrategiaVista doc={d.contenido} />
      )}
      {/* volver al index; el equipo además puede editar */}
      <nav className={s.flotante} aria-label="Documento">
        <Link href={`/${cliente}`} className="btn ghost chico">
          ← Carpeta
        </Link>
        {p.rol === "panda" && (
          <Link href={`/panda/subir?cliente=${cliente}&doc=${doc}`} className="btn chico">
            Editar
          </Link>
        )}
      </nav>
    </>
  );
}
