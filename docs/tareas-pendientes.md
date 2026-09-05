---
type: Nota
title: Tareas pendientes · Jobs
description: Tareas manuales y de seguimiento abiertas del pipeline de empleo, con contexto y criterio de cierre. Creada el 29 ago 2026 tras el incidente del hueco de filas vacías en Ofertas_activas.
tags: [n8n, empleo, tareas]
timestamp: 2026-08-29T09:00:00Z
---

# Abiertas

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

**Chequeo intermedio (3 sep 2026):** `search_executions` con
`status: [error, crashed]`, `startedAfter: 2026-08-31` → **0 resultados** en toda
la instancia. 7+ días desde la reconexión base van limpios; falta llegar al 7 sep
para cumplir la ventana de cierre.

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

**Estado (3 sep 2026):** los dos puntos siguen sin poder verificarse de forma
natural:
- Punto 1 — desde el 31 ago **ninguna oferta de aplicación por email** ha pasado
  por `Jobs · generación CV`; todas las candidaturas recientes (#734–#751) son de
  `tipo_aplicacion: enlace`, que no tocan la rama `email` ni marcan `cv_enviado`.
  `Ofertas_activas` no tiene ninguna fila `cv_enviado` con la columna
  `fecha_envio` (R) rellena.
- Punto 2 — la `fecha_envio` más antigua posible es del 31 ago 2026, así que
  ninguna fila llega a los 30 días hasta **~30 sep 2026**. La Regla 3 no puede
  disparar antes sin forzarla.
- Decisión pendiente de Mar: esperar al tráfico real (fecha natural ~30 sep) o
  montar la prueba forzada (fila de prueba `cv_enviado` con `fecha_envio` vieja +
  `DIAS_SIN_RESPUESTA` bajado temporalmente en `Jobs · archivado`, con Mar
  publicando el draft y revirtiéndolo después — el `publish_workflow` del MCP lo
  bloquea el clasificador de auto-mode de Claude Code en esta sesión).

**Criterio de cierre:** los dos puntos anteriores verificados en pasadas reales.

## 16. Revisión de legalidad frente al AI Act de la UE

**Prioridad: media. Abierta el 3 sep 2026 — pedida por Mar. Escrito el 4 sep
2026 — pendiente de que Mar lo revise para cerrar.**
Investigar el estado vigente del Reglamento (UE) 2024/1689 (AI Act) y comprobar
si Jobs está dentro de la legalidad y qué habría que modificar.

**Contexto y alcance:**
- Este proyecto se construyó **sin el paso 4 del método** — no existe
  `docs/03-legal.md`. La tarea crea ese doc con la clasificación y el veredicto.
- Solo toca documentación. Ningún cambio en workflows previsto (salvo que la
  investigación encuentre algo ilegal, poco probable).
- A fecha de hoy (3 sep 2026) **ya aplican las obligaciones de alto riesgo del
  2 ago 2026**. Hay que mirar además, vía `WebSearch`, el «Digital Omnibus» de
  simplificación que se movió a finales de 2025 y cualquier retoque posterior
  (el conocimiento del modelo llega a ene 2026).

**Hipótesis previa (NO conclusión, a validar en la investigación):** Jobs es una
herramienta **personal y del lado del candidato** — filtra *ofertas* para Mar, no
*candidaturas* de terceros. El Anexo III.4 (alto riesgo en empleo) apunta a
sistemas usados por **reclutadores**, no a un asistente de búsqueda propio. Lo
más probable: categoría de **riesgo mínimo**, con obligaciones ligeras de
alfabetización en IA (art. 4, vigente desde feb 2025) y transparencia. **El
cuadro cambia si se comercializa** (M6 / plan de comercialización) → ahí sí
entraría el Anexo III.4. Es también un gate útil antes de construir M1
(scoring de encaje con IA).

**Alcance decidido (4 sep 2026):** el análisis se hace **para el uso personal
actual** de `Jobs` (los workflows n8n que Mar usa para sí misma) **y** con una
sección aparte, claramente marcada, de **qué cambiaría al comercializar**. Mar
confirma que quiere comercializar en el futuro y que ya tiene un MVP aparte,
**Jobs App** (`Jobs App · ingesta`, `Rw4dTNjQa5tR3Eo4`), pero `Jobs` tal cual
seguirá siendo de uso personal. El doc cubre los dos escenarios sin bloquearse en
el segundo.

**Criterio de cierre:** `docs/03-legal.md` escrito y revisado por Mar, con la
clasificación de riesgo del AI Act, el estado RGPD (exención de actividad
doméstica), las obligaciones que aplican hoy y las que aplicarían al comercializar,
y la lista de modificaciones necesarias (si las hay).

**Escrito el 4 sep 2026** — [docs/03-legal.md](03-legal.md). Verificado en
fuente hoy (no de memoria): el "Digital Omnibus" (Parlamento 16 jun 2026,
Consejo 29 jun 2026) **aplazó** las obligaciones de alto riesgo del Anexo III
del 2 ago 2026 al **2 dic 2027** — corrige lo que decía la hipótesis previa de
esta tarea ("ya aplican desde el 2 ago 2026"). **Veredicto: riesgo mínimo** —
Anexo III.4 (empleo) apunta a herramientas del lado del reclutador
(publicar/filtrar/evaluar candidatos), y `Jobs` es del lado del candidato
(Mar filtra ofertas para sí misma). Sin líneas rojas para el uso personal
actual; sección aparte con lo que cambiaría si Jobs App (`Rw4dTNjQa5tR3Eo4`)
llega a ofrecerse a candidatos (riesgo mínimo, pero Mar pasa a proveedora) o a
reclutadores (alto riesgo, Anexo III.4, desde dic 2027). RGPD: exención
doméstica clara para los datos propios de Mar; matiz conservador para los
emails de recruiters que procesa `Jobs · seguimiento` vía Anthropic (interés
legítimo, sin acción adicional requerida). Pendiente de que Mar lo lea para
cerrar la tarea.

## 17. Mejorar `Filtro cualificación` — entran ofertas técnicas fuera de perfil

**Prioridad: alta. Abierta el 3 sep 2026 — pedida por Mar. En recogida de
ejemplos.** A Mar le entran ofertas para las que obviamente no está cualificada
(roles técnicos, de ingeniería informática, infraestructura…).

**Método acordado (4 sep 2026):** Mar **no** prepara una lista de golpe. Cada vez
que entre una oferta mal filtrada la enlazará en la sesión; el agente la registra
en [mejora-filtro-cualificacion.md](mejora-filtro-cualificacion.md) (brief
permanente de esta tarea) y, cuando haya patrón (≥ 5 ofertas o Mar dice
«suficientes»), endurece el nodo `Filtro cualificación` siguiendo el protocolo de
ese documento. La corrección se deja en draft y la publica Mar.

**Toca:** el Code node `Filtro cualificación` de `Jobs · ingesta`
(`CXCD8BZUQEQKex2a`) — nodo caliente. Posiblemente una columna nueva en la pestaña
`Metricas` (o reusar `descartes_perfil` / `descartes_encaje`).

**Causa probable (a confirmar leyendo el nodo):** el criterio 5 «encaje» *rescata*
cualquier oferta cuyo título mencione la familia `IA`. Así entran roles de
infraestructura que solo mencionan «AI»: en la hoja el 3 sep están *Kubernetes &
Cloud Integration Engineer* (OpenNebula, `id_unico 4d13f46f`) y *AI Enablement
Engineer* (LocalStack, `fac88e75`), **ambas con CV ya generado**. La lista «dura»
del criterio 4 no cubre `kubernetes`, `cloud`, `backend`, `infra`…, y `engineer`
suelto no descarta a propósito (para no perder *Automation Engineer*).

**Diseño tentativo:** lista de rechazo «ingeniería técnica dura» (`kubernetes`,
`devops`, `sre`, `backend`, `frontend`, `full-stack`, `software engineer`,
`data engineer`, `cloud engineer`, `platform engineer`, `firmware`…) que corte
**antes** del rescate por familia `IA`, salvo enmarcado claro de ops/PM/enablement.

**Riesgo:** medio — un umbral mal puesto deja fuera *AI Engineer* legítimos (el
bootcamp de Mar es justo eso).

**Necesito de Mar antes de diseñar:** la **lista concreta** de ofertas que
entraron mal (título + por qué no encajan). Claude puede sacar candidatas de
`Archivo` y de las últimas pasadas, pero el criterio de Mar manda.

**Criterio de cierre:** una pasada real deja fuera las ofertas técnicas del tipo
que Mar señaló, sin descartar los roles de operaciones/PM/IA legítimos; el
recuento de descartes cuadra en `Metricas`.

## 18. Columnas `enlace_cv` y `enlace_carta` en `Ofertas_activas`

**Prioridad: media. Abierta el 3 sep 2026 — pedida por Mar. Implementada y
publicada por Mar el 4 sep 2026. Verificada en la rama `enlace`; restos menores en
observación.** Añadir al sheet dos columnas con el enlace del Doc de CV y el del
Doc de carta generados para cada oferta, para reducir confusiones al enviar.

**Decisiones de Mar (4 sep 2026):**
- Formato del enlace: **enlace de edición** `https://docs.google.com/document/d/<id>/edit`.
- Ramas: **ambas** (email y enlace). El nodo que las escribe corre antes del
  bifurcado, así que cubrir las dos sale gratis (un solo nodo tocado).

**Implementación (4 sep 2026), vía n8n MCP:**
- **Hoja `n8n_jobs`:** cabeceras nuevas `enlace_cv` / `enlace_carta` en
  `Ofertas_activas!S1:T1` y `Archivo!T1:U1` (mapeo por cabecera, la posición da
  igual). Fila 1 intacta por lo demás; el formato lo repone `mantenimiento`
  (ambas columnas quedan fuera de todo allowlist del Apps Script).
- **`Jobs · generación CV`** (`morsS0M2folmXWhS`): el nodo
  `Actualizar estado generar_cv_ia` (Google Sheets `update`, corre **antes** del
  `email o enlace`) suma a `columns.value` dos claves:
  `enlace_cv = {{ 'https://docs.google.com/document/d/' + $('Crear doc cv').item.json.id + '/edit' }}`
  y `enlace_carta` con la misma forma sobre `Crear doc carta`. Cambio 100 %
  aditivo (`updateNodeParameters`, `replace: true`, releído byte a byte):
  `columns.value` gana 2 claves, `columns.schema` 2 entradas; `estado`,
  `generar_cv_ia`, `id_unico` y `matchingColumns: ['id_unico']` intactos. 26
  nodos, wiring `Escribir carta → Actualizar estado generar_cv_ia → email o
  enlace` intacto. Salida de `Crear doc cv` confirmada en #750:
  `json.id` = ID del Doc.
- **Publicado el 4 sep 2026 por Mar:** `activeVersionId == versionId ==
  0e59f551-748d-432b-9ca9-6e53e16dbe8c`. El único warning de validación
  (`Enviar cv y carta por email` sin `operation` explícito) es preexistente y sin
  impacto (ver «Fallos conocidos» de [jobs-generacion-cv.md](jobs-generacion-cv.md)).

**Patrón:** idéntico a la tarea 12 (`fecha_envio`) — mapeo por cabecera, 100 %
aditivo, `mantenimiento` no lo toca. Docs
[jobs-hoja-formato.md](jobs-hoja-formato.md) y
[jobs-generacion-cv.md](jobs-generacion-cv.md) ya actualizados.

**Verificación (4 sep 2026):** Mar confirma que en la rama `enlace` las columnas
`enlace_cv`/`enlace_carta` (S/T) quedan rellenas con el enlace de edición correcto
y funcionan (abren el Doc de CV y de carta).

**Restos menores en observación (no bloquean, se comprueban de forma
oportunista):** confirmar en una candidatura real de tipo `email` que las mismas
columnas se rellenan igual (el nodo corre antes del bifurcado, así que debería
ser automático); que los enlaces sobreviven a una pasada de `mantenimiento`; y
que al archivarse la oferta viajan a `Archivo` (cols T/U).

**Criterio de cierre:** publicada y verificada — cumplido en lo esencial. Se
cierra del todo cuando se confirmen los tres restos menores.

## 19. Reorganizar/depurar las columnas de `Ofertas_activas` y `Archivo`

**Prioridad: baja. Abierta el 4 sep 2026 — pedida por Mar.** La hoja se ha ido
llenando de columnas (18 en `Ofertas_activas`, 20 en `Archivo` tras la tarea 18)
y Mar no tiene claro para qué sirven algunas ni si hacen falta. Preguntó en
concreto por `plataforma`, `estado_propuesto`, `resumen_respuesta` e `id_url`.

**Auditado el 4 sep 2026 — las 4 están vivas, ninguna se puede borrar:**

| Columna | La escribe | La lee | Si se borra |
|---|---|---|---|
| `plataforma` | los 13 normalizadores de [Jobs · ingesta](jobs-ingesta.md) (nombre de la fuente: LinkedIn, We Work Remotely…) | `Registrar métricas` (desglose por fuente en la pestaña `Metricas`, tarea 10); base de la decisión M4 (podar Wellfound/FlexJobs) en [jobs-evaluacion.md](jobs-evaluacion.md) | se pierde el desglose por fuente de `Metricas` y no se puede decidir M4 |
| `estado_propuesto` | `Jobs · seguimiento` (`Guardar propuesta de la IA`) | Regla 3 de `Decisión archivar` en [jobs-archivado.md](jobs-archivado.md) (tarea 12: solo archiva `cv_enviado` si está vacía) | la tarea 12 se rompe; además Mar pierde la propuesta de la IA que hoy valida a mano antes de que cambie `estado` |
| `resumen_respuesta` | `Jobs · seguimiento`, junto con `estado_propuesto` | Mar, a mano (para entender qué respondió la empresa) | Mar pierde el resumen de la respuesta de la empresa |
| `id_url` | `Filtro duplicados` de la ingesta (tarea 9 / M2 — hash de la URL normalizada) | el propio `Filtro duplicados`, como segunda clave de dedup junto a `id_unico` | reaparece el bug de la tarea 9 (misma oferta dos veces con `id_unico` distinto) |

**Sobre reordenar:** es técnicamente seguro para la automatización — todos los
nodos de n8n mapean por **cabecera** (nombre de columna), no por posición, y el
Apps Script `mantenimiento` también busca sus 3 columnas clave (`fecha_guardado`,
`generar_cv_ia`, `estado`) por nombre (`cabeceras.indexOf(...)`), no por letra.
**El riesgo no es la automatización, es el formato manual:** el desplegable de
`estado` con el color de cada chip lo pintó Mar a mano (la API de Sheets no
expone el color del chip, ver tarea 6) y está atado a la **posición** de la
columna E; moverla obligaría a rehacer esa validación+color. La banda de colores
alternos también depende de qué columnas cubre.

**Candidata a investigar aparte:** la columna **`⭐`** de `Archivo` (distinta de
`destacada`), señalada como «sobrante» en
[jobs-hoja-formato.md](jobs-hoja-formato.md) — comprobar si algo la escribe/lee
antes de tocarla.

**Recomendación de Claude:** no borrar ni reordenar nada por ahora. Si lo que
molesta es el ruido visual, la opción de coste cero es **ocultar columnas**
(clic derecho → Ocultar columna) en Google Sheets — no afecta a la
automatización (sigue mapeando por cabecera) y es reversible al instante. Mar
puede ocultar `estado_propuesto`, `resumen_respuesta`, `id_url`, `plataforma` (o
las que le estorben) sin ningún riesgo.

**Duda para Mar:** ¿ocultar columnas es suficiente, o prefieres que se investigue
en serio una reordenación (agrupar lo que consultas tú a la izquierda, lo que
solo usan los workflows a la derecha)? Si es lo segundo, es una tarea con más
alcance (revisar validaciones, banda y el script antes de tocar nada).

**Criterio de cierre:** Mar decide entre ocultar (cierre inmediato) o encargar la
reordenación completa (nueva subtarea con su propio plan).

## 21. Unificar el formato de todas las pestañas de `n8n_jobs`

**Prioridad: baja. Abierta el 4 sep 2026 — pedida por Mar, sin prisa.** Hay
celdas y columnas sin formato en la hoja `n8n_jobs`, sobre todo en
`Ofertas_activas`. Sin auditar todavía — Mar no especificó qué celdas
concretas, solo que las ha visto.

**Alcance precisado (5 sep 2026):** Mar confirma que el diseño actual de
`Ofertas_activas` le gusta tal cual — **es la referencia, no se toca**. Lo
que hay que unificar es `Metricas` (y de paso `Archivo`) para que sigan el
mismo estilo visual: banda de colores alternos, tipografía, alineación,
alto de fila. `Metricas` es la pestaña más reciente (tarea 10, 31 ago 2026)
y nunca pasó por ningún formateo — se creó solo con las 12 cabeceras.

**Hipótesis de partida (a confirmar, no asumir):** las columnas que se
fueron añadiendo por API a lo largo del proyecto —`id_url` (tarea 9),
`fecha_envio` (tarea 12), `enlace_cv`/`enlace_carta` (tarea 18), y las que
sumaría M1 (`encaje_ia`/`motivo_ia`, ver
[jobs-evaluacion.md](jobs-evaluacion.md))— solo escribieron la **cabecera**
en la fila 1; nunca pasaron por el formateo manual que sí tienen las
columnas originales (fuente, tipografía, alineación, y sobre todo si caen
dentro de la banda de colores alternos y del rango de validación de
`estado`). El Apps Script `mantenimiento`
([jobs-hoja-formato.md](jobs-hoja-formato.md)) cubre casilla, orden, alto de
fila, desplegable de `estado` y la banda — pero solo si esas columnas nuevas
ya estaban dentro de su rango de referencia; si no, quedarían visualmente
descolgadas del resto.

**Toca:** posiblemente el Apps Script `mantenimiento` (`apps-script/`, vía
clasp) si el hueco es de rango/banda, y/o un repaso manual una sola vez en
Google Sheets si es solo de estilo (bordes, fuente, alineación) que la API
no puede leer ni fijar de forma fiable (mismo límite que el color del chip
de `estado`, tarea 6).

**Relacionado:** se solapa con la parte de formato de la tarea 19
(reordenar/depurar columnas) — mismo riesgo de fondo: lo que la API no
puede leer (bordes, color de chip, cobertura de la banda) solo se arregla a
mano y hay que evitar romperlo con cambios automáticos.

**Necesito de Mar antes de tocar nada:** confirmar si el estilo de
referencia de `Ofertas_activas` (banda, fuente, alineación) se puede leer
de forma fiable vía API para replicarlo en `Metricas`/`Archivo`, o si hace
falta que Mar lo describa a mano (mismo límite que el color del chip de
`estado`, tarea 6) — Claude lo comprueba leyendo el formato actual de la
hoja antes de tocar nada.

**Criterio de cierre:** `Metricas` y `Archivo` con un formato consistente
con el de `Ofertas_activas` (fuente, alineación, banda de colores, bordes
donde corresponda) en todas sus columnas, incluidas las añadidas después de
la creación de la hoja; sin tocar el diseño actual de `Ofertas_activas` ni
romper el desplegable de `estado` ni su banda existente.

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

## 22. M1 — Puntuación de encaje con IA

**Prioridad: alta. Abierta el 4 sep 2026 — implementación pedida por Mar
("sigue con M1"), tras decidir el 4 sep que el paso 16 (red team) va después
de esta mejora. Publicada por Mar el 4 sep 2026. CERRADA el 5 sep 2026 —
verificada end-to-end en una pasada real disparada manualmente por Mar.** Es
M1 de [jobs-evaluacion.md](jobs-evaluacion.md), la mejora que más tiempo
ahorra a Mar (resuelve H1: ofertas técnicas fuera de perfil que colaban por
mencionar «AI»).

**Implementación (4 sep 2026), vía n8n MCP** en `Jobs · ingesta`
(`CXCD8BZUQEQKex2a`, 51 nodos). **Publicada por Mar el 4 sep 2026 —
confirmado `versionId == activeVersionId == a8076aec-df56-47aa-a272-95663ea808dd`,
`active: true`:**

- 3 nodos nuevos entre `Filtro cualificación` y `Get row(s) in sheet`:
  `Preparar scoring` (Code) arma el prompt con el perfil de Mar **resumido
  en el propio código** (no lee el JSON de Drive, para no añadir esa
  dependencia a este workflow) más ejemplos de calibración sacados de H1;
  `Scoring encaje` (HTTP Request a `api.anthropic.com`, `claude-haiku-4-5` —
  decisión de Mar del 30 ago 2026, reusa `ANTHROPIC_API_KEY`) usa un turno
  `assistant` prefilled con `"{"` para forzar JSON limpio sin depender solo
  de la instrucción del prompt; `Aplicar scoring` (Code) empareja cada
  respuesta con su oferta por índice, valida el rango 0-100 y **ante
  cualquier fallo deja `encaje_ia`/`motivo_ia` en `null` sin descartar la
  oferta** (mismo patrón que `Aplicar humanizacion`).
- `Filtro duplicados` cambia una sola línea: lee de `Aplicar scoring` en vez
  de `Filtro cualificación` — el resto del nodo, intacto.
- Columnas nuevas `encaje_ia` / `motivo_ia` en `Ofertas_activas!U1:V1` y
  `Archivo!V1:W1` (mapeo por cabecera, fila 1 intacta por lo demás).
- 12 nodos reposicionados en el lienzo (desplazados +600px en X) para hacer
  sitio a los 3 nuevos; wiring, no visual.
- **Verificado byte a byte antes de pedir a Mar que publicara**: los 3
  jsCode nuevos y la línea cambiada de `Filtro duplicados` coinciden
  carácter a carácter con lo enviado; conexiones (`Filtro cualificación →
  Preparar scoring → Scoring encaje → Aplicar scoring → Get row(s) in
  sheet`) y el resto del grafo (fan-out a `Registrar métricas`, rama de
  `Guardarraíl huecos`) intactos.
- Avisos de validación tras el cambio: los mismos 4 preexistentes (`Merge`/
  `Unir aviso error` sin `numberInputs`, `Send a message1`/`Aviso huecos`
  sin `operation` explícito) — ninguno nuevo, ninguno de los 3 nodos añadidos.

**No incluye** (a propósito, fuera del alcance de M1 según
[jobs-evaluacion.md](jobs-evaluacion.md)): ordenar `Ofertas_activas` por
`encaje_ia` (iría en el Apps Script `mantenimiento`, no en n8n) ni ningún
descarte automático por umbral — el nodo **solo puntúa**.

**Verificación end-to-end (5 sep 2026), vía lectura directa de la hoja**
(`n8n-mcp` seguía sin conectar — error 502 — así que la comprobación se hizo
con `google-sheets` MCP en vez de `n8n_executions`). Mar disparó
manualmente `Jobs · ingesta`; la pasada quedó registrada en `Metricas` como
`2026-09-05 11:03` (`= 2026-09-05T09:03Z`, coincide con la hora de
modificación de la hoja):

1. **`encaje_ia`/`motivo_ia` rellenos en ofertas nuevas** — la única oferta
   nueva de esa pasada (*Revenue Operations Specialist (SaaS)*, micro1,
   `id_unico 4db9d32c`, Himalayas) quedó con `encaje_ia = 0` y `motivo_ia`
   explicando que la descripción llegó incompleta y no permite evaluar el
   encaje. Confirma también el camino de **descripción degradada, no
   fallo de API**: puntúa bajo en vez de dejarlo en blanco.
2. **Discrimina un caso real de H1** — en la pasada anterior (`RemotoJob`,
   4 sep ~19:50) entró *«Ingeniero de IA Generativa y Sistemas de Agentes»*
   (Synera, `id_unico 14bcf59d`): título con «IA», pero **`encaje_ia = 15`**
   con `motivo_ia`: *"Puesto de ingeniero técnico puro (sistemas de agentes,
   modelos de lenguaje) que exige experiencia profesional en desarrollo de
   IA. Candidata tiene conocimientos básicos de IA en bootcamp pero NO
   perfil de ingeniero de software, ni experiencia profesional en
   desarrollo. No encaja."* — exactamente el escenario de H1 (título con
   «IA» que antes rescataba el criterio 5 de `Filtro cualificación`), ahora
   puntuado bajo en vez de colar sin más.
