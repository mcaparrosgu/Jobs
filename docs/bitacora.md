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

## 2026-09-03 · Cierre tarea 15: auditoría de generación de CV/carta completada

- Mar publicó `4552575d` (todas las versiones de la tarea 15 quedan publicadas;
  `activeVersionId == 4552575d`). Se marcaron 2 ofertas más: **#749** (mercor) y
  **#750** (Blink Health), ambas `idioma EN`, `success`.
- VERIFICADO e2e con el workflow completamente publicado: (1) `Filtro generar CV`
  emitió **1 oferta por ejecución** (dedupe), la 2.ª en la pasada siguiente sin
  colgarse; (2) el Doc del CV **aterrizó en «Cvs jobs n8n»**
  (`17YrQa7V0x2pYJh0Cu5aZ8tWcami-D-MY`), no en la carpeta de la plantilla; (3)
  Formación con **las 2 entradas** (Bootcamp NEOLAND + Grado UOC 2012–2019 con
  Honores) cada una en su ranura propia con estilo de título; (4) encabezados
  traducidos a **Experience / Education / Skills** por ser CV en inglés; (5)
  habilidades y resto del CV intactos; (6) el proyecto de Mar (pipeline
  n8n/Docker) integrado en el `<p class="resumen">`, sin sección de Proyectos.
- LIMPIEZA — Los **13 CV** generados antes del arreglo (26-08-03 … 26-09-03) se
  movieron a mano de «Plantillas CV n8n» a «Cvs jobs n8n» vía Drive MCP
  (`update_file` con `parentId`). En «Plantillas CV n8n» quedan solo la plantilla
  del CV, la de la carta y un `Copy of Plantilla CV` huérfano (Mar decide si lo
  borra).
- LO QUE COSTÓ — `publish_workflow` del MCP n8n lo bloquea el clasificador de
  auto-mode de Claude Code en esta sesión: cada versión (5 en total a lo largo de
  la tarea) la tuvo que publicar Mar a mano desde el editor. Patrón para futuras
  tareas de n8n: dejar el draft verificado byte a byte y pedir a Mar el Publish.
- APRENDIZAJE — Una copia de Google Drive (`operation: copy`) sin `folderId`
  aterriza en la carpeta del **archivo origen**, no en «Mi unidad». Si un nodo
  `googleDrive` de copia debe guardar en una carpeta concreta, hay que fijarle
  `folderId` + `sameFolder: false` + `driveId` explícitamente (como ya hacía
  `Crear doc carta` y no `Crear doc cv`).

## 2026-09-03 · Cierre tarea 11: truncado de `resumen` a ~800 verificado

- Verificada e2e la tarea 11 (M8) sin tocar nada: ya estaba implementada y
  publicada el 31 ago (`Jobs · ingesta`, `Filtro duplicados`, `truncarResumen()`
  + `LIMITE_RESUMEN = 800`, `versionId == activeVersionId == f8ac4e6b-…`).
