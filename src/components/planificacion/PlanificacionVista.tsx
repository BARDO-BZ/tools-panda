"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Pieza, Planificacion } from "@/lib/tipos";
import { DIAS, FORMATO, NOMBRE_ESTADO, NOMBRE_MES, ddmm, estadoDe, etiquetaPieza, fechaLocal, resumen, useFeedback } from "./datos";
import PiezaDetalle from "./PiezaDetalle";
import Impresion from "./Impresion";
import s from "./planificacion.module.css";

type Solapa = "publicaciones" | "stories";
type Vista = "calendario" | "grid";

export default function PlanificacionVista({ plan, docId, assets }: { plan: Planificacion; docId: string; assets: string }) {
  const { data, error, accion } = useFeedback(docId);
  const [solapa, setSolapa] = useState<Solapa>("publicaciones");
  const [vista, setVista] = useState<Vista>("calendario");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [menuPdf, setMenuPdf] = useState(false);

  const todas = useMemo(() => [...plan.publicaciones, ...plan.stories], [plan]);
  const piezas = solapa === "publicaciones" ? plan.publicaciones : plan.stories;
  const res = resumen(data, todas);
  const cerrado = data?.cierre ?? null;

  // Link directo por pieza: …/planificacion-xxx#p04
  useEffect(() => {
    const leer = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const p = todas.find((x) => x.id === id);
      setAbierta(p ? p.id : null);
      if (p) setSolapa(p.formato === "story" ? "stories" : "publicaciones");
    };
    leer();
    addEventListener("hashchange", leer);
    return () => removeEventListener("hashchange", leer);
  }, [todas]);

  const abrir = (id: string) => {
    history.pushState(null, "", `#${id}`);
    setAbierta(id);
  };
  const cerrarDetalle = () => {
    history.pushState(null, "", location.pathname + location.search);
    setAbierta(null);
  };


  const imprimir = (que: "publicaciones" | "stories" | "completo") => {
    setMenuPdf(false);
    document.documentElement.dataset.imprimir = que;
    const limpiar = () => {
      delete document.documentElement.dataset.imprimir;
      removeEventListener("afterprint", limpiar);
    };
    addEventListener("afterprint", limpiar);
    requestAnimationFrame(() => window.print());
  };

  const piezaAbierta = todas.find((p) => p.id === abierta) ?? null;
  const vencido = plan.feedbackHasta ? fechaLocal(plan.feedbackHasta) < new Date(new Date().toDateString()) : false;

  return (
    <div className={s.app}>
      {/* ── 01 · portada + estado del mes ── */}
      <header className={s.cabecera}>
        <div className="tex suave" />
        <span className="lbl top">{plan.cliente} · Planificación</span>
        <span className="lbl bot">Panda</span>
        <div className={s.cabeceraIn}>
          <span className="tag">{plan.titulo.toLowerCase()}</span>
          <h1 className={`bleed glow-rojo ${s.cliente}`} style={{ "--len": Math.max(plan.cliente.length, 5) } as CSSProperties}>
            {plan.cliente}
          </h1>
          <p className={`serif ${s.mes}`}>_ / {plan.periodo} /</p>

        <div className={s.estado} data-estado={res.general}>
          <div className={s.estadoFila}>
            <span className={s.semaforo} aria-hidden />
            <strong>{NOMBRE_MES[res.general]}</strong>
            <span className={s.porc}>{res.total ? Math.round((res.aprobada / res.total) * 100) : 0}%</span>
          </div>
          <div className={s.barraProgreso} role="progressbar" aria-valuenow={res.aprobada} aria-valuemax={res.total}>
            <span style={{ width: `${(res.aprobada / Math.max(res.total, 1)) * 100}%` }} data-tipo="ok" />
            <span style={{ width: `${(res.comentarios / Math.max(res.total, 1)) * 100}%` }} data-tipo="coment" />
          </div>
          <ul className={s.cuentas}>
            <li>
              <b>
                {res.aprobada}/{res.total}
              </b>{" "}
              aprobadas
            </li>
            <li>
              <b>{res.comentarios}</b> con comentarios
            </li>
            <li>
              <b>{res.pendiente}</b> pendientes de revisión
            </li>
          </ul>
          <div className={s.cierre}>
            {cerrado ? (
              <p className="rotulo">
                Feedback cerrado · {cerrado.autor} · {new Date(cerrado.fecha).toLocaleDateString("es-AR")}
              </p>
            ) : (
              <>
                {plan.feedbackHasta && (
                  <p className="rotulo" data-vencido={vencido}>
                    Feedback hasta el {ddmm(plan.feedbackHasta)}
                  </p>
                )}
                <button
                  className="btn chico"
                  disabled={!data}
                  onClick={() => {
                    if (confirm("¿Cerrar el feedback del mes? Le avisamos al equipo y ya no se pueden sumar comentarios.")) accion({ accion: "cerrar" });
                  }}
                >
                  Cerrar feedback
                </button>
              </>
            )}
          </div>
        </div>
        {error && <p className={s.error}>{error}</p>}
        </div>
      </header>

      {/* ── barra: solapas + vista + PDF ── */}
      <div className={s.barra}>
        <div className={s.solapas} role="tablist">
          {(["publicaciones", "stories"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={solapa === t} onClick={() => setSolapa(t)}>
              {t === "publicaciones" ? "Publicaciones" : "Stories"}
              <span className={s.contador}>{(t === "publicaciones" ? plan.publicaciones : plan.stories).length}</span>
            </button>
          ))}
        </div>
        <div className={s.derecha}>
          {solapa === "publicaciones" && (
            <div className={s.switch} role="group" aria-label="Vista">
              {(["calendario", "grid"] as const).map((v) => (
                <button key={v} aria-pressed={vista === v} onClick={() => setVista(v)}>
                  {v === "calendario" ? "Calendario" : "Grid"}
                </button>
              ))}
            </div>
          )}
          <div className={s.pdfWrap}>
            <button className="btn ghost chico" onClick={() => setMenuPdf((m) => !m)} aria-expanded={menuPdf}>
              Descargar PDF
            </button>
            {menuPdf && (
              <div className={s.menu}>
                <button onClick={() => imprimir("publicaciones")}>Publicaciones</button>
                <button onClick={() => imprimir("stories")}>Stories</button>
                <button onClick={() => imprimir("completo")}>Completo</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── contenido ── */}
      <main className={s.contenido}>
        {solapa === "publicaciones" && vista === "calendario" && (
          <Calendario mes={plan.mes} piezas={piezas} estado={(id) => estadoDe(data, id)} abrir={abrir} />
        )}
        {(solapa === "stories" || vista === "grid") && (
          <div className={solapa === "stories" ? s.grillaStories : s.grilla}>
            {piezas.map((p) => (
              <Tarjeta key={p.id} p={p} assets={assets} estado={estadoDe(data, p.id)} abrir={abrir} />
            ))}
          </div>
        )}
      </main>

      <footer className={s.pie}>
        <img className="glow-sutil" src="/logos/panda-sello-negro.svg" alt="Que no panda el cúnico · Panda producción audiovisual" />
        <span className="serif">_ / desarrollado por Panda /</span>
      </footer>

      {piezaAbierta && (
        <PiezaDetalle
          key={piezaAbierta.id} // al pasar a otra pieza, el slider arranca de cero
          p={piezaAbierta}
          assets={assets}
          feedback={data}
          cerrado={Boolean(cerrado)}
          estado={estadoDe(data, piezaAbierta.id)}
          accion={accion}
          cerrar={cerrarDetalle}
          vecinas={piezaAbierta.formato === "story" ? plan.stories : plan.publicaciones}
          abrir={abrir}
        />
      )}


      <Impresion plan={plan} assets={assets} feedback={data} />
    </div>
  );
}