3. **Ninguna oferta se pierde** — el embudo de `Metricas` para la pasada de
   hoy (Himalayas: `crudas 20 → tras_teletrabajo 20 → tras_salario 19 →
   tras_cualificacion 2 → nuevas 1`) es monótono y coincide con la única
   fila nueva añadida a `Ofertas_activas`; ninguna regresión frente a
   pasadas anteriores a M1.

**Observación menor, no bloqueante:** en esa misma pasada de RemotoJob
(4 sep ~17:01/19:50) otra oferta nueva (*Especialista en Gestión de Redes
Sociales*, Sayonara, `id_unico 2a1fbbaa`) quedó **sin** `encaje_ia`/
`motivo_ia` (ambos vacíos) — consistente con el diseño «ante cualquier fallo
deja `null` sin descartar la oferta» de `Aplicar scoring`: la oferta no se
perdió, solo se quedó sin puntuar. No se investiga la causa puntual (podría
ser un fallo transitorio de la llamada a Claude); si se repite con
frecuencia, vigilar `Aplicar scoring` en pasadas futuras.

**Cierre:** cumplido — publicado, `encaje_ia`/`motivo_ia` se rellenan en
ofertas nuevas, discrimina correctamente un caso real de H1 y no hay
regresión en el recuento de ofertas guardadas. Doc
[jobs-evaluacion.md](jobs-evaluacion.md) (M1) ya refleja el estado.

