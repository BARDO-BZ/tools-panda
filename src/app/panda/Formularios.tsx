"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Cliente } from "@/lib/tipos";
import { crearCliente, crearUsuario, type EstadoForm } from "./acciones";
import s from "@/components/app/app.module.css";

function Mensaje({ estado }: { estado: EstadoForm }) {
  if (estado.error) return <p className={s.error}>{estado.error}</p>;
  if (estado.ok) return <p className={s.ok}>{estado.ok}</p>;
  return null;
}

/** limpia el formulario cuando la acción sale bien */
function useReset(estado: EstadoForm) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  return ref;
}

export function FormCliente() {
  const [estado, accion, enviando] = useActionState(crearCliente, {});
  const ref = useReset(estado);
  return (
    <form ref={ref} action={accion} className={s.form}>
      <label className={s.campoGrupo}>
        <span className="rotulo">Nombre del cliente</span>
        <input name="nombre" className={s.campo} required maxLength={80} placeholder="Sumatoria" />
      </label>
      <button className="btn" disabled={enviando}>
        {enviando ? "Creando…" : "Crear carpeta"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function FormUsuario({ clientes }: { clientes: Cliente[] }) {
  const [estado, accion, enviando] = useActionState(crearUsuario, {});
  const [rol, setRol] = useState<"cliente" | "panda">("cliente");
  const ref = useReset(estado);
  return (
    <form ref={ref} action={accion} className={s.form}>
      <div className={s.fila2}>
        <label className={s.campoGrupo}>
          <span className="rotulo">Nombre</span>
          <input name="nombre" className={s.campo} required maxLength={80} placeholder="Matías Pérez" />
        </label>
        <label className={s.campoGrupo}>
          <span className="rotulo">Mail</span>
          <input name="email" type="email" className={s.campo} required placeholder="matias@sumatoria.com" />
        </label>
      </div>
      <fieldset className={s.campoGrupo}>
        <legend className="rotulo">Tipo de acceso</legend>
        <div className={s.opciones}>
          <label>
            <input type="radio" name="rol" value="cliente" checked={rol === "cliente"} onChange={() => setRol("cliente")} /> Cliente · ve solo sus carpetas
          </label>
          <label>
            <input type="radio" name="rol" value="panda" checked={rol === "panda"} onChange={() => setRol("panda")} /> Equipo Panda · ve todo y administra
          </label>
        </div>
      </fieldset>
      {rol === "cliente" && (
        <fieldset className={s.campoGrupo}>
          <legend className="rotulo">Carpetas a las que accede</legend>
          {clientes.length ? (
            <div className={s.opciones}>
              {clientes.map((c) => (
                <label key={c.slug}>
                  <input type="checkbox" name="clientes" value={c.slug} defaultChecked={clientes.length === 1} /> {c.nombre}
                </label>
              ))}
            </div>
          ) : (
            <p className={s.suave}>Primero creá una carpeta en Clientes.</p>
          )}
        </fieldset>
      )}
      <button className="btn" disabled={enviando}>
        {enviando ? "Creando…" : "Crear y mandar invitación"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}
