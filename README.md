# tools-panda

Estrategias, planificaciones y reportes de redes de **Panda** para sus clientes, como web con
login. Todo sale con el mismo sistema visual de Panda (el del deck de propuestas, en modo claro).
Next.js 16 en Vercel + Supabase (base de datos, login y archivos).

| | |
|---|---|
| Repo | `github.com/BARDO-BZ/tools-panda` (privado) |
| Hosting | Vercel: cada `git push` a `main` deploya solo |
| Supabase | proyecto propio de Panda (`bojeehfsufbixiipmzzm`), separado del de Bardo |
| Setup desde cero | [`SETUP-SUPABASE.md`](SETUP-SUPABASE.md) |
| Lo que falta | [`PENDIENTES.md`](PENDIENTES.md) |

## Dos puntos de acceso, una sola app

Todos entran por **`/entrar`** con un link mágico por mail (sin contraseña). Nadie se registra
solo: los usuarios los crea el equipo. Según quién sea:

| | Ve | Puede |
|---|---|---|
| **Cliente** | solo las carpetas que tiene asignadas: `/<cliente>` (index por año y mes) y sus documentos | comentar y aprobar piezas, cerrar el feedback del mes |
| **Equipo Panda** | todo: `/panda` (clientes), `/panda/usuarios`, `/panda/subir` | crear carpetas y usuarios, subir y editar documentos |

A quien no tiene acceso a algo le responde **404** (no confirma que exista). La verificación
está en `src/lib/servidor/sesion.ts` y la hace cada página, endpoint y server action.

### Cómo funciona el login

1. `/entrar` → se pide el link (solo se manda si el mail tiene usuario; la respuesta es la misma
   exista o no, para no revelar quién tiene cuenta).
2. El link del mail pasa por Supabase y vuelve a `/auth/confirmar`.
3. Con la plantilla de mail de fábrica, la sesión llega en el `#` de la URL: `/auth/confirmar`
   la deriva a `/auth/entrando`, que la guarda en cookies y entra. Funciona aunque el mail se
   abra en otro dispositivo.
4. `src/proxy.ts` refresca la sesión en cada navegación.

Las invitaciones de usuarios nuevos siguen el mismo camino.

## Cargar contenido

`/panda/subir` → elegir la carpeta → soltar un **ZIP con `contenido.json` + placas**. Desde ahí
mismo se descargan ZIP de ejemplo (fuente en `ejemplos/`, se arman con `npm run ejemplos`), cada
uno con un `LEEME.txt` que explica cada campo.

- El ZIP se abre y se valida **en el navegador**: los errores aparecen antes de subir nada.
- Las placas pueden ir en PNG o JPG: se pasan solas a webp de 1080 px y suben directo a Supabase
  (no pasan por el servidor, así no chocan con el límite de 4,5 MB de Vercel).
- Proporciones: **feed 3:4** (1080 × 1440), **stories y reels 9:16** (1080 × 1920).
- **Editar** (en el index o en el documento) = soltar el ZIP corregido completo. Sube la versión;
  los comentarios de las piezas que mantienen su `id` se conservan.

Las skills de Claude (`skills/estrategia-panda`, `skills/planificacion-panda`) generan ese
mismo `contenido.json`.

## Estructura

```
src/lib/validar.ts           validador del contenido (navegador, servidor y `npm run validar`)
src/lib/servidor/sesion.ts   quién está logueado y qué puede ver
src/lib/servidor/almacen*.ts datos y archivos: Supabase en producción, .data/ en modo local
src/lib/sitio.ts             URL pública (tolera SITE_URL vacía o sin https://)
src/proxy.ts                 refresco de la sesión de Supabase
src/app/entrar, auth/        login: pedir link, confirmar, entrando
src/app/[cliente]/           index de la carpeta + vista de cada documento
src/app/panda/               panel del equipo: clientes, usuarios, subir
src/app/api/documentos       subida en dos pasos (preparar → subir placas → confirmar)
src/app/api/archivos         placas privadas: solo con sesión y acceso a la carpeta
src/app/api/feedback         comentarios, aprobaciones y cierre del feedback
supabase/schema.sql          tablas, RLS y bucket
ejemplos/                    fuente de los ZIP de ejemplo descargables
```

## Trabajar en local

