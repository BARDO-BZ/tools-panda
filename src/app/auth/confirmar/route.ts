import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { conSupabase } from "@/lib/servidor/almacen";
import { entrarLocal, supabaseSesion } from "@/lib/servidor/sesion";

// Destino del link mágico (y de la invitación). Acepta los cuatro formatos:
//  · #access_token=…       plantilla de fábrica de Supabase (sin SMTP propio) → /auth/entrando
//  · ?token_hash=…&type=…  plantillas de mail de Supabase con {{ .TokenHash }} (funciona aunque el mail
//                          se abra en otro dispositivo; es el recomendado, ver SETUP-SUPABASE.md)
//  · ?code=…               flujo PKCE por defecto (solo si se abre en el mismo navegador)
//  · ?local=…              modo local de desarrollo
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  let ok = false;

  // Plantilla de fábrica de Supabase: la sesión (o el error) viene después del "#", que el servidor
  // no ve. Se pasa a /auth/entrando, que la lee en el navegador (el navegador conserva el #
  // al seguir la redirección).
  if (!q.get("local") && !q.get("token_hash") && !q.get("code")) redirect(q.get("error") ? "/entrar?error=link" : "/auth/entrando");

  if (q.get("local")) ok = await entrarLocal(q.get("local")!);
  else if (conSupabase) {
    const sb = await supabaseSesion();
    if (q.get("token_hash") && q.get("type")) {
      ok = !(await sb.auth.verifyOtp({ token_hash: q.get("token_hash")!, type: q.get("type") as EmailOtpType })).error;
    } else if (q.get("code")) {
      ok = !(await sb.auth.exchangeCodeForSession(q.get("code")!)).error;
    }
  }
  redirect(ok ? "/" : "/entrar?error=link");
}
