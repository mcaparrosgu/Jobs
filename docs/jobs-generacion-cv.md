---
type: n8n Workflow
title: Jobs · generación CV
description: Genera CV y carta de presentacion a medida con Claude para las ofertas que Mar marca, y los envia por email cuando la aplicacion es por correo.
resource: https://<N8N_HOST>/workflow/morsS0M2folmXWhS
tags: [n8n, empleo, anthropic, google-docs, google-sheets]
timestamp: 2026-08-06T00:00:00Z
---

# Proposito

Segunda pieza del pipeline de busqueda de empleo de Mar: genera CV y carta de
presentacion a medida con Claude para las ofertas que ella marca a mano en la
hoja `n8n_jobs`, y si la aplicacion es por email, envia ambos documentos como
PDF adjunto.

Separado del workflow original **Jobs** el 6 ago 2026 (ver
[jobs-revision.md](jobs-revision.md), punto 6) para poder activarlo y depurarlo
sin afectar a la ingesta ni al seguimiento.

- **ID:** `morsS0M2folmXWhS`
- **Estado:** activo desde el 6 ago 2026
- **Nodos:** 21
- **Hoja de calculo:** `n8n_jobs`, id `1JUM8rF4UmfeUI8gQFZ4jKVxjwKWltmVwAicpwG2xm-U`,
  pestana `Ofertas_activas` (`gid=0`)

# Disparador

**Google Sheets Trigger** (`Cambio en generar_cv_ia`) — desde el 16 ago 2026.
Sondea `Ofertas_activas` cada 5 minutos (`pollTimes: everyX 5 minutes`) y solo
dispara una ejecución cuando cambia la columna `generar_cv_ia`
(`event: rowUpdate`, `columnsToWatch: ['generar_cv_ia']`). Antes era un
**Schedule Trigger** fijo a las 09:00/17:00: con Mar marcando la casilla a
mano en cualquier momento del día, el CV podía tardar hasta 8 h en generarse.
Ahora la latencia máxima es de ~5 min.

Usa una credencial OAuth2 propia, **`Google Sheets Trigger account`**
(`googleSheetsTriggerOAuth2Api`), distinta de la `Google Sheets account`
normal que usa el resto del pipeline — Google exige un tipo de credencial
específico para este nodo. Creada a mano por Mar el 16 ago 2026 (el Client
Secret no se puede leer ni reutilizar desde el editor de n8n una vez
guardado, así que no se pudo automatizar del todo).

El antiguo **Schedule Trigger** (09:00/17:00) se dejó **deshabilitado, no
borrado**, como red de seguridad manual: si el Google Sheets Trigger fallara
o se desconectara la credencial, Mar puede reactivarlo desde el editor sin
tener que reconstruirlo.

**Vigilante propio desde el 16 ago 2026** — check dedicado en Healthchecks.io
(`Jobs n8n · generación CV`, ping a
`$env.HEALTHCHECKS_PING_URL_GENERACION_CV`). Al ser event-driven (solo corre
cuando Mar marca una oferta), el periodo es muy laxo: **7 días**, gracia
**1 día** — semanas sin generar ningún CV son normales si Mar no está
aplicando activamente, así que un periodo corto habría dado falsas alarmas
constantes.

# Flujo

Se dispara sobre las filas que Mar marca a mano con `generar_cv_ia = true`.

1. **`Get row(s) in sheet1`** → **`Filtro generar CV`** (compara con
   `String(generar_cv_ia).toLowerCase() === 'true'`, tolerante a que Sheets
   devuelva el valor como texto).
2. **`Download file`** (Drive, id `1UqVvPbJfAU59FTt1FOfPydkbrPkVyHmo`) +
   **`Extract from File`** — el CV base en JSON.
3. **`Prompt para CV`** — construye el prompt (8 KB) con el CV base y la oferta.
4. **`HTTP Request Claude`** — `POST api.anthropic.com/v1/messages`,
   `claude-sonnet-5`, `max_tokens: 8000`, clave por `$env.ANTHROPIC_API_KEY`,
   `timeout: 120000` ms y `retryOnFail` (3 intentos, 3 s de espera).
5. **`Separar CV y carta`** — parte la respuesta por los marcadores
   `===IDIOMA===` / `===CV===` / `===CARTA===`, valida longitudes minimas y
   compone los nombres de fichero `CV - AA-MM-DD - <id> - <puesto> - <empresa>`.
6. **`Crear doc cv`** / **`Crear doc carta`** — copian plantillas de Docs
   (`11IUpAhDJHIP…` y `1GvPkVpd-eK4…`), **`Adaptar * plantilla`** monta las
   peticiones y **`Escribir * en docs`** las aplica via
   `docs.googleapis.com/v1/documents/{id}:batchUpdate`.
7. **`Actualizar estado generar_cv_ia`** → `estado: cv_ia_creado`.
8. **`email o enlace`** — si `tipo_aplicacion == "email"`, descarga ambos docs
   como PDF, los une (`Juntar PDFs`), los envia con **`Enviar cv y carta por
   email`** (asunto y cuerpo en ES o EN segun el idioma detectado) y marca
   `estado: cv_enviado`. Si es "enlace", la rama va directa al ping (Mar
   aplica a mano). Ambas ramas convergen en **`Ping Healthchecks`** (desde el
   16 ago 2026, mismo patron que [Jobs · ingesta](jobs-ingesta.md):
   `retryOnFail` 3 intentos/3s, `onError: continueRegularOutput`).

Los 7 nodos de Google Drive/Docs (`Download file`, `Crear doc cv`,
`Escribir CV en docs`, `Crear doc carta`, `Escribir carta`, `Descargar CV
PDF`, `Descargar carta PDF`) llevan `retryOnFail` desde el 16 ago 2026 (3
intentos, 3 s de espera) — mismo patron que ya tenian Sheets, Gmail y la
llamada a Claude. Antes, un fallo transitorio de la API de Google en
cualquiera de estos pasos cortaba la generacion del CV sin segunda
oportunidad.

# Dependencias

- **Credenciales n8n:** Google Sheets OAuth2, Google Sheets Trigger OAuth2
  (propia, solo para el disparador), Google Drive OAuth2, Google Docs OAuth2,
  Gmail OAuth2.
- **Variables de entorno** (via `$env`, requieren passthrough en
  `docker-compose.yml`): `ANTHROPIC_API_KEY`, `HEALTHCHECKS_PING_URL_GENERACION_CV`.
- **Servicios externos de pago:** API de Anthropic (hasta 8.000 tokens de
  salida por CV, dos ejecuciones diarias).

# Fallos conocidos

- `Enviar cv y carta por email` no expone `parameters.operation` de forma
  explicita (usa el valor por defecto del nodo Gmail); el validador de n8n lo
  marca como advertencia pero no impide que envie. Preexistente al split, sin
  impacto conocido en produccion.
- Si Claude no respeta el formato `===IDIOMA===`/`===CV===`/`===CARTA===`,
  `Separar CV y carta` lanza un error explicito en vez de generar documentos a
  medias — no hay reintento automatico para ese caso (es un fallo de
  contenido, no de red).

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — de donde se separo el 6 ago 2026
- [Jobs · seguimiento](jobs-seguimiento.md)
- [Revision y mejoras propuestas](jobs-revision.md)
- [index.md](../../docs/index.md)
