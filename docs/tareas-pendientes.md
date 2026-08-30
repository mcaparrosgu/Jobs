---
type: Nota
title: Tareas pendientes · Jobs
description: Tareas manuales y de seguimiento abiertas del pipeline de empleo, con contexto y criterio de cierre. Creada el 29 ago 2026 tras el incidente del hueco de filas vacías en Ofertas_activas.
tags: [n8n, empleo, tareas]
timestamp: 2026-08-29T09:00:00Z
---

# Abiertas

*(ninguna abierta a 30 ago 2026)*

# Cerradas

## 7. Publicar y verificar el paso de humanización con OpenAI (Jobs · generación CV)

**Prioridad: media. Cerrada el 30 ago 2026 — verificada end-to-end.** El 29 ago
2026 se añadió a `Jobs · generación CV` (ID `morsS0M2folmXWhS`) un paso de
reescritura de la prosa del CV y la carta con OpenAI (`gpt-4.1-mini`), para
quitar el estilo genérico de IA y sacar el texto de la marca de agua que Claude
incrusta en lo que genera. Detalle en
[jobs-generacion-cv.md](jobs-generacion-cv.md), Flujo punto 5.bis.

**Camino hasta el cierre:**
- **29 ago ✅** `OPENAI_API_KEY` en `docker-compose.yml` + `.env` de
  `C:\AI Engineering\n8n\Docker n8n\`, contenedor recreado con `docker compose
  up -d`. Draft publicado (`activeVersionId a03951d1-…`).
- **29 ago ⛔** primera prueba (#674) murió en `Download file` por la credencial
  `Google Drive account` caducada — no llegó al paso nuevo.
- **30 ago ✅** Mar reconectó `Google Drive account` (y revisó `Google Docs` /
  `Gmail`). Re-disparado el trigger.

**Verificación (30 ago 2026)** — dos ejecuciones `trigger` `success` que
ejercitan el paso nuevo:
- **#710** — «Sales Operations Specialist» / Echodyne (`6971fd98`). *(Se marcó
  sin querer: al togglear `G8` para re-disparar, la pasada horaria de
  `mantenimiento` reordenó la hoja entre el `FALSE` y el `TRUE`, así que `G8`
  cayó sobre otra fila. Sin daño: `tipo enlace`, no manda email; solo generó un
  Doc de más.)*
- **#711** — «Operations & AI Manager [100% Remote]» / UpCounting (`d87f2c8c`),
  la oferta de prueba prevista (su flag de ayer se procesó al arreglar la
  credencial).

En ambas:
- `Humanizar (OpenAI)` → `success` en ~6,6 s, **una** llamada (sin tanda de 3
  reintentos → clave OK). `gpt-4.1-mini-2025-04-14`, ~1,4 k tokens.
- `Aplicar humanizacion` → `_humanizado: true`,
  `_humanizar_nota: "aplicados: resumen, descripcion_1, descripcion_2,
  descripcion_3, carta"`.
- **Sin invención de datos:** empresas, fechas, cifras y herramientas
  conservadas; solo cambia la redacción y numerales tipo «7+ años» → «over 7
  years». La 4.ª `p.descripcion` (lista de habilidades) queda intacta y las
  etiquetas/clases HTML no se tocan.
- `Adaptar cv/carta plantilla` consumen el texto humanizado sin el error de
  «campo no encontrado»; el flujo llega hasta `Ping Healthchecks` y
  `Actualizar estado` deja `estado: cv_ia_creado`, `generar_cv_ia: false`.

**Pendiente menor (no bloquea):** la humanización de la **carta** es de calidad
irregular — a veces aplana frases distintivas de Claude a aperturas más sosas
(«I am interested in the … role»). Y en #710 introdujo una errata («Adapt at»
por «Adept at»). Son ajustes de prompt para más adelante; el mecanismo funciona
y ante cualquier fallo cae al texto de Claude (`_humanizado: false`).

**Cierre:** cumplido — #710 y #711 con `_humanizado: true`, documentos correctos
y sin regresiones de formato.

## 4. Verificar la primera ejecución programada con `useAppend: true`

