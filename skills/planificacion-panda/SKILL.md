---
name: planificacion-panda
description: Arma la planificación mensual de redes de un cliente de PANDA como ZIP (contenido.json + placas) listo para subir a tools-panda, donde el cliente la revisa con calendario, grid, vista por pieza, comentarios y aprobación. Usar cuando pidan cargar, crear, editar o exportar la planificación del mes de un cliente de Panda, o consultar en qué estado está (aprobadas, con comentarios). Pide la info que falte antes de escribir.
---

# Planificación Panda

Cada mes de cada cliente es **un ZIP** con `contenido.json` + las placas. El equipo lo suelta
en **/panda/subir** (o en "Editar" sobre la planificación existente). El template es uno solo y
no se toca. Los comentarios y aprobaciones del cliente viven en Supabase, no en el JSON.

| Pieza | Valor |
|---|---|
| Entregable | `planificacion-<cliente>-<aaaa-mm>.zip`: `contenido.json` + `placas/*.webp` |
| Dónde se sube | `/panda/subir` → carpeta del cliente → soltar el ZIP |
| URL resultante | `/<cliente>/planificacion-<aaaa-mm>` · pieza: `…#p04` (solo con login) |
| Tipos | `src/lib/tipos.ts` → `Planificacion` y `Pieza` |
| Ejemplo | `ejemplos/planificacion/` (contenido.json + placas de muestra + LEEME.txt) |
| Feedback | Supabase de Panda: tablas `comentarios`, `aprobaciones`, `cierres` (`supabase/schema.sql`) |

## 1 · Juntar la info (y pedir lo que falte)

Fuente: el brief del mes, la tarea de ClickUp o el PDF de la planificación. **Si falta algo,
preguntalo todo junto en un mensaje.** Por pieza hace falta:

- fecha, formato (carrusel / posteo / reel / story), título, red(es), eje
- copy completo (publicaciones), CTA
- las placas (PNG/JPG) en orden; reels: la portada + link al video (Drive)
- opcional: hashtags, objetivo, links

Y del mes: cliente, mes (`yyyy-mm`), **fecha límite de feedback**.

Si te pasan un PDF de la planificación vieja, sacá las placas y el copy de ahí (pymupdf:
`page.get_image_info()` para ubicar cada placa y `get_pixmap(clip=bbox)` para exportarla).

## 2 · Placas

Pueden ir en PNG o JPG: al subir, la web las pasa sola a webp de 1080 px. Si las preparás vos,
**webp, ~1080 px de ancho, calidad ~82** (unos 50–150 KB cada una):

```bash
python3 -c "from PIL import Image; im=Image.open('in.png').convert('RGB'); im.thumbnail((1080,1920)); im.save('out.webp','WEBP',quality=82)"
```

Nombres: `p01-1.webp, p01-2.webp…` (publicación 01, placa 1) y `s01-1.webp…` para stories.
Proporciones: **placas de feed 3:4** (1080×1440), **stories y reels 9:16** (1080×1920). Si llegan
en otra proporción, se ven recortadas al centro: pedir el export correcto.

## 3 · El JSON

Partí de `ejemplos/planificacion/contenido.json`. Del mes: `tipo: "planificacion"`, `titulo`,
`periodo`, **`mes`** (`"2026-10"`, ordena la carpeta del cliente) y `feedbackHasta`.

- `id` estable por pieza: `p01…` en publicaciones, `s01…` en stories. **No renumerar ids de un
  mes ya enviado**: los comentarios y aprobaciones están atados al id.
- `numero` es el que se ve ("Pieza 04"); `fecha` en `yyyy-mm-dd`.
- `placas`: nombres de archivo (sin carpeta). Dentro del ZIP pueden estar en cualquier carpeta:
  se buscan por nombre.
- Stories: una pieza por secuencia; si una secuencia tiene varias placas, van todas en `placas`.

## 4 · Estados (un solo vocabulario)

Por pieza: **Pendiente de revisión** · **Con comentarios** · **Aprobada**. Se calculan solos:
comentario sin resolver → "Con comentarios"; aprobada y sin comentarios pendientes → "Aprobada".
Comentar una pieza aprobada la vuelve a revisión.

Del mes: 🟢 Aprobado (todas aprobadas) · 🟡 En revisión · 🔴 Pendiente de correcciones (alguna con comentarios).

Cuando el cliente cierra el feedback ("Cerrar feedback"), ya no se puede comentar ni aprobar. Si
está configurado `AVISO_WEBHOOK_URL` (n8n), se dispara un aviso al equipo.

## 5 · Corregir una pieza (versiones)

Corregir las placas o el copy en el ZIP **manteniendo los `id`**, subir `"version": 2` en la
pieza y re-subir el ZIP completo con **Editar**. Las placas de cada versión del documento van a
una carpeta nueva, así que no hay problemas de caché. Después, marcar los comentarios como
resueltos.

## 6 · Consultar el estado

```bash
set -a && . ./.env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/comentarios?doc=eq.<cliente>/<slug>&estado=eq.pendiente&select=pieza,autor,texto,creado" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

O más simple: abrir el link. La cabecera muestra el estado del mes.

## 7 · Verificar, PDF y publicar

```bash
(cd carpeta-del-mes && zip -qr ../planificacion.zip contenido.json placas)
npm run validar -- planificacion.zip       # 0 errores (mismo validador que la web)
```

Subir el ZIP en `/panda/subir` y revisarlo en desktop y en mobile (390 px). PDF para Drive:

```bash
npm run pdf -- --login                                          # una vez
npm run pdf -- <cliente>/<slug> completo --base https://<dominio>   # o publicaciones / stories
```

Para probar sin tocar producción: `npm run dev` sin `.env.local` corre en modo local
(datos en `.data/`, el link de acceso aparece en pantalla).