- EVIDENCIA — Ejecución **#748** (3 sep 15:01Z, `trigger`, `success`). `Filtro
  duplicados` emitió 4 ofertas nuevas; la de **We Work Remotely** («Executive
  Assistant …» / Ellipsis®, `id_unico dbc8e3b6`) llegó con la descripción entera
  del feed. En `Ofertas_activas` fila 8 quedó con `resumen` de **801 caracteres
  exactos terminados en `...`**, corte en el espacio tras «…and performance» (sin
  partir palabra) y el enlace de `L8` intacto y completo. Las otras 3 ofertas de
  la pasada tenían `resumen` corto natural (<800) y pasaron sin tocar.
- APRENDIZAJE — El único feed que entrega descripciones largas sin recortar es
  We Work Remotely (su normalizador no hace `substring`, a diferencia de
  LinkedIn/Infojobs que cortan a 200). Por eso la tarea 11 tardó 3 días en
  encontrar un caso real que la ejercitara: la mayoría de fuentes ya llegan
  cortas. El truncado en `Filtro duplicados` (tras los filtros) mantuvo intacto
  el filtrado de arriba.
- ABIERTAS — Quedan la 12 (archivar `cv_enviado` a 30 días: sin tráfico de
  ofertas por email desde el 31 ago y ninguna fila puede tener aún `fecha_envio`
  de hace 30 días — verificable el ~30 sep o forzando una fila de prueba), la 13
  (vigilancia OAuth: chequeo intermedio del 3 sep limpio, cierre el 7 sep) y la
  14 (case study, al final del proyecto).

## 2026-09-03 · 3 tareas nuevas de mejora (Mar) — capturadas y triadas

- Mar pide 3 mejoras para Jobs. Anotadas en `docs/tareas-pendientes.md`
  (Abiertas) como tareas **16, 17, 18**, sin empezar. Se arrancan «mañana o
  luego», una a una, con el ciclo de siempre.
- **16 — revisión de legalidad frente al AI Act.** Solo docs; no hay
  `docs/03-legal.md` (el proyecto se construyó sin el paso 4 del método). Hay
  que investigar el Reglamento (UE) 2024/1689 vigente (a 3 sep 2026 ya aplican
  las obligaciones de alto riesgo del 2 ago 2026) + `WebSearch` del «Digital
  Omnibus» de simplificación de finales de 2025. Hipótesis previa a validar:
  Jobs es herramienta **personal del lado del candidato** → no Anexo III.4 (lado
  reclutador) → riesgo mínimo; cambia si se comercializa. Duda para Mar: ¿solo
  uso personal o contemplando comercialización?
- **17 — endurecer `Filtro cualificación`.** Entran ofertas técnicas fuera de
  perfil (*Kubernetes & Cloud Integration Engineer*, *AI Enablement Engineer*,
  ambas con CV ya generado el 3 sep). Causa probable: el criterio 5 «encaje»
  rescata todo lo que mencione la familia `IA`, colando infra que solo dice
  «AI». Diseño tentativo: lista de rechazo «ingeniería técnica dura» antes del
  rescate por `IA`. Riesgo medio (no descartar *AI Engineer* legítimos — el
  bootcamp de Mar es eso). **Bloqueada:** falta la lista concreta de ofertas
  malas de Mar.
- **18 — columnas `enlace_cv` / `enlace_carta` en `Ofertas_activas`.** Quick
  win, mismo patrón que la tarea 12 (`fecha_envio`): cabeceras nuevas S y T +
  `Archivo`, el nodo `Actualizar estado` de `Jobs · generación CV` escribe las 2
  URLs de los Docs. 100 % aditivo. Orden propuesto: **esta primero.**
- ORDEN PROPUESTO POR CLAUDE: 18 → 17 → 16. Pendiente de que Mar confirme por
  dónde empezar y responda las dudas abiertas de cada una.

## 2026-09-04 · Tarea 18 — enlaces de CV y carta en la hoja (draft)

- QUÉ SE DECIDIÓ — `Ofertas_activas` (y `Archivo`) ganan dos columnas,
  `enlace_cv` y `enlace_carta`, con la **URL de edición** del Google Doc
  (`https://docs.google.com/document/d/<id>/edit`). Las escribe el nodo
  `Actualizar estado generar_cv_ia` de `Jobs · generación CV` al marcar
  `estado: cv_ia_creado`. Mar eligió: enlace de edición (no el corto) y **ambas
  ramas** (email y enlace).
- POR QUÉ EN ESE NODO — corre **antes** del bifurcado `email o enlace`, así que
  con un solo nodo tocado se cubren las dos ramas. En la rama email el CV/carta
  ya se mandan en PDF, pero el enlace queda como referencia por si hay que
  reenviar.
- CÓMO — mismo patrón que la tarea 12 (`fecha_envio`): cabeceras nuevas por
  mapeo de cabecera (`Ofertas_activas!S1:T1`, `Archivo!T1:U1`), cambio 100 %
  aditivo en el nodo (`updateNodeParameters`, `replace: true`, releído byte a
  byte). `columns.value` gana 2 claves, `columns.schema` 2 entradas; `estado`,
  `generar_cv_ia`, `id_unico` y el matching intactos. La forma del enlace usa
  `$('Crear doc cv').item.json.id` / `$('Crear doc carta').item.json.id` —
  ambos nodos son ancestros lineales, el `id` de salida está confirmado en la
  ejecución #750.
