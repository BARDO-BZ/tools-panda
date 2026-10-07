import type { Metadata } from "next";
import Link from "next/link";
import { almacen } from "@/lib/servidor/almacen";
import { requerirPanda } from "@/lib/servidor/sesion";
import Barra from "@/components/app/Barra";
import { FormCliente } from "./Formularios";
import s from "@/components/app/app.module.css";

export const metadata: Metadata = { title: "Clientes — Panda" };

// Panel del equipo: todas las carpetas de clientes.
export default async function Panel() {
  const p = await requerirPanda();
  const db = almacen();
  const clientes = await db.listarClientes();
  const [docs, usuarios] = await Promise.all([Promise.all(clientes.map((c) => db.listarDocumentos(c.slug))), db.listarPerfiles()]);

  return (
    <>
      <Barra perfil={p} actual="clientes" />
      <main className={s.pagina}>
        {db.modo === "local" && <p className={s.aviso}>Modo local: los datos se guardan en .data/ y no se mandan mails. Para producción, configurar Supabase.</p>}
        <span className="tag">equipo</span>
        <h1 className={s.h1}>Clientes</h1>

        <div className={s.columnas}>
          <ul className={s.tablaLista}>
            {clientes.length === 0 && <li className={s.suave}>Todavía no hay carpetas.</li>}
            {clientes.map((c, i) => {
              const ultimo = docs[i].map((d) => d.actualizado).sort().at(-1);
              const accesos = usuarios.filter((u) => u.rol === "cliente" && u.clientes.includes(c.slug)).length;
              return (
                <li key={c.slug} className={s.filaCliente}>
                  <Link href={`/${c.slug}`} className={s.filaClienteNombre}>
                    {c.nombre}
                  </Link>
                  <span className="rotulo">
                    {docs[i].length} docs · {accesos} {accesos === 1 ? "usuario" : "usuarios"}
                    {ultimo ? ` · actualizado ${new Date(ultimo).toLocaleDateString("es-AR")}` : ""}
                  </span>
                  <Link href={`/panda/subir?cliente=${c.slug}`} className="btn ghost chico">
                    Subir
                  </Link>
                </li>
              );
            })}
          </ul>
          <aside className={s.lateral}>
            <p className="rotulo">Nueva carpeta</p>
            <FormCliente />
          </aside>
        </div>
      </main>
    </>
  );
}
