---
type: Nota
title: Tareas pendientes · Jobs
description: Tareas manuales y de seguimiento abiertas del pipeline de empleo, con contexto y criterio de cierre. Creada el 29 ago 2026 tras el incidente del hueco de filas vacías en Ofertas_activas.
tags: [n8n, empleo, tareas]
timestamp: 2026-08-29T09:00:00Z
---

# Hechas (pendientes de revisión)

## 1. Revisar el disparador horario del Apps Script de `n8n_jobs`

**Prioridad: alta.** Es la causa raíz del incidente del 29 ago 2026 (ver
[jobs-hoja-formato.md](jobs-hoja-formato.md#29-ago-2026-el-apps-script-no-estaba-corriendo)
y [jobs-ingesta.md](jobs-ingesta.md#fallos-conocidos)).

**Estado (29 ago 2026):** hecha, pendiente de revisión. Al abrir la hoja **no
existía ningún proyecto Apps Script** — no era que el disparador hubiera fallado,
es que el script nunca estuvo instalado ahí. Se creó el proyecto desde cero, se
pegó el script documentado en `jobs-hoja-formato.md` y se ejecutó
`crearDisparador()`. Verificado vía API sobre la hoja: `Ofertas_activas` con 39
filas ordenadas por `fecha_guardado` desc, sin huecos, hoja recortada a 40 filas
exactas, casilla real (`dataValidation BOOLEAN`) y booleano `false` en
`generar_cv_ia`, alto 21 px; `Archivo` ordenado y con `generar_cv_ia` vacía y sin
casilla.

**Actualización 29 ago 2026 (tarde):** Mar confirma que el Apps Script **se está
disparando**. Además se amplió el script (tarea 6, cerrada) para cubrir
desplegable de `estado` con chip de color y banda. Queda por revisar sólo lo de
abajo (que una pasada horaria automática salga `Completado` sin error).

**Supervisar a partir del lunes 31 ago 2026.** El 29 ago es sábado y no se
esperan más ofertas hasta el lunes, así que la comprobación con datos reales
(ingesta de las 09:00/17:00 del lunes → pasada `mantenimiento` posterior →
`Ofertas_activas` ordenada, sin huecos, con casilla, desplegable+chip y banda
hasta la última fila) se hace el **31 ago**. Mirar en Apps Script → Ejecuciones
que las pasadas automáticas de ese día salen `Completado`.

El script `mantenimiento` (Extensiones → Apps Script dentro de la hoja) debería
correr cada hora: reordena las dos pestañas por `fecha_guardado` desc, fuerza
alto de fila 21 px, reaplica/quita la casilla de `generar_cv_ia` y purga
casillas/valores sueltos en filas vacías. Entre el 25 y el 29 ago **no se
ejecutó** y por eso un hueco de ~260 filas vacías dejó las ofertas nuevas
enterradas al fondo sin que nada avisara.

Qué comprobar:
- Extensiones → Apps Script → **Activadores (Triggers)**: que existe el
  disparador time-based de `mantenimiento` cada 1 h y no está en estado de
  error.
- **Ejecuciones** del proyecto Apps Script: buscar fallos recientes
  (autorización caducada, cuota diaria agotada, timeout).
- Si el disparador desapareció o falla: volver a lanzarlo con `crearDisparador()`
  (está en el propio script) y confirmar que la siguiente pasada horaria
  reordena y limpia.

**Cierre:** una ejecución horaria `success` visible en el log de Apps Script y
la hoja ordenada/sin huecos tras ella.

# Abiertas

## 3. Decidir qué hacer con las ofertas del 25 y 26 ago 2026

**Prioridad: baja.** Se perdieron en el reformateo manual del 27 ago; no están
en `Ofertas_activas` ni en `Archivo`. Son recuperables desde el output de
`Append row in sheet` de las ejecuciones n8n del 25 ago (#645) y 26 ago (#647)
—mismo método que se usó el 29 ago para las 11 del 27–28—, pero puede que ya no
interesen por antigüedad.

**Cierre:** recuperarlas y reinsertarlas, o decidir explícitamente que se
descartan.

## 4. Verificar la primera ejecución programada con `useAppend: true`

**Prioridad: media.** El cambio se aplicó el 29 ago pero aún no se ha visto una
pasada automática completa. Comprobar en la ejecución de las 17:00 (o la
siguiente) que `Append row in sheet` escribe justo tras el bloque de datos
(fila 41+) y que, tras el Apps Script, las ofertas nuevas quedan arriba del
todo.

**Cierre:** una ejecución `trigger` posterior al 29 ago con las filas nuevas
contiguas y visibles.

# Cerradas

## 2. Guardarraíl que avise si `Ofertas_activas` vuelve a tener huecos

**Prioridad: media. Cerrada el 29 ago 2026.** El incidente fue **silencioso**:
`Jobs · ingesta` terminó `success` y pingueó Healthchecks los días 25–29 aunque
las ofertas caían en la fila 280+. El dead-man's switch no cubre "escribió, pero
en el sitio equivocado".

Idea: en `Jobs · ingesta`, tras `Get row(s) in sheet`, comparar el
`row_number` máximo con el número de filas devueltas. Si difieren en más de un
margen pequeño (hay filas vacías intercaladas), mandar un aviso por la rama de
error / email en vez de seguir como si nada. No bloquea la ingesta, solo avisa.

**Implementación (29 ago 2026), vía n8n MCP** en `Jobs · ingesta` (ID
`CXCD8BZUQEQKex2a`) como **rama aislada de 2 nodos** colgando de `Get row(s) in
sheet`, sin tocar el `append`, el email de nuevas ofertas ni la rama de error
compartida (`Unir aviso error`):
- **`Guardarraíl huecos`** (Code): `huecos = max(row_number) − filasConDatos − 1`.
  Si `huecos > 5` (`UMBRAL`) emite 1 item; si no, devuelve `[]`.
- **`Aviso huecos`** (Gmail, credencial `Gmail account`, a `mcaparrosgu@gmail.com`,
  `retryOnFail` 3×3 s): solo se ejecuta si el guardarraíl emitió item.
Wiring: `Get row(s) in sheet` → `Guardarraíl huecos` → `Aviso huecos` (la salida
existente a `Leer archivo` se conserva).

**Verificación (29 ago 2026, tarde):**

1. **Credencial en `Aviso huecos`** — el MCP no deja *leer* el campo
   `credentials` (lo oculta en todos los nodos). Se **forzó** por escritura:
   `update_workflow` → `setNodeCredential` con `Gmail account` (`gmailOAuth2`, id
   `44KKYSs6vIH5K7lX`). El envío real del punto 3 confirma que quedó bien.

2. **Sin falsa alarma con hoja sana** — **verificado por cálculo** con datos
   reales de la ejecución #664: `Get row(s) in sheet` devuelve filas contiguas
   (`row_number` 2…N sin huecos), `huecos = maxRow − filasConDatos − 1 = 0`, y
   `0 ≤ 5` → el Code devuelve `[]`. No dispara.

3. **`UMBRAL = -1` → email real → restaurar** — ejecución manual **#671**
   (29 ago 14:02–14:03Z, `success`) con `UMBRAL = -1` publicado:
   - `Guardarraíl huecos` emitió 1 item → `huecos: 0`, `filasConDatos: 39`,
     `ultimaFila: 40` + `html_alerta_huecos` (`0 ≤ -1` es falso → dispara).
   - `Aviso huecos` `success` → Gmail `id 1a04dd52fb3cee3b`, `labelIds: [SENT,
     INBOX, UNREAD]`. Confirmado desde la bandeja (`search_threads`): correo en
     `mcaparrosgu@gmail.com`, asunto «🕳️ Ofertas_activas tiene huecos de filas
     vacías», HTML renderizado.
   - Efectos colaterales de la pasada completa (esperados): `Append row in
     sheet` añadió 3 ofertas nuevas y `Notificación nuevas ofertas` mandó su
     email; el Apps Script `mantenimiento` las reordena dentro de la hora.
   - Restaurado `UMBRAL = 5` con `updateNodeParameters` (jsCode verificado byte
     a byte). **Producción: `UMBRAL = 5`, `versionId == activeVersionId` =
     `6d1d7110…`, `active`, wiring intacto.**

   **Incidente (resuelto):** el primer intento de bajar `UMBRAL` con
   `setNodeParameter` (path `/parameters/jsCode`) **corrompió un dígito** —
   guardó `const UMBRAL = 1;` en vez del valor enviado. Se detectó releyendo el
   `jsCode` publicado y se corrigió con `updateNodeParameters`. **Regla: no usar
   `setNodeParameter` con strings multilínea en este MCP; usar
   `updateNodeParameters` (reescritura completa) y verificar releyendo.**

**Cierre:** cumplido — los 3 puntos verificados; la ejecución #671 disparó el
aviso y el correo llegó a la bandeja.

## 6. Ampliar el Apps Script para que reponga desplegable de `estado` (con color de chip) y banda

**Prioridad: media. Cerrada el 29 ago 2026.** Tras la ingesta, `Ofertas_activas`
tenía `E2:E22` sin el desplegable de `estado` y los colores alternos cortados en
la fila 19. El Apps Script `mantenimiento` no cubría ni el desplegable ni la
banda, y dar rango de columna entera a la validación no sirve (la API lo acota a
la cuadrícula; la hoja se mantiene sin filas de reserva por el diseño
anti-huecos).

**Hecho:**
- Mar coloreó los 9 chips a mano (Datos → Validación de datos; la API no expone
  el color del chip). Paleta en `jobs-hoja-formato.md`.
- Se amplió `procesarHoja_` (bloque de código en `jobs-hoja-formato.md`) con,
  sólo para `Ofertas_activas`:
  - **paso 4** — propaga el desplegable a `E2:E<ultimaFila>` con
    `Range.copyTo(..., PASTE_DATA_VALIDATION)` desde la primera fila con
    validación de lista. Reconstruir con `newDataValidation()` borraría el
    color; el `copyTo` lo conserva.
  - **paso 5** — `Banding.setRange()` para que la banda termine en `ultimaFila`.

**Verificado:** fila de prueba añadida al final → una pasada `mantenimiento` le
puso el desplegable **con el óvalo de color** y la banda la alcanzó.
`mantenimiento` no borra la fila de prueba (deliberado); se quitó a mano.

**Cierre:** cumplido — el script mantiene desplegable+chip y banda tras cada
ingesta sin intervención.

## 5. Confirmar que `Borrar ofertas ofertas_activas` (Jobs · archivado) borra todas las filas, no solo la primera

**Prioridad: media.** Durante la investigación del 29 ago se vio que ese nodo
recibe N items (filas a archivar, ordenadas desc por `row_number`) pero su
salida es siempre `[{}]` (1 item). Había que confirmar que efectivamente elimina
las N filas y no solo la del primer item; si solo borrara una por ejecución,
`Ofertas_activas` acumularía ofertas viejas ya copiadas a `Archivo`
(duplicados lógicos entre pestañas y crecimiento lento de la hoja).

**Estado (29 ago 2026): confirmada, sin acción pendiente.** El nodo borra
**todas** las filas que recibe. El item único `{ success: true }` de la salida
es solo el resumen de la operación: el nodo Google Sheets (`operation: delete`,
v4.7) acumula una petición `deleteDimension` por item de entrada y las manda
juntas en un solo `batchUpdate` a la API de Sheets. El `pairedItem` de esa
salida enlaza con **todos** los items de entrada y el `executionTime` escala con
el número de filas. El orden descendente por `row_number` que impone
`Ordenar eliminación` es justo lo que evita que los índices se desplacen dentro
del lote (se borra de abajo hacia arriba).

Verificado con datos de ejecución reales de `Jobs · archivado`
(ID `t4jxqH2wJyDF3EYt`):
- **#646** (26 ago 07:00): 15 filas a la entrada → salida 1 item con
  `pairedItem` 0–14; `executionTime` ~12,5 s.
- **#659** (27 ago 17:17): 8 filas → salida 1 item con `pairedItem` 0–7;
  `executionTime` ~3,8 s.
- **#652** (27 ago 07:00), la pasada siguiente a #646: `Decisión archivar` solo
  encontró 6 filas nuevas (del 20 ago); **ninguna** de las 15 del 19 ago que
  archivó #646 reapareció, pese a que ya superaban los 7 días y habrían vuelto a
  entrar si no se hubieran borrado.
- Hoja `n8n_jobs` a 29 ago: los 8 `id_unico` de #659 y los 15 de #646 están
  todos en `Archivo` y **ninguno** sigue en `Ofertas_activas`.

**Cierre:** cumplido — varias ejecuciones con varias filas a archivar, todas
fuera de `Ofertas_activas` y todas en `Archivo`.

# Relacionados

- [jobs-ingesta.md](jobs-ingesta.md)
- [jobs-hoja-formato.md](jobs-hoja-formato.md)
- [jobs-archivado.md](jobs-archivado.md)
