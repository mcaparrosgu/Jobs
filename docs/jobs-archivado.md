---
type: n8n Workflow
title: Jobs · archivado
description: Archiva las candidaturas antiguas (descartadas/rechazadas siempre, pendientes con más de 7 días) de Ofertas_activas a Archivo.
resource: https://<N8N_HOST>/workflow/t4jxqH2wJyDF3EYt
tags: [n8n, empleo, google-sheets]
timestamp: 2026-08-27T18:00:00Z
---

# Proposito

Cuarta pieza del pipeline de búsqueda de empleo de Mar: mueve las candidaturas
resueltas o caducadas de `Ofertas_activas` a `Archivo`, para que la hoja activa
no crezca sin límite.

Separado de [Jobs · ingesta](jobs-ingesta.md) el 16 ago 2026. Hasta entonces el
archivado vivía en el mismo lienzo que la ingesta, compartiendo el
`Schedule Trigger`: un error en cualquiera de los Code nodes de la ingesta
(como ocurrió del 5 al 13 ago 2026, ver
[jobs-revision.md](jobs-revision.md#1-el-filtro-de-cualificación-no-tiene-ningún-efecto))
tumbaba también el archivado, aunque no tuviera relación con el fallo. Era el
"siguiente paso si vuelve a molestar" que quedó anotado en el punto 6 de esa
revisión.

- **ID:** `t4jxqH2wJyDF3EYt`
- **Estado:** activo desde el 16 ago 2026
- **Nodos:** 8 (6 hasta el 17 ago 2026, cuando entraron `Ping Healthchecks` y,
  el mismo día, `Hay para archivar`)
- **Hoja de calculo:** `n8n_jobs`, id `1JUM8rF4UmfeUI8gQFZ4jKVxjwKWltmVwAicpwG2xm-U`
  - pestana `Ofertas_activas` (`gid=0`) — de donde se borra
  - pestana `Archivo` (`gid=1758745884`) — donde se acumula

# Disparador

**Schedule Trigger** — a las **09:00 y 17:00**, en la zona horaria de
`GENERIC_TIMEZONE`. Mismo horario que [Jobs · ingesta](jobs-ingesta.md), pero
es un trigger independiente en un workflow distinto: un fallo aquí ya no puede
afectar a la ingesta ni viceversa.

**Vigilante propio desde el 17 ago 2026** — check dedicado en Healthchecks.io
(`Jobs n8n · archivado`, ping a `$env.HEALTHCHECKS_PING_URL_ARCHIVADO`). Hasta
entonces era el único de los cuatro workflows de Jobs sin ninguna
notificación de fallo (ver Fallos conocidos, ahora cerrado). Al compartir el
mismo `Schedule Trigger` fijo 09:00/17:00 que [Jobs ·
ingesta](jobs-ingesta.md), el check usa el mismo modo simple que ese: periodo
**1 día**, gracia **2 horas** — no el periodo laxo (3-7 días) de los checks
event-driven de seguimiento y generación CV, que no tienen una cadencia fija
con la que alinearse.

# Flujo

1. **`Analizar archivar`** (`googleSheets`, `executeOnce: true`) lee todas las
   filas de `Ofertas_activas`.
2. **`Decisión archivar`** (`code`) selecciona `descartada`/`rechazada`
   siempre, y `pendiente` con más de 7 días desde `fecha_guardado`. Si no
   encuentra ninguna, devuelve un único item centinela `{ _sinArchivar: true }`
   en vez de un array vacío (ver Fallos conocidos — es imprescindible para que
   el ping llegue igual).
3. **`Hay para archivar`** (`if`, desde el 17 ago 2026) — `true` si
   `$json._sinArchivar` es `true` (nada que archivar) → va directo a
   `Ping Healthchecks`. `false` (hay candidatas reales) → sigue la cadena
   normal.
4. **`Añadir filas a Archivo`** (`googleSheets`, `append`,
   `mappingMode: autoMapInputData`) las añade a `Archivo`.
5. **`Ordenar eliminación`** (`code`) las ordena por `row_number` descendente
   — imprescindible para no desordenar los índices al borrar de abajo hacia
   arriba.
6. **`Borrar ofertas ofertas_activas`** (`googleSheets`, `delete`,
   `startIndex: {{ $json.row_number }}`) las elimina una a una de
   `Ofertas_activas`.
7. **`Ping Healthchecks`** (`httpRequest`, desde el 17 ago 2026) — mismo
   patrón que [Jobs · ingesta](jobs-ingesta.md): `retryOnFail` 3 intentos/3s,
   `onError: continueRegularOutput` para que un fallo del ping no oculte que
   el borrado sí se completó. Recibe datos de **dos** ramas (`Hay para
   archivar` cuando no hay nada, y `Borrar ofertas ofertas_activas` cuando sí
   lo hay) — mutuamente excluyentes en cada ejecución, así que nunca hace
   ping doble.

Lógica y código copiados literalmente del workflow original — sin cambios de
comportamiento respecto a `Jobs · ingesta` antes del split, solo un
`Schedule Trigger` propio en vez de compartido.

# Dependencias

- **Credenciales n8n:** Google Sheets OAuth2 (`Google Sheets account`).
- **Variables de entorno** (via `$env`, requieren passthrough en
  `docker-compose.yml`): `HEALTHCHECKS_PING_URL_ARCHIVADO`.
- **Servicios externos de pago:** ninguno.

# Fallos conocidos

- `startIndex: {{ $json.row_number }}` **verificado sin off-by-one** con la
  fila de cabecera el 16 ago 2026, antes del split — ver el detalle en
  [jobs-revision.md](jobs-revision.md), punto 7.
- ~~Sin vigilante — es el único de los cuatro workflows de Jobs que no avisa si
  falla~~ **Corregido y verificado el 17 ago 2026.** Añadido `Ping
  Healthchecks` al final del flujo, mismo patrón que [Jobs ·
  seguimiento](jobs-seguimiento.md) y [Jobs · generación CV](jobs-generacion-cv.md):
  si `Analizar archivar` o cualquier otro nodo falla, el workflow sigue
  deteniéndose en silencio en ese punto (`onError` por defecto en el resto de
  nodos), pero ahora el check `Jobs n8n · archivado` en Healthchecks.io deja
  de recibir el ping y avisa.
- ~~El ping nunca llegaba en las pasadas sin nada que archivar~~ **Corregido
  el 17 ago 2026, detectado al verificar el punto anterior.** Primera
  ejecución manual real (#592): `Decisión archivar` no encontró ninguna fila
  que archivar y devolvió `[]`; en n8n una salida de 0 items **corta la
  cadena entera** — ni `Añadir filas a Archivo` ni `Ping Healthchecks` llegan
  a ejecutarse, aunque el workflow entero reporte `success`. El check se
  habría quedado en "Never" para siempre en cualquier pasada de las
  09:00/17:00 sin candidatas — que puede ser la mayoría de los días —,
  vaciando de contenido al vigilante que se acababa de añadir.

  Arreglado con el patrón que [Jobs · ingesta](jobs-ingesta.md) ya usaba para
  el mismo problema (su nodo `If` "¿hubo filas nuevas?"): `Decisión archivar`
  emite un item centinela `{ _sinArchivar: true }` cuando no hay nada que
  archivar, y el nuevo nodo `Hay para archivar` lo manda directo al ping sin
  pasar por el resto de la cadena (ver Flujo, pasos 2-3 y 7). Verificado con
  una segunda ejecución manual real (#593, con la hoja real sin candidatas en
  ese momento): el check pasó de "Never" a "14 seconds ago" en
  Healthchecks.io. Detalle del hallazgo en
  [tareas-manuales.md](../../docs/tareas-manuales.md).

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — de donde se separó el 16 ago 2026
- [Jobs · generación CV](jobs-generacion-cv.md)
- [Jobs · seguimiento](jobs-seguimiento.md)
- [Revision y mejoras propuestas](jobs-revision.md)
- [Formato y mantenimiento de la hoja n8n_jobs](jobs-hoja-formato.md) — este
  workflow copia `generar_cv_ia` a `Archivo` por cabecera y borra filas de
  `Ofertas_activas`; el formato lo repone un Apps Script aparte
- [index.md](../../docs/index.md)