```bash
npm install
npm run dev                                       # http://localhost:3000
npm run admin -- link --mail hola@bardo.bz        # link de acceso en la terminal (no manda mail)
```

Con `.env.local` cargado, `npm run dev` usa el **Supabase real**. Sin `.env.local`, corre en
**modo local**: todo se guarda en `.data/` y el link de acceso aparece en pantalla en `/entrar`.
Sirve para probar sin tocar datos reales.

### Comandos

| Comando | Para qué |
|---|---|
| `npm run admin -- link --mail <mail>` | Link de acceso de un solo uso, impreso en la terminal. Para entrar sin depender del mail (no se comparte: es una llave de la cuenta) |
| `npm run admin -- crear-usuario --mail <mail> --nombre "<nombre>" --rol panda` | Primer usuario del equipo. El resto se crea desde `/panda/usuarios` |
| `npm run admin -- crear-usuario --mail <mail> --nombre "<nombre>" --carpeta <slug>` | Usuario cliente con acceso a una carpeta |
| `npm run admin -- migrar migracion` | Sube a Supabase los documentos de `migracion/clientes/…` |
| `npm run validar -- archivo.zip` | Revisa un ZIP con el mismo validador que la web |
| `npm run ejemplos` | Rearma los ZIP de ejemplo desde `ejemplos/` |
| `npm run pdf -- --login` | Una vez: abre Chrome para entrar (el PDF necesita sesión) |
| `npm run pdf -- <cliente>/<slug> [publicaciones\|stories\|completo]` | Backup en PDF para Drive (sale en `pdf/`). También está el botón PDF en la web |

Antes de pushear: `npx tsc --noEmit`, `npx eslint src` y `npm run build` sin errores.

## Variables de entorno

En `.env.local` (local) y en Vercel → Settings → Environment Variables. Plantilla en `.env.example`.

| Variable | Valor | En Vercel |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Supabase → Project Settings → Data API) | Production y Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable key** (`sb_publishable_…`) | Production y Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_…`). Nunca al navegador ni al repo | Production y Preview, marcada *Sensitive* |
| `SITE_URL` | En local `http://localhost:3000`; en Vercel la URL pública (`https://….vercel.app` o el dominio propio) | Solo Production |
| `AVISO_WEBHOOK_URL` | Opcional: webhook (n8n) que avisa cuando un cliente cierra el feedback | Production |

Cada URL desde la que se entra tiene que estar también en Supabase → Authentication →
URL Configuration → **Redirect URLs**, con `/auth/confirmar` al final. Si falta, el link del
mail deja al usuario en una página de Supabase en vez de la app.

## Supabase: cosas a saber

- **Mails.** Sin SMTP propio, Supabase manda muy pocos mails por hora y **solo a miembros del
  equipo del proyecto en Supabase**: a un cliente no le llega nada. Con SMTP propio (Resend u
  otro, en Authentication → Emails → SMTP Settings) se levanta el límite y se pueden traducir
  las plantillas.
- **Pausa.** En el plan gratuito, el proyecto se pausa después de una semana sin uso: la URL deja
  de existir y la app no puede leer nada. Se reactiva desde el panel (**Restore project**) sin
  perder datos; los primeros minutos responde "Bad Gateway" o "no encuentra la tabla" hasta que
  termina de levantar. Con clientes reales: plan Pro, que no pausa.
- **Seguridad.** Todas las tablas tienen RLS activo y ninguna policy pública: la publishable key
  no lee ni escribe nada. Solo el servidor accede, con la secret key, después de verificar la
  sesión. El bucket `documentos` es privado y las placas se sirven con links firmados de una hora.

## Si algo falla

| Síntoma | Causa y solución |
|---|---|
| "Se mandaron demasiados links en la última hora" | Límite de mails de Supabase. Esperar, o entrar con `npm run admin -- link`. Solución de fondo: SMTP propio |
| "El link venció o ya se usó" | Los links sirven una sola vez y vencen (por defecto, en una hora). Pedir otro desde `/entrar` |
| El link deja en una página de Supabase | Falta la URL en *Redirect URLs* (ver arriba) |
| Nada carga, `ENOTFOUND` o "fetch failed" | Proyecto de Supabase pausado: reactivarlo |
| El build en Vercel falla con `ERR_INVALID_URL` | `SITE_URL` mal cargada. Ya se tolera vacía; revisar que tenga `https://` |
