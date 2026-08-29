---
type: n8n Workflow
title: Jobs · ingesta
description: Recolecta ofertas de teletrabajo en 12 fuentes, las filtra y deduplica en Google Sheets, y archiva las candidaturas antiguas.
resource: https://<N8N_HOST>/workflow/CXCD8BZUQEQKex2a
tags: [n8n, empleo, adzuna, apify, google-sheets]
timestamp: 2026-08-29T09:00:00Z
---

# Proposito

Primera pieza del pipeline de busqueda de empleo de Mar: recolecta ofertas de
12 fuentes dos veces al dia, las filtra por modalidad, salario y encaje con su
perfil, y las acumula en una hoja de calculo que hace de base de datos. La
generacion de CV/carta y el seguimiento de respuestas viven en workflows
separados desde el 6 ago 2026 (ver [Relacionados](#relacionados)).

La hoja `n8n_jobs` es el estado del sistema, no un informe: este workflow lee
de ella para deduplicar y escribe en ella el ciclo de vida de cada oferta
nueva (`pendiente`) y su archivado.

- **ID:** `CXCD8BZUQEQKex2a` (es el workflow original "Jobs", renombrado — no
  cambio de ID)
- **Estado:** activo desde el 6 ago 2026 tras el split (`active: true`, 1
  trigger)
- **Nodos:** 46 (46 hasta el 14 ago 2026 por la tarde, cuando entro
  `HTTP Request Detalle RemotoJob`; 47 desde el 15 ago con la reconexión de
  `HTTP Request All Jobs Scraper`; 42 desde el 16 ago 2026 al separar los 5
  nodos de archivado a [Jobs · archivado](jobs-archivado.md); 44 desde el 18
  ago 2026 al entrar `HTTP Request Jooble` + `Normalizador Jooble`; 46 desde el
  29 ago 2026 con el guardarraíl de huecos `Guardarraíl huecos` + `Aviso
  huecos`, ver Fallos conocidos y sección C)
- **Hoja de calculo:** `n8n_jobs`, id `1JUM8rF4UmfeUI8gQFZ4jKVxjwKWltmVwAicpwG2xm-U`
  - pestana `Ofertas_activas` (`gid=0`) — candidaturas vivas
  - pestana `Archivo` (`gid=1758745884`) — historico

# Disparador

**Schedule Trigger** — a las **09:00 y 17:00**, en la zona horaria de
`GENERIC_TIMEZONE`. Abre en abanico 13 ramas a la vez: las 12 fuentes de
ofertas mas la lectura de archivado. (Hasta el 14 ago 2026 este parrafo decia
"11 ramas / 11 fuentes"; eran 11 ramas pero solo 10 fuentes.)

El 14 ago 2026 hubo **temporalmente** una tercera regla a las 19:00, anadida
solo para comprobar que el cron disparaba (el ordenador habia estado apagado a
las 17:00 y n8n **no recupera** los disparos perdidos). Cumplida la prueba con
la ejecucion #572, se quito el mismo dia: el horario vigente vuelve a ser
09:00 y 17:00, alineado con el cron `0 9,17 * * *` del check de Healthchecks.

# Flujo

## A. Ingesta de ofertas (Schedule → hoja)

Trece fuentes en paralelo, cada una con su normalizador que las reduce al mismo
esquema (`titulo_puesto`, `empresa`, `salario`, `modalidad`, `resumen`,
`tipo_aplicacion`, `enlace_o_email`, `plataforma`, `fecha_publicacion`):

| Fuente | Nodo | Como |
|---|---|---|
| Adzuna | `HTTP Request Adzuna` | API oficial, `$env.ADZUNA_APP_ID` / `ADZUNA_APP_KEY` |
| Indeed | `HTTP Request1 Indeed` | Apify `valig~indeed-jobs-scraper` |
| LinkedIn | `HTTP Request LinkedIn` | Apify `valig~linkedin-jobs-scraper` |
| InfoJobs | `HTTP Request Infojobs` | Apify `shahidirfan~infojobs-scraper` — migracion a la API oficial bloqueada, ver Fallos conocidos |
| Himalayas | `HTTP Request Himalayas` | API publica |
| Glassdoor/SAP/Talent | `HTTP Request All Jobs Scraper` + `Normalizador All Jobs Scraper` | Apify `agentx~all-jobs-scraper` — reconectado el 15 ago 2026; Jooble salio de su `platforms` el 18 ago 2026 al pasar a fuente propia (ver Fallos conocidos) |
| Jooble | `HTTP Request Jooble` + `Normalizador Jooble` | API oficial gratuita `jooble.org/api/{{ $env.JOOBLE_API_KEY }}` — anadida el 18 ago 2026 (ver Fallos conocidos) |
| Get on Board | `HTTP Request Get on Board` | API publica `getonbrd.com` |
| Wellfound | `HTTP Request Wellfound` | Apify `crawlerbros~wellfound-scraper` |
| FlexJobs | `HTTP Request Flexjobs` | Apify `jupri~flexjobs-scraper` |
| We Work Remotely | `RSS Read` | RSS |
| RemotoJob | `RSS Read RemotoJob` + `HTTP Request Detalle RemotoJob` | RSS `remotojob.com/feed/`, sin clave (desde el 14 ago 2026). Unica fuente con **dos** peticiones: el feed no trae la empresa y hay que ir a la pagina de cada oferta (ver Fallos conocidos) |
| Jobicy | `HTTP Request Jobicy` | API publica `jobicy.com/api/v2/remote-jobs`, sin clave (desde el 14 ago 2026) |

**Fuentes evaluadas y descartadas** (para no volver a investigarlas):

- **Welcome to the Jungle** — descartada el 14 ago 2026. No publica API abierta:
  su buscador va sobre los indices Algolia `wk_cms_jobs_production` y
  `wk_cms_organizations_production`, y las claves publicas documentadas
  (`CSEKHVMS53` con `4bd8f62…` y `02f19bc…`) devuelven **403**; la web es un
  Next.js que no expone la clave en el HTML. La unica via viable seria el actor
  de Apify `logiover~welcome-to-the-jungle-jobs-scraper` (activo y mantenido),
  con precio por evento de **0,005 $/oferta**: con 50 ofertas y dos ejecuciones
  diarias son unos **15 $/mes**. Se decidio no pagarlo y ocupar su hueco con
  Jobicy.
- **Remotive** (`remotive.com/api/remote-jobs`) — API gratuita y sin clave, pero
  devolvia solo **18 ofertas** y su aviso legal amenaza con cortar el acceso si
  no se atribuye la fuente. Se prefirio Jobicy: 50 ofertas por llamada y sin esa
  condicion.

Todas convergen en **`Merge`** (13 entradas desde el 18 ago 2026: InfoJobs en
la 0, All Jobs Scraper en la 5 — hueco reservado desde el 13 ago —, RemotoJob
en la 10, Jobicy en la 11 y Jooble en la 12, nueva). Despues, en cadena:

1. **`Filtro teletrabajo`** — deja pasar si el normalizador ya marco
   `modalidad === 'Remoto'` **o** si aparece una palabra de remoto en
   titulo+resumen; descarta siempre si aparece "hybrid", "presencial",
   "onsite"…
2. **`Filtro salario`** — umbral 33.000 €/ano, con deteccion de divisa (USD,
   GBP con tasas fijas aproximadas; sin divisa explicita se asume EUR). Las
   ofertas sin salario pasan.
3. **`Filtro cualificación`** — cinco criterios en cascada sobre cada oferta;
   gana el primero que dispare. Salvo el de idioma, todos miran **solo el
   titulo**: mirar tambien el resumen descarta ofertas buenas (ver la nota de
   RemotoJob mas abajo).
   1. **idioma** — descarta si exige un idioma que Mar no habla (habla ES, CA
      y EN). Solo cuenta si el idioma aparece a menos de 40 caracteres de una
      marca de requisito (`fluent`, `native`, `imprescindible`, `C1`…), para
      que un "we serve the German market" no tire nada. Mas dos atajos
      inequivocos: `(m/w/d)` aleman y `(H/F)` frances.
   2. **contrato** — freelance, autonomo, contractor, part-time, practicas.
   3. **nivel** — `senior`, `sr`, `lead`, `principal`, `staff`, `head of`,
      `director`, `VP`, `chief`… con excepcion para `semi senior` y `junior`.
      Ademas descarta si pide mas de 4 años de experiencia, salvo que sean
      años de operaciones (donde Mar tiene 7).
   4. **perfil** — profesion fuera de perfil, en dos listas: **dura** (nunca
      rescatable: desarrollo, QA, diseño, sanidad, legal, docencia, logistica,
      construccion…) y **blanda** (ventas, marketing, finanzas, atencion al
      cliente, RRHH), que la lista de **rescate** anula para dejar pasar los
      compuestos legitimos tipo `Marketing Operations`.
   5. **encaje** — la oferta tiene que ganarse la entrada: si el titulo no
      menciona ninguna **familia objetivo** (operaciones, automatizacion, IA,
      procesos, coordinacion, administracion), se descarta.

   Despues marca `destacada: ⭐`, buscando las señales fuertes **solo en el
   titulo**. Y deja en el log de la ejecucion el recuento de descartes por
   criterio y la lista de titulos descartados, que es como se calibra sin
   guardar nada en la hoja.
4. **`Get row(s) in sheet`** + **`Leer archivo`** — leen las dos pestanas.
   `Get row(s) in sheet` tiene desde el 29 ago 2026 una segunda salida hacia
   **`Guardarraíl huecos`** (rama aislada, ver sección D); la salida a
   `Leer archivo` no cambia.
5. **`Filtro duplicados`** — lee de `Filtro cualificación`, calcula `id_unico`
   con un hash 32-bit de `empresa+titulo_puesto` normalizado, y descarta lo
   que ya este en cualquiera de las dos pestanas o repetido dentro de la
   propia tanda. Anade `fecha_guardado`, `estado: pendiente`,
   `generar_cv_ia: false`.
6. **`Append row in sheet`** → `Ofertas_activas`. Desde el 29 ago 2026 con
   `useAppend: true` (append nativo de la API de Sheets, no el modo *update* por
   defecto): anexa tras el bloque de datos contiguo desde A1, así que un hueco
   de filas vacías ya no manda las ofertas nuevas al final físico de la hoja.
   Ver Fallos conocidos.
7. **`If`** (¿hubo filas nuevas?) → **`Formato email`** → **`Notificación
   nuevas ofertas`** (Gmail, tabla HTML) → **`Ping Healthchecks`**
   (ping a `$env.HEALTHCHECKS_PING_URL`). Si no hubo ofertas, va directo al
   ping.

## B. Archivado — separado el 16 ago 2026

El archivado (`Analizar archivar` → `Decisión archivar` → `Añadir filas a
Archivo` → `Ordenar eliminación` → `Borrar ofertas ofertas_activas`) vivía
aquí, compartiendo el `Schedule Trigger` con la ingesta. Desde el 16 ago 2026
es un workflow independiente: [Jobs · archivado](jobs-archivado.md), con su
propio `Schedule Trigger` a las 09:00/17:00. Motivo del split: un error en
cualquier nodo de la ingesta tumbaba también el archivado aunque no tuvieran
relación (pasó del 5 al 13 ago 2026, ver
[jobs-revision.md](jobs-revision.md#1-el-filtro-de-cualificación-no-tiene-ningún-efecto)).
Detalle del flujo, sin cambios de lógica, en
[jobs-archivado.md](jobs-archivado.md).

## C. Aviso de fallos

Las 12 fuentes HTTP (todas menos los dos RSS) tienen `onError:
continueErrorOutput`; `RSS Read` tambien desde el 6 ago 2026 y `RSS Read
RemotoJob` desde el 14 ago 2026. Sus salidas de error van a **`Unir aviso
error`** (merge de 13 entradas, 0–12: hasta el 13 ago 2026 declaraba 10 con la
entrada 5 huerfana, se bajo a 9, el 14 ago subio a 11 al entrar RemotoJob en la
9 y Jobicy en la 10, el 15 ago subio a 12 al conectar `HTTP Request All Jobs
Scraper` en la 11, y el 18 ago subio a 13 al conectar `HTTP Request Jooble` en
la 12) → **`Envío error por email`** (monta el HTML y corta si no hay errores)
→ **`If1`** (`{{ $input.all().length }} > 0`) → **`Send a message1`** (Gmail).

Desde el 14 ago 2026 las fuentes llevan ademas `retryOnFail` (3 intentos,
3 s entre ellos); `HTTP Request All Jobs Scraper` se sumo el 15 ago con el
mismo patron. Los reintentos se agotan **antes** de que el nodo salga por su
rama de error, asi que el correo de aviso solo salta tras tres intentos
fallidos: un corte de red pasajero ya no genera un aviso.

## D. Guardarraíl de huecos en `Ofertas_activas` (29 ago 2026)

Añadido tras el incidente del hueco de ~260 filas vacías (ver
[jobs-hoja-formato.md](jobs-hoja-formato.md#29-ago-2026-el-apps-script-no-exist%C3%ADa)).
El incidente fue **silencioso**: la ingesta salió `success` y pingueó
Healthchecks los días 25–29 aunque las ofertas caían en la fila 280+. El
dead-man's switch no cubre "escribió, pero en el sitio equivocado".

Rama **aislada** de dos nodos que cuelga de `Get row(s) in sheet`, en paralelo a
`Leer archivo`. No toca el `append`, ni el `If`/email de nuevas ofertas, ni la
rama de error compartida de la sección C:

- **`Guardarraíl huecos`** (Code) — lee `$('Get row(s) in sheet').all()` y calcula
  `huecos = max(row_number) − filasConDatos − 1` (con la hoja contigua da 0). Si
  `huecos > 5` (constante `UMBRAL`) emite 1 item con el HTML del aviso; si no,
  `return []`. Sin `row_number` no mide y no avisa (evita falsos positivos).
- **`Aviso huecos`** (Gmail `send`, credencial `Gmail account`, a
  `mcaparrosgu@gmail.com`, `retryOnFail` 3×3 s) — al recibir 0 items no se
  ejecuta. Solo manda correo cuando hay hueco.

No bloquea la ingesta: es puramente informativo. Implementado vía n8n MCP.
**Verificado el 29 ago 2026** con la ejecución manual #671 (`UMBRAL = -1`
temporal): `Guardarraíl huecos` emitió el item de aviso y `Aviso huecos` envió
el correo (Gmail `id 1a04dd52fb3cee3b`, recibido en `mcaparrosgu@gmail.com`);
`UMBRAL` restaurado a 5 y republicado. Ver
[tareas-pendientes.md](tareas-pendientes.md) tarea 2.

# Dependencias

- **Credenciales n8n:** Google Sheets OAuth2, Google Drive OAuth2, Gmail OAuth2.
- **Variables de entorno** (via `$env`, requieren passthrough en
  `docker-compose.yml`): `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `APIFY_API_TOKEN`,
  `HEALTHCHECKS_PING_URL`.
- **Servicios externos de pago:** Apify (6 actores activos desde el 15 ago
  2026, con `agentx~all-jobs-scraper` reconectado).
- **Fuentes sin credencial ni clave:** Himalayas, Get on Board, We Work Remotely,
  RemotoJob y Jobicy. No requieren nada en `.env` ni passthrough en
  `docker-compose.yml`.

# Fallos conocidos

Ver el detalle en [jobs-revision.md](jobs-revision.md). Actualizado 29 ago 2026:

- ~~El filtro de cualificacion no tenia efecto~~ **Corregido**, pero el arreglo
  se escribio como `$('Filtro cualificacion')` **sin tilde** y tuvo el workflow
  caido del 5 al 13 ago 2026 con `ExpressionError: Referenced node doesn't
  exist`. Corregido de verdad el 13 ago. Es el fallo mas caro de la historia de
  este workflow: una semana sin ingesta y sin archivado.
- ~~Las claves de Adzuna viajaban a himalayas.app~~ **Corregido y cerrado.** El
  nodo dejo de enviarlas el 5 ago 2026 y las claves expuestas se rotaron en el
  panel de Adzuna entre el 13 y el 16 ago 2026.
- ~~El filtro de salario multiplicaba por 1000 lo que ya venia en euros~~
  **Corregido**, con umbral de 33.000 €/ano y deteccion de divisa.
- ~~No hay `retryOnFail` en ningun nodo~~ **Corregido del todo el 14 ago 2026.**
  Primero en los nodos de Sheets y Gmail; ese dia se completo con las **11
  fuentes** (9 HTTP + los 2 RSS) y `Ping Healthchecks`. Todos con `maxTries: 3`
  y `waitBetweenTries: 3000`, el mismo patron. Van **22 de 47 nodos** con
  reintento (el 22 es `HTTP Request All Jobs Scraper`, sumado el 15 ago); el
  21 es `HTTP Request Detalle RemotoJob`, que va con
  `maxTries: 2` y `waitBetweenTries: 2000` en vez del patron comun **porque se
  ejecuta una vez por oferta**, no una por fuente: son 20 peticiones, y el
  reintento se multiplica por 20. Los normalizadores (Code) se quedan **sin
  reintento a proposito**:
  `Normalizador FlexJobs` y `Normalizador Wellfound` lanzan error adrede cuando
  detectan datos de muestra, y reintentar solo retrasaria el aviso sin cambiar
  el resultado.
  **Ojo con el coste de Apify:** los seis actores se llaman con
  `run-sync-get-dataset-items` y `timeout: 600000`. Si n8n corta por timeout, el
  actor sigue corriendo en Apify y se cobra igual, asi que un fallo por timeout
  puede pagarse **hasta tres veces**. Un 403 por falta de saldo es inofensivo
  (no llega a lanzar el run). Si el gasto se dispara, bajar `maxTries` a 2 en
  los seis nodos de Apify.
- ~~`RSS Read` no tiene salida de error~~ **Corregido**.
- ~~El merge de errores espera entradas que solo producen datos cuando algo
  falla~~ **Corregido** el 13 ago 2026 bajando `numberInputs` a 9 y cerrando el
  hueco de la entrada 5. El 14 ago subio a 11 con RemotoJob (entrada 9) y
  Jobicy (entrada 10). El 15 ago subio a **12** al conectar `HTTP Request All
  Jobs Scraper` en la entrada 11.
- ~~`Borrar ofertas ofertas_activas` puede tener un off-by-one con la fila de
  cabecera~~ **Verificado y correcto el 16 ago 2026.** Intento del 15 ago sin
  resultado (n8n no aplica un pin de prueba si el nodo real anterior devuelve 0
  items). El 16 ago Mar marco a proposito las filas 2-8 de `Ofertas_activas`
  como `descartada` para tener una candidata real, y se ejecuto paso a paso en
  el editor con datos reales en cada nodo: `Analizar archivar` leyo las 156
  filas, `Decisión archivar` filtro exactamente esas 7, `Ordenar eliminación`
  las ordeno por `row_number` descendente (8→2) y `Borrar ofertas
  ofertas_activas` las borro (`{"success": true}`), confirmado en la hoja: la
  fila 2 paso a ser la que antes era la fila 9. `startIndex: {{ $json.row_number }}`
  es correcto, sin desfase con la cabecera.
- **La credencial "Google Sheets account" caducó y bloqueó toda la ingesta el
  16 ago 2026** hasta que Mar la reconectó a mano desde el editor de n8n
  ("Access could not be refreshed... reconnect it to continue"). Explica por
  que ese dia no hubo ninguna ejecucion ni a las 09:00 ni antes: el primer nodo
  que toca Sheets (`Analizar archivar`, en paralelo desde el `Schedule
  Trigger`) habria fallado de inmediato. Sin causa raiz confirmada de por que
  caduco (token OAuth revocado, expirado, o cambio de permisos/contraseña en
  la cuenta de Google) — vigilar si vuelve a pasar.
- **El nodo `Ordenar eliminación` tenia datos de prueba pineados** desde el
  intento del 15 ago (fila 593, oferta de Aveni) que nunca se limpiaron y
  habrian falseado cualquier ejecucion de prueba posterior del nodo. Detectado
  y desanclado (`Unpin`) el 16 ago 2026 al retomar la verificacion del
  borrado. Conviene revisar si hay pin data olvidado en otros nodos tras una
  sesion de pruebas.
- **`id_unico` es un hash de 32 bits.** Sin cambiar a proposito — cambiar el
  algoritmo invalidaria todos los ids ya escritos y rompería la deduplicacion y
  el cruce con `Jobs · seguimiento`.
- **`HTTP Request All Jobs Scraper` reconectado el 15 ago 2026** (fondos de
  Apify repuestos). El nodo estaba en el workflow desde el 6 ago pero
  desconectado del `Schedule Trigger` a proposito; se le añadio `onError:
  continueErrorOutput` + `retryOnFail` (mismo patron que las otras 11 fuentes,
  antes faltaban) y se conecto su salida de error a `Unir aviso error` — sin
  eso, un fallo suyo tumbaba la ejecucion entera, igual que el bug historico de
  `RSS Read`. Verificado de extremo a extremo en la **ejecucion #577** (15 ago,
  manual, `success`, 97 s): el body enviaba `country: "ES"` y el actor lo
  rechazo con `400 invalid-input` (la API solo acepta el nombre completo del
  pais en ingles) — corregido a `"Spain"` en la misma sesion. `FlexJobs` fallo
  en la misma ejecucion con `403 full-permission-actor-not-approved`: ese actor
  de Apify exige aprobar sus permisos a mano en el panel, es una tarea de Mar
  (ver [tareas-manuales.md](../../docs/tareas-manuales.md)). Las otras cuatro fuentes
  de Apify (Indeed, LinkedIn, InfoJobs, Wellfound) devolvieron ofertas reales,
  confirmando que el saldo de Apify esta repuesto.
- **La ejecucion #577 tambien confirmo el ping de Healthchecks.** Como no hubo
  ninguna ejecucion a las 17:00 del 15 ago (el equipo entro en suspension y no
  desperto hasta las 16:33, ver [tareas-manuales.md](../../docs/tareas-manuales.md)),
  esta fue la primera senal que llego a Healthchecks desde las 09:00 de ese
  dia.
- ~~FlexJobs y Wellfound colaban ofertas de muestra como si fueran reales~~
  **Corregido el 14 ago 2026.** Con el `Monthly usage hard limit exceeded` de
  Apify, InfoJobs y LinkedIn devuelven 403 y salen por su rama de error, pero
  los actores de FlexJobs y Wellfound respondian **200 con una oferta ficticia**
  ("Ejemplo Flex Corp", "Ejemplo Startup Inc", URLs con `example.com` y con ids
  `12345`/`1234567`). Esas ofertas entraban en el pipeline como cualquier otra;
  cuatro filas mock del 5 ago siguen en la pestana `Archivo`. Ahora
  `Normalizador FlexJobs` y `Normalizador Wellfound` detectan esas ofertas por
  contenido y las descartan; si la respuesta entera es de muestra lanzan un
  error que sale por su salida 1 hacia `Unir aviso error`, reutilizando la misma
  entrada del merge que ya usaba su nodo HTTP (7 y 6 respectivamente), por lo
  que `numberInputs` sigue en 9. La deteccion se probo contra el payload real de
  la ejecucion #569 y contra casos limite que no debe descartar (una empresa
  llamada "Ejemplares S.L.", un id `12345678`), y se verifico de extremo a
  extremo en la **ejecucion #570**: ambos normalizadores salieron por su rama de
  error, ninguna oferta falsa llego a la hoja y el correo de aviso listo los dos
  mensajes junto a los 403 de InfoJobs y LinkedIn. Las cuatro filas mock que ya
  estaban en la pestana `Archivo` (filas 56, 57, 159 y 160) se borraron el mismo
  dia, previa copia de la hoja en Drive.
- ~~Indeed ignora su `resultsLimit`~~ **Resuelto el 14 ago 2026 subiendo el
  limite a 100.** Pedia 30 y el actor devolvia 100 ofertas, pero **reales**
  (comprobado en la ejecucion #569: 35 empresas distintas, URLs validas de
  `es.indeed.com`), no datos de muestra. Era un asunto de coste y volumen, no de
  calidad: Apify ya scrapeaba 100 y se pagaba igual. Se sube el `resultsLimit` a
  100 para que la configuracion refleje lo que ocurre; no cambia ni el coste ni
  las ofertas que entran.
- **`Envío error por email` daba "Error desconocido" con los errores de los Code
  nodes.** Solo leia `item.json.error?.message`, y n8n entrega el error de un
  Code node como string. Corregido el 14 ago 2026 para aceptar ambas formas.
- ~~El check de Healthchecks estaba configurado con un `period` incompatible con
  este cron~~ **Corregido el 14 ago 2026.** El check `Jobs n8n`
  (`e882112f-…-8292c`) usaba el modo simple con `period` de 13 h, pero el hueco
  entre el ping de las 17:00 y el de las 09:00 es de 16 h: en cuanto el cron
  funcionase habria marcado el check caido cada noche a las 07:00 y enviado un
  aviso falso diario. Ahora usa expresion cron `0 9,17 * * *` con timezone
  `Europe/Madrid` y 1 h de gracia, alineada con el Schedule Trigger. Conviene
  cambiar los dos a la vez si algun dia se toca el horario.
- **`Filtro teletrabajo` ignoraba el campo `modalidad`.** Solo buscaba
  "remote"/"remoto"/"teletrabajo" en `titulo_puesto + resumen`, asi que una
  oferta de un portal 100% remoto se descartaba si su resumen no usaba esas
  palabras. Cambiado el 14 ago 2026 a
  `oferta.modalidad === 'Remoto' || palabrasRemoto.some(...)`. Sin esto,
  RemotoJob y Jobicy casi no habrian producido filas: sus extractos rara vez
  dicen "remoto". Medido sobre las 70 ofertas reales del 14 ago 2026, el filtro
  anterior dejaba pasar **7**; el nuevo, **68**. **Efecto colateral buscado:**
  tambien suben de volumen
  Wellfound, Get on Board y We Work Remotely, que ya marcaban `modalidad:
  'Remoto'`. La exclusion por "hybrid"/"presencial"/"onsite" sigue mandando.
- ~~**RemotoJob no expone la empresa**~~ **Resuelto** el 14 ago 2026, por la
  tarde. El RSS solo trae titulo, enlace, fecha y extracto, y `dc:creator` es el
  editor del portal, no el empleador — pero **la pagina de cada oferta incrusta
  un JSON-LD `JobPosting` de schema.org** con `hiringOrganization.name`. Se
  intercalo `HTTP Request Detalle RemotoJob` entre el RSS y el normalizador
  (`responseFormat: text` → el HTML llega en `data`), y el normalizador saca de
  ahi la empresa. Medido contra las 20 ofertas reales del feed: **empresa
  resuelta en 20 de 20**, y el resto del pipeline sin cambios (15 filas a la hoja
  antes y despues). Tres cosas que costaron y conviene no repetir:
  - **Ese JSON-LD no es JSON valido.** Mete saltos de linea y tabuladores crudos
    dentro de los strings y `JSON.parse` lo rechaza; hay que sustituir los
    caracteres de control por espacios antes de parsear. Sin ese saneo el nodo
    devuelve `No especificado` **en silencio**, sin fallar. (`ConvertFrom-Json`
    de PowerShell si lo acepta, asi que una comprobacion hecha con PowerShell da
    un falso visto bueno.)
  - **El `baseSalary` del JSON-LD esta roto en origen y no se usa.** 16 de las 20
    ofertas declaran exactamente `1000 EUR/MONTH` — relleno del portal — y las
    otras cuatro traen el rango concatenado sin separador (`7500095000` = 75.000
    y 95.000, `70000100000` = 70.000 y 100.000), todas etiquetadas `MONTH` aunque
    sean anuales. Usarlo hundia RemotoJob **de 15 filas a 2**, descartando
    ofertas buenas por un salario falso. `salario` se queda en `No especificado`,
    que es la verdad.
  - **La `description` completa del JSON-LD tampoco se usa como `resumen`.**
    Estaba disponible y es diez veces mas larga que el extracto del RSS, pero
    medida contra `Filtro cualificacion` **descartaba 2 de las 15** ofertas que
    ahora pasan (entre ellas una de "Modelos de Lenguaje e IA", justo el perfil):
    mas texto significa mas probabilidad de tropezar con una palabra de la lista
    de exclusion. El `resumen` sigue saliendo del feed.

  El emparejamiento entre la pagina y su entrada del feed va por
  `$('RSS Read RemotoJob').itemMatching(i)`, que sigue el `pairedItem`, no por
  indice: asi una pagina que falle no descuadra a las demas. El nodo va con
  `onError: continueRegularOutput` a proposito — si una oferta suelta no
  responde, su empresa queda en `No especificado` y las otras 19 siguen; el aviso
  de fuente caida ya lo cubre la rama de error del `RSS Read RemotoJob`.
- **Verificado de extremo a extremo en la ejecucion #572** (14 ago 2026,
  modo `trigger`, `success` en 62 s). Salto a las 19:00 porque ese dia habia una
  regla temporal a esa hora, puesta solo para probar el cron y retirada despues;
  el horario normal es 09:00 y 17:00. Es la primera ejecucion **automatica** sin
  error desde el 8 ago. Reparto real por fuente:

  | Fuente | Merge | Teletrabajo | Salario | Cualificacion | A la hoja |
  |---|---|---|---|---|---|
  | Adzuna | 20 | 20 | 18 | 14 | 1 |
  | Himalayas | 20 | 20 | 20 | 20 | 15 |
  | Get on Board | 100 | 98 | 55 | 32 | 30 |
  | We Work Remotely | 100 | 87 | 87 | 59 | 3 |
  | **RemotoJob** | **20** | **20** | **20** | **15** | **15** |
  | **Jobicy** | **50** | **48** | **48** | **34** | **33** |
  | | 310 | 293 | 248 | 174 | **97** |

  Las dos fuentes nuevas aportaron **48 de las 97 filas**. Los cinco actores de
  Apify (Indeed, LinkedIn, InfoJobs, Wellfound, FlexJobs) devolvieron **403
  `Monthly usage hard limit exceeded`** y salieron por su rama de error, asi que
  no aportaron nada: sin RemotoJob y Jobicy la ejecucion habria dado 49 filas.
  Ninguna oferta de muestra llego a la hoja.
- **Los reintentos se confirmaron en la misma ejecucion.** `HTTP Request
  Infojobs` tardo **7.428 ms** en devolver 0 items: son los tres intentos con
  3 s de espera entre ellos antes de rendirse y salir por la rama de error. Las
  fuentes que responden bien no pagan nada extra (`HTTP Request Jobicy` 752 ms,
  `RSS Read RemotoJob` 1.857 ms).
- **Ni RemotoJob ni Jobicy llevan guardarrail de datos de muestra.** Ese
  guardarrail es especifico de los actores de Apify sin saldo, que responden 200
  con ofertas ficticias. Estas dos fuentes fallan con codigo HTTP y salen por su
  rama de error.
- **Healthchecks avisara cada dia que el ordenador este apagado a las 09:00 o
  las 17:00** (sin resolver). El check y el trigger estan alineados —ambos en
  09/17—, asi que no hay desajuste que corregir; el problema es otro: un check de
  cron estricto encaja mal con una maquina que no esta siempre encendida y con un
  n8n que **no recupera los disparos perdidos**. El 14 ago el ordenador estaba
  apagado a las 17:00, el ping no llego y a las 18:00 el check paso a `down` y
  mando un aviso: cierto, pero sin nada que arreglar. Si esos avisos se vuelven
  ruido, la salida recomendada es **pasar el check a modo simple con `period` de
  24 h y 2 h de gracia**: avisaria solo si pasa un dia entero sin ninguna
  ejecucion, que es la senal que de verdad interesa. El check vive en el panel de
  Healthchecks, fuera de n8n.
- ~~**Healthchecks avisa una sola vez al caer, no insiste.**~~ **Corregido el
  16 ago 2026.** Durante el corte del 5 al 13 ago 2026 el check **si** detecto
  el fallo (paso a `down` el 6 ago a las 09:06) y la notificacion por correo
  estaba activa; lo que fallo fue que nadie actuo sobre ese unico aviso.
  Activado en la cuenta de Healthchecks (Account → Email Reports → "Ongoing
  reminders if any checks are down") el recordatorio **diario** mientras
  cualquier check siga caido — afecta a los tres checks de la cuenta, no solo a
  este.
- **Dos checks hermanos anadidos el 16 ago 2026** para los otros dos workflows
  del pipeline, que hasta entonces no tenian vigilante propio: ver
  [jobs-seguimiento.md](jobs-seguimiento.md#disparador) y
  [jobs-generacion-cv.md](jobs-generacion-cv.md#disparador). A diferencia de
  este check (cron fijo 09/17), los otros dos son event-driven — el periodo se
  fijo mucho mas laxo (3 dias y 7 dias respectivamente) para no generar
  falsas alarmas por simple ausencia de actividad.
- ~~**`Filtro cualificación` dejaba pasar cualquier profesion no enumerada**~~
  **Corregido el 14 ago 2026, por la tarde.** Era una lista negra pura: si el
  titulo no mencionaba `frontend`, `abogado`, `sales`… la oferta entraba. De las
  248 que le llegaron en la ejecucion #572 pasaban **174**, y a la hoja llegaron
  ofertas de *Ambulance Dispatcher*, *Remote Travel Consultant*, *Consultor SAP
  HCM*, *Chief of Staff to the CTO* y *Director of Operations*. Tres agujeros:
  no habia lista blanca, no habia ningun filtro de nivel, y `operations` estaba
  en la lista de rescate, que anula la exclusion — la puerta por la que entraba
  el catalogo entero de Himalayas. Reescrito con los cinco criterios de la
  seccion A.3. **Sobre esas mismas 248 ofertas ahora pasan 15**: 116 caen por
  perfil, 101 por nivel, 9 por contrato y 7 por idioma. Cuatro decisiones que
  conviene no deshacer sin medir:
  - **La coincidencia es por palabra completa** (`\b…\b` sobre el texto
    normalizado), no por subcadena. Con `includes` los terminos cortos del
    perfil (`ai`, `ia`, `ops`, `rpa`) casaban dentro de `email`, `training`,
    `retail` y `maintenance`.
  - **Las exclusiones de profesion van en dos listas.** La **dura** no la salva
    nada: sin esa separacion, `Applied AI Developer`, `QA Automation Engineer` y
    `Desarrollador Full-Stack con IA` se colaban rescatados por su propia
    mencion de IA. La **blanda** si es rescatable, que es lo que deja pasar
    `Marketing Operations` sin dejar pasar `Marketing Manager`.
  - **`engineer` va por compuestos concretos** (`software engineer`,
    `ai engineer`, `data engineer`…), nunca suelto, para no descartar
    `Automation Engineer`, que si es el perfil.
  - **Los plurales hay que ponerlos a mano.** `Outbound & Automations Manager`
    se caia porque `automations` no casa con `\bautomation\b`.
- ~~**La marca ⭐ nunca ha llegado a la hoja**~~ **Corregido el 15 ago 2026.**
  `Append row in sheet` usa `mappingMode: autoMapInputData`, que mapea contra
  las cabeceras reales de `Ofertas_activas`; hasta el 15 ago no existía ahí la
  columna `destacada`, así que la clave se descartaba en silencio. Mar añadió
  la columna a mano ese día, en la columna **F**. El nodo no necesita ningún
  cambio. De paso, hasta el 14 ago 2026 la ⭐ se buscaba tambien en el
  `resumen`, asi que *Director of Finance* y *Senior QA Analyst* salian
  marcadas por mencionar "automation" en el cuerpo. Ahora solo se mira el
  titulo.
  - **16 ago 2026:** durante una limpieza de la hoja (huecos de filas vacías y
    `generar_cv_ia` en texto plano, ver más abajo) apareció una **segunda**
    columna `destacada`, vacía, en **Q** — no la que usa `Append row in
    sheet`. Confirmado con Mar que la válida es la F (con las ⭐ ya escritas) y
    se borró la Q. **Confirmado el 17 ago 2026** en la ejecución #590: la
    cabecera de `Ofertas_activas` sigue teniendo `destacada` solo en F, sin
    reaparición en Q, y las filas que escribió esa ejecución mapearon el campo
    correctamente.
- ~~La credencial "Gmail account" caducó y bloqueó la notificación (y, en
  cascada, el ping a Healthchecks) el 17 ago 2026~~ **Corregido el mismo día.**
  Mismo mensaje que tuvo "Google Sheets account" el 16 ago ("Access could not
  be refreshed... reconnect it to continue"). La ejecución #590 de las 09:00
  llegó hasta `Append row in sheet` sin problema (escribió 7 ofertas nuevas
  reales), pero `Notificación nuevas ofertas` falló tras sus 3 reintentos y
  detuvo ahí el workflow. `Ping Healthchecks` nunca llegó a ejecutarse, porque
  está conectado *después* de la notificación en la cadena (paso 7 de la
  sección A) — comportamiento correcto de un dead-man's switch, pero que dejó
  también sin confirmar el modo simple de Healthchecks. Mar reconectó la
  credencial y relanzó con "Retry" desde el editor; el reintento (#591,
  `retryOf: 590`) salió `success`: Gmail devolvió `id`/`threadId` del mensaje
  enviado y `Ping Healthchecks` respondió `"OK"`, confirmando de paso el
  vigilante. Sin causa raíz confirmada — es la **segunda** credencial de
  Google que caduca en 48 h (Sheets el 16, Gmail el 17); si se repite con una
  tercera conviene investigar en serio en vez de reconectar sin más. Detalle
  del cierre en [tareas-manuales.md](../../docs/tareas-manuales.md).
- ~~El marcador de género alemán de `Filtro cualificación` solo reconocía el
  orden "m" primero~~ **Corregido el 17 ago 2026.** Mar recibió por email
  "E-invoicing & EDI Integration Engineer (f/m/d) - with English and
  German/French/Italian" (ecosio, vía Jobicy) pese a exigir alemán, francés e
  italiano en el propio título. Dos fallos independientes en `motivoIdioma`:
  1. El atajo de marcador alemán solo probaba `/\(\s*m\s*[/|]\s*[wf]\s*[/|]\s*[dx]\s*\)/i`
     — es decir, únicamente "(m/w/d)" con la "m" fija en primera posición. La
     oferta usaba **"(f/m/d)"**, la variante female/male/diverse con la que
     algunas empresas alemanas traducen "m/w/d" al publicar en inglés, y no
     casaba.
  2. El criterio general (idioma cerca de una marca de requisito como
     "fluent"/"native"/"required") tampoco lo pilló: el título solo *lista*
     los idiomas ("with English and German/French/Italian") sin ninguna
     palabra de esas cerca, y el resumen empezaba con texto de la empresa
     ("Company Description ecosio is a...") sin marca de requisito en la
     ventana de 40 caracteres.

  Arreglado el punto 1: la regex ahora acepta cualquier orden de
  `m`/`w`/`f`/`d`/`x` separados por `/` o `|` dentro del paréntesis
  (`/\(\s*[mwfdx]\s*[/|]\s*[mwfdx]\s*[/|]\s*[mwfdx]\s*\)/i`), verificado
  contra "(f/m/d)", "(m/w/d)", "(w/m/d)" y "(d/f/m)".

  **Punto 2 corregido también, el mismo día**: si el **título** por sí solo
  menciona 2 o más idiomas no hablados, se descarta directamente, sin
  necesitar una marca de requisito cerca. Solo mira el título (no el
  resumen), para no descartar ofertas que solo listan mercados o países en
  el cuerpo del texto. Probado contra 8 títulos reales e hipotéticos sin
  ningún falso positivo: "Support Engineer - DACH region", "Regional Sales
  Manager - Germany, France" y "Automation Engineer - EMEA" no casan
  (nombres de país/región, no de idioma), mientras que la oferta de ecosio y
  una "Localization Manager - French, German, Italian" hipotética sí se
  descartan. La fila de ecosio en `Ofertas_activas` (`fecha_guardado
  2026-08-17`) no se tocó a mano — sigue en `pendiente`, `Jobs · archivado`
  la recogerá pasados 7 días si Mar no la marca antes.
- **Aparecieron 438 filas completamente vacías (53–490) intercaladas entre
  datos reales en `Ofertas_activas`, y `generar_cv_ia` tenía `FALSE` como
  texto plano (sin casilla) en la fila 32 y en un bloque de filas 491–595.**
  Detectado y corregido el 16 ago 2026, a mano en el editor de Sheets (no por
  n8n): se borraron las 438 filas vacías y se reaplicó la casilla de
  verificación sobre las celdas con `FALSE` en texto. **La causa no se
  investigó** — encaja con un borrado de fila hecho con "borrar contenido" en
  vez de "eliminar fila" (deja el formato y la validación de datos pero no
  quita la fila), pero no hay evidencia que lo confirme contra
  `Borrar ofertas ofertas_activas`, el único nodo que borra filas de esta
  pestaña. Vigilar si el hueco vuelve a aparecer tras el próximo archivado —
  sería la pista que falta.
  - **27 ago 2026:** `generar_cv_ia` volvió a verse como texto `FALSE` (sin
    casilla), esta vez sin hueco de filas vacías: el valor era booleano de
    verdad, solo faltaba la validación de datos. n8n escribe el booleano pero
    nunca la casilla, y acotarla a mano se pierde en cuanto la ingesta añade
    filas más allá del rango validado. Arreglado y automatizado con un Apps
    Script dentro de la hoja — ver
    [jobs-hoja-formato.md](jobs-hoja-formato.md). Ahí también está por qué la
    casilla **no** puede ir en la columna entera (pondría `FALSE` en las filas
    vacías y descuadraría el `append`).
  - **29 ago 2026: el hueco volvió.** Reaparecieron ~260 filas vacías (20–279)
    entre los datos hasta el 24 ago (filas 2–19) y las ofertas del 27–29 ago,
    que el `append` había escrito a partir de la fila 280. Las ejecuciones de
    los días 25–29 salieron todas `success` y con filas escritas, pero al abrir
    la hoja parecía que la ingesta se había parado el día 24. Encaja con el
    reformateo manual del 27 ago (borrar contenido en vez de filas) **más el
    Apps Script de mantenimiento que nunca se llegó a instalar en la hoja**: no
    reordenó ni purgó nada porque no existía (orden viejo arriba, `generar_cv_ia`
    otra vez como texto `FALSE`, hueco intacto). Es la pista que faltaba: el
    hueco lo deja el borrado de contenido y **el Apps Script es quien tiene que
    limpiarlo**; si no está, se acumula. Arreglado a mano vía API el 29 ago:
    borradas las
    filas vacías, hoja reordenada por `fecha_guardado` desc, casilla reaplicada
    al rango de datos, 39 ofertas contiguas. En el borrado se eliminaron de más
    11 filas con datos (27 ago y parte del 28), recuperadas íntegras de las
    ejecuciones #653/#658/#662 (`Append row in sheet`) y reinsertadas — sin
    pérdida. Las ofertas del **25 y 26 ago sí se perdieron** en el reformateo
    manual del 27, no están en ninguna pestaña. Como blindaje se puso
    `useAppend: true` en `Append row in sheet` (ver Flujo A.6): un hueco futuro
    ya no destierra las filas nuevas al final físico de la hoja. **Hecho el 29
    ago (pendiente de revisión):** (1) creado el proyecto Apps Script en la hoja
    con el script de mantenimiento y lanzado `crearDisparador()` —falta confirmar
    que el disparador horario corre solo; (2) añadido el guardarraíl `Guardarraíl
    huecos` + `Aviso huecos` a este workflow (ver sección D) para que un hueco
    futuro avise por email. Seguimiento en
    [tareas-pendientes.md](tareas-pendientes.md) (tareas 1 y 2).
- **La linea que quita acentos no debe llevar caracteres invisibles.** Estaba
  escrita como `/[̀-ͯ]/g`, con los propios caracteres combining U+0300 y U+036F
  dentro del rango: invisibles en cualquier editor y faciles de perder en una
  copia o un guardado con otra codificacion. Si se pierden, el filtro deja de
  normalizar acentos **en silencio** y `Automatización` deja de casar con
  `automatizacion`. Cambiada el 14 ago 2026 a `/\p{Diacritic}/gu`, que es todo
  ASCII y hace lo mismo.

- **Apify se quedo sin credito el 18 ago 2026, entre las ejecuciones de las
  9:00 y las 9:16.** La automatica (#596) solo fallo `All Jobs Scraper` con
  `408 run-timeout-exceeded`; 16 minutos despues, la manual (#597) recibio
  `403 Monthly usage hard limit exceeded` en `All Jobs Scraper`, `FlexJobs` y
  `Wellfound` — probablemente el propio reintento por timeout de la primera
  ejecucion agoto el credito restante. Un 403 por falta de saldo es inofensivo
  (no llega a lanzar el run), pero el 408 si se cobra, y con `maxTries: 3` se
  paga hasta tres veces. Mientras dure el corte se baja `maxTries` a **2** solo
  en `HTTP Request All Jobs Scraper` (los otros cinco Apify se dejan en 3,
  fallan limpio con 403 sin coste).
- **Jooble sale de `All Jobs Scraper` y pasa a fuente propia con su API
  oficial gratuita, el 18 ago 2026.** Con Apify sin credito, se anadieron
  `HTTP Request Jooble` + `Normalizador Jooble` (API `jooble.org/api/{{
  $env.JOOBLE_API_KEY }}`, clave ya presente en `.env` desde antes) como 13a
  fuente — `Merge` y `Unir aviso error` subieron de 12 a 13 entradas, Jooble en
  la 12 de ambos. Se quito `"Jooble"` de la lista `platforms` del `jsonBody` de
  `All Jobs Scraper` para no pagarlo dos veces cuando vuelva el credito.
  **Trampa real, encontrada al verificar con la ejecucion #598:** el body
  llevaba `"location": "España"` (con eñe) y Jooble devolvia `totalCount: 0`
  sin ningun error — la llamada se daba por buena porque la API respondia 200
  con JSON valido, solo que vacio. Probado por curl directo contra la API real:
  `"location": "Spain"` (nombre del pais en ingles, igual que ya le pasa a
  `All Jobs Scraper` con `"country": "Spain"`) da 144.197 resultados con
  `"remote operations"`, identico a omitir `location`. Corregido en el
  workflow real el mismo dia; sin verificar aun de extremo a extremo con una
  ejecucion completa tras la correccion — comprobar en la proxima pasada
  automatica que `Normalizador Jooble` aporta filas a la hoja.
- **La migracion de InfoJobs a su API oficial (apidoc.infojobs.net) esta
  bloqueada por un fallo en el propio portal de terceros.** Mar confirmo el 18
  ago 2026 que ya lo habia intentado antes — el login del portal de
  desarrollador funciona, pero se queda colgado en algun punto tras entrar sin
  completar el registro de la app, y por eso se opto por el actor de pago
  `shahidirfan~infojobs-scraper` en vez de la API gratuita. Sin causa raiz
  identificada (¿bug del portal, bloqueo geografico, extension del
  navegador?); si se reintenta, probar en una ventana de incognito o con otro
  navegador antes de asumir que sigue roto. Mientras tanto InfoJobs se queda en
  Apify, sujeto igual que los demas actores al corte de credito.

# Relacionados

- [Jobs · archivado](jobs-archivado.md) — separado de este workflow el 16 ago 2026
- [Jobs · generación CV](jobs-generacion-cv.md) — separado de este workflow el 6 ago 2026
- [Jobs · seguimiento](jobs-seguimiento.md) — separado de este workflow el 6 ago 2026
- [Revision y mejoras propuestas](jobs-revision.md)
- [Formato y mantenimiento de la hoja n8n_jobs](jobs-hoja-formato.md) —
  `Append row in sheet` mapea por cabecera; el formato (casilla, orden, alto)
  lo repone un Apps Script aparte
- [Tareas pendientes · Jobs](tareas-pendientes.md) — seguimiento del incidente
  del 29 ago 2026 (Apps Script, guardarraíl de huecos, etc.)
- [index.md](../../docs/index.md)
