---
type: n8n Workflow
title: Jobs · seguimiento
description: Clasifica con un agente de IA las respuestas de empresas que llegan por Gmail y propone el nuevo estado de cada candidatura.
resource: https://<N8N_HOST>/workflow/QWIGXkYm9FOdxrEJ
tags: [n8n, empleo, anthropic, langchain, gmail, google-sheets]
timestamp: 2026-08-14T20:00:00Z
---

# Proposito

Tercera pieza del pipeline de busqueda de empleo de Mar: cuando llega un email
a la etiqueta de Gmail dedicada a candidaturas, un agente de IA decide si es
de verdad la respuesta de una empresa, localiza la candidatura en la hoja
`n8n_jobs` y propone un nuevo estado. **No cambia `estado` directamente**:
deja la propuesta en columnas aparte (`estado_propuesto`,
`resumen_respuesta`) para que Mar la valide a mano.

Separado del workflow original **Jobs** el 6 ago 2026 (ver
[jobs-revision.md](jobs-revision.md), punto 6) para poder activarlo y depurarlo
sin afectar a la ingesta ni a la generacion de CV.

- **ID:** `QWIGXkYm9FOdxrEJ`
- **Estado:** activo desde el 6 ago 2026
- **Nodos:** 9
- **Hoja de calculo:** `n8n_jobs`, id `1JUM8rF4UmfeUI8gQFZ4jKVxjwKWltmVwAicpwG2xm-U`,
  pestana `Ofertas_activas` (`gid=0`)

# Disparador

**Email recibido** (`gmailTrigger`) — sondeo cada hora sobre la etiqueta
`Label_7457971305058964602`, **al minuto 30** (`mode: everyHour`,
`minute: 30`).

El minuto no es decorativo. Hasta el 14 ago 2026 sondeaba en punto, que es el
valor por defecto de `everyHour`, y por tanto coincidia con las 09:00 y las
17:00 del Schedule Trigger de [Jobs · ingesta](jobs-ingesta.md). Los dos
workflows escriben en la misma pestana `Ofertas_activas` y **no hay ningun
bloqueo**: la ingesta anade filas nuevas mientras este actualiza
`estado_propuesto` y `resumen_respuesta` por `id_unico`, y dos escrituras
simultaneas sobre la misma fila pueden pisarse. Moverlo al minuto 30 separa las
dos ventanas media hora sin perder frecuencia.

Es una **mitigacion, no una solucion**: si alguna vez una ejecucion de la
ingesta se alargara mas de 30 minutos, el solape volveria. La #572 tardo 62 s,
asi que el margen es amplio.

**Vigilante propio desde el 16 ago 2026** — check dedicado en Healthchecks.io
(`Jobs n8n · seguimiento`, ping a `$env.HEALTHCHECKS_PING_URL_SEGUIMIENTO`).
Hasta entonces solo [Jobs · ingesta](jobs-ingesta.md) tenia vigilante: si este
workflow dejaba de procesar respuestas de empresas, nadie se enteraba. El
`Gmail Trigger` es **event-driven** (n8n solo ejecuta el workflow cuando hay un
email nuevo en la etiqueta, no en cada sondeo horario), asi que el check no
puede usar un periodo ajustado al sondeo como el de ingesta — un dia entero sin
que ninguna empresa responda es normal, no una averia. Periodo **3 dias**,
gracia **1 dia**: bastante laxo para no generar falsas alarmas, pero acota una
averia real a como mucho unos dias sin deteccion.

# Flujo

1. **`Email recibido`** → **`Email no interno`** (descarta lo que envia ella
   misma).
2. **`Analizar respuesta empresa`** — agente LangChain con `claude-sonnet-5`
   (`Anthropic Chat Model`), la hoja como herramienta (`Consultar tabla
   ofertas`) y un `Structured Output Parser` (con su propio modelo,
   `Anthropic Chat Model1`, para el `autoFix`). Decide primero si el email es
   de verdad una respuesta de empresa; si lo es, localiza la candidatura y
   propone `id_unico`, `estado_propuesto` y `resumen_respuesta`.
3. **`Hay candidatura`** → si si, **`Guardar propuesta de la IA`** escribe la
   propuesta en la fila correspondiente; si no, sigue directo. Ambas ramas
   convergen en **`Ping Healthchecks`** (desde el 16 ago 2026, mismo patron que
   [Jobs · ingesta](jobs-ingesta.md): `retryOnFail` 3 intentos/3s,
   `onError: continueRegularOutput` para que un fallo del ping no tumbe el
   analisis ya hecho).

# Dependencias

- **Credenciales n8n:** Gmail OAuth2, Google Sheets OAuth2, Anthropic (para
  los tres nodos LangChain).
- **Variables de entorno** (via `$env`, requieren passthrough en
  `docker-compose.yml`): `HEALTHCHECKS_PING_URL_SEGUIMIENTO`.
- **Servicios externos de pago:** API de Anthropic, hasta dos llamadas por
  email recibido (agente + autoFix del parser).

# Fallos conocidos

- El agente decide en un solo paso si el email es relevante y, si lo es, a
  que candidatura corresponde — no hay revision humana antes de escribir la
  propuesta en la hoja (aunque no toca `estado` directamente, ver Proposito).
- ~~Sin `retryOnFail` en el agente ni en los modelos de chat~~ **Corregido el
  16 ago 2026.** `Analizar respuesta empresa`, `Anthropic Chat Model` y
  `Anthropic Chat Model1` llevan ahora `retryOnFail: true, maxTries: 3,
  waitBetweenTries: 3000`, el mismo patrón que ya tenían `Consultar tabla
  ofertas` y `Guardar propuesta de la IA`. Antes, un 429 de Anthropic cortaba
  el análisis de ese email sin segunda oportunidad.

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — de donde se separo el 6 ago 2026
- [Jobs · generación CV](jobs-generacion-cv.md)
- [Revision y mejoras propuestas](jobs-revision.md)
- [index.md](../../docs/index.md)
