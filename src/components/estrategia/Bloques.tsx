import type { CSSProperties } from "react";
import type { Bloque, Fondo } from "@/lib/tipos";
import s from "./estrategia.module.css";

// Un componente por tipo de bloque, todos con el lenguaje visual de Panda (globals.css).
// Para sumar un tipo nuevo: agregarlo a `Bloque` en lib/tipos.ts, escribir su componente acá,
// sumarlo al switch de <BloqueVista>, a FONDO y a BLOQUES en scripts/validar.mjs.

const n2 = (i: number) => String(i + 1).padStart(2, "0");

/** Fondo por defecto de cada tipo (modo claro): el blanco manda; rosa y rojo cortan el ritmo. */
export const FONDO: Record<Bloque["tipo"], Fondo> = {
  portada: "blanco",
  "semestre-anterior": "blanco",
  columnas: "rosa",
  metricas: "blanco",
  desafio: "rojo",
  territorios: "blanco",
  seccion: "blanco",
  lista: "blanco",
  comparacion: "blanco",
  grilla: "rosa",
  tabla: "blanco",
  cita: "rojo",
  cierre: "blanco",
};

/** Sobre fondos claros va el sello negro; sobre negro o rojo, el blanco. */
const selloPara = (f: Fondo) => `/logos/panda-sello-${f === "negro" || f === "rojo" ? "blanco" : "negro"}.svg`;

/** Ajusta el titular sangrado al largo de la palabra para que no se salga de la pantalla. */
const sangrado = (texto: string) => ({ "--len": Math.max(texto.length, 5) }) as CSSProperties;

function Portada({ b, cliente }: { b: Extract<Bloque, { tipo: "portada" }>; cliente: string }) {
  return (
    <>
      <div className={s.portada}>
        <h1 className={`bleed glow-rojo rv ${s.sangrado}`} style={sangrado(cliente)}>
          {cliente}
        </h1>
        <p className={`serif rv d1 ${s.bajadaPortada}`}>
          _ / {b.titulo}
          {b.bajada ? ` · ${b.bajada}` : ""} /
        </p>
        {b.kicker && <span className={`tag rv d2 ${s.tagPortada}`}>{b.kicker}</span>}
      </div>
    </>
  );
}

function Encabezado({ tag, titulo, bajada }: { tag?: string; titulo?: string; bajada?: string }) {
  return (
    <header className={s.encabezado}>
      {tag && <span className="tag rv">{tag}</span>}
      {titulo && <h2 className={`${s.h2} rv d1`}>{titulo}</h2>}
      {bajada && <p className={`serif rv d1 ${s.bajada}`}>{bajada}</p>}
    </header>
  );
}

