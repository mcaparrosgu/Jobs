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

## 2026-09-03 · Auditoría de la generación de CV/carta y arreglo del Grado UOC (tarea 15)

- CONTEXTO — Mar marcó 3 ofertas y pidió supervisar la generación. Las 3
  ejecuciones (#734 Simera, #735 Elevenlabs, #736 PadSplit) salieron `success`,
  la humanización con `gpt-4.1-mini` fiel (sin inventar datos, habilidades
  intactas, cartas 97–102 % de longitud). Pero **los 3 CV (Google Doc) perdían
  el Grado de la UOC**: el HTML de Claude y el humanizado lo llevan (2 `<h3>`
  bajo `<h2>Formación>`), pero `Adaptar cv plantilla` solo mapeaba `h3[3]` /
  `empresa[3]` a la única ranura `{{FORMACION_TITULO}}` / `{{FORMACION_DETALLE}}`,
  así que `h3[4]` (el Grado) se descartaba en silencio. Además, al revisar el
  flujo se vio que `Filtro generar CV` no deduplica: el Google Sheets Trigger
  emite la misma fila varias veces por pasada y `Prompt para CV` +
  `HTTP Request Claude` generan N CV, de los que `Separar CV y carta` (`.first()`)
  se queda 1 — en #735 se pagaron **6 llamadas Sonnet (8k tokens) y se usó 1**.
- QUÉ SE DECIDIÓ — Tres cambios en `Jobs · generación CV` (`morsS0M2folmXWhS`),
  vía `updateNodeParameters` + relectura byte a byte (sha256 `Filtro generar CV`
  `969532f7…`, `Adaptar cv plantilla` `087bb1f4…`, `Prompt para CV` `938f148d…`),
  `node --check` OK, publicado como draft `versionId 40d83c73-…` (**pendiente de
  publicar: el `publish_workflow` lo bloqueó el clasificador de auto-mode; lo
  publica Mar**):
  1. **`Filtro generar CV`** — deduplica por `id_unico` y emite **1 sola oferta
     por ejecución**. El resto sigue con `generar_cv_ia = true` y entra en la
     siguiente pasada del disparador (que se re-dispara al escribir
     `generar_cv_ia = false`, comportamiento observado hoy en #734→#735→#736).
     Cada ejecución hace 1 llamada a Claude en vez de N.
  2. **`Prompt para CV`** — el spec HTML pasa a **EXACTAMENTE 2 bloques de
     Formación** (1: Bootcamp NEOLAND en curso; 2: Grado UOC 2012–2019 con
     Honores), siempre y en ese orden, nunca omitir la UOC. Se aclara que el CV
     **no lleva sección de Proyectos** (van integrados en `resumen`/experiencia),
     resolviendo la contradicción con el «ORDEN FIJO» de `notas_para_la_ia` que
     hablaba de «3) proyectos, 4) formación» sin que existiera slot de proyectos.
  3. **`Adaptar cv plantilla`** — recoge `h3[4]`/`empresa[4]` y **pliega la 2.ª
     entrada de Formación dentro de `{{FORMACION_DETALLE}}`** como línea extra
     (`\n` → salto de línea en la plantilla del Doc). `formacionTitulo` y
     `habilidades` pasan a campos esenciales: si faltan, error ruidoso en vez de
     Doc silenciosamente incompleto.
- ALTERNATIVAS DESCARTADAS — (a) Ampliar la plantilla del Doc con una 2.ª ranura
  real (`{{FORMACION_TITULO_2}}` / `{{FORMACION_DETALLE_2}}`): es lo correcto para
  paridad tipográfica (el Grado en negrita como el Bootcamp) pero necesita editar
  el Google Doc a mano y crea una ventana en que el placeholder no existe. Queda
  como mejora opcional. (b) Hacer todo el chain multi-item para procesar N
  ofertas en una ejecución: cambio estructural grande (afecta `Crear doc`,
  `email o enlace`, el envío) con solo verificación e2e manual; el dedupe+first
  resuelve el coste sin ese riesgo.
- POR QUÉ ESTA — El requisito de Mar es que la UOC aparezca **siempre** junto a
  NEOLAND; plegarla en la línea de detalle lo garantiza sin depender de una
  edición manual del template. El dedupe corta el gasto desperdiciado de Claude
  de inmediato y con un cambio de 3 líneas en un Code node de lógica pura (misma
  forma de salida). Ninguno toca el wiring ni la humanización (que sustituye por
  substring `resumen` + `descripcion_1..3`, ajena a las `<h3>` de formación).
- QUÉ SE ROMPIÓ — Nada verificado aún. Advertencia preexistente de
  `Enviar cv y carta por email` (sin `parameters.operation` explícito) sigue
  igual, no la introdujo este cambio.
- QUÉ QUEDA PENDIENTE — (1) Mar publica el draft `40d83c73-…` (el `publish_workflow`
  lo bloqueó el clasificador de auto-mode). (2) Verificar en un CV real nuevo: las
  2 entradas de Formación en el Doc (NEOLAND + Grado UOC), habilidades y resto del
  CV intactos, y que la API de Docs acepta el salto de línea que mete
  `Adaptar cv plantilla` en `{{FORMACION_DETALLE}}` (si lo rechaza, usar el salto
  de línea nativo de Google Docs, U+000B, en vez del `\n` actual). (3) Confirmar
  que, al procesar 1 oferta por ejecución, el disparador drena el resto sin dejar
  filas colgadas. Cierre en la tarea 15.

## 2026-09-03 · Seguimiento tarea 15: v1 verificada + ranura real de Formación (v2)

