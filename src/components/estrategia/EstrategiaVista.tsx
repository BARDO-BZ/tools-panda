import type { Estrategia, Reporte } from "@/lib/tipos";
import { BloqueVista, Decoracion, FONDO } from "./Bloques";
import Navegacion from "./Navegacion";
import s from "./estrategia.module.css";

// Estrategia (y reporte, que comparte bloques): una placa por bloque, a pantalla completa,
// con el lenguaje del deck de Panda (rótulos verticales, folio, tag, tinta).
// Al imprimir, cada placa es una página 16:9.
export default function EstrategiaVista({ doc }: { doc: Estrategia | Reporte }) {
  const placas = doc.bloques.map((b, i) => ({ id: `placa-${i + 1}`, label: b.label ?? b.tipo, fondo: b.fondo ?? FONDO[b.tipo] }));
  const tipoDoc = doc.tipo === "reporte" ? "Reporte" : "Estrategia";
  return (
    <div className={s.doc}>
      <Navegacion placas={placas} titulo={`${doc.cliente} · ${doc.titulo}`} />
      {doc.bloques.map((b, i) => {
        const marco = b.tipo !== "cierre";
        return (
          <section key={i} id={placas[i].id} className={s.placa} data-fondo={placas[i].fondo} data-tipo={b.tipo}>
            <Decoracion b={b} />
            {marco && (
              <>
                <span className="lbl top">
                  {doc.cliente} · {b.tipo === "portada" ? tipoDoc : placas[i].label}
                </span>
                <span className="lbl bot">Panda</span>
              </>
            )}
            <div className={s.interior}>
              <BloqueVista b={b} cliente={doc.cliente} fondo={placas[i].fondo} />
            </div>
            {marco && <span className="num">{String(i + 1).padStart(2, "0")}</span>}
          </section>
        );
      })}
    </div>
  );
}
