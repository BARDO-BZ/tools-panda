"use client";

import { useCallback, useEffect, useState } from "react";
import type { EstadoPieza, Feedback, Formato, Pieza } from "@/lib/tipos";

/* ───────────── feedback contra /api/feedback ───────────── */

export function useFeedback(doc: string) {
  const [data, setData] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/feedback?doc=${encodeURIComponent(doc)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((d) => vivo && setData(d))
      .catch(() => vivo && setError("No pudimos cargar los comentarios."));
    return () => {
      vivo = false;
    };
  }, [doc]);

  const accion = useCallback(
    async (cuerpo: Record<string, unknown>) => {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, ...cuerpo }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error === "feedback cerrado" ? "El feedback de este mes ya está cerrado." : "No se pudo guardar. Probá de nuevo.");
        return false;
      }
      setError(null);
      setData(d);
      return true;
    },
    [doc],
  );

  return { data, error, accion };
}

/* ───────────── estados ───────────── */

export function estadoDe(f: Feedback | null, pieza: string): EstadoPieza {
  if (!f) return "pendiente";
  if (f.comentarios.some((c) => c.pieza === pieza && c.estado === "pendiente")) return "comentarios";
  if (f.aprobaciones.some((a) => a.pieza === pieza)) return "aprobada";
  return "pendiente";
}

export const NOMBRE_ESTADO: Record<EstadoPieza, string> = {
  pendiente: "Pendiente de revisión",
  comentarios: "Con comentarios",
  aprobada: "Aprobada",
};

export type EstadoMes = "aprobado" | "revision" | "correcciones";

export function resumen(f: Feedback | null, piezas: Pieza[]) {
  const cuenta = { aprobada: 0, comentarios: 0, pendiente: 0 };
  for (const p of piezas) cuenta[estadoDe(f, p.id)]++;
  const general: EstadoMes =
    cuenta.aprobada === piezas.length ? "aprobado" : cuenta.comentarios > 0 ? "correcciones" : "revision";
  return { ...cuenta, total: piezas.length, general };
}

export const NOMBRE_MES: Record<EstadoMes, string> = {
  aprobado: "Aprobado",
  revision: "En revisión",
  correcciones: "Pendiente de correcciones",
};

/* ───────────── fechas y textos ───────────── */

export function fechaLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const ddmm = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const FORMATO: Record<Formato, string> = {
  carrusel: "Carrusel",
  posteo: "Posteo",
  reel: "Reel",
  story: "Story",
};

export const etiquetaPieza = (p: Pieza) => `${p.formato === "story" ? "Story" : "Pieza"} ${String(p.numero).padStart(2, "0")}`;

export function hace(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