- Mar publicó el draft `40d83c73`. Se marcaron 2 ofertas; las 2 salieron bien:
  **#739** (OpenNebula) y **#740** (Doppel), ambas `success`. `Filtro generar CV`
  recibió 8 filas (2 ofertas × duplicados del trigger) y emitió 1 por ejecución;
  la 2.ª oferta se procesó en la pasada siguiente del disparador, ninguna quedó
  colgada. **La API de Docs acepta el `\n`** de `{{FORMACION_DETALLE}}`: el Doc
  del CV muestra el Grado UOC plegado en la línea de detalle, habilidades y resto
  intactos. El proyecto de Mar (pipeline n8n/Docker/Tailscale) sale integrado en
  el `<p class="resumen">`, sin sección de Proyectos — el cambio del prompt
  funciona.
- MEJORA v2 — Mar añadió a la plantilla del CV (Doc `11IUpAhDJHIP…`) las 2
  ranuras `{{FORMACION_TITULO2}}` / `{{FORMACION_DETALLE2}}` (nombró los
  placeholders con `2` pegado, sin guion bajo). `Adaptar cv plantilla` reescrito
  (sha256 `52aa49a9…`, `node --check` OK): deja de plegar la 2.ª entrada en la
  línea de detalle y la manda a su ranura propia, con el mismo estilo (título en
  negrita) que el Bootcamp. Aviso en log si Claude solo trae 1 entrada. Publicado
  como draft `versionId e3da5677-…`; **el `publish_workflow` lo bloqueó otra vez
  el clasificador de auto-mode → lo publica Mar**.
- ORDEN QUE SE SIGUIÓ — Primero Mar editó la plantilla del Doc, luego se subió el
  código: así no hubo ventana en que `{{FORMACION_TITULO2}}` no existiera y el
  Grado se cayera. Entre la publicación de `e3da5677` y su verificación, la
  versión activa `40d83c73` (plegado) ya deja el Grado en el CV, así que no hay
  regresión posible.
- PENDIENTE — Mar publica `e3da5677` y marca 1 oferta para ver el Grado en su
  ranura propia (no plegado). Cierre de la tarea 15.

## 2026-09-03 · Seguimiento tarea 15: encabezados de sección según idioma

- Mar publicó `e3da5677` y marcó una oferta. **#743** (TripleTen, `idioma EN`,
  `success`): `Adaptar cv plantilla` mapeó las 4 ranuras de Formación por
  separado y el Doc muestra el Grado UOC **en su línea propia con estilo de
  título** — la mejora v2 funciona.
- FALLO NUEVO (lo detectó Mar en #743) — Los encabezados de sección del CV salen
  en **castellano** («Experiencia» / «Formación» / «Habilidades») aunque la
  oferta, el CV y la carta estén en inglés. Causa: esos encabezados son **texto
  fijo de la plantilla del Doc**, no marcadores; `Adaptar cv plantilla` solo
  extrae el contenido de `<h3>` y `<p class>`, nunca toca los `<h2>` de Claude
  (que además siempre van en castellano por el spec del prompt).
- ARREGLO — `Adaptar cv plantilla` v3 (draft `versionId d2db224c-…`, pendiente de
  publicar): si `idioma === 'EN'` (de `Aplicar humanizacion`) añade 3
  `replaceAllText` que traducen «Experiencia»→«Experience», «Formación»→
  «Education», «Habilidades»→«Skills» **después** de rellenar los marcadores —en
  un CV inglés esas 3 palabras solo quedan en los encabezados, así que el
  reemplazo por palabra suelta es seguro—. Un CV en español no añade nada
  (la plantilla ya está en castellano).
- ALTERNATIVA DESCARTADA — Convertir los encabezados en marcadores
  (`{{H_EXPERIENCIA}}`…) en la plantilla: más limpio pero obliga a otra edición
  manual del Doc. El swap por `replaceAllText` es autocontenido y no toca la
  plantilla.
- PENDIENTE — Mar publica `d2db224c` y un CV real en inglés confirma «Experience /
  Education / Skills». Menor: párrafo vacío entre `{{FORMACION_DETALLE2}}` y
  «— Habilidades» en la plantilla (del copia-pega de Mar); se puede borrar para
  apretar el interlineado. Cierre de la tarea 15.

## 2026-09-03 · Seguimiento tarea 15: el CV se guardaba en la carpeta de plantilla

- Mar publicó `d2db224c` y arregló el párrafo vacío de la plantilla. **#745**
  (LocalStack, `idioma EN`, `success`): encabezados del CV traducidos a
  «Experience / Education / Skills» — v3 funciona.
- FALLO NUEVO (lo detectó Mar en #745) — El Doc del CV se guardaba en la carpeta
  **«Plantillas CV n8n»** (`1VLGVEReqJM9HDKj07xj41At6N4OabrMJ`), no en **«Cvs jobs
  n8n»** (`17YrQa7V0x2pYJh0Cu5aZ8tWcami-D-MY`). Causa: `Crear doc cv`
  (`operation: copy`) no fijaba carpeta destino, y una copia de Drive sin
  `folderId` aterriza en la carpeta del **origen** (la plantilla). `Crear doc
  carta` sí tiene `folderId` desde siempre, así que las cartas nunca estuvieron
  mal ubicadas — la mención de «y cartas» de Mar fue una suposición.
- ARREGLO — `Crear doc cv` (draft `versionId 4552575d-…`, pendiente de publicar):
  se le añade `folderId 17YrQa7…` («Cvs jobs n8n»), `sameFolder false`, `driveId
  "My Drive"`, copiando la config exacta de `Crear doc carta`. Verificado
  releyendo el nodo tras el `update`.
- PENDIENTE — Mar publica `4552575d` y un CV nuevo aterriza en «Cvs jobs n8n».
  Opcional: mover a mano los CV ya generados (#734–#745) de «Plantillas CV n8n» a
  «Cvs jobs n8n». Cierre de la tarea 15.
