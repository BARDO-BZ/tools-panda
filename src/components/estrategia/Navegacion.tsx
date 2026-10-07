"use client";

import { useEffect, useState } from "react";
import s from "./estrategia.module.css";

// Puntos por placa + botón de PDF + "↓ scroll". También prende la animación de entrada
// (.on) de cada placa cuando llega a pantalla, como el deck de propuestas.
export default function Navegacion({ placas, titulo }: { placas: { id: string; label: string; fondo: string }[]; titulo: string }) {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("on");
          if (e.intersectionRatio >= 0.5) setActual(placas.findIndex((p) => p.id === e.target.id));
        }
      },
      { threshold: [0.2, 0.5] },
    );
    placas.forEach((p) => {
      const el = document.getElementById(p.id);
      if (el) obs.observe(el);
    });
    // al imprimir, todo visible
    const antes = () => placas.forEach((p) => document.getElementById(p.id)?.classList.add("on"));
    addEventListener("beforeprint", antes);
    return () => {
      obs.disconnect();
      removeEventListener("beforeprint", antes);
    };
  }, [placas]);

  return (
    <>
      <nav className={s.nav} aria-label={titulo} data-fondo={placas[actual]?.fondo}>
        <ol className={s.puntos}>
          {placas.map((p, i) => (
            <li key={p.id}>
              <a href={`#${p.id}`} aria-current={i === actual} title={p.label}>
                <span className="sr">{p.label}</span>
              </a>
            </li>
          ))}
        </ol>
        <button className={s.pdf} onClick={() => window.print()} title="Descargar PDF">
          PDF
        </button>
      </nav>
      <div className={s.hint} data-off={actual > 0} data-fondo={placas[actual]?.fondo} aria-hidden>
        ↓ scroll
      </div>
    </>
  );
}
