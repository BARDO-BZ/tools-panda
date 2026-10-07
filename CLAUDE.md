@AGENTS.md

# tools-panda

- Solo Panda. Nada de Bardo en copy, marca ni infraestructura (Supabase propio de Panda).
- El contenido NO vive en el repo: se sube desde `/panda/subir` (ZIP con contenido.json + placas)
  y se guarda en Supabase (o en `.data/` en modo local). Los templates no se tocan para cargar un
  documento. Para un bloque o campo nuevo: `src/lib/tipos.ts` → componente → `src/lib/validar.ts`.
- Permisos: toda página, route handler y server action verifica con `src/lib/servidor/sesion.ts`
  (`requerirSesion`, `requerirPanda`, `puedeVer`, `accesoA`). Sin acceso → 404, nunca 403.
- Nunca poner datos de clientes en `public/`: las placas se sirven por `/api/archivos` con sesión.
- Antes de pushear: `npx tsc --noEmit`, `npx eslint src` y `npm run build` sin errores.
- Sin `vercel deploy` a mano: el código se publica con `git push`.
- Marca: un solo sistema visual, el del deck de propuestas de Panda (`referencias/referencia.html`, local, no se versiona).
  Paleta, tag, rótulos verticales, tinta, titular sangrado y botones viven en `src/app/globals.css`;
  tipografías en `src/app/layout.tsx`. Sin colores por cliente. Modo claro: los colores de
  base salen de los tokens `--bg`, `--fg`, `--sub`, `--panel`, `--linea` de globals.css.
- Impresión: las medidas de la estrategia usan `--u` (no `vw`) y las páginas van con `@page`
  con nombre (`placa`, `hoja`) porque la ruta carga los dos CSS.