**Prioridad: media. Cerrada el 30 ago 2026 — verificada (con un matiz menor).**
El cambio se aplicó el 29 ago para que `Append row in sheet` escribiera justo
tras el bloque de datos en vez de sobre un hueco de filas vacías.

**Verificación (30 ago 2026):** Mar activó la ingesta a mano y entraron **3
ofertas realmente nuevas**. Ejecución **#675** de `Jobs · ingesta` (ID
`CXCD8BZUQEQKex2a`, 30 ago 09:24Z, `success`):
- `Filtro duplicados` → 3 items: *Delivery/Project Manager | GT*, *Revenue
  Strategy & Operations – EMEA* (Elevenlabs), *Informatica Admin* (NTT DATA),
  todas `fecha_guardado 2026-08-30`.
- `Append row in sheet` → 3 items de salida; `Notificación nuevas ofertas` mandó
  el email (Gmail id `1a051fd530ca6cd9`).
- En la hoja quedaron en las **filas 22–24, contiguas**, justo debajo de la
  fila 21 (último dato previo), **sin ningún hueco**. La pasada horaria de
  `mantenimiento` posterior las reordenó arriba (tarea 1).
- `Guardarráil huecos` emitió `[]` en las dos pasadas del día (#675: 21−20−1=0;
  #708: 24−23−1=0). Sin falsa alarma.

**Matiz:** #675 fue `mode: manual` (Mar lo lanzó a mano), no `trigger`. El
comportamiento del `append` es idéntico en ambos modos; lo único que cambia es
que en `manual` el nodo no devuelve `updatedRange`, pero la posición de las
filas se confirmó directamente leyendo la hoja. Se da por buena sin esperar a
una `trigger`.

**Cierre:** cumplido — pasada con 3 ofertas nuevas, filas contiguas tras el
bloque de datos y visibles arriba tras `mantenimiento`.

## 1. Revisar el disparador horario del Apps Script de `n8n_jobs`

**Prioridad: alta. Cerrada el 30 ago 2026.** Era la causa raíz del incidente del
29 ago 2026 (huecos de filas vacías; ver
[jobs-hoja-formato.md](jobs-hoja-formato.md#29-ago-2026-el-apps-script-no-estaba-corriendo)).
Al abrir la hoja **no existía ningún proyecto Apps Script** — el script nunca
estuvo instalado ahí. Se creó el proyecto desde cero, se pegó el script
documentado en `jobs-hoja-formato.md` y se ejecutó `crearDisparador()`.

**Verificación end-to-end con datos reales (30 ago 2026):** Mar activó la ingesta
a mano y entraron 3 ofertas nuevas (GT, Elevenlabs, NTT DATA, `fecha_guardado
2026-08-30`). El `append` las dejó en las filas 22–24, contiguas y al fondo
(orden aún sin aplicar). En la siguiente pasada horaria de `mantenimiento` el
script **reordenó** `Ofertas_activas` por `fecha_guardado` desc (las 3 subieron
arriba) y Mar confirma en Apps Script → **Activadores** que el disparador
time-based corre **cada hora sin error** y en **Ejecuciones** que salen
`Completado`. Estado de la hoja verificado vía API antes de la reordenación: 23
filas contiguas sin huecos, todas a 21 px, casilla `BOOLEAN` en `generar_cv_ia`
y desplegable `ONE_OF_LIST` en `estado` en todas (incluidas las nuevas), banda
hasta la última fila (`bandedRanges` 0–24), hoja recortada a 24 filas exactas
(`rowCount: 24`).

**Cierre:** cumplido — disparador horario `Completado` en el log de Apps Script y
hoja ordenada/sin huecos tras la pasada, con datos reales de la ingesta del 30
ago.

## 3. Decidir qué hacer con las ofertas del 25 y 26 ago 2026

**Prioridad: baja. Cerrada el 29 ago 2026 — descartadas.** Se perdieron en el
reformateo manual del 27 ago; no están en `Ofertas_activas` ni en `Archivo`.
Eran recuperables desde el output de `Append row in sheet` de las ejecuciones
n8n del 25 ago (#645) y 26 ago (#647), pero Mar decide **no recuperarlas**: por
antigüedad ya no interesan.

**Cierre:** decisión explícita de descartarlas.

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
