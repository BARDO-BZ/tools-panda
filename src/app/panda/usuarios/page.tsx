import type { Metadata } from "next";
import { almacen } from "@/lib/servidor/almacen";
import { requerirPanda } from "@/lib/servidor/sesion";
import Barra from "@/components/app/Barra";
import { actualizarCarpetas, borrarUsuario } from "../acciones";
import { FormUsuario } from "../Formularios";
import s from "@/components/app/app.module.css";

export const metadata: Metadata = { title: "Usuarios — Panda" };

export default async function Usuarios() {
  const p = await requerirPanda();
  const db = almacen();
  const [usuarios, clientes] = await Promise.all([db.listarPerfiles(), db.listarClientes()]);
  const nombre = new Map(clientes.map((c) => [c.slug, c.nombre]));

  return (
    <>
      <Barra perfil={p} actual="usuarios" />
      <main className={s.pagina}>
        <span className="tag">equipo</span>
        <h1 className={s.h1}>Usuarios</h1>

        <div className={s.columnas}>
          <ul className={s.tablaLista}>
            {usuarios.map((u) => (
              <li key={u.id} className={s.filaUsuario}>
                <div>
                  <b>{u.nombre}</b>
                  {u.id === p.id && <span className={s.suave}> (vos)</span>}
                  <p className={s.suave}>{u.email}</p>
                </div>
                <span className={u.rol === "panda" ? "tag" : "tag hueco"}>{u.rol === "panda" ? "equipo" : "cliente"}</span>
                {u.rol === "cliente" ? (
                  <details className={s.carpetas}>
                    <summary className="rotulo">{u.clientes.map((c) => nombre.get(c) ?? c).join(" · ") || "sin carpeta"}</summary>
                    <form action={actualizarCarpetas} className={s.form}>
                      <input type="hidden" name="id" value={u.id} />
                      <div className={s.opciones}>
                        {clientes.map((c) => (
                          <label key={c.slug}>
                            <input type="checkbox" name="clientes" value={c.slug} defaultChecked={u.clientes.includes(c.slug)} /> {c.nombre}
                          </label>
                        ))}
                      </div>
                      <button className="btn ghost chico">Guardar carpetas</button>
                    </form>
                  </details>
                ) : (
                  <span className="rotulo">todas las carpetas</span>
                )}
                {u.id !== p.id && (
                  <form action={borrarUsuario}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className={s.borrar} aria-label={`Quitar acceso a ${u.nombre}`}>
                      Quitar acceso
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <aside className={s.lateral}>
            <p className="rotulo">Nuevo usuario</p>
            <FormUsuario clientes={clientes} />
          </aside>
        </div>
      </main>
    </>
  );
}
