---
type: Review
title: Jobs — revisión y mejoras propuestas
description: Hallazgos de la revisión del workflow Jobs el 5 ago 2026, ordenados por gravedad, con el estado de cada corrección.
resource: https://<N8N_HOST>/workflow/CXCD8BZUQEQKex2a
tags: [n8n, empleo, revision]
timestamp: 2026-08-27T18:00:00Z
---

Revisión del workflow Jobs sobre el JSON en producción, cuando todavía era un
único workflow. Tras el split del 6 ago 2026 (punto 6), vive como
[Jobs · ingesta](jobs-ingesta.md), [Jobs · generación CV](jobs-generacion-cv.md)
y [Jobs · seguimiento](jobs-seguimiento.md).

**Actualización 6 ago 2026:** los siete puntos quedaron corregidos. El 3 se
corrigió en el filtro (no en los normalizadores de cada fuente, ver detalle).
El 6 se resolvió con el split completo.

**Actualización 13 ago 2026:** el arreglo del punto 1 estaba **mal escrito** y
tuvo la ingesta caída una semana — ver la regresión documentada en ese punto.
Corregido, junto con dos de los detalles menores del punto 7.

# 1. El filtro de cualificación no tiene ningún efecto

`Filtro duplicados` arrancaba con:

```js
const ofertasNuevas = $('Filtro salario').all().map(item => item.json);
```

Pero la cadena real es `Filtro salario` → `Filtro cualificación` → lecturas de
la hoja → `Filtro duplicados`. Al leer de `Filtro salario` se saltaba el filtro
de cualificación entero: las ofertas de desarrollador, ventas o legal que ese
nodo descarta **volvían a entrar** y acababan en la hoja, y la marca `destacada`
(⭐) que añade nunca llegaba a `Append row in sheet`.

**Arreglo:** `$('Filtro cualificación').all()`.

**Corregido** (5 ago 2026, edición manual de Mar en el editor de n8n) — pero
mal, ver abajo.

## Regresión: el arreglo se escribió sin la tilde (5–13 ago 2026)

El arreglo del 5 ago se aplicó como `$('Filtro cualificacion')`, **sin tilde**,
mientras el nodo real se llama `Filtro cualificación`. n8n resuelve los nodos
por su nombre literal, así que la referencia no apuntaba a nada:

```
ExpressionError: Referenced node doesn't exist
lastNodeExecuted: Filtro duplicados
```

Como el error se lanza dentro de un Code node, **aborta la ejecución entera**,
no solo su rama: también dejó de correr el archivado. Todas las ejecuciones por
cron desde entonces terminaron en `error` (ids 472, 474, 489 y 535, del 11 al 13
ago). En ese periodo tampoco había fondos en Apify, así que las fuentes que
dependen de él no traían nada de todos modos; pero el `ExpressionError` habría
impedido escribir en la hoja aunque los hubiera habido.

Pasó inadvertido una semana porque el fallo es silencioso desde fuera: el ping a
Healthchecks vive aguas abajo del nodo que rompe, así que nunca llegó a
enviarse... y un ping que no llega es justo lo que Healthchecks debería haber
avisado.

