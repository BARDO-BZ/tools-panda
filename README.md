# tools-panda

Estrategias, planificaciones y reportes de redes de **Panda** para sus clientes, como web con
login. Todo sale con el mismo sistema visual de Panda (el del deck de propuestas). Next.js en
Vercel + Supabase (base, login y archivos).

## Dos puntos de acceso, una sola app

Todos entran por **`/entrar`** con un link mágico por mail (sin contraseña). Según quién sea:

| | Ve | Puede |
|---|---|---|
| **Cliente** | solo las carpetas que tiene asignadas: `/<cliente>` (index por año y mes) y sus documentos | comentar y aprobar piezas, cerrar el feedback del mes |
| **Equipo Panda** | todo: `/panda` (clientes), `/panda/usuarios`, `/panda/subir` | crear carpetas y usuarios, subir y editar documentos |

A quien no tiene acceso a algo le responde 404 (no confirma que exista). La verificación está
en `src/lib/servidor/sesion.ts` y la hace cada página, endpoint y server action.

## Cargar contenido

`/panda/subir` → elegir la carpeta → soltar un **ZIP con `contenido.json` + placas**. Desde ahí
mismo se descargan ZIP de ejemplo (`ejemplos/` → `npm run ejemplos`) con un LEEME de cada campo.

- El ZIP se abre y se valida **en el navegador**: los errores aparecen antes de subir nada.
- Las placas se pasan solas a webp de 1080 px y suben directo al almacenamiento.
- **Editar** (en el index o en el documento) = soltar el ZIP corregido completo. Sube la versión;
  los comentarios de las piezas que mantienen su `id` se conservan.

Las skills de Claude (`skills/`) generan ese mismo `contenido.json`.

## Estructura

```
src/lib/validar.ts           validador del contenido (navegador, servidor y `npm run validar`)
src/lib/servidor/sesion.ts   quién está logueado y qué puede ver
src/lib/servidor/almacen*.ts datos y archivos: Supabase en producción, .data/ en modo local
src/app/[cliente]/           index de la carpeta + vista de cada documento
src/app/panda/               panel del equipo
src/app/api/documentos       subida en dos pasos (preparar → subir placas → confirmar)
src/app/api/archivos         placas privadas: solo con sesión y acceso a la carpeta
supabase/schema.sql          tablas, RLS y bucket
```

## Trabajar

```bash
npm install
npm run dev                                   # modo local si no hay .env.local
npm run admin -- crear-usuario --mail vos@panda.bz --nombre "Vos" --rol panda
npm run admin -- migrar migracion             # documentos del piloto (Sumatoria)
npm run validar -- archivo.zip                # revisar un ZIP antes de subirlo
npm run ejemplos                              # rearmar los ZIP de ejemplo
npm run pdf -- --login                        # una vez; después:
npm run pdf -- <cliente>/<slug> [publicaciones|stories|completo]
npm run build
```

**Modo local**: sin variables de Supabase, todo se guarda en `.data/` y el link de acceso
aparece en pantalla en vez de mandarse por mail. Sirve para desarrollar y probar; no para clientes.

## Producción

Ver `SETUP-SUPABASE.md` (proyecto, esquema, plantillas de mail, SMTP, variables) y `PENDIENTES.md`.
