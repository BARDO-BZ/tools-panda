"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import s from "@/components/app/app.module.css";

// Llegada desde el link mágico o la invitación con la plantilla de mail de fábrica de Supabase:
// la sesión viene en el #fragmento de la URL (#access_token=…&refresh_token=…), que solo el
// navegador puede leer. Se guarda en las cookies (las mismas que lee el servidor) y se entra.
export default function Entrando() {
  const [error, setError] = useState(false);

  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1));
    // sacar los tokens de la barra y del historial cuanto antes
    history.replaceState(null, "", location.pathname);
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    if (!access_token || !refresh_token) {
      location.replace("/entrar?error=link");
      return;
    }
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setError(true);
      else location.replace("/");
    });
  }, []);

  return (
    <main className={s.entrar}>
      <div className={s.entrarIn}>
        <span className="tag">panda</span>
        {error ? (
          <>
            <p className={s.entrarTitulo}>El link venció o ya se usó.</p>
            <Link href="/entrar" className="btn" style={{ width: "fit-content" }}>
              Pedir uno nuevo
            </Link>
          </>
        ) : (
          <p className={s.entrarTitulo}>Entrando…</p>
        )}
      </div>
    </main>
  );
}