## 20. Arreglar enlaces rotos a `tareas-manuales.md` e `index.md` en los docs

**Prioridad: baja. Abierta el 4 sep 2026 — detectada por Claude, anotada a
petición de Mar. CERRADA el 4 sep 2026.** Varios docs de `docs/` tenían enlaces
internos que apuntaban a `../../docs/tareas-manuales.md` y `../../docs/index.md`
— ficheros que **no existen** en este repo. Deuda previa a que `Jobs` tuviera
esta carpeta `docs/` propia; no la causó ningún cambio reciente.

**Inventario original (14 enlaces, 4 ficheros de destino inexistentes):**

| Fichero | Línea | Enlace roto | Contexto |
|---|---|---|---|
| `jobs-archivado.md` | 154 | `[index.md](../../docs/index.md)` | sección Relacionados |
| `jobs-generacion-cv.md` | 238 | `[index.md](../../docs/index.md)` | sección Relacionados |
| `jobs-hoja-formato.md` | 140 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | «Instalación y verificación…, sección Para cerrar Jobs» |
| `jobs-hoja-formato.md` | 429 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | Relacionados, «instalar y verificar el script» |
| `jobs-hoja-formato.md` | 433 | `[index.md](../../docs/index.md)` | sección Relacionados |
| `jobs-ingesta.md` | 405 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | permisos de un actor de Apify, tarea de Mar |
| `jobs-ingesta.md` | 410 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | incidente del 15 ago (equipo suspendido) |
| `jobs-ingesta.md` | 611 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | cierre de un incidente de credenciales Google |
| `jobs-ingesta.md` | 750 | `[index.md](../../docs/index.md)` | sección Relacionados |
| `jobs-revision.md` | 181 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | contingencia del actor de Glassdoor/SAP/Talent |
| `jobs-revision.md` | 262 | `` `tareas-manuales.md` `` (sin enlace) | detalle del borrado de filas, sección «Cerradas» |
| `jobs-revision.md` | 292 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | «Para cerrar Jobs» |
| `jobs-archivado.md` | 143 | `[tareas-manuales.md](../../docs/tareas-manuales.md)` | hallazgo del check de Healthchecks |
| `jobs-seguimiento.md` | 102 | `[index.md](../../docs/index.md)` | sección Relacionados |

