import "server-only";
import { almacenLocal } from "./almacen-local";
import { almacenSupabase } from "./almacen-supabase";
import type { Almacen } from "./comun";

export * from "./comun";

// Todo lo que se guarda (clientes, usuarios, documentos, placas) pasa por acá.
// Con las variables de Supabase cargadas usa Supabase; sin ellas, en desarrollo, guarda en .data/
// (modo local: sirve para probar el flujo completo sin cuentas). En producción sin Supabase, falla.

export const conSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export function almacen(): Almacen {
  if (conSupabase) return almacenSupabase();
  if (process.env.NODE_ENV === "production") throw new Error("Faltan las variables de Supabase (ver .env.example)");
  return almacenLocal();
}

