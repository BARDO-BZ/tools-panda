"use client";

import { useActionState } from "react";
import { pedirLink, type EstadoEntrar } from "./acciones";
import s from "@/components/app/app.module.css";

export default function FormEntrar({ errorLink }: { errorLink: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoEntrar, FormData>(pedirLink, {});

  if (estado.enviado)
    return (
      <div className={s.entrarCaja}>
        <p className={s.entrarTitulo}>Revisá tu mail.</p>
        <p className={s.suave}>
          Si <b>{estado.enviado}</b> tiene acceso, te llega un link para entrar. Vence en una hora.
        </p>
        {estado.linkLocal && (
          <p className={s.aviso}>
            Modo local (sin mails): <a href={estado.linkLocal}>entrar con este link</a>
          </p>
        )}
      </div>
    );

  return (
    <form action={accion} className={s.entrarCaja}>
      <label className="rotulo" htmlFor="email">
        Tu mail
      </label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="nombre@empresa.com" className={s.campo} />
      {(estado.error || errorLink) && <p className={s.error}>{estado.error ?? "El link venció o ya se usó. Pedí uno nuevo."}</p>}
      <button className="btn" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviarme el link"}
      </button>
      <p className={s.suave}>Te mandamos un link para entrar, sin contraseña.</p>
    </form>
  );
}