**Arreglo aplicado (4 sep 2026):**
- **`index.md` (5 enlaces):** se creó [docs/index.md](index.md), índice real que
  enlaza los 4 workflows, la hoja, evaluación/mejora y el resto de docs. Los 5
  enlaces ahora apuntan ahí (`[Índice de docs](index.md)`).
- **`tareas-manuales.md` (9 referencias):** revisadas caso a caso — todas
  apuntaban a incidentes históricos (jul–ago 2026) ya narrados en línea en el
  propio párrafo, sin contenido adicional que rescatar y sin equivalente en
  [tareas-pendientes.md](tareas-pendientes.md) (el fichero es anterior a la
  creación de esta lista, el 29 ago 2026). Se quitó el enlace roto manteniendo
  el texto en 8 casos. El caso de `jobs-revision.md:292` («Para cerrar Jobs»)
  llevaba dos tareas: instalar el Apps Script (ya cerrada, tiene su propia
  «Actualización 29 ago 2026» en el mismo doc) y registrar la app en
  apidoc.infojobs.net (**sigue pendiente** — sin tarea abierta que la rastree;
  redirigida a [jobs-ingesta.md#fallos-conocidos](jobs-ingesta.md#fallos-conocidos),
  donde ya vivía documentada).
- **Hallazgo de paso:** al leer `jobs-ingesta.md:405` se confirma que la
  aprobación manual de permisos del actor de Apify de **FlexJobs** (bloqueado
  desde el 15 ago 2026 con `403 full-permission-actor-not-approved`) sigue sin
  rastro de haberse hecho. No se abre tarea nueva porque
  [jobs-evaluacion.md](jobs-evaluacion.md) (M4) ya propone podar FlexJobs del
  todo por coste/nulo retorno — decisión pendiente de Mar, no un enlace roto.

**Cierre:** los 14 enlaces resueltos (5 redirigidos a `docs/index.md`, 9 sin
enlace con el texto conservado o redirigidos a su doc real); `docs/index.md`
creado y enlazado desde los 5 docs que lo mencionaban. Verificado con
`grep -rn "tareas-manuales\.md\|index\.md" docs/*.md` sin resultados fuera de
este doc.

## 11. Truncar `resumen` a ~800 caracteres

**Prioridad: baja. Abierta el 30 ago 2026 — aprobada por Mar. Implementada y
publicada el 31 ago 2026. CERRADA el 3 sep 2026 — verificada end-to-end en una
pasada real (#748).** Es M8 de [jobs-evaluacion.md](jobs-evaluacion.md). Algunas
ofertas guardaban la descripción completa sin recortar (~10 KB), lo que disparaba
el alto de fila que el Apps Script corrige cada hora. El enlace completo se
conserva en su columna; la generación de CV recorta la oferta a 6.000 caracteres
aparte, así que no le afecta.

**Dónde se trunca (decisión del 31 ago 2026):** dentro de `Filtro duplicados`, al
construir cada oferta de salida — después de todos los filtros, que siguen viendo
el `resumen` completo. Truncar antes del `Merge` cambiaría decisiones de
`Filtro teletrabajo` y del criterio de idioma de `Filtro cualificación` si la
palabra clave cae más allá del carácter 800. Un solo nodo tocado en vez de 13 y
comportamiento de filtrado intacto.

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
  f8ac4e6b-ef03-4fbe-9836-259a010e81b7`. 48 nodos, wiring intacto.

**Verificación end-to-end (3 sep 2026), vía n8n MCP + lectura de la hoja** —
ejecución **#748** de `Jobs · ingesta` (3 sep 15:01Z, `trigger`, `success`, con
la versión activa `f8ac4e6b`):
- `Filtro duplicados` emitió 4 ofertas nuevas. La de **We Work Remotely**
  («Executive Assistant (Remote, UK/EU, £38k-£43k/year)» / Ellipsis®,
  `id_unico dbc8e3b6`) llegó con la descripción entera del feed (WWR no la recorta
  en su normalizador, a diferencia de LinkedIn/Infojobs que hacen `substring(0,
  200)`).
- En `Ofertas_activas` esa fila (fila 8) quedó con **`resumen` de 801 caracteres
  exactos, terminado en `...`**, cortado en un espacio tras «…and performance»
  (sin partir la palabra) — la firma de `truncarResumen()`. El enlace en `L8`
  intacto y completo
  (`https://weworkremotely.com/remote-jobs/ellipsis-executive-assistant-remote-uk-eu-38k-43k-year`).
- Las otras 3 ofertas de la misma pasada tenían `resumen` corto natural (<800) y
  pasaron sin tocar. Ninguna oferta con `resumen` > 800 sin recortar en el resto
  de la hoja.

**Cierre:** cumplido — pasada real con una oferta de descripción larga deja
`resumen` recortado a ~800 + `...` y el enlace intacto; el filtrado de arriba no
cambió ninguna decisión. Docs `jobs-evaluacion.md` (M8) y `jobs-ingesta.md`
actualizados.

## 15. El CV generado perdía el Grado de la UOC y el CV salía mal ubicado

**Prioridad: alta. Abierta y CERRADA el 3 sep 2026 — verificada end-to-end con el
workflow publicado (#749 mercor, #750 Blink Health, ambos `idioma EN`).**
Detectada al supervisar 3 CV reales (#734 Simera, #735 Elevenlabs, #736 PadSplit),
aprobada por Mar.

En los 3 CV iniciales (Google Doc) **faltaba el «Grado en Comunicación y
Publicidad Creativa · UOC · 2012–2019, con Honores»**. El HTML que genera Claude y el que sale de la
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

**Versiones publicadas por Mar:** `40d83c73` (pasos 1+2 + `Adaptar` `087bb1f4`) →
`e3da5677` (`Adaptar` `52aa49a9`) → `d2db224c` (`Adaptar` `e68b67cc`) →
`4552575d` (paso 4, `Crear doc cv`). `activeVersionId == 4552575d-…`.

**Verificación end-to-end (3 sep 2026):**
- **#739** (OpenNebula) y **#740** (Doppel): `Filtro generar CV` recibió 8 filas
  (2 ofertas × duplicados del trigger) y emitió **1** por ejecución, la 2.ª en la
  pasada siguiente sin colgarse.
- **#743** (TripleTen, `EN`): las 4 ranuras de Formación por separado; Grado UOC
  en su línea propia con estilo de título.
- **#745** (LocalStack, `EN`): encabezados traducidos a **Experience / Education /
  Skills**. Se detectó aquí que el CV se guardaba en «Plantillas CV n8n» → paso 4.
- **#749** (mercor, `EN`) y **#750** (Blink Health, `EN`), ya con `4552575d`: el
  Doc del CV **aterriza en «Cvs jobs n8n»**; Formación con las 2 entradas
  (Bootcamp NEOLAND y Grado UOC 2012–2019 con Honores) cada una en su ranura con
  estilo de título;
  encabezados en inglés; habilidades y resto del CV intactos; proyecto de Mar
  integrado en el resumen, sin sección de Proyectos; dedupe a 1 oferta/ejecución.

**Limpieza:** los **13 CV** generados antes del arreglo (26-08-03 … 26-09-03) se
movieron a mano de «Plantillas CV n8n» a «Cvs jobs n8n» (vía Drive MCP). En
«Plantillas CV n8n» solo quedan la plantilla del CV, la de la carta y un
`Copy of Plantilla CV` huérfano (Mar decide si lo borra).

**Cierre:** cumplido — 4 sub-arreglos (2 bloques de Formación con ranura propia,
encabezados según idioma, dedupe, carpeta destino) verificados en #749 y #750 con
el workflow completamente publicado.

**Pendiente menor (no bloquea):** borrar el `Copy of Plantilla CV` huérfano de
«Plantillas CV n8n» (decisión de Mar).

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
