import type { CSSProperties } from "react";
import type { Feedback, Pieza, Planificacion } from "@/lib/tipos";
import { FORMATO, NOMBRE_ESTADO, ddmm, estadoDe, etiquetaPieza } from "./datos";
import s from "./planificacion.module.css";

// Solo existe al imprimir. <html data-imprimir="publicaciones|stories|completo"> decide qué sale.
// Una pieza por página: placas arriba, datos y copy abajo.
export default function Impresion({ plan, assets, feedback }: { plan: Planificacion; assets: string; feedback: Feedback | null }) {
  const pagina = (p: Pieza) => (
    <section key={p.id} className={s.hoja}>
      <header className={s.hojaCabecera}>
        <span className="rotulo">
          {plan.cliente} · {plan.periodo}
        </span>
        <span className="rotulo">Panda</span>
      </header>
      <h2 className={s.infoTitulo}>
        {etiquetaPieza(p)} · {p.titulo}
      </h2>
      <p className="rotulo">
        {ddmm(p.fecha)} · {FORMATO[p.formato]}
        {p.redes ? ` · ${p.redes.join(" · ")}` : ""}
        {p.eje ? ` · Eje: ${p.eje}` : ""} · {NOMBRE_ESTADO[estadoDe(feedback, p.id)]}
      </p>
      <div className={s.hojaPlacas} data-formato={p.formato}>
        {p.placas.map((src) => (
          <img key={src} src={`${assets}/${src}`} alt="" />
        ))}
      </div>
      {p.copy && <p className={s.hojaCopy}>{p.copy}</p>}
      {p.links?.map((l) => (
        <p key={l.url} className="rotulo">
          {l.label}: {l.url}
        </p>
      ))}
    </section>
  );

  return (
    <div className={s.impresion} aria-hidden>
      <section className={`${s.hoja} ${s.hojaPortada}`}>
        <div className="tex" />
        <span className="tag">{plan.titulo.toLowerCase()}</span>
        <h1 className={`bleed glow-rojo ${s.cliente}`} style={{ "--len": Math.max(plan.cliente.length, 5) } as CSSProperties}>
          {plan.cliente}
        </h1>
        <p className={`serif ${s.mes}`}>_ / {plan.periodo} /</p>
      </section>
      <div data-grupo="publicaciones">{plan.publicaciones.map(pagina)}</div>
      <div data-grupo="stories">{plan.stories.map(pagina)}</div>
    </div>
  );
}
