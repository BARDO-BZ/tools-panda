import Link from "next/link";
import { redirect } from "next/navigation";
import { almacen } from "@/lib/servidor/almacen";
import { requerirSesion } from "@/lib/servidor/sesion";
import Barra from "@/components/app/Barra";
import s from "@/components/app/app.module.css";

// Punto de entrada: el equipo va al panel; un cliente, directo a su carpeta.
export default async function Inicio() {
  const p = await requerirSesion();
  if (p.rol === "panda") redirect("/panda");
  if (p.clientes.length === 1) redirect(`/${p.clientes[0]}`);

  const todos = await almacen().listarClientes();
  const mios = todos.filter((c) => p.clientes.includes(c.slug));
  return (
    <>
      <Barra perfil={p} />
      <main className={s.pagina}>
        <span className="tag">tus carpetas</span>
        <h1 className={s.h1}>Hola, {p.nombre.split(" ")[0]}.</h1>
        {mios.length ? (
          <ul className={s.listaCarpetas}>
            {mios.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`}>{c.nombre} →</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.suave}>Todavía no tenés una carpeta asignada. Escribile al equipo de Panda.</p>
        )}
      </main>
    </>
  );
}