- ESTADO — **draft** `versionId 0e59f551-…`; `activeVersionId` sigue en
  `4552575d-…`. El `publish_workflow` del MCP lo bloquea el clasificador de
  auto-mode de Claude Code en esta sesión → **Mar tiene que pulsar Publish**.
  Falta verlo en una pasada real (enlaces correctos en S/T, supervivencia a
  `mantenimiento`, viaje a `Archivo` al archivar).
- ORDEN — sigue en pie 18 → 17 → 16. La 17 sigue bloqueada (falta la lista de
  ofertas malas de Mar); la 16 necesita que Mar diga si el análisis legal es
  solo uso personal o contempla comercialización.

## 2026-09-04 · Tarea 18 publicada y verificada; alcance de la 16 decidido; método de la 17; nace la 19

- TAREA 18 — Mar publicó el draft (`activeVersionId == versionId ==
  0e59f551-…`) y confirma que en la rama `enlace` las columnas `enlace_cv` /
  `enlace_carta` quedan bien y los enlaces funcionan. Quedan como restos
  menores, no bloqueantes: la rama `email`, la supervivencia a
  `mantenimiento` y el viaje a `Archivo` al archivar — se comprueban de forma
  oportunista, no con una prueba dedicada.
- TAREA 16 — Mar decide el alcance: el análisis legal cubre el uso **personal**
  actual de `Jobs` (los workflows n8n) más una sección aparte de qué cambia al
  **comercializar**. Aclaración importante: ya existe un MVP de comercialización
  separado, **Jobs App** (`Jobs App · ingesta`, workflow `Rw4dTNjQa5tR3Eo4`);
  `Jobs` tal cual seguirá siendo personal. La tarea queda desbloqueada.
- TAREA 17 — Mar no va a preparar una lista de golpe: irá enlazando ofertas mal
  filtradas según entren. Se crea `docs/mejora-filtro-cualificacion.md` como
  brief permanente: protocolo de registro (tabla en el propio doc), umbral de
  acumulación (≥5 ejemplos o que Mar diga "suficientes") antes de tocar el
  filtro, guardarraíl explícito contra rechazar `AI Engineer`/`Automation
  Engineer`/ops-PM legítimos, y el mismo patrón de implementación aditiva +
  draft + Publish de Mar que las tareas 9/11/15. Ya lleva las 2 ofertas
  detectadas el 3 sep (OpenNebula, LocalStack) como hipótesis a confirmar.
- TAREA 19 (nueva) — Mar pregunta qué son y si hacen falta `plataforma`,
  `estado_propuesto`, `resumen_respuesta` e `id_url`. Auditoría: **las 4 están
  vivas** (tabla completa en `tareas-pendientes.md`) — borrar cualquiera rompe
  algo (Metricas/M4, tarea 12, seguimiento a mano, o reabre el bug de
  duplicados de la tarea 9). APRENDIZAJE — toda la automatización mapea por
  **cabecera**, no por posición (n8n Y el Apps Script vía
  `cabeceras.indexOf(...)`), así que reordenar columnas es técnicamente seguro
  para los workflows; el riesgo real es el **formato manual** de Mar (color del
  chip de `estado`, atado a la posición de la columna E, y la banda de
  colores). Recomendación dada: ocultar columnas en vez de borrar o reordenar
  (coste cero, reversible, no toca el mapeo). Pendiente de que Mar elija entre
  ocultar (cierra ya) o encargar una reordenación completa (subtarea aparte).

## 2026-09-04 · Tarea 20 (nueva) — enlaces rotos a tareas-manuales.md / index.md

