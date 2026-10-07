import Link from "next/link";
import type { Perfil } from "@/lib/tipos";
import s from "./app.module.css";

// Barra superior de las páginas con sesión (index, panel). Los documentos no la llevan:
// tienen su propia navegación y se ven a pantalla completa.
export default function Barra({ perfil, actual }: { perfil: Perfil; actual?: "clientes" | "usuarios" | "subir" }) {
  return (
    <header className={s.barra}>
      <Link href="/" className={s.barraMarca} aria-label="Inicio">
        <img src="/logos/panda-iso-negro.svg" alt="" />
        <span className="rotulo">{perfil.rol === "panda" ? "Panda · equipo" : "Panda"}</span>
      </Link>
      {perfil.rol === "panda" && (
        <nav className={s.barraNav}>
          <Link href="/panda" aria-current={actual === "clientes" ? "page" : undefined}>
            Clientes
          </Link>
          <Link href="/panda/usuarios" aria-current={actual === "usuarios" ? "page" : undefined}>
            Usuarios
          </Link>
          <Link href="/panda/subir" aria-current={actual === "subir" ? "page" : undefined}>
            Subir
          </Link>
        </nav>
      )}
      <form action="/salir" method="post" className={s.barraUsuario}>
        <span className={s.suave}>{perfil.nombre}</span>
        <button className="btn ghost chico">Salir</button>
      </form>
    </header>
  );
}