**El dead-man's switch no está avisando.** Comprobado el 13 ago 2026: la última
ejecución con éxito de `Jobs · ingesta` es la **469, del 5 ago a las 17:06**, y
en `mode: manual`. Ninguna ejecución **por cron** ha terminado nunca en
`success` en este workflow. Es decir, el último ping salió el 5 ago y pasaron
**ocho días sin una sola señal** sin que llegara ningún aviso. La URL es válida
(`hc-ping.com` + UUID, y `$env.HEALTHCHECKS_PING_URL` llega al contenedor), así
que el fallo está en el check: o no tiene *period*/*grace* configurados, o no
tiene canal de notificación, o está en pausa. Revisar en el panel de
Healthchecks — mientras no avise, este workflow puede volver a caerse en
silencio.

**Corregido** (13 ago 2026): `$('Filtro cualificación').all()`, publicado y
verificado sobre el workflow activo.

**Lección:** al referenciar un nodo por nombre, copiarlo literal del workflow
—tildes, mayúsculas y espacios incluidos— en vez de teclearlo. Casi todos los
nodos de este workflow llevan tilde (`Decisión archivar`, `Notificación nuevas
ofertas`, `Envío error por email`), así que la trampa se puede repetir.

# 2. Se mandan las claves de Adzuna a himalayas.app

`HTTP Request Himalayas` heredó los query params del nodo de Adzuna:

```json
{"name": "app_id", "value": "={{$env.ADZUNA_APP_ID}}"},
{"name": "app_key", "value": "={{$env.ADZUNA_APP_KEY}}"}
```

La URL ya lleva su propia query (`?q=operations&country=ES&…`), así que estos
parámetros no hacían falta y además entregaban las credenciales de Adzuna a un
tercero en cada llamada, dos veces al día.

**Arreglo:** vaciar `queryParameters` de ese nodo. Si las claves ya han viajado,
rotarlas en Adzuna.

**Corregido y cerrado del todo.** El 5 ago 2026 (edición manual de Mar en el
editor de n8n) `HTTP Request Himalayas` dejó de llevar `queryParameters`, y las
claves de Adzuna que habían viajado a himalayas.app **se rotaron en su panel**
entre el 13 y el 16 ago 2026. Las credenciales expuestas ya no son válidas, así
que este punto no deja residuo.

# 3. El filtro de salario multiplica por 1000 lo que ya viene en euros

```js
const valoresReales = numeros.map(n => parseFloat(n) * 1000);
```

Adzuna devuelve `salary_min: 30000`, que el normalizador convierte en
`"30000 - 45000"`. El filtro leía 30000 y lo multiplicaba → 30 millones, siempre
por encima del umbral. Con un formato "30 - 45" sí funcionaba. Además
`\d+(\.\d+)?` interpreta el "30.000" español como 30.

**Arreglo:** normalizar el salario a un número en el normalizador de cada
fuente, no en el filtro, y que el filtro compare sin heurística.

**Corregido** (6 ago 2026), pero no con el arreglo sugerido originalmente. Mar
ya había reescrito parte de `Filtro salario` en el editor (normaliza "30.000"
correctamente y solo multiplica por 1000 los números por debajo de 1000), pero
dejó basura de sintaxis al final del código (`})})}}}` sueltos tras el
`return`) que habría roto la pasada de las 9:00 con un `SyntaxError`. Se quitó
esa basura y, a petición de Mar, se subió el umbral a 33.000 €/año y se añadió
detección de divisa (USD, GBP con tasas fijas aproximadas; sin divisa
explícita se asume EUR) directamente en el filtro. **No** se reescribieron los
11 normalizadores de fuente como proponía el arreglo original: el campo
`salario` que entregan es demasiado heterogéneo (cadenas libres, algunos en
USD, uno "Por confirmar") como para tocarlo a ciegas sin datos reales de cada
API con los que probar. El filtro sigue dejando pasar las ofertas sin salario
conocido.

# 4. Sin reintentos en ninguno de los 71 nodos

`HTTP Request Claude`, los nodos de Sheets y los de Gmail no tenían
`retryOnFail`. Un 429 o un 529 de Anthropic cortaba la ejecución después de que
`Actualizar estado generar_cv_ia` ya hubiera marcado filas, dejando la hoja en un
estado intermedio.

**Arreglo:** `retryOnFail: true` con `maxTries: 3` y `waitBetweenTries` de unos
segundos en los nodos de red; para Claude, además, un `timeout` explícito.

**Corregido** (6 ago 2026). `retryOnFail: true`, `maxTries: 3`,
`waitBetweenTries: 3000` en `HTTP Request Claude`, las 10 lecturas/escrituras
de Sheets (incluida la tool `Consultar tabla ofertas`) y los 3 nodos de Gmail.
`HTTP Request Claude` además tiene `timeout: 120000` explícito.

**Completado** (14 ago 2026). Faltaban justo los nodos que hacen de puerta de
entrada: ninguna de las fuentes reintentaba. Ahora llevan `retryOnFail: true`,
`maxTries: 3`, `waitBetweenTries: 3000` las **11 fuentes** de
[Jobs · ingesta](jobs-ingesta.md) — `HTTP Request Adzuna`, `HTTP Request1
Indeed`, `HTTP Request LinkedIn`, `HTTP Request Infojobs`, `HTTP Request
Himalayas`, `HTTP Request Get on Board`, `HTTP Request Wellfound`, `HTTP Request
Flexjobs`, `HTTP Request Jobicy`, `RSS Read` y `RSS Read RemotoJob` — más `Ping
Healthchecks`, donde un fallo pasajero disparaba una alarma falsa del
dead-man's switch. Van 20 de 45 nodos con reintento.

Los reintentos se agotan **antes** de que el nodo salga por su rama de error,
así que el correo de aviso solo salta tras tres intentos fallidos.

Los normalizadores (Code) se quedan **sin reintento a propósito**: `Normalizador
FlexJobs` y `Normalizador Wellfound` lanzan error adrede al detectar datos de
muestra de Apify, y reintentar solo retrasaría el aviso.

**Pendiente de vigilar:** los cinco actores de Apify se llaman con
`run-sync-get-dataset-items` y `timeout: 600000`. Si n8n corta por timeout, el
actor sigue corriendo en Apify y se cobra igual, así que un fallo por timeout
puede pagarse hasta tres veces. Un 403 por falta de saldo es inofensivo (no
llega a lanzar el run). Si el gasto se dispara, bajar `maxTries` a 2 en esos
cinco nodos.

**Actualización 18 ago 2026:** ocurrió de verdad. Apify se quedó sin crédito
entre las pasadas de las 9:00 y las 9:16; `HTTP Request All Jobs Scraper`
devolvió `408 run-timeout-exceeded` (el 408 sí se cobra, ~908 s en tres
intentos) y luego `403 Monthly usage hard limit exceeded`. Se le bajó
`maxTries` a **2** solo a ese nodo; los otros cinco de Apify se quedaron en 3.
Jooble salió de `All Jobs Scraper` a su propia API gratuita esas mismas fechas,
así que ese actor se quedó con Glassdoor/SAP/Talent. El caso queda como
contingencia vigilada en
[tareas-manuales.md](../../docs/tareas-manuales.md). Detalle en
[jobs-ingesta.md](jobs-ingesta.md#fallos-conocidos).

# 5. `RSS Read` puede tumbar toda la ejecución

Las 9 fuentes HTTP tenían `onError: continueErrorOutput`, pero el nodo de RSS
no. Si We Work Remotely no respondía, caía la ejecución completa: también el
archivado y la generación de CV, que no tienen nada que ver.

**Arreglo:** ponerle la misma salida de error y engancharla a
`Unir aviso error`.

**Corregido** (6 ago 2026). `RSS Read` tiene `onError: continueErrorOutput` y
su salida de error está conectada a `Unir aviso error`.

# 6. Un solo workflow con dos triggers y 71 nodos

El cron y el trigger de Gmail convivían en el mismo lienzo, y las cuatro ramas
(ingesta, CV, seguimiento, archivado) solo comparten la hoja de cálculo.

**Arreglo sugerido:** partir en tres workflows — `Jobs · ingesta`,
`Jobs · generación CV`, `Jobs · seguimiento`. Se pueden activar y depurar por
separado, y un fallo en una rama deja de afectar a las demás. Es el cambio con
más impacto en mantenibilidad, y también el más invasivo.

**Corregido** (6 ago 2026). Se dividió en tres workflows independientes:
[Jobs · ingesta](jobs-ingesta.md) (`CXCD8BZUQEQKex2a`, es el workflow original
renombrado), [Jobs · generación CV](jobs-generacion-cv.md) (`morsS0M2folmXWhS`)
y [Jobs · seguimiento](jobs-seguimiento.md) (`QWIGXkYm9FOdxrEJ`). Cada uno
migró con sus nodos, conexiones, credenciales y ajustes de reintento
idénticos a los del workflow original — no se tocó lógica, solo estructura.
El archivado se quedó en `Jobs · ingesta` junto con la ingesta (comparten
trigger y ciclo de vida de la hoja), tal y como quedó sin resolver en el
arreglo sugerido originalmente. Los tres están publicados y activos.

Nota: la regresión del punto 1 demuestra que el split **no** aisló tanto como se
esperaba. `Jobs · ingesta` conserva la ingesta y el archivado en el mismo
lienzo, así que un error en un Code node de la ingesta sigue tumbando el
archivado. Separarlos sería el siguiente paso si vuelve a molestar.

# 7. Detalles menores

- ~~**`Aviso fallo externo` está mal llamado**~~ **Corregido** (6 ago 2026):
  renombrado a `Ping Healthchecks`.
- ~~**`Copiar archivo`** no copia un archivo: añade filas a la pestaña
  `Archivo`~~ **Corregido** (13 ago 2026): renombrado a `Añadir filas a
  Archivo`. Ninguna expresión lo referenciaba por nombre; sus conexiones
  (`Decisión archivar` → … → `Ordenar eliminación`) quedaron intactas.
- ~~**`Code in JavaScript`** / **`Normalizador All Jobs Scraper1`**~~
  **Corregido** (6 ago 2026): renombrados a `Normalizador InfoJobs` y
  `Normalizador Get on Board` respectivamente.
- ~~**`generar_cv_ia === true`** es una comparación estricta~~ **Corregido**
  (6 ago 2026): ahora compara con
  `String(fila.generar_cv_ia).toLowerCase() === 'true'`.
- ~~**`Merge` de errores con 9 entradas** en modo append depende de que n8n
  resuelva las entradas que nunca reciben datos~~ **Corregido** (13 ago 2026),
  aunque el problema real resultó ser otro: `Unir aviso error` declaraba
  `numberInputs: 10` con solo 9 conectadas — la entrada 5 quedó huérfana al
  quitar `HTTP Request All Jobs Scraper`. Se remapearon las entradas 6–9 a 5–8
  y se bajó `numberInputs` a 9. **No** se añadió el `If` sobre el conteo que
  proponía este punto: esa guarda ya existía por duplicado aguas abajo, en
  `Envío error por email` (`if (errores.length === 0) return []`) y en `If1`
  (`{{ $input.all().length }} > 0`). El 14 ago 2026 `numberInputs` subió a
  **11** al entrar RemotoJob (entrada 9) y Jobicy (entrada 10). Si en algún
  momento se vuelve a conectar All Jobs Scraper, habrá que subirlo a **12**.
- **`id_unico` es un hash de 32 bits** (`hash = (hash * 31 + c) >>> 0`); con
  unos miles de filas la probabilidad de colisión deja de ser despreciable, y
  se usa como clave de actualización en Sheets. **Sin corregir a propósito:**
  cambiar el algoritmo invalida todos los `id_unico` ya escritos, así que las
  ofertas existentes dejarían de deduplicarse (reentrarían como nuevas) y
  `Jobs · seguimiento` dejaría de casar las respuestas con su candidatura.
  Hacerlo bien exige migrar las dos pestañas en el mismo paso; no es un cambio
  que se pueda soltar sin más.
- ~~**`Borrar ofertas ofertas_activas`** usa `startIndex: {{ $json.row_number }}`.
  Conviene verificar el desfase de 1 fila (cabecera) con un borrado de prueba~~
  **Verificado el 16 ago 2026.** Intento del 15 ago forzando una fila de prueba
  con pin data no llegó a ejecutarse (n8n no aplica el pin de un nodo si el
  nodo real anterior en la cadena devuelve 0 items). El 16 ago Mar marcó a
  propósito 7 filas reales (2-8) como `descartada` y se ejecutó paso a paso en
  el editor con datos reales en cada nodo hasta el borrado real: la fila 2 pasó
  a ser la que antes era la fila 9, sin desfase con la cabecera. Detalle
  completo en `tareas-manuales.md` (sección "Cerradas") y en memoria
  `estado-n8n-jobs`. De paso salieron dos hallazgos: la credencial "Google
  Sheets account" había caducado (bloqueaba toda la ingesta ese día hasta que
  Mar la reconectó) y el nodo `Ordenar eliminación` tenía datos de prueba
  pineados del intento del 15 ago que nunca se limpiaron (desanclados).
- ~~**La hoja se escribe desde dos triggers a la vez**~~ **Mitigado** (14 ago
  2026). El sondeo de Gmail de [Jobs · seguimiento](jobs-seguimiento.md) iba en
  `everyHour` sin `minute`, y el valor por defecto de ese campo es **0**: caía
  exactamente en las 09:00 y las 17:00 del Schedule Trigger de la ingesta. Ahora
  va al **minuto 30**, así que las dos ventanas de escritura quedan separadas
  media hora sin perder frecuencia. Sigue **sin haber bloqueo** — es una
  mitigación, no una solución: si una ejecución de la ingesta se alargara más de
  30 minutos, el solape volvería. La #572 tardó 62 s, así que hay margen de
  sobra.

# Estado

A 16 ago 2026 **los siete puntos originales están cerrados**, incluido el 2: la
rotación de las claves de Adzuna se completó entre el 13 y el 16 ago. El arreglo
en n8n está verificado contra el workflow publicado — `HTTP Request Himalayas` no
lleva `queryParameters` y Adzuna usa `$env` — y las claves nunca estuvieron en el
repo ni en la historia de git.

Del punto 7 queda **una** cosa sin tocar, por decisión consciente: el hash de
`id_unico` (requiere migrar las dos pestañas a la vez). El off-by-one del
borrado se verificó y descartó el 16 ago 2026 (ver más arriba). La escritura
concurrente desde dos triggers quedó mitigada el 14 ago 2026 moviendo el
sondeo de Gmail al minuto 30.

**Lo que falta para dar Jobs por cerrada formalmente** está en
[tareas-manuales.md](../../docs/tareas-manuales.md), sección «Para cerrar Jobs». A 27
ago 2026 quedan dos tareas activas, por prioridad: (1) instalar el Apps Script
que mantiene el formato de la hoja `n8n_jobs` —casilla de `generar_cv_ia`,
orden por `fecha_guardado` y alto de fila; ver
[jobs-hoja-formato.md](jobs-hoja-formato.md)— y (2), de baja prioridad,
registrar la app en apidoc.infojobs.net para sacar `HTTP Request Infojobs` de
Apify (bloqueada por un fallo del portal de terceros). Las tres confirmaciones
sobre ejecución real y el vigilante que le faltaba a
[Jobs · archivado](jobs-archivado.md) se cerraron el 17 ago 2026.

**Actualización 29 ago 2026:** la tarea (1) nunca se completó — al ir a revisar
el disparador se vio que **no había ningún proyecto Apps Script en la hoja**. Se
creó ese día y se lanzó `crearDisparador()` (pendiente de confirmar que el
disparador horario corre solo). Además se añadió a `Jobs · ingesta` un
guardarraíl que avisa por email si el hueco de filas vacías reaparece (nodos
`Guardarraíl huecos` + `Aviso huecos`, ver
[jobs-ingesta.md](jobs-ingesta.md) sección D). **Se volvió a tropezar con
«publicar no es guardar»**: el `update_workflow` del guardarraíl dejó
`versionId` ≠ `activeVersionId` hasta llamar a `publish_workflow`. Seguimiento en
[tareas-pendientes.md](tareas-pendientes.md).

Notas técnicas sobre el propio proceso de corrección, que han costado tiempo
más de una vez:

- **Publicar no es guardar.** Hasta que no se llamó a `publish_workflow` el 6
  ago 2026 por la tarde, el workflow en producción seguía ejecutando la versión
  del 5 ago (`activeVersionId` distinto de la última versión guardada). Cualquier
  cambio a estos tres workflows necesita `publish_workflow` explícito; después,
  comprobar que `versionId` y `activeVersionId` coinciden.
- **Validar no es verificar.** Los avisos `INVALID_PARAMETER` sobre
  `parameters.operation` en los nodos de Gmail son falsos positivos (`send` es
  la operación por defecto); en cambio, la referencia rota del punto 1 pasó la
  validación sin una sola queja. Después de cada cambio hay que releer las
  `connections` y, si es posible, mirar una ejecución real.

Nota aparte, no relacionada con esta revisión: `Normalizador All Jobs Scraper`
(fuente Jooble/Glassdoor/SAP/Talent, dentro de [Jobs ·
ingesta](jobs-ingesta.md)) estuvo desconectado de su llamada a Apify a
propósito hasta el 15 ago 2026 por falta de fondos. Reconectado ese día junto
con `retryOnFail` y salida de error (que le faltaban) y un fix de `country`;
verificado en la ejecución #577. Detalle en
[jobs-ingesta.md](jobs-ingesta.md#fallos-conocidos).