- QUÉ SE DECIDIÓ — No arreglar ahora los 14 enlaces internos rotos que
  encontró Claude de paso (apuntan a `../../docs/tareas-manuales.md` y
  `../../docs/index.md`, ficheros que no existen en este repo). Mar pide solo
  anotarlo como tarea, sin prisa. Inventario completo (fichero, línea,
  contexto) en `tareas-pendientes.md` tarea 20.
- POR QUÉ ES DEUDA PREVIA — son enlaces de antes de que `Jobs` tuviera esta
  carpeta `docs/` propia; ningún cambio de esta sesión los rompió.

## 2026-09-04 · Tarea 20 CERRADA — enlaces rotos arreglados, `docs/index.md` creado

- QUÉ SE HIZO — revisados los 14 enlaces caso a caso: los 5 a `index.md` ahora
  apuntan al `docs/index.md` real creado en esta sesión (mapa de los 4
  workflows, la hoja y el resto de docs); los 9 a `tareas-manuales.md`
  apuntaban a incidentes históricos ya narrados en el propio párrafo y sin
  equivalente en `tareas-pendientes.md` (anterior a su creación), así que se
  quitó el enlace roto conservando el texto, salvo uno redirigido a
  `jobs-ingesta.md#fallos-conocidos` (registro de InfoJobs en
  apidoc.infojobs.net, que sigue pendiente).
- HALLAZGO DE PASO — la aprobación manual de permisos del actor de Apify de
  FlexJobs (bloqueado desde el 15 ago 2026) sigue sin rastro de haberse hecho.
  No se abre tarea nueva: M4 de `jobs-evaluacion.md` ya propone podar FlexJobs
  del todo, así que la decisión de Mar viene primero.
- CIERRE — detalle completo en `tareas-pendientes.md`, tarea 20 (movida a
  Cerradas).

## 2026-09-04 · Pasos 4 y 5 del método aplicados fuera de orden (legal + spec)

- QUÉ SE DECIDIÓ — Mar pidió aplicar el método de 20 pasos a `Jobs`
  retroactivamente. Se escribieron `docs/03-legal.md` (Paso 4) y
  `docs/04-spec.md` (Paso 5) sin los pasos 1-3 previos (el proyecto ya
  estaba construido), reconstruyendo el contexto desde la documentación
  real del pipeline en vez de `docs/00-problema.md` / `01-historias.md` /
  `02-mvp.md`, que no existen. El spec incluye, marcado `[PREVISTO]`, las
  mejoras de `jobs-evaluacion.md` aún no construidas (M1, M4, M6, mitad de
  M7, envío autónomo) — decisión explícita de Mar de que cubriera también
  hacia dónde va el sistema, no solo el estado actual. Se decidió además
  el orden entre el Paso 16 (red team/seguridad, nunca hecho) y M1
  (scoring de encaje): **M1 va primero**, red team después — aunque M1
  añade otro punto donde texto externo llega a un generador de IA.
- ALTERNATIVAS DESCARTADAS — Forzar el skill `paso-04-legal`/`paso-05-spec`
  tal cual, exigiendo los docs 00-02 antes de seguir (se habría bloqueado
  sin motivo real, el contexto ya existía en otra forma). Hacer red team
  antes de M1 «para no acumular más superficie de ataque antes de
  auditarla» — descartado porque Mar quiere ver primero si M1 aporta el
  valor esperado antes de invertir en asegurar algo que podría cambiar.
- POR QUÉ ESTA — El objetivo del método aquí es documentar mejor lo que ya
  existe, no bloquear el proyecto por un orden que no se siguió. Verificar
  el AI Act en fuente viva (no de memoria) cambió la conclusión de una
  hipótesis previa de la propia tarea 16 (creía que el alto riesgo del
  Anexo III ya aplicaba desde el 2 ago 2026; en realidad el Digital
  Omnibus lo aplazó a dic 2027) — confirma que ese tipo de fecha nunca se
  debe dar por buena sin buscarla ese mismo día.
