import { redirect } from "next/navigation";
import { cerrarSesion } from "@/lib/servidor/sesion";

// POST (desde el botón "Salir"): no GET, para que un link o un prefetch no cierren la sesión.
export async function POST() {
  await cerrarSesion();
  redirect("/entrar");
}