function Chip({ estado }: { estado: ReturnType<typeof estadoDe> }) {
  return (
    <span className={s.chip} data-estado={estado}>
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}

function Tarjeta({ p, assets, estado, abrir }: { p: Pieza; assets: string; estado: ReturnType<typeof estadoDe>; abrir: (id: string) => void }) {
  return (
    <button className={s.tarjeta} onClick={() => abrir(p.id)}>
      <div className={s.portadaPieza} data-formato={p.formato}>
        {p.placas[0] && <img src={`${assets}/${p.placas[0]}`} alt="" loading="lazy" />}
        {p.placas.length > 1 && <span className={s.cantidad}>1/{p.placas.length}</span>}
      </div>
      <div className={s.tarjetaInfo}>
        <span className="rotulo">
          {etiquetaPieza(p)} · {ddmm(p.fecha)} · {FORMATO[p.formato]}
        </span>
        <p className={s.tarjetaTitulo}>{p.titulo}</p>
        <Chip estado={estado} />
      </div>
    </button>
  );
}

function Calendario({
  mes,
  piezas,
  estado,
  abrir,
}: {
  mes: string;
  piezas: Pieza[];
  estado: (id: string) => ReturnType<typeof estadoDe>;
  abrir: (id: string) => void;
}) {
  const [y, m] = mes.split("-").map(Number);
  const primero = new Date(y, m - 1, 1);
  const dias = new Date(y, m, 0).getDate();
  const offset = (primero.getDay() + 6) % 7; // lunes primero
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  while (celdas.length % 7) celdas.push(null);
  const delDia = (d: number) => piezas.filter((p) => fechaLocal(p.fecha).getDate() === d && fechaLocal(p.fecha).getMonth() === m - 1);

  return (
    <>
      {/* desktop: grilla del mes */}
      <div className={s.calendario}>
        {DIAS.map((d) => (
          <div key={d} className={`rotulo ${s.diaSemana}`}>
            {d}
          </div>
        ))}
        {celdas.map((d, i) => (
          <div key={i} className={s.dia} data-vacio={d === null}>
            {d && <span className={s.numDia}>{d}</span>}
            {d &&
              delDia(d).map((p) => (
                <button key={p.id} className={s.evento} data-estado={estado(p.id)} onClick={() => abrir(p.id)}>
                  <span className="rotulo">
                    {etiquetaPieza(p)} · {FORMATO[p.formato]}
                  </span>
                  <span className={s.eventoTitulo}>{p.titulo}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
      {/* mobile: agenda */}
      <ol className={s.agenda}>
        {piezas.map((p) => (
          <li key={p.id}>
            <button onClick={() => abrir(p.id)} data-estado={estado(p.id)}>
              <span className={s.agendaFecha}>
                <b>{fechaLocal(p.fecha).getDate()}</b>
                <span className="rotulo">{DIAS[(fechaLocal(p.fecha).getDay() + 6) % 7]}</span>
              </span>
              <span className={s.agendaInfo}>
                <span className="rotulo">
                  {etiquetaPieza(p)} · {FORMATO[p.formato]}
                </span>
                <span className={s.eventoTitulo}>{p.titulo}</span>
                <Chip estado={estado(p.id)} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
