# Supabase de Panda: puesta en marcha

Sin estas variables la app corre en **modo local** (datos en `.data/`, sin mails). Para usarla
con clientes de verdad hace falta el proyecto de Supabase. Son ~15 minutos.

## 1 · Crear el proyecto

1. [supabase.com](https://supabase.com) → cuenta nueva de Panda → **New project**.
2. Nombre `tools-panda`, región **South America (São Paulo)**, contraseña de base fuerte
   (guardarla en 1Password; la app no la usa).

## 2 · Correr el esquema

**SQL Editor → New query**, pegar `supabase/schema.sql` entero y **Run**. Crea las tablas
(clientes, perfiles, accesos, documentos, comentarios, aprobaciones, cierres) y el bucket
privado `documentos`. Se puede volver a correr sin perder datos.

## 3 · Configurar el login

**Authentication → Sign In / Providers → Email**: activo. Desactivar **Allow new users to sign up**:
nadie se registra solo, los usuarios los crea el equipo.

**Authentication → URL Configuration**

- Site URL: la URL de producción (ej. `https://clientes.panda.bz`)
- Redirect URLs: agregar `https://clientes.panda.bz/auth/confirmar` y `http://localhost:3000/auth/confirmar`

**Plantillas de mail: no hace falta tocarlas.** La app funciona con las de fábrica (el link
vuelve a `/auth/confirmar` → `/auth/entrando`, que toma la sesión), también si el mail se abre
en otro dispositivo. Supabase solo deja editarlas con SMTP propio.

**SMTP propio (antes de invitar clientes).** El mail de fábrica de Supabase **solo manda a los
miembros del equipo del proyecto en Supabase** y muy pocos por hora: sirve para probar con tu
propio mail, no para clientes. En **Authentication → Emails → SMTP Settings** cargar un proveedor
(Resend, Postmark o el SMTP de Google Workspace) con un remitente tipo `hola@panda.bz` (Resend
pide verificar el dominio con registros DNS: se los pasa a Rama, como el CNAME).

Ya con SMTP, conviene traducir las plantillas (**Authentication → Emails → Templates**):
asunto y texto en castellano ("Tu link para entrar a Panda", "Te invitaron a Panda"). El link
puede quedar como está (`{{ .ConfirmationURL }}`).

## 4 · Variables

**Project Settings → API Keys / Data API**. En `.env.local` (desarrollo) y en Vercel (producción):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # "Publishable key" (o la "anon" en formato viejo)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...           # "Secret key" (o "service_role"): NUNCA al navegador ni al repo
SITE_URL=http://localhost:3000            # en .env.local; en Vercel, la URL de producción
```

La anon key puede ser pública: con RLS activo y sin policies no lee ni escribe nada.

## 5 · Primer usuario y migración

```bash
npm run admin -- crear-usuario --mail vos@panda.bz --nombre "Tu nombre" --rol panda
npm run admin -- migrar migracion     # sube los documentos del piloto (Sumatoria)
```

Llega la invitación por mail → entrar → desde **/panda/usuarios** se crea el resto.

## 6 · Verificar

- `/entrar` con un mail que **no** existe: dice "revisá tu mail" pero no llega nada (está bien:
  no revela quién tiene cuenta).
- Un usuario cliente solo ve su carpeta; `/panda` le da 404.
- Abrir una placa (`/api/archivos/...`) sin sesión: 404.