- QUÉ SE ROMPIÓ — Nada; solo documentación, ningún workflow tocado. Hubo
  un malentendido de Mar al ver el `ls` de comprobación de los docs 00-02
  inexistentes («¿Lo he perdido?»), aclarado en el momento: `ls` nunca
  borra nada, era solo la comprobación de que esos ficheros nunca se
  crearon.
- QUÉ QUEDA PENDIENTE DE ENTENDER — Si la exención de actividad doméstica
  del RGPD cubre de verdad el tratamiento de los emails de recruiters vía
  la API de Anthropic, o si conviene tratarlo como no exento desde ya
  (zona gris, ver `03-legal.md` sección 5) — no hay jurisprudencia
  española/europea que lo resuelva de forma directa para este caso
  concreto (un particular procesando correspondencia propia con ayuda de
  un proveedor cloud de IA). Queda como pregunta para un abogado si
  `Jobs` cambia de escenario.

## 2026-09-04 · M1 implementada en draft (tarea 22): scoring de encaje con IA

- QUÉ SE DECIDIÓ — Construir M1 tal como lo dejó diseñado
  `jobs-evaluacion.md`, con dos ajustes sobre ese diseño: (1) el perfil de
  Mar para el prompt de scoring se **resume directamente en el código** del
  nodo `Preparar scoring`, en vez de leer
  `perfil_estructurado_mar_cv_n8n_JSON.json` de Drive como hace `Jobs ·
  generación CV` — evita añadir una credencial/dependencia de Drive nueva a
  `Jobs · ingesta`, que hasta hoy no la tenía; (2) la llamada a
  `claude-haiku-4-5` usa la técnica de **prefill del turno `assistant` con
  `"{"`** para forzar que la respuesta sea JSON limpio, en vez de confiar
  solo en pedirlo por instrucción en el prompt (que es lo único que hace
  `Jobs · generación CV` con sus marcadores `===CV===`).
- ALTERNATIVAS DESCARTADAS — Leer el perfil de Drive igualmente, para que el
  prompt de scoring use el JSON completo en vez de un resumen — descartado
  porque encarece el prompt sin necesidad (el scoring solo necesita el
  resumen de alto nivel, no cada proyecto) y rompe el "tres nodos" del
  diseño original. Confiar solo en la instrucción del prompt para el
  formato JSON (como hace ya `Prompt para CV`) — descartado porque ahí el
  parseo es por marcadores de texto con reintento manual si falla, y aquí
  queríamos algo más determinista dado que corre sobre N ofertas por
  ejecución (no 1), así que un fallo de formato es más probable que ocurra
  alguna vez.
- POR QUÉ ESTA — Mantener el cambio dentro del patrón ya validado del
  proyecto (mismo blindaje anti-inyección de `Prompt para CV`, mismo
  fallback a `null` sin bloquear que `Aplicar humanizacion`) en vez de
  inventar un patrón nuevo. El prefill es una técnica estándar de la API de
  Anthropic para forzar continuaciones con un formato dado; no se había
  usado antes en este proyecto (los otros pasos con Claude devuelven texto
  libre con marcadores, no JSON).
- QUÉ SE ROMPIÓ — Nada durante la construcción: se verificó cada jsCode con
  `node --check` (envuelto en una función async, ya que el Code node de n8n
  permite `return` en la raíz) antes de enviarlo, y se releyó el workflow
  completo byte a byte después de aplicar las 22 operaciones — los 3
  jsCode nuevos y la línea cambiada de `Filtro duplicados` coincidieron
  exactamente. Los 12 nodos reposicionados (+600px en X para hacer sitio a
  los 3 nuevos) no rompieron ninguna conexión: se comprobó `connections`
  completo tras el cambio, no solo las de los nodos nuevos.
- QUÉ QUEDA PENDIENTE DE ENTENDER — Si el prefill `"{"` sigue funcionando
  igual de bien con `claude-haiku-4-5` que con modelos más grandes cuando la
  oferta trae un `resumen` ambiguo o en un idioma raro — no se ha probado
  todavía con datos reales, solo con `node --check` de sintaxis. La
  verificación end-to-end (tarea 22) es la que contestará esto de verdad.
