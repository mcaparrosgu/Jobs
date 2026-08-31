# Bitácora del proyecto

Cuaderno de decisiones en orden cronológico. Solo se añade al final: guarda el
**porqué** de cada decisión, qué se descartó y qué costó entender, que es lo que
se pierde con cada `/clear`. No se reescribe ni se corrige hacia atrás; si una
decisión cambió, se anota una entrada nueva que lo diga.

## 2026-08-31 · Hito: rama de métricas del embudo de ingesta (tarea 10 / M3)

- QUÉ SE DECIDIÓ — Pestaña nueva `Metricas` en `n8n_jobs` (una fila por pasada y
  fuente: crudas → tras_teletrabajo → tras_salario → tras_cualificacion →
  nuevas + descartes por criterio) alimentada por una rama aislada
  `Registrar métricas` → `Append métricas` que cuelga en abanico de
  `Filtro duplicados`, en paralelo al `append` principal. Para tener el desglose
  de descartes por criterio, `Filtro cualificación` publica ese recuento
  **por fuente** en `workflowStaticData` y se separa el criterio 5 (etiqueta
  `perfil:` → `encaje:`), sin tocar la decisión pasa/descarta.
- ALTERNATIVAS DESCARTADAS — (a) Rama doble: una segunda rama siempre-activa
  colgando de `Get row(s) in sheet` para cubrir también las pasadas sin ofertas
  nuevas. (b) No tocar `Filtro cualificación` y recalcular los descartes por
  diferencia de recuentos entre etapas — pero eso da el total, no el desglose
  por criterio. (c) Adjuntar el desglose a cada item de salida de
  `Filtro cualificación`.
- POR QUÉ ESTA — Es la que especificaba M3 y Mar ya había aprobado, y la más
  simple. La rama doble añade dos nodos y más lógica para cubrir un caso poco
  frecuente. La opción (c) se pierde si una pasada no deja pasar ninguna oferta
  y ensucia el `append`; `workflowStaticData` es el único canal limpio para que
  un nodo posterior lea algo que no sean los items de salida del anterior.
