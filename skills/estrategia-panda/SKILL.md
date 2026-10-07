---
name: estrategia-panda
description: Arma la estrategia semestral de redes de un cliente de PANDA como ZIP (contenido.json) listo para subir a tools-panda, donde se ve como web scrolleable con la marca Panda (una placa por bloque). Usar cuando pidan crear, editar o exportar una estrategia (o un reporte) de Panda para un cliente. Pide la info que falte antes de escribir. No es para propuestas comerciales (eso es propuestas-panda) ni para planificaciones mensuales (planificacion-panda).
---

# Estrategia Panda

La estrategia es un **`contenido.json`** que el template único de `tools-panda` renderiza como
web scrolleable. Nunca se escribe HTML a mano: se escribe el JSON, se comprime en un ZIP y el
equipo lo suelta en **/panda/subir** (o en "Editar" sobre la estrategia existente).

| Pieza | Valor |
|---|---|
| Entregable | `estrategia-<cliente>-<aaaa-mm>.zip` con `contenido.json` (las estrategias no llevan imágenes) |
| Dónde se sube | `/panda/subir` → carpeta del cliente → soltar el ZIP |
| URL resultante | `/<cliente>/estrategia-<aaaa-mm>` (solo con login) |
| Tipos | `src/lib/tipos.ts` → `Estrategia` y `Bloque` |
| Ejemplo completo | `ejemplos/estrategia/contenido.json` (los 13 tipos de bloque) |

## 1 · Juntar la info (y pedir lo que falte)

Antes de escribir, tené esto. **Si falta algo, preguntalo en un solo mensaje** con la lista de
lo que falta, no de a una pregunta. No inventes números ni metas.

- Cliente y período (ej. "2° semestre 2026").
- **Semestre anterior**: objetivos, estrategia propuesta, metas por canal (meta → logro → %).
- **Lo que pasó**: por eje, diagnóstico + el dato concreto de hoy. La frase que resume la evolución.
- **Crecimiento**: métricas por canal (Instagram, LinkedIn, Newsletter…), 4 por canal, con su
  referencia (vs. período anterior, mejor mes, etc.). Aclarar si las ventanas se superponen.
- **Nuevo desafío**: de qué foco a qué foco; los ejes con sus KPIs; el KPI general.
- **Territorios** y **próximos pasos**.
- **Frase de cierre** (posicionamiento).

Si mandan PNGs de placas viejas o un PDF, leelos y extraé los datos de ahí antes de preguntar.

## 2 · Elegir los bloques

La estructura no es fija: cada estrategia usa los bloques que necesita, en el orden que cuente
mejor la historia. Los tipos (ver `Bloque` en `src/lib/tipos.ts`):

| Tipo | Para qué |
|---|---|
| `portada` | kicker "Cliente × Panda", título, período |
| `semestre-anterior` | objetivos + estrategia + banda de metas (meta → logro → %) |
| `columnas` | 3 columnas con diagnóstico + bloque "Hoy", banda de cierre opcional |
| `metricas` | bandas por canal con grilla de 4 tiles (número + label + referencia) |
| `desafio` | antes → después, 3 ejes con KPIs, banda "KPI general" (fondo oscuro) |
| `territorios` | grilla 2×2 de territorios + lista numerada de próximos pasos |
| `seccion` | divisor de sección (Sección 01 · Dónde estamos) |
| `lista` | lista numerada con título opcional por ítem + conclusión |
| `comparacion` | antes / ahora en dos tarjetas |
| `grilla` | tarjetas libres (ej. rol por canal, KPIs por etapa) |
| `tabla` | tabla (ej. pilar → etapa → canal → idioma) |
| `cita` | frase grande + pie de 2-3 tarjetas |
| `cierre` | "Gracias" + frase de posicionamiento + sello de Panda |

El recorrido estándar de 7 placas (el de Sumatoria): `portada · semestre-anterior · columnas ·
metricas · desafio · territorios · cierre`. Para una estrategia por secciones (estilo Bastión):
`portada · seccion · comparacion · lista · seccion · cita · tabla · grilla · cierre`.

Cada bloque acepta además `label` (nombre de la placa en la navegación) y `notas` (notas del
orador, no se muestran).

Si hace falta un tipo de bloque nuevo: agregarlo a `Bloque` en `src/lib/tipos.ts`, escribir el
componente en `src/components/estrategia/Bloques.tsx`, sumarlo al switch de `BloqueVista` y a
`BLOQUES` en `src/lib/validar.ts`.

## 3 · Escribir el JSON

Partí de `ejemplos/estrategia/contenido.json`. Campos generales: `tipo: "estrategia"`,
`titulo`, `periodo` y **`fecha`** (`"2026-07"`: año-mes con el que se ordena en la carpeta del
cliente; para un 2° semestre, julio). `cliente` es opcional: al subir se usa el de la carpeta.

**Estilo**: todo sale con la paleta y el lenguaje de Panda (blanco, negro, rojo, rosa; tag "/ texto /_",
rótulos verticales, tinta). No hay colores por cliente: no agregues `tema`. Cada tipo de bloque
tiene su fondo por defecto (el blanco manda, es modo claro; `columnas` y `grilla` van en rosa; `desafio` y
`cita`, en rojo). Si dos placas seguidas quedan del mismo color y conviene cortar, forzalo con
`"fondo": "blanco" | "negro" | "rosa" | "rojo"` en el bloque.

El nombre del cliente sale sangrado en la portada (se ajusta solo al largo). Evitá el guion
largo (–) en textos que van en serif (`bajada`, `periodo`, `frase`): PP Mondwest no lo tiene.

**Voz**: todo sale como Panda. El kicker es "Cliente × Panda". No dejes "Bardo" en ningún lado
(el validador avisa).

## 4 · Verificar

```bash
mkdir -p /tmp/estr && cp contenido.json /tmp/estr/ && (cd /tmp/estr && zip -q ../estrategia.zip contenido.json)
npm run validar -- /tmp/estrategia.zip      # 0 errores (mismo validador que la web)
```

Al soltarlo en la web también se valida antes de publicar. Después de subirlo, mirarlo en
desktop y en mobile (390 px): que ninguna placa desborde, que los números se lean.

## 5 · PDF (backup a Drive)

```bash
npm run pdf -- --login                       # una vez (abre Chrome para entrar)
npm run pdf -- <cliente>/<slug> --base https://<dominio>
```

Sale en `pdf/` (no se commitea), una página 16:9 por placa. Se sube a mano a Drive.
Desde la web, el botón **PDF** de la barra lateral hace lo mismo con el diálogo de impresión.

## 6 · Publicar

Se publica subiendo el ZIP en `/panda/subir` (documento nuevo) o con **Editar** sobre la
estrategia que ya existe (reemplaza el contenido y sube la versión). No hay `git push` de
contenido. El cliente la ve en su carpeta (`/<cliente>`), ordenada por año y mes, con su login.
