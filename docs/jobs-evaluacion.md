---
type: Review
title: Jobs — evaluación del sistema y viabilidad del envío autónomo
description: Auditoría del pipeline completo el 30 ago 2026 contra datos reales de la hoja, con las mejoras propuestas por valor/esfuerzo y el veredicto sobre automatizar el envío del CV y la carta al portal de empleo.
tags: [n8n, empleo, revision, automatizacion]
timestamp: 2026-08-30T20:00:00Z
---

# Qué es esto

Respuesta a dos preguntas de Mar sobre el pipeline de búsqueda de empleo
([ingesta](jobs-ingesta.md), [generación CV](jobs-generacion-cv.md),
[seguimiento](jobs-seguimiento.md), [archivado](jobs-archivado.md) + la hoja
`n8n_jobs` + el Apps Script de mantenimiento):

1. ¿Funciona el sistema? ¿Lo mejorarías/optimizarías?
2. ¿Hay alguna posibilidad de automatizar el envío autónomo del CV y la carta al
   portal de empleo correspondiente?

**Nada de lo que hay aquí está implementado.** Es un análisis: cada mejora dice
qué resuelve, dónde se tocaría y cómo se verificaría, para decidir después.

Se distingue de [jobs-revision.md](jobs-revision.md), que audita el **código** de
los workflows (los 7 puntos del 5 ago 2026, todos cerrados). Este documento
audita el **resultado**: qué entra en la hoja, qué sobrevive a los filtros y qué
trabajo manual queda. Los hallazgos salen de leer datos reales —289 filas de
`Archivo`, 23 de `Ofertas_activas`— y de seguir en vivo el embudo de aplicación
de una oferta, no de releer la documentación.

# Veredicto

**El sistema funciona, y está mejor construido de lo habitual en un proyecto
personal.** Lo que ya está resuelto y no hay que tocar:

- **Aislamiento**: 4 workflows independientes, tras dos splits sucesivos (6 y 16
  ago). Un error en la ingesta ya no tumba el archivado.
- **Vigilancia**: un check propio en Healthchecks.io por workflow, con periodos
  distintos según sean por cron o event-driven.
- **Resiliencia**: `retryOnFail` en las 13 fuentes, en Sheets, Gmail, Drive/Docs
  y en las llamadas a Claude; `onError: continueErrorOutput` en todas las fuentes
  con su rama de aviso por email.
- **Degradación elegante**: si la humanización con OpenAI falla, `Aplicar
  humanizacion` devuelve el texto original de Claude y marca `_humanizado: false`
  en vez de romper. Es el patrón correcto y conviene copiarlo en todo lo nuevo.
- **Seguridad**: el prompt de `Prompt para CV` envuelve el texto de la oferta en
  `<datos_oferta>`, lo limpia con `limpiarTextoExterno()` y sustituye `=` por `-`
  para que una oferta no pueda falsificar los marcadores `===CV===`.
- **El guardarraíl de huecos** cubre justo el fallo que el dead-man's switch no
  veía: «escribió, pero en el sitio equivocado».

**Lo que no está resuelto no es la fiabilidad, es la eficacia del embudo.** Entra
mucho ruido, hay duplicados reales en producción, dos fuentes de pago no aportan
nada y no se mide ninguna de las cosas que permitirían calibrarlo. El sistema
sabe responder «¿ha corrido?», pero no «¿está funcionando?».

# Hallazgos

Cada uno con la evidencia que lo sostiene. No hay ninguno inferido de la
documentación.

## H1 — El filtro de cualificación deja pasar ofertas fuera de perfil

En `Ofertas_activas` a 30 ago 2026 conviven, todas en estado `pendiente`:

- *Spanish-Speaking Virtual Medical Assistant* (consulta de traumatología)
- *Behavioral Health Integration Specialist* (documentación clínica, requiere
  Level 1 Arizona Fingerprint Clearance Card)