- QUÉ SE ROMPIÓ — `Append métricas` falló en la ejecución #720 con `Sheet with
  ID gid=1516813991 not found`: se referenció la pestaña nueva por `gid` en modo
  *list* y n8n no la resolvió (con `gid=0` sí funciona en `Append row in sheet`).
  Se arregló pasando `sheetName` a modo **nombre** (`"Metricas"`). El
  `onError: continueRegularOutput` hizo su trabajo: el fallo no tocó el resto del
  pipeline y la ejecución quedó `success`. La #721 salió pasada 100 %
  duplicados, así que la rama de métricas no llegó a ejecutarse y la escritura
  quedó sin verificar — se confirma con la pasada automática del 1 sep 09:00.
- QUÉ QUEDA PENDIENTE DE ENTENDER — Por qué exactamente el modo *list* con `gid=`
  no encuentra una pestaña recién creada cuando `gid=0` sí funciona. Y si la
  limitación de «pasada 100 % duplicados → sin fila en `Metricas`» acabará
  molestando para comparar semanas entre sí; se revisa con dos semanas de datos
  reales, junto con la decisión sobre M4.

## 2026-08-31 · Hito: archivar `cv_enviado` sin respuesta a los 30 días (tarea 12 / mitad de M7)

- QUÉ SE DECIDIÓ — Una candidatura que lleva 30 días en `cv_enviado`, sin que
  `Jobs · seguimiento` haya propuesto ningún estado, se archiva automáticamente
  con `estado: sin_respuesta`. Columna nueva `fecha_envio` en `Ofertas_activas` y
  `Archivo`, que `Jobs · generación CV` escribe (`{{ $now.toFormat('yyyy-MM-dd')
  }}`) en el mismo nodo que marca `cv_enviado`, solo en la rama `email`. La
  transición la hace la nueva Regla 3 de `Decisión archivar` en
  [Jobs · archivado](jobs-archivado.md), **en la misma pasada** que el archivado:
  empuja `{ ...oferta, estado: 'sin_respuesta' }` (una copia) directo a `Archivo`.
- ALTERNATIVAS DESCARTADAS — (a) Dos fases: una pasada escribe `sin_respuesta` en
  `Ofertas_activas` (visible, con opción a que Mar intervenga) y la siguiente
  pasada lo archiva. (b) Que la transición la hiciera `Jobs · generación CV` o un
  workflow nuevo con Schedule propio.
- POR QUÉ ESTA — Mar eligió la vía directa. La de dos fases obliga a un nodo
  Google Sheets `update` extra, a añadir `sin_respuesta` a la validación del
  desplegable de `estado` y a colorear el chip a mano (la API no expone el
  color) — justo lo que el texto de M7 daba por necesario. Haciéndolo en
  `Decisión archivar`, que ya lee toda la hoja dos veces al día, `sin_respuesta`
  nunca llega a `Ofertas_activas`: entra en `Archivo` como texto plano (allí el
  `estado` no lleva desplegable) y no hay nada manual que tocar. Mismo patrón
  aditivo de un solo nodo que las tareas 9/10/11.
- QUÉ SE ROMPIÓ — Nada. `updateNodeParameters` + relectura byte a byte (acentos
  intactos) en los dos workflows; `Jobs · generación CV` publicado como
  `5c2638d4-…`, `Jobs · archivado` como `75d363e2-…`. La única advertencia de
  validación es la preexistente de `Enviar cv y carta por email` (falso positivo
  ya documentado). No hay ninguna fila `cv_enviado` en la hoja ahora mismo, así
  que la próxima pasada de archivado es un no-op para la Regla 3.
- QUÉ QUEDA PENDIENTE DE ENTENDER — Si «sin respuesta» = `estado_propuesto` vacío
  es señal suficiente, o si hay que mirar también `resumen_respuesta` u otra
  cosa. Y qué hacer con las filas `cv_enviado` anteriores a hoy, que no tienen
  `fecha_envio` y la Regla 3 ignora a propósito: hoy no hay ninguna, pero si
  aparecieran habría que rellenarles `fecha_envio` a mano o dejarlas para el
  archivado por otra vía. Se cierra cuando se vean los dos pasos en pasadas
  reales.

## 2026-08-31 · Hito: truncar `resumen` a ~800 caracteres (tarea 11 / M8)

- QUÉ SE DECIDIÓ — El `resumen` de cada oferta se recorta a ~800 caracteres
  antes de escribirlo en la hoja, para que las descripciones enteras (~10 KB en
  la fila de GitLab) dejen de disparar el alto de fila que el Apps Script de
  `mantenimiento` tiene que forzar a 21 px cada hora. El recorte se hace
  **dentro del nodo `Filtro duplicados`** de [Jobs · ingesta](jobs-ingesta.md),
  al construir la oferta de salida: función `truncarResumen()` con
  `LIMITE_RESUMEN = 800`, corte al último espacio si está cerca del límite (no
  parte palabras) y marca `...`. Cambio 100 % aditivo: las claves de dedup
  (`id_unico`, `id_url`) y la decisión pasa/descarta no se tocan.
- ALTERNATIVAS DESCARTADAS — (a) Lo que decía el doc M8: truncar en cada uno de
  los 13 normalizadores, antes del `Merge`. (b) Un nodo Code nuevo entre
  `Filtro duplicados` y `Append row in sheet`.
- POR QUÉ ESTA — Truncar antes del `Merge` (opción a) mete el recorte por
  delante de `Filtro teletrabajo` (que mira `titulo+resumen` para detectar
  "hybrid"/"onsite" y para rescatar por palabras de remoto) y del criterio de
  idioma de `Filtro cualificación`: si la palabra clave cae más allá del
  carácter 800, esos filtros cambian de decisión y se cuela una oferta híbrida
  o se tira una remota buena. Haciéndolo en `Filtro duplicados` —que ya reescribe
  cada item de forma aditiva y va después de todos los filtros— el filtrado
  queda intacto y se toca un solo nodo en vez de 13. La opción (b) es igual de
  segura pero añade un nodo y hay que meterlo en el abanico que también alimenta
  `Registrar métricas`.
- QUÉ SE ROMPIÓ — Nada. `updateNodeParameters` + relectura byte a byte (sha256
  `285e5933a2d86986`), publicado como `versionId
  f8ac4e6b-ef03-4fbe-9836-259a010e81b7`, wiring intacto, 48 nodos. Comportamiento
  de `truncarResumen()` probado en local (texto corto pasa igual, `null`/
  `undefined` no rompen, texto largo corta ~800 + `...`, exactamente 800 no se
  toca).
- QUÉ QUEDA PENDIENTE DE ENTENDER — Si 800 caracteres es el número correcto: se
  eligió porque el doc M8 lo decía y porque el prompt del CV recorta a 6.000
  aparte, pero no se ha medido cuánto texto útil se pierde de media. Se revisa
  cuando una pasada real con ofertas largas deje ver el recorte en la hoja
  (criterio de cierre de la tarea 11).
