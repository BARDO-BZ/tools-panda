-- tools-panda · esquema de Supabase (proyecto propio de Panda, separado del de Bardo)
-- Correr una vez en SQL Editor → New query → Run. Se puede volver a correr: no borra datos.
--
-- Seguridad: todas las tablas tienen RLS activo y NINGUNA policy pública. La anon key no puede
-- leer ni escribir nada; solo el servidor de Next (con la service role) accede, después de
-- verificar la sesión del usuario. El bucket de placas es privado: se sirve con links firmados.

-- ── carpetas de clientes ─────────────────────────────────────────────────────
create table if not exists clientes (
  slug    text primary key check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$'),
  nombre  text not null,
  creado  timestamptz not null default now()
);

-- ── usuarios (el login es Supabase Auth; acá el nombre, el rol y las carpetas) ─
create table if not exists perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  email   text not null unique,
  nombre  text not null,
  rol     text not null check (rol in ('panda', 'cliente')),
  creado  timestamptz not null default now()
);

create table if not exists accesos (
  perfil   uuid not null references perfiles (id) on delete cascade,
  cliente  text not null references clientes (slug) on delete cascade on update cascade,
  primary key (perfil, cliente)
);

-- ── documentos (estrategias, planificaciones, reportes) ──────────────────────
create table if not exists documentos (
  id               uuid primary key,
  cliente          text not null references clientes (slug) on delete cascade on update cascade,
  slug             text not null,
  tipo             text not null check (tipo in ('estrategia', 'planificacion', 'reporte', 'propuesta')),
  titulo           text not null,
  periodo          text,
  fecha            text not null check (fecha ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- yyyy-mm, ordena el index
  version          int  not null default 1,
  contenido        jsonb not null,
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now(),
  actualizado_por  text,
  unique (cliente, slug)
);
create index if not exists documentos_cliente_fecha on documentos (cliente, fecha desc);

-- ── feedback de planificaciones ──────────────────────────────────────────────
create table if not exists comentarios (
  id         uuid primary key default gen_random_uuid(),
  doc        text not null,               -- "<cliente>/<slug>"
  pieza      text not null,               -- id de la pieza: "p01", "s03"
  autor      text not null,
  texto      text not null check (char_length(texto) <= 4000),
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'resuelto')),
  creado     timestamptz not null default now(),
  resuelto   timestamptz
);
create index if not exists comentarios_doc on comentarios (doc, creado);

create table if not exists aprobaciones (
  doc    text not null,
  pieza  text not null,
  autor  text not null,
  fecha  timestamptz not null default now(),
  primary key (doc, pieza)
);

create table if not exists cierres (
  doc    text primary key,
  autor  text not null,
  fecha  timestamptz not null default now()
);

-- ── RLS: activo y sin policies (solo la service role pasa) ───────────────────
alter table clientes     enable row level security;
alter table perfiles     enable row level security;
alter table accesos      enable row level security;
alter table documentos   enable row level security;
alter table comentarios  enable row level security;
alter table aprobaciones enable row level security;
alter table cierres      enable row level security;

-- ── bucket privado para las placas ───────────────────────────────────────────
-- ruta: <cliente>/<id-del-documento>/v<version>/<archivo>.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 15728640, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
