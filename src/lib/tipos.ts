// Tipos del contenido. Cada documento es un JSON en content/clientes/<cliente>/<slug>.json
// y el template correspondiente lo renderiza. La skill genera el JSON; el template no se toca.

type DocBase = {
  cliente: string; // nombre visible: "Sumatoria"
  titulo: string; // "Estrategia semestral"
  periodo?: string; // "2° semestre 2026"
  /** año-mes con el que se ordena en el index del cliente (yyyy-mm). En planificaciones, si falta, se usa `mes` */
  fecha?: string;
};

/* ─────────────────────────── Estrategia ─────────────────────────── */

export type Bloque =
  | { tipo: "portada"; kicker?: string; titulo: string; bajada?: string }
  | {
      tipo: "semestre-anterior";
      titulo: string;
      periodo?: string;
      objetivos: string[];
      estrategia?: { resumen: string; items: { titulo: string; texto: string }[] };
      metas?: { canal: string; meta: string; logro: string; porcentaje: string }[];
    }
  | {
      tipo: "columnas";
      titulo: string;
      columnas: { titulo: string; diagnostico?: string; detalle?: string; hoy?: string }[];
      banda?: { label: string; texto: string };
    }
  | {
      tipo: "metricas";
      titulo?: string;
      canales: { canal: string; tiles: { valor: string; label: string; referencia?: string }[] }[];
      nota?: string;
    }
  | {
      tipo: "desafio";
      titulo: string;
      antes: { label: string; texto: string };
      despues: { label: string; texto: string };
      ejes: { titulo: string; texto: string; kpis: string[] }[];
      kpiGeneral?: { texto: string; embudo?: string };
    }
  | {
      tipo: "territorios";
      titulo?: string;
      territorios: { titulo: string; texto: string }[];
      pasosTitulo?: string;
      pasos: string[];
    }
  | { tipo: "seccion"; numero: string; titulo: string; items?: string[] }
  | { tipo: "lista"; kicker?: string; titulo: string; items: { titulo?: string; texto: string }[]; conclusion?: string }
  | {
      tipo: "comparacion";
      kicker?: string;
      titulo: string;
      antes: { label: string; items: string[]; nota?: string };
      ahora: { label: string; items: string[]; nota?: string };
    }
  | { tipo: "grilla"; kicker?: string; titulo: string; items: { titulo: string; subtitulo?: string; lineas?: string[] }[] }
  | { tipo: "tabla"; kicker?: string; titulo: string; bajada?: string; columnas: string[]; filas: string[][] }
  | { tipo: "cita"; kicker?: string; cita: string; pie?: { label: string; texto: string }[] }
  | { tipo: "cierre"; kicker?: string; titulo: string; frase?: string };

export type TipoBloque = Bloque["tipo"];

/** Fondos de la paleta Panda. Cada tipo de bloque tiene uno por defecto; se puede forzar. */
export type Fondo = "blanco" | "negro" | "rosa" | "rojo";

export type BloqueDoc = Bloque & {
  /** nombre de la placa (navegación y rótulo vertical) */
  label?: string;
  /** notas del orador, no se muestran */
  notas?: string;
  fondo?: Fondo;
};

export type Estrategia = DocBase & {
  tipo: "estrategia";
  bloques: BloqueDoc[];
};

/* ───────────────────────── Planificación ───────────────────────── */

export type Formato = "carrusel" | "posteo" | "reel" | "story";

export type Pieza = {
  /** id estable dentro del documento: "p01", "s03". Es la clave de comentarios y aprobaciones */
  id: string;
  numero: number;
  fecha: string; // ISO yyyy-mm-dd
  formato: Formato;
  titulo: string;
  redes?: string[];
  eje?: string;
  copy?: string;
  cta?: string;
  hashtags?: string[];
  objetivo?: string;
  links?: { label: string; url: string }[];
  /** rutas relativas a la carpeta de assets del documento */
  placas: string[];
  /** número de versión de la pieza (sube cuando se corrige) */
  version?: number;
};

export type Planificacion = DocBase & {
  tipo: "planificacion";
  mes: string; // yyyy-mm
  /** fecha límite de feedback (ISO yyyy-mm-dd) */
  feedbackHasta?: string;
  publicaciones: Pieza[];
  stories: Pieza[];
};

/* ──────────────────────────── Reporte ──────────────────────────── */

export type Reporte = DocBase & {
  tipo: "reporte";
  bloques: Estrategia["bloques"];
};

export type Documento = Estrategia | Planificacion | Reporte;

/* ─────────────────────────── Feedback ──────────────────────────── */

export type EstadoPieza = "pendiente" | "comentarios" | "aprobada";

export type Comentario = {
  id: string;
  pieza: string;
  autor: string;
  texto: string;
  estado: "pendiente" | "resuelto";
  creado: string;
  resuelto?: string | null;
};

export type Feedback = {
  comentarios: Comentario[];
  aprobaciones: { pieza: string; autor: string; fecha: string }[];
  cierre: { autor: string; fecha: string } | null;
};

/* ──────────────────── Usuarios, clientes, documentos ──────────────────── */

export type Rol = "panda" | "cliente";

export type Perfil = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** slugs de las carpetas (clientes) a las que tiene acceso. El equipo Panda ve todas */
  clientes: string[];
};

export type Cliente = {
  slug: string; // carpeta y URL: "sumatoria"
  nombre: string; // "Sumatoria"
};

export type TipoDocumento = Documento["tipo"];

/** Lo que se lista en el index (sin el contenido) */
export type DocMeta = {
  id: string;
  cliente: string; // slug
  slug: string;
  tipo: TipoDocumento;
  titulo: string;
  periodo?: string;
  fecha: string; // yyyy-mm
  version: number;
  actualizado: string; // ISO
  actualizadoPor?: string;
};

export type DocGuardado = DocMeta & { contenido: Documento };
