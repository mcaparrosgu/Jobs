---
type: Nota
title: Tareas pendientes · Jobs
description: Tareas manuales y de seguimiento abiertas del pipeline de empleo, con contexto y criterio de cierre. Creada el 29 ago 2026 tras el incidente del hueco de filas vacías en Ofertas_activas.
tags: [n8n, empleo, tareas]
timestamp: 2026-08-29T09:00:00Z
---

# Abiertas

## 15. El CV generado pierde el Grado de la UOC (2.ª entrada de Formación)

**Prioridad: alta. Abierta el 3 sep 2026 — detectada al supervisar 3 CV reales
(#734 Simera, #735 Elevenlabs, #736 PadSplit), aprobada por Mar.** En los 3 CV
(Google Doc) **falta el «Grado en Comunicación y Publicidad Creativa · UOC ·
2012–2019, con Honores»**. El HTML que genera Claude y el que sale de la
humanización **sí lo llevan** (2 `<h3>` bajo `<h2>Formación>`: Bootcamp NEOLAND +
Grado UOC); se pierde al volcar a la plantilla del Doc. Agravante: la carta de
Simera afirma «I hold a degree in Communication and Creative Advertising» que el
CV adjunto no lista.

**Causa raíz** (no es de OpenAI): el Code node `Adaptar cv plantilla` de
[Jobs · generación CV](jobs-generacion-cv.md) (`morsS0M2folmXWhS`) asume una
estructura fija — `h3[0..2]` = 3 puestos, `h3[3]` = formación **única**,
`descripcion[3]` = habilidades — y solo mapea `{{FORMACION_TITULO}}` = `h3[3]` y
`{{FORMACION_DETALLE}}` = `empresa[3]`. Cuando Claude emite **2** `<h3>` de
formación (los 3 CV de hoy), `h3[3]` = «AI Engineering Bootcamp» entra y `h3[4]` =
«Grado UOC» **se descarta en silencio**. Las habilidades se salvan solo porque el
recuento de `p.descripcion` no cambia. El prompt `Prompt para CV` es el origen de
la contradicción: su spec HTML pide **una** entrada de formación, pero su «ORDEN
FIJO» habla de «3) proyectos, 4) formación» y no hay sección de proyectos.

**Requisito de Mar:** la formación de la **UOC** debe aparecer **siempre** junto
con la de **NEOLAND** en el CV.

**Implementado (3 sep 2026), vía n8n MCP** (`updateNodeParameters` + relectura
byte a byte + `node --check` OK), en cuatro nodos de `Jobs · generación CV`
(`morsS0M2folmXWhS`):

1. **`Prompt para CV`** (sha256 `938f148d…`) — el spec HTML pasa a **EXACTAMENTE 2
   bloques de Formación**, siempre y en este orden: (1) Bootcamp de AI Engineering
   de NEOLAND (en curso) y (2) Grado en Comunicación y Publicidad Creativa de la
   UOC (2012–2019, con Honores). «Nunca omitas el Grado de la UOC». Aclara que el
   CV **no lleva sección de Proyectos** (van integrados en `resumen`/experiencia),
   resolviendo la contradicción con el «ORDEN FIJO».
