// URL pública del sitio, para los links de los mails y el Open Graph.
// Tolerante a variables vacías o mal escritas (ej. SITE_URL cargada vacía en Vercel, o sin
// "https://"): en ese caso usa el dominio de producción que informa Vercel y, si tampoco hay,
// devuelve null para que quien llame decida (por ejemplo, usar el host del pedido).

function normalizar(v: string | undefined): string | null {
  const t = v?.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//.test(t) ? t : `https://${t}`);
    return u.origin;
  } catch {
    return null;
  }
}

export function urlSitio(): string | null {
  return normalizar(process.env.SITE_URL) ?? normalizar(process.env.VERCEL_PROJECT_PRODUCTION_URL);
}
