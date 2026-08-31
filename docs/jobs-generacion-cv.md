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
- **Estado:** activo desde el 6 ago 2026. **Paso de humanización con OpenAI
  publicado el 29 ago 2026**; ver [Flujo](#flujo) punto 5.bis. **Verificado
  end-to-end el 30 ago 2026** con las ejecuciones `trigger` #710 (Echodyne) y
  #711 (UpCounting): `Humanizar (OpenAI)` `success` en una llamada, `Aplicar
  humanizacion` con `_humanizado: true`, datos/empresas/fechas conservados, HTML
  intacto y flujo completo hasta `Ping Healthchecks`. Ver
  [tareas-pendientes.md](tareas-pendientes.md) tarea 7 (cerrada).
  **Ajuste del prompt de la carta el 30 ago 2026** (`activeVersionId =
  5b8618f5-4893-44d6-8e11-4b6fd0731b92`): el system prompt de `Preparar
  humanizacion` pasa a «retoque ligero, no reescritura», con regla anti-errata
  (conservar la grafía exacta) y bloque específico para la carta que protege el
  enfoque de la primera frase; `temperature` 0.7 → 0.4. **Verificado end-to-end
  el 31 ago 2026** con la ejecución `trigger` #715 (AI Data Annotator / Argos
  Multilingual): `_humanizado: true`, la primera frase conserva el enfoque (recorte
  del cliché «I am writing to», no una apertura genérica), sin erratas nuevas y
  con el Doc de la carta sin regresiones de formato. Único resto: OpenAI puede
  introducir algún guion largo sin espacios (tic de IA, no errata). Ver
  [tareas-pendientes.md](tareas-pendientes.md) tarea 8 (cerrada).
- **Nodos:** 26 (la cifra de 21 estaba desactualizada; +3 del paso de humanización del 29 ago 2026)
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
5.bis **Paso de humanización con OpenAI** (publicado el 29 ago 2026, verificado
   end-to-end el 30 ago 2026 — ejecuciones #710/#711, ver
   [tareas-pendientes.md](tareas-pendientes.md) tarea 7). Reescribe la prosa para
   quitarle el estilo genérico de IA y, al no pasarla
   por Claude, sacarla de la marca de agua de texto que Claude incrusta en todo
   lo que genera (ver
   [support.claude.com](https://support.claude.com/es/articles/16266773-como-claude-marca-el-contenido-generado-por-ia)).
   Tres nodos entre `Separar CV y carta` y `Crear doc cv`:
   - **`Preparar humanizacion`** (Code) — extrae del HTML del CV el `resumen` y
     las 3 primeras `p.descripcion` (la 4.ª, la lista de habilidades, NO se
     toca) más el cuerpo de la carta, y arma el cuerpo de la llamada
     (`gpt-4.1-mini`, `temperature 0.4`, `response_format: json_object`). El
     system prompt (ajustado el 30 ago 2026, ver tarea 8) exige un **retoque
     ligero, no una reescritura** — si una frase ya suena natural, se deja tal
     cual; prohíbe inventar datos, obliga a conservar idioma, cifras, empresas y
     fechas y a mantener la longitud (85–115 %); veta arranques manidos, tríos
     rítmicos, superlativos vacíos y conectores pomposos; tiene una regla
     anti-errata (conservar la grafía exacta de cada palabra, «Adept», no
     «Adapt») y un bloque específico para la carta que protege el enfoque de la
     primera frase (nunca sustituirla por una apertura genérica).
   - **`Humanizar (OpenAI)`** (HTTP Request) — `POST
     api.openai.com/v1/chat/completions`, `Authorization: Bearer
     {{ $env.OPENAI_API_KEY }}`, `timeout 60000` ms, `retryOnFail` (3×3 s),
     `onError: continueRegularOutput`.
   - **`Aplicar humanizacion`** (Code) — valida campo a campo (no vacío, longitud
     entre 0,5× y 2× del original, y que el texto original aparezca en el HTML) y
     hace `String.replace` puntual dentro del HTML del CV, sin tocar etiquetas ni
     clases; sustituye el cuerpo de la carta. Ante **cualquier** fallo (sin
     respuesta, JSON inválido, longitud disparatada, `OPENAI_API_KEY` ausente)
     devuelve el texto original de Claude y marca `_humanizado: false` +
     `_humanizar_nota`. Su salida tiene la misma forma que `Separar CV y carta`.
   `Adaptar cv plantilla` y `Adaptar carta plantilla` leen de
   `Aplicar humanizacion` (antes, de `Separar CV y carta`); `nombre_carta` e
   `idioma` se siguen leyendo de `Separar CV y carta` (campos passthrough
   idénticos).
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
  `docker-compose.yml`): `ANTHROPIC_API_KEY`, `HEALTHCHECKS_PING_URL_GENERACION_CV`
  y **`OPENAI_API_KEY`** (paso de humanización). `OPENAI_API_KEY` **añadida el 29
  ago 2026** a `C:\AI Engineering\n8n\Docker n8n\docker-compose.yml` (línea 52,
  bloque `environment` del servicio n8n) y al `.env` de esa carpeta; contenedor
  `dockern8n-n8n-1` recreado con `docker compose up -d` y variable verificada
  dentro del contenedor.
- **Servicios externos de pago:** API de Anthropic (hasta 8.000 tokens de
  salida por CV, dos ejecuciones diarias) y **API de OpenAI** (`gpt-4.1-mini`,
  una llamada corta por CV en el paso de humanización).

# Fallos conocidos

- `Enviar cv y carta por email` no expone `parameters.operation` de forma
  explicita (usa el valor por defecto del nodo Gmail); el validador de n8n lo
  marca como advertencia pero no impide que envie. Preexistente al split, sin
  impacto conocido en produccion.
- Si Claude no respeta el formato `===IDIOMA===`/`===CV===`/`===CARTA===`,
  `Separar CV y carta` lanza un error explicito en vez de generar documentos a
  medias — no hay reintento automatico para ese caso (es un fallo de
  contenido, no de red).
- **Paso de humanización:** si `OPENAI_API_KEY` faltara o la llamada fallara,
  `Humanizar (OpenAI)` agota los 3 reintentos (~9 s de latencia extra por CV) y
  `Aplicar humanizacion` cae al texto original de Claude — el CV se genera igual,
  pero SÍ lleva la marca de agua de Claude y el estilo sin pulir. El campo
  `_humanizar_nota` de esa ejecución dice qué pasó. (Desde el 29 ago 2026 la
  clave está en el entorno; ver Dependencias.)
- **Credencial `Google Drive account` caducada (29 ago 2026):** la ejecución de
  prueba #674 falló en `Download file` con *«The credential "Google Drive
  account" needs to be reconnected»* (`googleDriveOAuth2Api`, id
  `ed8cmyLm1oZVZKB9`). El refresh token de Google expiró/se revocó (patrón
  habitual en apps OAuth de Google en modo *Testing*: ~7 días). Bloquea TODO el
  workflow en el paso 2. Se arregla reconectando la credencial en la UI de n8n
  (Settings → Credentials → *Google Drive account* → Reconnect); requiere login
  de Google, no se puede automatizar. Conviene revisar de paso `Google Docs` y
  `Gmail`. Última generación correcta antes del fallo: ejecución #661, 27 ago.
  **Reconectada el 30 ago 2026** (Mar, junto con `Google Docs` y `Gmail`);
  ejecuciones #710/#711 correctas después. Volvió a caducar en #709 (30 ago) por
  un token residual de la época *Testing*.
  **Arreglo de fondo (31 ago 2026):** la app OAuth de Google ya está «En
  producción» en Google Cloud Console (quita la caducidad de 7 días); Mar
  reconectó las 5 credenciales de Google como línea base limpia. En vigilancia
  hasta el 7 sep 2026 — ver tarea 13 de
  [tareas-pendientes.md](tareas-pendientes.md).

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — de donde se separo el 6 ago 2026
- [Jobs · seguimiento](jobs-seguimiento.md)
- [Revision y mejoras propuestas](jobs-revision.md)
- [index.md](../../docs/index.md)