function SemestreAnterior({ b }: { b: Extract<Bloque, { tipo: "semestre-anterior" }> }) {
  return (
    <>
      <Encabezado tag="de dónde veníamos" titulo={b.titulo} bajada={b.periodo} />
      <div className={`${s.dosCol} rv d2`}>
        <div>
          <p className={`rotulo ${s.rotuloGris}`}>Objetivos</p>
          <ol className={s.sintomas}>
            {b.objetivos.map((o, i) => (
              <li key={o}>
                <i>{n2(i)}</i>
                {o}
              </li>
            ))}
          </ol>
        </div>
        {b.estrategia && (
          <div>
            <p className={`rotulo ${s.rotuloGris}`}>Estrategia propuesta</p>
            <p className={s.destacado}>{b.estrategia.resumen}</p>
            <ul className={s.pasos}>
              {b.estrategia.items.map((it) => (
                <li key={it.titulo}>
                  <b>{it.titulo}</b>
                  <span>{it.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {b.metas && b.metas.length > 0 && (
        <div className={`${s.metas} rv d3`}>
          <p className={`rotulo ${s.rotuloGris}`}>Metas logradas</p>
          <ul>
            {b.metas.map((m) => (
              <li key={m.canal}>
                <span className={s.metaCanal}>{m.canal}</span>
                <span className={s.metaMeta}>{m.meta}</span>
                <span className={s.metaLogro}>{m.logro}</span>
                <span className={s.metaPct}>{m.porcentaje}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Columnas({ b }: { b: Extract<Bloque, { tipo: "columnas" }> }) {
  return (
    <>
      <Encabezado tag="lo que pasó" titulo={b.titulo} />
      <div className={`${s.grilla3} rv d2`}>
        {b.columnas.map((c, i) => (
          <div key={c.titulo} className={s.columna}>
            <i className={s.numRojo}>{n2(i)}</i>
            <b className={s.colTitulo}>{c.titulo}</b>
            {c.diagnostico && <p className={s.diagnostico}>{c.diagnostico}</p>}
            {c.detalle && <p className={s.detalle}>{c.detalle}</p>}
            {c.hoy && (
              <div className={s.hoy}>
                <span className="rotulo">Hoy</span>
                <p>{c.hoy}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {b.banda && (
        <div className={`${s.banda} rv d3`}>
          <span className="rotulo">{b.banda.label}</span>
          <p>{b.banda.texto}</p>
        </div>
      )}
    </>
  );
}

function Metricas({ b }: { b: Extract<Bloque, { tipo: "metricas" }> }) {
  return (
    <>
      <Encabezado tag="crecimiento" titulo={b.titulo} />
      <div className={`${s.canales} rv d2`}>
        {b.canales.map((c) => (
          <div key={c.canal} className={s.canalFila}>
            <p className={`rotulo ${s.canal}`}>{c.canal}</p>
            <div className={s.grilla4}>
              {c.tiles.map((t) => (
                <div key={t.label} className={s.tile}>
                  <span className={s.numero}>{t.valor}</span>
                  <span className="rotulo">{t.label}</span>
                  {t.referencia && <span className={s.referencia}>{t.referencia}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {b.nota && <p className={`${s.nota} rv d3`}>{b.nota}</p>}
    </>
  );
}

function Desafio({ b }: { b: Extract<Bloque, { tipo: "desafio" }> }) {
  return (
    <>
      <Encabezado tag="el nuevo desafío" titulo={b.titulo} />
      <div className={`${s.comparativa} rv d1`}>
        <div className={s.antes}>
          <span className="rotulo">{b.antes.label}</span>
          <p>{b.antes.texto}</p>
        </div>
        <span className={s.flecha} aria-hidden>
          →
        </span>
        <div className={s.despues}>
          <span className="rotulo">{b.despues.label}</span>
          <p>{b.despues.texto}</p>
        </div>
      </div>
      <div className={`${s.grilla3} rv d2`}>
        {b.ejes.map((e, i) => (
          <div key={e.titulo} className={s.eje}>
            <i>{n2(i)}</i>
            <b>{e.titulo}</b>
            <p>{e.texto}</p>
            <ul>
              {e.kpis.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {b.kpiGeneral && (
        <div className={`${s.kpiGeneral} rv d3`}>
          <span className="rotulo">KPI general</span>
          <p>{b.kpiGeneral.texto}</p>
          {b.kpiGeneral.embudo && <span className={`rotulo ${s.embudo}`}>{b.kpiGeneral.embudo}</span>}
        </div>
      )}
    </>
  );
}

function Territorios({ b }: { b: Extract<Bloque, { tipo: "territorios" }> }) {
  return (
    <div className={s.territorios}>
      <div>
        <Encabezado tag="territorios" titulo={b.titulo} />
        <div className={`${s.grilla2} rv d2`}>
          {b.territorios.map((t, i) => (
            <div key={t.titulo} className={s.territorio}>
              <i className={s.numRojo}>{n2(i)}</i>
              <b className={s.colTitulo}>{t.titulo}</b>
              <p className={s.detalle}>{t.texto}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`${s.ladoPasos} rv d3`}>
        <span className="tag hueco">{(b.pasosTitulo ?? "próximos pasos").toLowerCase()}</span>
        <ol className={s.sintomas}>
          {b.pasos.map((p, i) => (
            <li key={p}>
              <i>{n2(i)}</i>
              {p}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Seccion({ b }: { b: Extract<Bloque, { tipo: "seccion" }> }) {
  return (
    <>
      <div className={s.seccion}>
        <span className="tag rv">sección {b.numero}</span>
        <h2 className={`${s.h2Grande} rv d1`}>{b.titulo}</h2>
        {b.items && (
          <ul className={`${s.indice} rv d2`}>
            {b.items.map((it) => (
              <li key={it} className="rotulo">
                {it}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Lista({ b }: { b: Extract<Bloque, { tipo: "lista" }> }) {
  return (
    <>
      <Encabezado tag={b.kicker} titulo={b.titulo} />
      <ol className={`${s.sintomas} ${s.sintomasAnchos} rv d2`}>
        {b.items.map((it, i) => (
          <li key={i}>
            <i>{n2(i)}</i>
            <span>
              {it.titulo && <b className={s.itemTitulo}>{it.titulo}</b>}
              {it.texto}
            </span>
          </li>
        ))}
      </ol>
      {b.conclusion && <p className={`${s.remate} rv d3`}>{b.conclusion}</p>}
    </>
  );
}

function Comparacion({ b }: { b: Extract<Bloque, { tipo: "comparacion" }> }) {
  const lado = (l: typeof b.antes, ahora: boolean) => (
    <div className={ahora ? s.ladoAhora : s.ladoAntes}>
      <span className={ahora ? "tag" : "tag hueco"}>{l.label}</span>
      <ul className={s.incluye}>
        {l.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      {l.nota && <p className={s.detalle}>{l.nota}</p>}
    </div>
  );
  return (
    <>
      <Encabezado tag={b.kicker} titulo={b.titulo} />
      <div className={`${s.grilla2} rv d2`}>
        {lado(b.antes, false)}
        {lado(b.ahora, true)}
      </div>
    </>
  );
}

function Grilla({ b }: { b: Extract<Bloque, { tipo: "grilla" }> }) {
  return (
    <>
      <Encabezado tag={b.kicker} titulo={b.titulo} />
      <div className={`${s.grillaAuto} rv d2`}>
        {b.items.map((it, i) => (
          <div key={it.titulo} className={s.columna}>
            <i className={s.numRojo}>{n2(i)}</i>
            <b className={s.colTitulo}>{it.titulo}</b>
            {it.subtitulo && <p className={s.diagnostico}>{it.subtitulo}</p>}
            {it.lineas?.map((l) => (
              <p key={l} className={s.detalle}>
                {l}
              </p>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Tabla({ b }: { b: Extract<Bloque, { tipo: "tabla" }> }) {
  return (
    <>
      <Encabezado tag={b.kicker} titulo={b.titulo} bajada={b.bajada} />
      <div className={`${s.tablaWrap} rv d2`}>
        <table className={s.tabla}>
          <thead>
            <tr>
              {b.columnas.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.filas.map((f, i) => (
              <tr key={i}>
                {f.map((celda, j) => (
                  <td key={j}>{celda}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cita({ b }: { b: Extract<Bloque, { tipo: "cita" }> }) {
  return (
    <div className={s.citaWrap}>
      {b.kicker && <span className="tag rv">{b.kicker}</span>}
      <blockquote className={`${s.cita} rv d1`}>“{b.cita}”</blockquote>
      {b.pie && (
        <div className={`${s.grilla3} rv d2`}>
          {b.pie.map((p) => (
            <div key={p.label} className={s.eje}>
              <i>{p.label}</i>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cierre({ b, fondo }: { b: Extract<Bloque, { tipo: "cierre" }>; fondo: Fondo }) {
  return (
    <>
      <div className={s.cierre}>
        <div className={s.cierreFila}>
          <h2 className={`bleed glow-rojo rv ${s.gracias}`}>{b.titulo}.</h2>
          <img className={`glow-sutil rv d1 ${s.sello}`} src={selloPara(fondo)} alt="Que no panda el cúnico · Panda producción audiovisual" />
        </div>
        {b.frase && <p className={`serif rv d2 ${s.frase}`}>{b.frase}</p>}
      </div>
    </>
  );
}

/** Recurso gráfico de fondo de la placa (va a nivel sección, no dentro del contenido). */
export function Decoracion({ b }: { b: Bloque }) {
  if (b.tipo === "portada") return <div className="tex" />;
  if (b.tipo === "cierre") return <div className="tex suave" />;
  if (b.tipo === "seccion")
    return (
      <span className="wmark" aria-hidden>
        {b.numero}
      </span>
    );
  return null;
}

export function BloqueVista({ b, cliente, fondo }: { b: Bloque; cliente: string; fondo: Fondo }) {
  switch (b.tipo) {
    case "portada":
      return <Portada b={b} cliente={cliente} />;
    case "semestre-anterior":
      return <SemestreAnterior b={b} />;
    case "columnas":
      return <Columnas b={b} />;
    case "metricas":
      return <Metricas b={b} />;
    case "desafio":
      return <Desafio b={b} />;
    case "territorios":
      return <Territorios b={b} />;
    case "seccion":
      return <Seccion b={b} />;
    case "lista":
      return <Lista b={b} />;
    case "comparacion":
      return <Comparacion b={b} />;
    case "grilla":
      return <Grilla b={b} />;
    case "tabla":
      return <Tabla b={b} />;
    case "cita":
      return <Cita b={b} />;
    case "cierre":
      return <Cierre b={b} fondo={fondo} />;
  }
}