- *AI Data Annotator* (anotación de audio, «native-level English»)
- *Informatica Admin* (perfil técnico de datos, 22 $/h, LATAM)
- *Automation Engineer (UiPath)* (3+ años de RPA y **certificación UiPath
  activa** — es de nivel senior)
- *Graphic Design Assistant*, *Data Entry*

Ninguna encaja. Pasaron los cinco criterios porque, **salvo el de idioma, todos
miran solo el título** (decisión documentada en
[jobs-ingesta.md](jobs-ingesta.md): mirar también el resumen descartaba ofertas
buenas). Títulos como *Behavioral Health Integration **Specialist*** o
*Executive **Assistant*** entran por la familia objetivo de
coordinación/administración.

La calibración conocida es que de 248 ofertas reales pasan 15. El problema no es
el volumen: es que de esas 15, buena parte son ruido que Mar tiene que descartar a
mano una por una.

## H2 — Duplicado real en producción: la dedup falla si cambia `empresa`

**Confirmado en la hoja, no es hipotético.** *«Especialista en Operaciones de
HubSpot y CRM»* está **dos veces** en `Ofertas_activas`:

| `fecha_guardado` | `empresa` | `id_unico` | `enlace_o_email` |
|---|---|---|---|
| 2026-08-28 | `No especificado` | `48d6e5bf` | `remotojob.com/oferta/especialista-en-operaciones-de-hubspot-y-crm/` |
| 2026-08-27 | `Prismic` | `8179f924` | **la misma URL, idéntica** |

`id_unico` es un hash de `normalizar(empresa) + normalizar(titulo_puesto)`. Como
RemotoJob devolvió la empresa vacía en una pasada y rellena en otra, el hash
cambia y `Filtro duplicados` no ve la repetición.

El mismo patrón, peor, en `Archivo`: *«Especialista en Data Operations y
Resiliencia Operativa»* de Devoteam aparece **6 veces** — 4 desde Himalayas y 2
desde LinkedIn, misma oferta publicada en dos plataformas.

## H3 — Dos fuentes de Apify no han aportado ni una sola oferta

En las 289 filas de `Archivo` **no hay ninguna** con `plataforma` = `Wellfound`
ni `FlexJobs`. Son dos de los seis actores de Apify, es decir, dos de las fuentes
que cuestan dinero. FlexJobs además lleva bloqueado desde el 15 ago 2026 con
`403 full-permission-actor-not-approved` (requiere aprobar permisos a mano en el
panel de Apify).

## H4 — El grueso de lo útil viene de las fuentes gratuitas

Reparto por `plataforma` en `Archivo`, de mayor a menor: **We Work Remotely**
(con diferencia la primera) ≫ Himalayas ≈ Jobicy ≈ Get on Board ≈ Adzuna >
LinkedIn > Indeed > Glassdoor / Jooble / RemotoJob / InfoJobs.

Las cuatro primeras son gratis y sin credencial. Las de Apify quedan en una
minoría clara. Conviene matizar: las filas más antiguas concentran más Adzuna,
Indeed y LinkedIn, así que parte del desequilibrio puede venir de los periodos sin
saldo en Apify. Es exactamente la duda que resuelve **M3**.

## H5 — `salario` es «No especificado» en el 100 % de `Ofertas_activas`

En las 23 filas activas no hay **ni una** con salario. El `Filtro salario`
(umbral 33.000 €/año, con detección de divisa) deja pasar las ofertas sin salario
por diseño, así que hoy no descarta prácticamente nada. No es un fallo, pero
conviene saber que la barrera real del embudo es `Filtro cualificación`, no el
salario: subir o bajar ese umbral no cambiaría nada.

## H6 — Solo ~6 % de las ofertas son de aplicación por email

Recuento de `Archivo!J` (`tipo_aplicacion`) sobre 289 filas: unas **17 `email`**
frente a **~272 `enlace`**. Y las `email` se concentran en las filas más antiguas:
entre las recientes es prácticamente todo `enlace`.