2. **`Filtro generar CV`** (sha256 `969532f7…`) — deduplica por `id_unico` y emite
   **1 oferta por ejecución**, para no pagar N llamadas Sonnet de las que
   `Separar CV y carta` (`.first()`) solo usa 1 (en #735 se pagaron 6 y se usó 1).
   El resto drena en pasadas sucesivas del disparador.
3. **`Adaptar cv plantilla`** — reescrito en 3 pasos: (a) `087bb1f4` plegaba la
   2.ª entrada de Formación en `{{FORMACION_DETALLE}}`; (b) `52aa49a9`, tras
   añadir Mar `{{FORMACION_TITULO2}}` / `{{FORMACION_DETALLE2}}` a la plantilla
   (Doc `11IUpAhDJHIP…`), la manda a su ranura propia con el estilo de título del
   Bootcamp; (c) `e68b67cc` (**versión final**): si `idioma === 'EN'` (de
   `Aplicar humanizacion`) traduce los encabezados fijos de la plantilla
   «Experiencia/Formación/Habilidades» → «Experience/Education/Skills» vía
   `replaceAllText`, después de rellenar los marcadores. `formacionTitulo` y
   `habilidades` son campos esenciales; aviso en log si Claude solo trae 1
   entrada de Formación.
4. **`Crear doc cv`** — `operation: copy` no fijaba carpeta destino → el CV se
   copiaba en la carpeta de la plantilla («Plantillas CV n8n»). Se le añade
   `folderId 17YrQa7V0x2pYJh0Cu5aZ8tWcami-D-MY` («Cvs jobs n8n»), `sameFolder
   false`, `driveId "My Drive"`, **igual que `Crear doc carta`** (que ya guardaba
   bien; las cartas nunca estuvieron mal ubicadas).

**Versiones:** `40d83c73` (pasos 1+2 + `Adaptar` `087bb1f4`) y `e3da5677`
(`Adaptar` `52aa49a9`) y `d2db224c` (`Adaptar` `e68b67cc`) — **publicadas por
Mar**. `Crear doc cv` (paso 4): **draft `versionId 4552575d-…`, pendiente de
publicar** — el `publish_workflow` lo bloquea el clasificador de auto-mode.

**Verificación (3 sep 2026):**
- **#739** (OpenNebula) y **#740** (Doppel): `Filtro generar CV` recibió 8 filas
  (2 ofertas × duplicados del trigger) y emitió **1** por ejecución, la 2.ª en la
  pasada siguiente sin colgarse; Claude emitió las 2 entradas de Formación; Grado
  UOC en el Doc; proyecto integrado en el resumen, sin sección de Proyectos.
- **#743** (TripleTen, `EN`): las 4 ranuras de Formación por separado; Grado UOC
  en su línea propia con estilo de título.
- **#745** (LocalStack, `EN`): encabezados del CV traducidos a **Experience /
  Education / Skills**; párrafo vacío de la plantilla ya arreglado por Mar. Se
  detecta que el CV se guardó en «Plantillas CV n8n» → paso 4.

**Pendiente:** Mar publica `4552575d-…` y un CV nuevo confirma que el Doc del CV
aterriza en «Cvs jobs n8n». Los **13 CV ya generados** (26-08-03 … 26-09-03) se
movieron a mano de «Plantillas CV n8n» a «Cvs jobs n8n» el 3 sep 2026 (vía Drive
MCP); en «Plantillas CV n8n» solo quedan `Plantilla CV`, `Plantilla Carta` y un
`Copy of Plantilla CV ` huérfano (Mar puede borrarlo).

**Criterio de cierre:** con `4552575d` publicado, un CV real en inglés deja en el
Doc, en la carpeta «Cvs jobs n8n», las 2 entradas de Formación con el mismo
estilo (NEOLAND + Grado UOC) y los encabezados «Experience / Education / Skills»;
un CV en español los mantiene en castellano; habilidades y resto intactos.

## 13. Comprobar que la app OAuth de Google queda publicada sin caducidad de 7 días

**Prioridad: alta. Abierta el 30 ago 2026. En vigilancia desde el 31 ago 2026.**
Es M5 de [jobs-evaluacion.md](jobs-evaluacion.md). En modo *Testing* Google expira
el refresh token a los 7 días — causa raíz de que `Google Sheets account` (16
ago) y `Google Drive account` (29 ago #674, y otra vez #709 el 30 ago) se hayan
desconectado. El arreglo es publicar la app OAuth (Google Cloud Console → Google
Auth Platform → Público → «Publicar aplicación»), sin cambios en n8n.

**Estado (31 ago 2026):**
- Mar confirma que la app OAuth **ya estaba «En producción»** desde hacía días
  (la publicó antes de que se abriera esta tarea). El fallo de `Google Drive
  account` en #709 (30 ago 10:15Z) fue un token residual de la época *Testing*
  que caducó; al reconectar Drive ese día ya se emitió un token de producción.
- Para arrancar una ventana de vigilancia limpia con fecha conocida, **el 31 ago
  2026 Mar reconectó las 5 credenciales de Google** en n8n (Drive, Docs, Sheets,
  Sheets Trigger, Gmail), todas con «Account connected». A partir de ahora todos
  los tokens son de producción y emitidos el mismo día.
- Comprobado vía n8n MCP (31 ago): ninguna ejecución `error`/`crashed` en ningún
  workflow después de #709 (30 ago). Línea base sin incidencias.

**Seguimiento pendiente por Claude — supervisión manual el 7 sep 2026 (o
después).** El **7 sep 2026** (7+ días desde la reconexión base del 31 ago), o en
la primera sesión posterior, comprobar vía n8n MCP que ninguna ejecución
`error`/`crashed` desde el 31 ago sea un «needs to be reconnected» de una de las 5
credenciales de Google (Drive, Docs, Sheets, Sheets Trigger, Gmail):
`search_executions` con `status: [error, crashed]`, `startedAfter: 2026-08-31`. Si
está limpio → cerrar esta tarea. Si alguna credencial cayó antes del 7 sep → la
publicación no bastó (revocación manual, otra app OAuth, scopes) y hay que reabrir
el diagnóstico.

No se automatiza: un `/loop` local muere al apagar el ordenador y un routine de
`/schedule` (nube) no alcanza la instancia de n8n del portátil (`127.0.0.1`) ni el
MCP `n8n-mcp` (local, no es conector de claude.ai). Queda como recordatorio para
que Claude lo haga a mano.

**Criterio de cierre:** 7+ días (hasta el 7 sep 2026) sin ningún aviso de «needs
to be reconnected» en Drive, Docs, Sheets, Sheets Trigger o Gmail tras la
reconexión base del 31 ago.

## 11. Truncar `resumen` a ~800 caracteres

**Prioridad: baja. Abierta el 30 ago 2026 — aprobada por Mar. Implementada y
publicada el 31 ago 2026; en vigilancia hasta confirmar el recorte en una pasada
real con ofertas largas.** Es M8 de [jobs-evaluacion.md](jobs-evaluacion.md).
Algunas ofertas guardan la descripción completa sin recortar (~10 KB en la fila
de GitLab), lo que dispara el alto de fila que el Apps Script corrige cada hora.
El enlace completo se conserva en su columna. No afecta a la generación de CV,
que ya recorta el texto de la oferta a 6.000 caracteres en `Prompt para CV`.

**Dónde se trunca (decisión del 31 ago 2026):** el doc original decía «en cada
normalizador, antes del `Merge`», pero ahí el recorte cambiaría decisiones de
`Filtro teletrabajo` (mira `titulo+resumen` para «hybrid»/«onsite» y para las
palabras de remoto) y del criterio de idioma de `Filtro cualificación`, si la
palabra clave cae más allá del carácter 800. Se hace **dentro de
`Filtro duplicados`**, al construir cada oferta de salida — después de todos los
filtros, que siguen viendo el `resumen` completo. Un solo nodo tocado en vez de
13 y comportamiento de filtrado intacto.

**Implementación (31 ago 2026), vía n8n MCP** en `Jobs · ingesta`
(`CXCD8BZUQEQKex2a`), detalle en [jobs-ingesta.md](jobs-ingesta.md) sección A
punto 5:
- `Filtro duplicados` (Code) reescrito con `updateNodeParameters` (releído byte a
  byte, sha256 `285e5933a2d86986`). Cambio **100 % aditivo**: nueva función
  `truncarResumen()` + `LIMITE_RESUMEN = 800`, aplicada como
  `resumen: truncarResumen(oferta.resumen)` en el objeto de salida. `id_unico`,
  `id_url` y la decisión pasa/descarta **sin tocar**.
- Recorta al último espacio si está a menos de 120 car. del límite (no parte
  palabras) y marca el corte con `...`. Texto `≤ 800` o no-string → pasa igual.
- Publicado, `versionId == activeVersionId ==
  f8ac4e6b-ef03-4fbe-9836-259a010e81b7`. 48 nodos, wiring intacto (entra de
  `Leer archivo`, sale a `Append row in sheet` + `Registrar métricas`).

**Pendiente:** una pasada real con ≥1 oferta de `resumen` largo (>800 car.) que
deje la celda recortada (~800 + `...`) y el enlace intacto.

**Criterio de cierre:** una pasada real con ofertas largas deja `resumen` recortado
(~800 caracteres) y el enlace intacto; el Apps Script deja de tener que corregir
alturas de fila disparadas.

## 12. Archivar `cv_enviado` sin respuesta a los 30 días

**Prioridad: baja. Abierta el 30 ago 2026 — aprobada por Mar (solo esta mitad de
M7). Implementada y publicada el 31 ago 2026; en vigilancia hasta ver los dos
pasos en pasadas reales.** Es la mitad de M7 de
[jobs-evaluacion.md](jobs-evaluacion.md): `cv_enviado` con **≥ 30 días** y sin
respuesta → se archiva con `estado: sin_respuesta`. Requiere una columna
`fecha_envio` nueva, que la escribe [Jobs · generación CV](jobs-generacion-cv.md)
en el mismo nodo que marca `estado: cv_enviado`.

**Decisión del 31 ago 2026 — transición directa a `Archivo` en una pasada** (Mar
eligió entre esto y una fase intermedia visible en `Ofertas_activas`). La regla
vive en `Decisión archivar` de [Jobs · archivado](jobs-archivado.md), que ya lee
toda la hoja dos veces al día: marca la fila `sin_respuesta` **en una copia** y la
manda a `Archivo` en la misma pasada. `sin_respuesta` **nunca aparece en
`Ofertas_activas`**, así que **no hay que tocar la validación del desplegable ni
colorear ningún chip**. En `Archivo` el `estado` no lleva desplegable (allowlist
del Apps Script), así que queda como texto plano.

**Implementación (31 ago 2026), vía n8n MCP:**
- **Hoja `n8n_jobs`:** cabecera `fecha_envio` nueva en `Ofertas_activas!R1` y
  `Archivo!S1` (mapeo por cabecera, la posición da igual). Fila 1 intacta por lo
  demás; el formato lo repone `mantenimiento`.
- **`Jobs · generación CV`** (`morsS0M2folmXWhS`, `activeVersionId
  5c2638d4-16e9-419a-b945-57043cbe1dcb`): el nodo `Actualizar estado cv_enviado`
  añade `fecha_envio: {{ $now.toFormat('yyyy-MM-dd') }}` junto a
  `estado: cv_enviado`. Cambio 100 % aditivo (solo en la rama `email`).
- **`Jobs · archivado`** (`t4jxqH2wJyDF3EYt`, `activeVersionId
  75d363e2-d475-4a70-a807-e93012aca1a3`): `Decisión archivar` (Code) reescrito con
  `updateNodeParameters` (releído byte a byte, acentos intactos). **Regla 3 nueva
  y aditiva** — si `estado === 'cv_enviado'`, `estado_propuesto` está vacío (Jobs ·
  seguimiento no propuso nada) y `fecha_envio` tiene ≥ 30 días → se empuja
  `{ ...oferta, estado: 'sin_respuesta' }` (copia, sin mutar el item original).
  Filas antiguas sin `fecha_envio` → se ignoran. Reglas 1 y 2 y el centinela
  `_sinArchivar` sin cambios. 8 nodos, wiring intacto.

**No incluye** el email de seguimiento a los 7-10 días de M7 — ver
[Sugerencias pendientes](#sugerencias-pendientes).

**Filas antiguas:** los `cv_enviado` anteriores a la tarea 12 no tienen
`fecha_envio` y la Regla 3 los ignora. **Decisión de Mar (31 ago 2026): no se
rellena `fecha_envio` a mano** — no es un dato útil retroactivo y esas
candidaturas ya están marcadas como `cv_enviado`; se avanzan o archivan a mano si
hace falta. La regla solo aplica de aquí en adelante.

**Pendiente de verificación en pasadas reales:**
1. Un `cv_enviado` marcado por `Jobs · generación CV` (rama `email`) deja
   `fecha_envio` en formato `yyyy-MM-dd` en `Ofertas_activas`.
2. Una fila `cv_enviado` + `estado_propuesto` vacío + `fecha_envio` de hace ≥ 30
   días pasa a `Archivo` con `estado: sin_respuesta` en una pasada de las
   09:00/17:00, sin arrastrar filas legítimas. (Se puede forzar antes con una
   fila de prueba y `DIAS_SIN_RESPUESTA` bajado temporalmente, patrón de la
   tarea 2 con `UMBRAL = -1`.)

**Criterio de cierre:** los dos puntos anteriores verificados en pasadas reales.

## 14. Redactar el case study estructurado de Jobs (al terminar el proyecto)

**Prioridad: baja. Abierta el 31 ago 2026 — la última, se hace cuando el
proyecto esté acabado.** Cuando Jobs se dé por terminado (sin tareas abiertas
que cambien la arquitectura), redactar el case study estructurado del proyecto
para poder enseñarlo a otros (portfolio, cliente, entrevista). Es el Paso 19
del método: invocar el skill `paso-19-case-study`, que lee `docs/00-problema.md`
… `docs/09-rutina.md` y `docs/bitacora.md` y genera `docs/case-study.md`.

**Criterio de cierre:** `docs/case-study.md` escrito y revisado por Mar, con el
problema, la solución, las decisiones clave (aislamiento ingesta/archivado,
guardarraíl de huecos, humanización con OpenAI, dedup por `id_url`, OAuth de
Google) y los resultados reales del pipeline.

# Cerradas

## 10. Pestaña `Metricas` del embudo de ingesta

**Prioridad: media. Abierta el 30 ago 2026 — aprobada por Mar. Implementada y
publicada el 31 ago 2026. Cerrada el 3 sep 2026 — verificada end-to-end en 3
pasadas reales.** Es M3 de [jobs-evaluacion.md](jobs-evaluacion.md). El recuento
de descartes por criterio solo vivía en el log de cada ejecución y se perdía.
Pestaña nueva `Metricas` (fecha_hora, fuente, crudas, tras_teletrabajo,
tras_salario, tras_cualificacion, nuevas, descartes por criterio), alimentada por
una rama aislada colgando de `Filtro duplicados` — mismo patrón que
`Guardarraíl huecos` → `Aviso huecos`, sin tocar el `append` principal.

**Implementación (31 ago 2026), vía n8n MCP** en `Jobs · ingesta`
(`CXCD8BZUQEQKex2a`), detalle en [jobs-ingesta.md](jobs-ingesta.md) sección E y
[jobs-hoja-formato.md](jobs-hoja-formato.md):

- Pestaña `Metricas` (`gid=1516813991`) creada con 12 cabeceras `snake_case`:
  `fecha_hora`, `fuente`, `crudas`, `tras_teletrabajo`, `tras_salario`,
  `tras_cualificacion`, `nuevas`, `descartes_idioma`, `descartes_contrato`,
  `descartes_nivel`, `descartes_perfil`, `descartes_encaje`. Fuera del allowlist
  `HOJAS` del Apps Script (no la mantiene).
- **`Filtro cualificación`** (`updateNodeParameters`, releído byte a byte,
  sha256 `7171a4cc5de9d1f8`): cambio 100 % aditivo — el criterio 5 pasa de
  `perfil:` a `encaje:` y publica el desglose de descartes por fuente en
  `$getWorkflowStaticData('global').metricasCualificacion` (sello `executionId`).
  La decisión pasa/descarta no cambia.
- **`Registrar métricas`** (Code, `onError: continueRegularOutput`) +
  **`Append métricas`** (Google Sheets `append`/`useAppend`, credencial
  `Google Sheets account`, `sheetName` por nombre, `retryOnFail` 3×3 s,
  `onError: continueRegularOutput`), en abanico desde `Filtro duplicados` en
  paralelo a `Append row in sheet`. Publicado, `versionId == activeVersionId ==
  c32d13eb-f22c-4294-ae3b-2ca0ace5cffb`. 48 nodos.

**Verificación parcial (31 ago 2026):** #720 (`success`) — `Registrar métricas`
emitió 7 filas (una por fuente), embudo monótono y autochequeo cuadrando, pero
`Append métricas` **falló** con `Sheet with ID gid=1516813991 not found`
(referencia por `gid` en modo *list*); el `onError` lo absorbió. Corregido:
`sheetName` por nombre.

**Verificación de cierre (3 sep 2026), vía n8n MCP + lectura de la hoja** — 3
pasadas reales con ≥1 oferta nueva, las 3 con las 7 filas en la pestaña
`Metricas`:

- **#724** (manual, 1 sep 11:12): 7 filas, `fecha_hora 2026-09-01 11:12`.
- **#727** (trigger, 1 sep 17:56): 7 filas, `fecha_hora 2026-09-01 17:56`.
- **#731** (trigger, 2 sep 17:36): 7 filas, `fecha_hora 2026-09-02 17:36`.
  `Append métricas` → `success`, 1.538 ms, 7 items; las 7 filas de la hoja son
  idénticas a lo que emitió `Registrar métricas`. Cuadre con el log de esa misma
  ejecución: **Σ `nuevas` = 5 = salida de `Filtro duplicados`**; **Σ
  `tras_cualificacion` = 18 = salida de `Filtro cualificación`** y cuadra fuente a
  fuente (Adzuna 1, Get on Board 1, Himalayas 4, Jobicy 2, Jooble 1, RemotoJob 2,
  WWR 7); autochequeo del embudo `Σ descartes = tras_salario − tras_cualificacion`
  cuadrando en las 7 fuentes; `descartes_encaje` separado de `descartes_perfil`;
  embudo monótono por fuente.

**Limitación asumida (documentada):** una pasada 100 % duplicados no deja fila —
la rama cuelga de `Filtro duplicados`, que en ese caso no emite (visto en #721).

**Cierre:** cumplido — 3 pasadas reales dejan una fila por fuente en `Metricas`
con los recuentos cuadrando con el log de esa misma ejecución. `Append métricas`
escribe sin error tras el fix de `sheetName`. Docs `jobs-evaluacion.md` (M3),
`jobs-ingesta.md` y `jobs-hoja-formato.md` ya reflejan el estado final.

## 9. Deduplicar también por URL en `Filtro duplicados`

**Prioridad: alta. Cerrada el 31 ago 2026 — verificada end-to-end (#718).** Es M2
de [jobs-evaluacion.md](jobs-evaluacion.md). Bug: *«Especialista en Operaciones de
HubSpot y CRM»* estaba dos veces en `Ofertas_activas` (misma URL de remotojob.com,
`id_unico` distinto `48d6e5bf` / `8179f924` porque `empresa` era `No especificado`
en una y `Prismic` en la otra). Solución **aditiva** en `Filtro duplicados`: nueva
clave `id_url` (mismo `hash32` sobre la URL normalizada — sin protocolo, sin www.,
sin puerto, sin query, sin fragment, sin barra final; vacía para email o URL
inválida). Descarta si coincide `id_unico` **o** `id_url`, contra lo guardado y
dentro de la propia tanda.

**Implementación (31 ago 2026), vía n8n MCP** en `Jobs · ingesta`
(`CXCD8BZUQEQKex2a`):
- Cabecera `id_url` en `Ofertas_activas!Q1` y `Archivo!R1` (fila 1 intacta por lo
  demás).
- `jsCode` de `Filtro duplicados` reescrito con `updateNodeParameters`. `hash32`
  extraído a función — reproduce byte a byte los `id_unico` existentes
  (`48d6e5bf` / `8179f924` comprobados); cambio 100 % aditivo. El rango de
  diacríticos de `normalizar()` se construye con `String.fromCharCode(0x300..
  0x36f)` para no dejar *combining chars* invisibles (el JSON del MCP decodifica
  los escapes unicode — ver [[n8n-mcp-quirks]]).
- **Dos versiones publicadas:** `8c112103-…` usaba `new URL()`, que **lanza en el
  sandbox del Code node de esta instancia** → `id_url` salía vacío para toda URL
  válida (visto en el output de #717). Fix en
  `f52e922d-171a-49a5-a0f7-e3a07bdf2183` (**activa**): `normalizarUrl` parsea con
  regex `^https?://([^/?#]+)([^?#]*)`, sin constructor. Equivalencia con la
  versión `new URL` verificada en todas las URLs reales; código publicado releído
  byte a byte (sha256 `31da1fa0d10fa030`).

**Verificación end-to-end (#718, 31 ago 08:08Z, `success`, versión `f52e922d`):**
Mar borró a mano la fila `No especificado`/`48d6e5bf` y se rellenó
`id_url = a5a42240` en la fila `Prismic`/`8179f924` (`Q18`). En esa pasada:
- `Filtro cualificación` pasó la oferta HubSpot/CRM del feed de RemotoJob
  (`empresa: No especificado` → `id_unico 48d6e5bf`, `id_url a5a42240`).
- `Get row(s) in sheet` (30 filas) y `Leer archivo` (299): **`48d6e5bf` no está en
  ninguna** (fila borrada), y `a5a42240` está en **una sola** fila
  (`Prismic`/`8179f924`).
- `Filtro duplicados` **descartó la oferta**: su `id_unico` no coincidía con nada,
  así que el descarte fue **por `id_url`** — el escenario exacto del bug (misma
  URL, `empresa` distinta, `id_unico` distinto). Salida 0 items (el resto de las
  18 ya estaban en la hoja tras la #717), ningún `Append`, ninguna oferta legítima
  perdida.
- Caso Jooble comprobado antes: 4 URLs reales (`jooble.org/away/<id>?p=…`) → 4
  `id_url` distintos tras quitar la query. Sin colisión.

**Cierre:** cumplido — #718 descarta la oferta duplicada por `id_url` sin perder
ofertas legítimas; `id_unico` intacto. Docs `jobs-ingesta.md` y
`jobs-hoja-formato.md` actualizados.

## 8. Verificar el ajuste del prompt de humanización de la carta

**Prioridad: baja. Abierta el 30 ago 2026. Cerrada el 31 ago 2026 — verificada
con la ejecución `trigger` #715.** Salía del «pendiente menor» de la tarea 7: la
humanización de la **carta** con `gpt-4.1-mini` daba calidad irregular —
aplanaba la primera frase a aperturas genéricas («I am interested in the … role»)
y en #710 metió una errata («Adapt at» por «Adept at»).

**Cambio aplicado (30 ago 2026), vía n8n MCP** en el Code node
`Preparar humanizacion` de `Jobs · generación CV` (ID `morsS0M2folmXWhS`),
publicado (`activeVersionId = 5b8618f5-4893-44d6-8e11-4b6fd0731b92`):
- El system prompt pasa de «reescribes prosa» a **«RETOQUE LIGERO, no una
  reescritura: cambia lo mínimo imprescindible… si una frase ya suena natural y
  concreta, DÉJALA tal cual»**.
- Nueva regla anti-errata: **conservar la grafía exacta de cada palabra
  («Adept», no «Adapt»), ante la duda dejar la palabra igual**.
- Bloque nuevo **«Para el texto "carta"»**: mantener el enfoque de la primera
  frase y **NUNCA** sustituirla por una apertura genérica.
- Longitud objetivo 80–120 % → **85–115 %**; `temperature` 0.7 → **0.4**.

**Verificación (31 ago 2026)** — ejecución `trigger` **#715** (30 ago 17:00Z,
`success`, disparada por `Cambio en generar_cv_ia`), oferta `f287d8fd` «AI Data
Annotator» / Argos Multilingual:
- `Aplicar humanizacion` → `_humanizado: true`,
  `_humanizar_nota: "aplicados: resumen, descripcion_1, descripcion_2,
  descripcion_3, carta"`. El `openai_body` confirma el prompt nuevo en uso
  (`temperature 0.4`, system prompt «RETOQUE LIGERO», bloque de la carta).
- **Primera frase:** Claude *«I am writing to apply for the AI Data Annotator
  position at Argos Multilingual.»* → humanizada *«I am applying for the AI Data
  Annotator position at Argos Multilingual.»* — recorte del cliché «writing to»,
  no una apertura genérica prohibida; enfoque (puesto + empresa) conservado.
- **Sin erratas nuevas**; cifras, empresas, fechas, `n8n`/`Docker`/`GDPR`/`C1`
  intactos; HTML del CV y la 4.ª `p.descripcion` (skills) sin tocar.
- **Doc de la carta** (`1uWdC9Z9E_mLGxUHjywYEajCoG9C7NOVrhhwJywHnp4k`) leído: 4
  párrafos + saludo + firma, espaciado correcto, longitud ~94 % del original.
- **Único resto (no bloquea):** OpenAI introdujo un guion largo sin espacios
  («…when needed—skills…») — tic de redacción de IA, no una errata ni una
  regresión de formato. Si reaparece de forma sistemática, añadir una regla al
  system prompt.

**Matiz asumido al cerrar:** #715 es una oferta de aplicación por **enlace**, no
por email, y la primera frase de Claude ya era genérica de salida, así que el
fallo original (aplanar una primera frase *distintiva*) no se estresó a fondo.
Mar da la tarea por cerrada: trigger real + `_humanizado: true` + carta limpia +
fallback al texto de Claude ante cualquier fallo.

**Cierre:** cumplido — #715 (trigger real) con el prompt nuevo deja
`_humanizado: true`, primera frase con el enfoque conservado, sin erratas y con
el Doc sin regresiones.

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

# Sugerencias pendientes

Ideas ya evaluadas y con diseño en [jobs-evaluacion.md](jobs-evaluacion.md), pero
que Mar quiere pedir más adelante, no ahora. No son tareas abiertas — se listan
aquí para no perderlas.

- **Borrador de mensaje de seguimiento a los 7-10 días** (la otra mitad de M7).
  Cuando una candidatura lleva 7-10 días en `cv_enviado` sin `estado_propuesto`,
  mandar a Mar un email con un borrador de mensaje de seguimiento a la empresa.
  Aprobada solo la mitad de archivado a 30 días (tarea 12); esta parte se pide
  explícitamente más adelante.
- **M6 — sacar n8n del portátil a un servidor.** Interesa cuando llegue el
  momento de monetizar/comercializar Jobs, no antes: mientras sea uso personal,
  perder una pasada por el portátil apagado no tiene coste real.
- **M1 — puntuación de encaje con IA** (proveedor ya fijado: `claude-haiku-4-5`,
  ver jobs-evaluacion.md). Explicada y con la duda de la decisión resuelta
  (no descarta nada por sí sola), pero aún sin aprobar para implementar.
- **M4 — podar Wellfound y FlexJobs.** Depende de los datos de la tarea 10
  (`Metricas`): decidir con dos semanas de datos reales, no antes.

# Relacionados

- [jobs-ingesta.md](jobs-ingesta.md)
- [jobs-hoja-formato.md](jobs-hoja-formato.md)
- [jobs-archivado.md](jobs-archivado.md)
- [jobs-evaluacion.md](jobs-evaluacion.md)
