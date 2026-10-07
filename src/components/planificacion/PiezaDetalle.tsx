"use client";

import { useEffect, useRef, useState } from "react";
import type { EstadoPieza, Feedback, Pieza } from "@/lib/tipos";
import { FORMATO, NOMBRE_ESTADO, ddmm, etiquetaPieza, hace } from "./datos";
import s from "./planificacion.module.css";

// Vista individual. Publicaciones: 50/50 (placa grande con slider | info). Stories: marco de
// celular vertical con la secuencia. En mobile todo se apila y el slider anda con el dedo.
export default function PiezaDetalle({
  p,
  assets,
  feedback,
  cerrado,
  estado,
  accion,
  cerrar,
  vecinas,
  abrir,
}: {
  p: Pieza;
  assets: string;
  feedback: Feedback | null;
  cerrado: boolean;
  estado: EstadoPieza;
  accion: (cuerpo: Record<string, unknown>) => Promise<boolean>;
  cerrar: () => void;
  vecinas: Pieza[];
  abrir: (id: string) => void;
}) {
  const [placa, setPlaca] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pista = useRef<HTMLDivElement>(null);
  const comentarios = feedback?.comentarios.filter((c) => c.pieza === p.id) ?? [];
  const aprobada = estado === "aprobada";
  const story = p.formato === "story";
  const idx = vecinas.findIndex((v) => v.id === p.id);
  const anterior = vecinas[idx - 1];
  const siguiente = vecinas[idx + 1];

  // Esc cierra; flechas recorren placas
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") ir(placa + 1);
      if (e.key === "ArrowLeft") ir(placa - 1);
    };
    addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  });

  function ir(i: number) {
    const el = pista.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(p.placas.length - 1, i));
    el.scrollTo({ left: destino * el.clientWidth, behavior: "smooth" });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    const ok = await accion({ accion: "comentar", pieza: p.id, texto });
    setEnviando(false);
    if (ok) setTexto("");
  }

  return (
    <div className={s.capa} role="dialog" aria-modal aria-label={`${etiquetaPieza(p)} · ${p.titulo}`}>
      <div className={s.detalle} data-story={story || p.formato === "reel"} data-formato={p.formato}>
        {/* ── placas ── */}
        <div className={s.visor}>
          <div className={story ? s.celular : s.marcoPlaca} data-formato={p.formato}>
            <div
              ref={pista}
              className={s.pista}
              onScroll={(e) => {
                const el = e.currentTarget;
                setPlaca(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {p.placas.map((src, i) => (
                <img key={src} src={`${assets}/${src}`} alt={`Placa ${i + 1} de ${p.placas.length}`} draggable={false} />
              ))}
            </div>
            {story && p.placas.length > 1 && (
              <>
                <div className={s.barritas}>
                  {p.placas.map((_, i) => (
                    <span key={i} data-activa={i <= placa} />
                  ))}
                </div>
                {/* como en Instagram: tocar a la izquierda vuelve, a la derecha avanza (con mouse);
                    en el teléfono se desliza con el dedo */}
                <button className={s.tapIzq} onClick={() => ir(placa - 1)} aria-label="Placa anterior" />
                <button className={s.tapDer} onClick={() => ir(placa + 1)} aria-label="Placa siguiente" />
              </>
            )}
          </div>
          {!story && p.placas.length > 1 && (
            <div className={s.controles}>
              <button onClick={() => ir(placa - 1)} disabled={placa === 0} aria-label="Placa anterior">
                ←
              </button>
              <span className="rotulo">
                {placa + 1} / {p.placas.length}
              </span>
              <button onClick={() => ir(placa + 1)} disabled={placa === p.placas.length - 1} aria-label="Placa siguiente">
                →
              </button>
            </div>
          )}
        </div>

        {/* ── info ── */}
        <div className={s.info}>
          <div className={s.infoCabecera}>
            <span className="rotulo">
              {etiquetaPieza(p)} · {ddmm(p.fecha)} · {FORMATO[p.formato]}
              {p.version && p.version > 1 ? ` · V${p.version}` : ""}
            </span>
            <button className={s.cerrar} onClick={cerrar} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <h2 className={s.infoTitulo}>{p.titulo}</h2>
          <span className={s.chip} data-estado={estado}>
            {NOMBRE_ESTADO[estado]}
          </span>

          <dl className={s.datos}>
            {p.redes && (
              <>
                <dt className="rotulo">Redes</dt>
                <dd>{p.redes.join(" · ")}</dd>
              </>
            )}
            {p.eje && (
              <>
                <dt className="rotulo">Eje</dt>
                <dd>{p.eje}</dd>
              </>
            )}
            {p.objetivo && (
              <>
                <dt className="rotulo">Objetivo</dt>
                <dd>{p.objetivo}</dd>
              </>
            )}
            {p.cta && (
              <>
                <dt className="rotulo">CTA</dt>
                <dd>{p.cta}</dd>
              </>
            )}
          </dl>

          {p.copy && (
            <div className={s.copy}>
              <span className="rotulo">Copy</span>
              <p>{p.copy}</p>
            </div>
          )}
          {p.hashtags && p.hashtags.length > 0 && <p className={s.hashtags}>{p.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>}
          {p.links && p.links.length > 0 && (
            <div className={s.links}>
              {p.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn ghost">
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}

          {/* ── aprobación ── */}
          <div className={s.acciones}>
            <button
              className={aprobada ? "btn ok" : "btn"}
              disabled={cerrado || !feedback}
              onClick={() => accion({ accion: aprobada ? "desaprobar" : "aprobar", pieza: p.id })}
            >
              {aprobada ? "Aprobada ✓" : "Aprobar"}
            </button>
            {!cerrado && (
              <a href="#comentar" className="btn ghost" onClick={(e) => (e.preventDefault(), document.getElementById("comentar")?.focus())}>
                Dejar comentario
              </a>
            )}
          </div>

          {/* ── comentarios ── */}
          <section className={s.comentarios}>
            <span className="rotulo">Comentarios ({comentarios.length})</span>
            {comentarios.map((c) => (
              <article key={c.id} className={s.comentario} data-estado={c.estado}>
                <header>
                  <b>{c.autor}</b>
                  <span>{hace(c.creado)}</span>
                </header>
                <p>{c.texto}</p>
                <button className={s.resolver} onClick={() => accion({ accion: c.estado === "pendiente" ? "resolver" : "reabrir", id: c.id })}>
                  {c.estado === "pendiente" ? "Marcar resuelto" : "Resuelto ✓ · reabrir"}
                </button>
              </article>
            ))}
            {cerrado ? (
              <p className={s.suave}>El feedback de este mes está cerrado.</p>
            ) : (
              <form onSubmit={enviar} className={s.form}>
                <textarea
                  id="comentar"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="＋ Agregar comentario"
                  rows={3}
                  maxLength={4000}
                />
                <button className="btn" disabled={enviando || !texto.trim()}>
                  {enviando ? "Enviando…" : "Comentar"}
                </button>
              </form>
            )}
          </section>

          <nav className={s.vecinas}>
            {anterior ? (
              <button onClick={() => abrir(anterior.id)}>← {etiquetaPieza(anterior)}</button>
            ) : (
              <span />
            )}
            {siguiente && <button onClick={() => abrir(siguiente.id)}>{etiquetaPieza(siguiente)} →</button>}
          </nav>
        </div>
      </div>
    </div>
  );
}
