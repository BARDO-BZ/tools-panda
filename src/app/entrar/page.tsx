import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesion } from "@/lib/servidor/sesion";
import FormEntrar from "./FormEntrar";
import s from "@/components/app/app.module.css";

export const metadata: Metadata = { title: "Entrar — Panda" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  if (await sesion()) redirect("/");
  const { error } = await searchParams;
  return (
    <main className={s.entrar}>
      <div className="tex suave" />
      <span className="lbl top">Panda · Clientes</span>
      <span className="lbl bot">Panda</span>
      <div className={s.entrarIn}>
        <span className="tag">entrá a tu carpeta</span>
        <h1 className={`bleed glow-rojo ${s.entrarMarca}`}>Panda</h1>
        <p className={`serif ${s.entrarBajada}`}>_ / estrategias, planificaciones y propuestas /</p>
        <FormEntrar errorLink={error === "link"} />
      </div>
    </main>
  );
}