Esto reencuadra la pregunta 2 por completo: **la rama que ya está automatizada de
punta a punta —generar los dos PDF y enviarlos por Gmail— cubre el 6 % de los
casos.** El trabajo manual de Mar está en el 94 % restante.

## H7 — Los `enlace` apuntan al agregador, no al formulario final

Los dominios de `enlace_o_email` son casi siempre `jobicy.com`,
`himalayas.app`, `weworkremotely.com`, `getonbrd.com` y `remotojob.com`: el
tablón donde se encontró la oferta, no el formulario de la empresa.

**Comprobado en vivo el 30 ago 2026** sobre *Operations & AI Manager* de
UpCounting (`d87f2c8c`, la misma oferta de la ejecución #711): el botón «Apply»
de Himalayas lleva a

```
https://himalayas.app/signup/talent?redirect=%2Fcompanies%2Fupcounting%2Fjobs%2F…
```

es decir, **obliga a crear cuenta en Himalayas**, y a partir de ahí el proceso de
la empresa continúa en un **Typeform con vídeo de presentación**.

O sea: para aplicar hay que dar dos o tres saltos más (agregador → login → ATS o
formulario propio → a veces vídeo), y cada oferta los da de forma distinta.

## H8 — El ciclo de vida no se cierra

`Decisión archivar` mueve a `Archivo` los estados `descartada` y `rechazada`
siempre, y `pendiente` con más de 7 días. Los demás estados del desplegable
—`crear_cv_ia`, `cv_ia_creado`, `cv_enviado`, `respuesta_recibida`,
`entrevista`, `oferta_recibida`— **no se archivan nunca**.

Para los tres últimos tiene sentido: son candidaturas vivas. Pero una
`cv_enviado` de hace dos meses sin respuesta se queda en `Ofertas_activas` para
siempre. Y, más importante: **no hay ningún seguimiento**. Una candidatura enviada
hace diez días sin contestar no genera ninguna acción, cuando el follow-up es de
lo que más sube la tasa de respuesta real.

## H9 — `resumen` sin truncar llega a ~10 KB por celda

La fila de *AI Transformation Owner* de GitLab guarda la oferta entera —incluida
la política de igualdad de oportunidades— en una sola celda. Es lo que dispara el
alto de fila que el Apps Script tiene que forzar a 21 px cada hora, y lo que hace
la hoja pesada de leer y de mover.

# Mejoras propuestas

Por valor/esfuerzo. Ninguna implementada.

## M1 — Puntuación de encaje con un LLM barato

**Resuelve H1. Es la que más tiempo ahorra a Mar.**

Tres nodos entre `Filtro cualificación` y `Filtro duplicados` en
[Jobs · ingesta](jobs-ingesta.md) (`CXCD8BZUQEQKex2a`), copiando el patrón de
`Preparar humanizacion` / `Humanizar (OpenAI)` / `Aplicar humanizacion`:

- **`Preparar scoring`** (Code) — arma la llamada con `titulo_puesto` + `resumen`
  recortado a ~1.500 caracteres + el perfil de Mar resumido (de
  `CVs json/perfil_estructurado_mar_cv_n8n_JSON.json`). Mismo blindaje
  anti-injection que `Prompt para CV`: el texto de la oferta va delimitado y
  limpiado.
- **`Scoring encaje`** (HTTP Request) — salida JSON forzada, `timeout 60000`,
  `retryOnFail` 3×3 s, `onError: continueRegularOutput`.
- **`Aplicar scoring`** (Code) — añade `encaje_ia` (0-100) y `motivo_ia` (una
  frase). **Ante cualquier fallo deja `encaje_ia: null` y la oferta pasa igual**,
  igual que `Aplicar humanizacion` cae al texto de Claude.

Dos columnas nuevas al final de la fila 1 de `Ofertas_activas` y de `Archivo`.
Como los dos nodos de escritura usan `mappingMode: autoMapInputData` (mapeo **por
nombre de cabecera**, no por posición), añadirlas no descoloca nada — ver
[jobs-hoja-formato.md](jobs-hoja-formato.md).

**Al principio solo puntúa; no descarta nada.** Tras dos semanas de datos se
decide si cortar por debajo de un umbral. La ordenación por `encaje_ia` dentro de
cada `fecha_guardado` iría en el Apps Script (`apps-script/Código.js`), no en n8n.

> ⚠️ **Esto NO toca la generación de CV y carta.** `Jobs · generación CV` se
> queda exactamente como está: **Claude escribe** el CV y la carta, y **OpenAI
> (`gpt-4.1-mini`) los retoca lo mínimo** para quitar la marca de agua de texto
> que Claude incrusta en lo que genera. Esa cadena está verificada end-to-end
> (tarea 7) y no se discute aquí. M1 es un nodo **nuevo** en la **ingesta**, que
> solo puntúa ofertas del 0 al 100 — no escribe ni edita ningún documento.

**Proveedor del scoring — decisión final de Mar (30 ago 2026): `claude-haiku-4-5`.**
Reusa `ANTHROPIC_API_KEY`, ya presente en el contenedor — un proveedor menos que
mantener en este pipeline. Cloudflare Workers AI (barajado antes como opción a
coste 0) queda descartado para este nodo; OpenAI sigue descartado igual que antes.

**Qué decisión toma el nodo — ninguna, al principio.** `Aplicar scoring` solo
escribe `encaje_ia` y `motivo_ia` en la fila; no cambia `estado`, no descarta
nada. Es una pista para que Mar revise antes las ofertas mejor puntuadas, no un
filtro automático. Un corte automático por umbral (p. ej. descartar por debajo de
30) es una decisión posterior, a tomar con los datos de **M3** en la mano — no
antes.

## M2 — Deduplicar también por URL

**Resuelve H2, que es un bug confirmado.**

Cambio **aditivo** en el Code `Filtro duplicados`, que no toca el hash `id_unico`
existente — que es justo lo que bloqueaba este arreglo en
[jobs-revision.md](jobs-revision.md) punto 7 (cambiar el algoritmo invalidaría
todos los ids ya escritos y rompería el cruce con
[Jobs · seguimiento](jobs-seguimiento.md)):

1. Calcular `id_url` con el **mismo** hash de 32 bits, pero sobre la URL
   normalizada: minúsculas, sin `?query`, sin `#fragment`, sin `/` final, sin
   `www.`.
2. Descartar la oferta si **`id_unico` o `id_url`** ya está en `Ofertas_activas`,
   en `Archivo`, o repetido dentro de la propia tanda.
3. Columna nueva `id_url` en las dos pestañas. Las filas antiguas la tendrán
   vacía; la comparación las ignora sin romper nada y se va rellenando sola.

Ojo con un caso: las URLs de Jooble llevan un identificador en la query
(`jooble.org/away/407458…?p=1&pos=1&…`). Al quitar la query quedaría solo
`jooble.org/away/407458…`, que sigue siendo único. Correcto, pero conviene
verificarlo con datos reales antes de publicar.

## M3 — Métricas del embudo

**Sin esto, M1 y M4 se deciden a ojo.**

Hoy `Filtro cualificación` deja el recuento de descartes por criterio y la lista
de títulos descartados **solo en el log de la ejecución**, que se pierde. Es como
se calibra ahora, y no permite comparar dos semanas entre sí.

Pestaña nueva `Metricas` en `n8n_jobs`, una fila por pasada y fuente:

```
fecha_hora | fuente | crudas | tras_teletrabajo | tras_salario |
tras_cualificacion | nuevas | descartes_idioma | descartes_contrato |
descartes_nivel | descartes_perfil | descartes_encaje
```

Nodo `Registrar métricas` (Code + `Append row in sheet`) colgando de
`Filtro duplicados` en **rama aislada** — mismo patrón que
`Guardarraíl huecos` → `Aviso huecos` de la sección D de
[jobs-ingesta.md](jobs-ingesta.md): no toca el `append` principal, ni el email de
nuevas ofertas, ni la rama de error compartida.

Responde a: qué fuente aporta ofertas que **sobreviven** a los filtros, qué
criterio descarta más, y si M1 y M4 mejoran algo.

**Estado (31 ago 2026): IMPLEMENTADO y publicado.** Pestaña `Metricas`
(`gid=1516813991`, 12 columnas) + rama aislada `Registrar métricas` →
`Append métricas` en [Jobs · ingesta](jobs-ingesta.md), sección E. Se separó el
criterio 5 de `Filtro cualificación` (`perfil:` → `encaje:`) y ese nodo publica
el desglose de descartes por fuente en `workflowStaticData`. `Registrar métricas`
verificado end-to-end (#720); pendiente confirmar la escritura de
`Append métricas` en una pasada con ofertas nuevas. Tarea 10 de
[tareas-pendientes.md](tareas-pendientes.md). Limitación asumida: una pasada 100 %
duplicados no deja fila (la rama cuelga de `Filtro duplicados`, que no emite).

## M4 — Podar Wellfound y FlexJobs

**Resuelve H3 y H4.** Desconectarlos del `Merge` **sin borrar los nodos**, igual
que se hizo con `All Jobs Scraper` entre el 6 y el 15 ago 2026 (desconectado a
propósito por falta de fondos, reconectado después).

**Aviso, porque esto ya rompió una vez:** obliga a recontar `numberInputs` de
`Merge` (hoy 13) y de `Unir aviso error` (hoy 13) y a remapear las entradas. El
13 ago 2026 la entrada 5 de `Unir aviso error` se quedó huérfana exactamente por
esto. Releer `connections` después de publicar.

El resto de fuentes de Apify se decide con los datos de M3 en dos semanas, no
ahora.

## M5 — Publicar la app OAuth de Google

**El arreglo operativo de más impacto, y no es código.**

Las credenciales de Google caducan cada ~7 días porque la app OAuth está en modo
**Testing** en Google Cloud Console: en ese modo Google caduca el refresh token a
los 7 días. Ya tumbó el pipeline el 16 ago 2026 (`Google Sheets account`, bloqueó
toda la ingesta) y el 29 ago 2026 (`Google Drive account`, mató la ejecución #674
en `Download file`).

Pasar la app a **In production** en la consola quita esa caducidad. Sigue sin
verificar —pantalla de «app no verificada» y límite de usuarios—, lo cual es
irrelevante para uso personal.

**Lo tiene que hacer Mar en la consola de Google**; no hay nada que programar. El
primer paso es mirar en qué estado (*Testing* / *In production*) está hoy la app.

**Estado (31 ago 2026):** la app ya está **«En producción»** (Mar la publicó días
antes; el fallo de `Google Drive account` en #709 el 30 ago fue un token residual
de *Testing*). El 31 ago Mar reconectó las 5 credenciales de Google como línea
base. Convertido en la tarea 13 de [tareas-pendientes.md](tareas-pendientes.md),
en vigilancia hasta el 7 sep 2026 sin «needs to be reconnected» para darlo por
cerrado.

## M6 — Sacar n8n del portátil

n8n **no recupera disparos perdidos**: si el equipo está apagado o suspendido a
las 09:00 o las 17:00, esa pasada no ocurre nunca. Pasó el 14 ago (apagado) y el
15 ago (suspensión). Como efecto secundario, Healthchecks avisa cada vez.

Un VPS pequeño lo resuelve, y existe la skill `n8n-mcp-skills:n8n-self-hosting`
para desplegarlo end-to-end (Docker Compose + Caddy + HTTPS automático).

**Cuesta dinero (~5 €/mes).** Se anota como opción, no como recomendación.

## M7 — Cerrar el ciclo de vida: seguimiento de candidaturas

**Resuelve H8.** Workflow nuevo o rama en [Jobs · archivado](jobs-archivado.md)
(`t4jxqH2wJyDF3EYt`), con Schedule diario:

- `cv_enviado` sin `estado_propuesto` y con **≥ 7 días** → email a Mar con un
  borrador de mensaje de seguimiento (mismo patrón Gmail que
  `Notificación nuevas ofertas`).
- `cv_enviado` con **≥ 30 días** y sin respuesta → `estado: sin_respuesta` → lo
  recoge el archivado. **Implementado y publicado el 31 ago 2026** (tarea 12 /
  [tareas-pendientes.md](tareas-pendientes.md)). Decisión de implementación: la
  transición la hace `Decisión archivar` de
  [Jobs · archivado](jobs-archivado.md) **en una sola pasada** (Regla 3 aditiva:
  `cv_enviado` + `estado_propuesto` vacío + `fecha_envio` ≥ 30 días → copia con
  `estado: sin_respuesta` directa a `Archivo`). `sin_respuesta` **no pasa por
  `Ofertas_activas`**, así que no hubo que tocar la validación del desplegable ni
  colorear el chip (lo que este doc daba por necesario). En vigilancia hasta ver
  los dos pasos en pasadas reales.

Requiere una columna **`fecha_envio`** (añadida el 31 ago 2026 a
`Ofertas_activas` y `Archivo`): la escribe
[Jobs · generación CV](jobs-generacion-cv.md) en el mismo nodo que marca
`estado: cv_enviado`.

## M8 — Menores

- **Truncar `resumen`** a ~800 caracteres (resuelve H9). Menos peso en la hoja y
  menos trabajo para el Apps Script. El prompt del CV lo recorta igualmente a
  6.000 caracteres. **Implementado y publicado el 31 ago 2026** (tarea 11 /
  [tareas-pendientes.md](tareas-pendientes.md)) — `versionId
  f8ac4e6b-…`. Se hace **dentro de `Filtro duplicados`**, al construir la oferta
  de salida, **no en los normalizadores como decía este doc**: truncar antes del
  `Merge` cambiaría decisiones de `Filtro teletrabajo` y del criterio de idioma
  de `Filtro cualificación` cuando la palabra clave cae más allá del carácter
  800. Un solo nodo tocado y filtrado intacto. En vigilancia hasta ver el
  recorte en una pasada real con ofertas largas.
- **No tocar el umbral del `Filtro salario`**: con H5 hoy es inocuo. Solo dejar
  constancia de que no está filtrando, para no perder tiempo ajustándolo.

# Lo que no cambiaría

**Google Sheets como base de datos.** Es tentador migrar a Postgres o a n8n Data
Tables —la mitad de los incidentes de este proyecto vienen de la hoja: huecos de
filas, formato que se pierde, concurrencia entre triggers sin bloqueo, borrado por
índice de fila—, pero:

1. La hoja **también es la interfaz de Mar**: ahí marca `generar_cv_ia` y revisa
   `estado_propuesto`. Migrar la base de datos significa construir una interfaz.
2. Ya está estabilizada: `useAppend: true`, el Apps Script horario y el
   guardarraíl de huecos cubren los tres modos de fallo conocidos.
3. **El producto con frontend ya existe aparte**: `C:\AI Engineering\n8n\Jobs App`
   (Next.js + Supabase + Cloudflare Workers AI), con su propio workflow
   `Jobs App · ingesta` copiado de este, ya en marcha.

Este pipeline es la herramienta personal de Mar y debe seguir siendo simple.

**Y nada de tocar `Jobs App` desde aquí.** Su CLAUDE.md prohíbe explícitamente
modificar estos cuatro workflows, y la separación conviene en ambos sentidos: son
proyectos con restricciones distintas (allí, presupuesto 0 € duro y OpenAI vetado
por decisión ética).

# Envío autónomo al portal

**Veredicto: hoy no es fiable — y los datos cambian la pregunta.**

## Las tres barreras

1. **No existe API de candidato.** Greenhouse, Lever, Ashby, Workable y
   SmartRecruiters exponen API **para el empleador** (publicar ofertas, leer
   candidaturas). Ninguna permite que un candidato postule programáticamente.
   LinkedIn no expone Easy Apply en su API. No hay vía limpia, ni de pago.
2. **Términos de servicio.** LinkedIn e Indeed prohíben explícitamente automatizar
   su interfaz. El riesgo no es teórico: perder la cuenta de LinkedIn en plena
   búsqueda de empleo cuesta mucho más que cualquier ahorro de tiempo.
3. **Los embudos no son homogéneos (H7).** Cuenta obligatoria en el agregador,
   CAPTCHAs, preguntas abiertas específicas de cada empresa, autorización de
   trabajo, salario esperado, preaviso, y —comprobado— un Typeform con vídeo. Un
   agente acierta a veces; y **un envío mal rellenado es irreversible**: no se
   puede retirar una candidatura y volver a mandarla bien. Esa asimetría es la que
   obliga a dejar a la persona en el bucle.

## Y el dato que reencuadra la pregunta

Por H6: **la rama automatizable ya está automatizada.** Cuando
`tipo_aplicacion == "email"`, n8n genera los dos PDF, los une y los envía por
Gmail sin intervención. Eso cubre el 6 % de las ofertas. El otro 94 % son enlaces
donde la barrera no es técnica sino de **acceso**: hay que crear cuentas y
responder preguntas específicas.

## Ruta escalonada

### Paso 1 — Medir a dónde llevan los «Apply» (decisión tomada: esto primero)

Antes de construir nada, saber si merece la pena. Nodo `Resolver destino apply` en
[Jobs · ingesta](jobs-ingesta.md), después de `Filtro duplicados` para que solo
corra sobre las ofertas **nuevas** (3-10 al día): sigue los redirects de
`enlace_o_email` y guarda el dominio final en una columna nueva `dominio_apply`.

Patrón de `HTTP Request Detalle RemotoJob`, que ya hace una petición por oferta:
`retryOnFail` 2×2 s (no 3×3 s, porque se multiplica por el número de ofertas) y
`onError: continueRegularOutput`.

A las dos semanas, mirar el reparto:

- Si **~50 % cae en 3-4 ATS estandarizados** (`greenhouse.io`, `lever.co`,
  `ashbyhq.com`, `workable.com`) → el copiloto del paso 2 merece la pena.
- Si son **40 dominios distintos con login** → **no se construye**, y el dato se
  usa solo para priorizar (paso 3).

### Paso 2 — Copiloto semi-autónomo, solo si el paso 1 lo justifica

**No** un bot que envía solo. Uno que deja el formulario relleno y **para antes de
pulsar «Enviar»**:

1. Casilla nueva `aplicar` en la hoja, igual que `generar_cv_ia` → Google Sheets
   Trigger, mismo patrón que `Cambio en generar_cv_ia`.
2. Servicio Playwright en un contenedor junto al n8n que ya corre en Docker
   (`C:\AI Engineering\n8n\Docker n8n\docker-compose.yml`), llamado por HTTP desde
   n8n.
3. Un **adaptador por ATS** (greenhouse / lever / ashby / workable) más uno
   genérico por heurística de etiquetas. Rellena desde un **perfil canónico de
   respuestas**, extendiendo `CVs json/perfil_estructurado_mar_cv_n8n_JSON.json`:
   datos de contacto, LinkedIn, autorización de trabajo, salario esperado,
   disponibilidad. Los campos de diversidad/EEO, en blanco.
4. Adjunta CV y carta **en PDF**.
5. Captura de pantalla del formulario relleno → Drive → email a Mar con el enlace
   y una URL de confirmación (webhook de n8n). **Un clic de Mar = envío real.**
6. Al confirmar: `estado: cv_enviado` + `fecha_envio` (la columna que necesita M7).

**Prerrequisito con valor propio:** hoy el PDF **solo se genera en la rama
`email`** de [Jobs · generación CV](jobs-generacion-cv.md) (`Descargar CV PDF` /
`Descargar carta PDF`). Extender esa conversión a la rama `enlace` y dejar los
PDF en Drive **merece la pena aunque el copiloto no se construya nunca**: Mar
tendría el CV y la carta listos para arrastrar al formulario, en vez de tener que
exportarlos a mano desde Docs.

Realismo: cubriría bien los ATS estandarizados y fallaría en los agregadores con
login y en los Typeform. Eso está bien — lo que no cubra lo sigue haciendo Mar.

### Paso 3 — La alternativa que suele ganar

Con `dominio_apply` ya medido, **priorizar por facilidad de aplicación**: marcar
las ofertas cuyo destino es un ATS conocido o un email y aplicar primero a esas.
No automatiza nada, no tiene ningún riesgo, y sube las aplicaciones por hora tanto
como el copiloto.

### Lo que no recomiendo

Automatizar **LinkedIn Easy Apply**. El riesgo de perder la cuenta es
desproporcionado respecto al ahorro, y es justo la cuenta que más importa durante
una búsqueda de empleo.

# Orden sugerido

1. **M5** — publicar la app OAuth. Quita la avería recurrente; es acción de Mar
   en la consola de Google, sin código.
2. **M2** — dedup por URL. Bug confirmado, cambio pequeño y aditivo.
3. **M3** — métricas. Habilita decidir M4 y calibrar M1 con datos.
4. **M1** — scoring de encaje. El que más tiempo ahorra.
5. **Paso 1 del envío autónomo** — `dominio_apply`. Medir antes de construir.
6. **M4** — podar Apify, con los datos de M3 en la mano.
7. **M7**, **M8**, **M6** — cuando lo anterior esté asentado.

# Al ejecutar cualquiera de estas mejoras

Las tres reglas del proyecto que ya han costado tiempo más de una vez (ver
[jobs-revision.md](jobs-revision.md)):

- **Publicar no es guardar.** Tras cada `update_workflow`, llamar a
  `publish_workflow` y comprobar que `versionId == activeVersionId`.
- **No usar `setNodeParameter` con strings multilínea** en el MCP de n8n: corrompe
  el `jsCode` (el 29 ago 2026 guardó `const UMBRAL = 1;` en vez del valor
  enviado). Usar `updateNodeParameters` y **releer** el nodo publicado byte a
  byte.
- **Validar no es verificar.** La referencia rota `$('Filtro cualificacion')` sin
  tilde pasó la validación sin una queja y tuvo la ingesta caída ocho días.
  Releer las `connections` y mirar una ejecución real.

Y la norma de documentación: al cerrar cada cambio, actualizar el doc del
workflow correspondiente y abrir/cerrar su tarea en
[tareas-pendientes.md](tareas-pendientes.md) con criterio de cierre comprobable.

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — M1, M2, M3, M4, M8 y el paso 1 del envío
  autónomo se tocarían aquí
- [Jobs · generación CV](jobs-generacion-cv.md) — PDF en la rama `enlace`,
  `fecha_envio`
- [Jobs · archivado](jobs-archivado.md) — M7
- [Jobs · seguimiento](jobs-seguimiento.md)
- [Revisión y mejoras propuestas](jobs-revision.md) — la auditoría de código del
  5 ago 2026, complementaria a esta
- [Formato y mantenimiento de la hoja n8n_jobs](jobs-hoja-formato.md) — columnas
  y validaciones nuevas
- [Tareas pendientes](tareas-pendientes.md)
