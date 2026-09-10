---
type: Nota
title: Mejora iterativa de `Filtro cualificación` (tarea 17)
description: Brief permanente para el agente. Mar irá enlazando ofertas mal filtradas a lo largo del tiempo; el agente las registra aquí y, cuando haya patrón, endurece el filtro sin descartar roles legítimos.
tags: [n8n, empleo, tarea-17, filtro-cualificacion]
timestamp: 2026-09-04T13:00:00Z
---

# ⏭️ Punto de retomada (actualizado 10 sep 2026)

**Iteración 1 IMPLEMENTADA, PUBLICADA y VERIFICADA. Tarea 17 CERRADA el 10 sep
2026.** Mar revisó los 6 motivos y fijó la regla en la sesión; el criterio 4c
nuevo está publicado en `Filtro cualificación` de `Jobs · ingesta`
(`activeVersionId de9ae329-52d4-4925-b5f8-39149c4d2db6`) y **verificado en la
pasada real #777**: `success`, `Filtro salario` 60 → `Filtro cualificación` 21;
Mar revisó las 21 («no perfectas pero pasables», ninguna claramente fuera de
perfil); el autochequeo del embudo cuadra fuente a fuente en `Metricas`
(Σ `descartes_perfil` = 83, el 4c cuenta ahí sin clave nueva). Detalle en
[Iteración 1 — implementada (10 sep 2026)](#iteración-1--implementada-10-sep-2026).

**Este documento sigue vivo.** Cuando entre otra oferta mal filtrada, Mar la
enlaza, se registra en la tabla de abajo, y cuando haya patrón (≥ 5 nuevas o
«ya tienes suficientes») se abre una **iteración 2** del nodo con el mismo
protocolo, y se reabre la tarea 17 (o se abre una nueva).

# Para qué es este documento

Es el **cuaderno de trabajo de la tarea 17** de
[tareas-pendientes.md](tareas-pendientes.md). Mar no va a preparar una lista de
golpe: **cada vez que entre una oferta que obviamente no es para ella** (roles
técnicos duros: infraestructura, backend, DevOps, ingeniería de datos pura…), la
enlazará en la sesión y pedirá que se registre aquí. Cuando haya suficientes
ejemplos para ver un patrón, el agente endurece el nodo `Filtro cualificación`.

**Regla de oro:** el criterio de Mar manda. Ante la duda, se deja pasar la oferta
y se le pregunta — nunca al revés. El bootcamp de Mar es *AI Engineering*, así que
un umbral mal puesto la dejaría fuera de su propio objetivo.

# El problema (contexto)

- **Nodo afectado:** el Code node `Filtro cualificación` de `Jobs · ingesta`
  (`CXCD8BZUQEQKex2a`). Nodo caliente — antes de tocarlo, consultar los skills
  n8n-mcp (`using-n8n-mcp-skills` → `n8n-code-javascript`).
- **Causa probable (confirmar leyendo el nodo):** el **criterio 5 «encaje»**
  *rescata* cualquier oferta cuyo título mencione la familia `IA`. Así entran
  roles de infraestructura que solo mencionan «AI». La lista «dura» del criterio
  4 no cubre `kubernetes`, `cloud`, `backend`, `infra`…, y `engineer` suelto no
  descarta a propósito (para no perder *Automation Engineer*).
- **Relación con métricas:** el criterio 5 ya publica su desglose de descartes por
  fuente en `workflowStaticData` para la pestaña `Metricas` (tarea 10). Cualquier
  cambio de recuento tiene que seguir cuadrando con el autochequeo del embudo.

# Protocolo para el agente

## Cuando Mar enlaza una oferta mal filtrada

1. **Regístrala** en la tabla [Registro de ofertas mal filtradas](#registro-de-ofertas-mal-filtradas)
   de abajo: fecha, título, empresa, plataforma, `id_unico`/`id_url` si se
   conocen, URL, y **el motivo por el que Mar dice que no encaja** (con sus
   palabras). Una fila por oferta.
2. **No rediseñes el filtro con una sola oferta.** Acumula hasta tener patrón:
   **≥ 5 ofertas registradas**, o hasta que Mar diga «ya tienes suficientes».
3. Confirma o corrige con Mar los motivos que estén marcados como hipótesis.

## Cuando hay suficientes ejemplos

4. **Lee el nodo** `Filtro cualificación` (`get_workflow_details` →
   `updateNodeParameters` para editar; nunca `setNodeParameter` con strings
   multilínea — ver [[n8n-mcp-quirks]]).
5. Para **cada** oferta registrada, identifica **qué criterio la rescató**
   (casi seguro el 5, «encaje», por mención de la familia IA).
6. **Diseña una lista de rechazo «ingeniería técnica dura»** que corte **antes**
   del rescate por familia IA. Palabras candidatas (ajustar con lo que digan las
   ofertas reales de Mar): `kubernetes`, `devops`, `sre`, `backend`, `frontend`,
   `full-stack`, `software engineer`, `data engineer`, `cloud engineer`,
   `platform engineer`, `infrastructure engineer`, `firmware`, `embedded`,
   `network engineer`, `site reliability`…
7. **Guardarraíl — NO rechazar roles legítimos:**
   - `AI Engineer`, `ML Engineer`, `Machine Learning Engineer` aplicados a
     producto.
   - `Automation Engineer`, `AI Automation`, roles de `n8n`/`Zapier`/`Make`.
   - Roles de **operaciones / PM / enablement / soporte** con encuadre claro de
     producto o negocio, aunque el título lleve «Engineer».
   Si una regla nueva pillaría a uno de estos, es demasiado agresiva.
8. **Implementa aditivo:** `updateNodeParameters` (reescritura completa), releer
   el `jsCode` publicado **byte a byte**, `node --check` sobre el código si se
   puede. La decisión pasa/descarta del resto de criterios **no cambia**. Patrón
   de las tareas 9 / 11 / 15.
9. **No publiques.** Deja el draft verificado y **pide Publish a Mar** — el
   `publish_workflow` del MCP lo bloquea el clasificador de auto-mode de Claude
   Code en esta sesión.
10. **Métricas:** valora añadir un contador `descartes_tecnico` a la pestaña
    `Metricas` (cabecera nueva por mapeo, patrón tarea 10; actualizar
    `Registrar métricas` y el autochequeo del embudo), o reutilizar
    `descartes_perfil` / `descartes_encaje` si encaja mejor.

## Verificación de cierre

- Una **pasada real** deja fuera las ofertas del tipo que Mar señaló.
- Los roles legítimos del punto 7 **siguen pasando** (comprobar con casos reales
  del histórico si los hay).
- El recuento de descartes **cuadra en `Metricas`** y el autochequeo del embudo
  no salta en ninguna fuente.
- Documentar en [jobs-ingesta.md](jobs-ingesta.md) y, si toca, en
  [jobs-evaluacion.md](jobs-evaluacion.md); cerrar la tarea 17 en
  [tareas-pendientes.md](tareas-pendientes.md) y anotar en
  [bitacora.md](bitacora.md).

# Registro de ofertas mal filtradas

> Estado: `registrada` = anotada, pendiente de acumular patrón ·
> `confirmada` = Mar validó el motivo · `corregida en vN` = el filtro ya la
> dejaría fuera.

| Fecha | Título | Empresa | Plataforma | id_unico / id_url | URL | Por qué no encaja (Mar) | Estado |
|---|---|---|---|---|---|---|---|
| 2026-09-03 | Kubernetes & Cloud Integration Engineer | OpenNebula Systems | Himalayas | `id_unico 4d13f46f` | — | *Hipótesis de Claude (a validar):* rol de infraestructura/cloud puro sobre OpenNebula, sin componente de producto ni de IA aplicada. | **confirmada** (Mar 10 sep) · corregida en `de9ae329` (4a `kubernetes`) |
| 2026-09-03 | AI Enablement Engineer | LocalStack | Himalayas | `id_unico fac88e75` | — | *Hipótesis de Claude (a validar):* «AI Enablement» aquí es tooling/infra para desarrolladores, no producto ni operaciones/PM. | **confirmada** (Mar 10 sep) · corregida en `de9ae329` (4a `enablement engineer`) |
| 2026-09-06 | AI DATA OPS ENGINEER – INGLÉS – REMOTO | IRIUM | Himalayas | `id_unico 86a496df` / `id_url d2814a13` | https://himalayas.app/companies/irium/jobs/ai-data-ops-engineer-ingles-remoto | *Hipótesis de Claude (a validar):* rol de Data Ops / ingeniería de datos; entró por «AI» en el título pese a ser ingeniería técnica. Llegó a generar CV + carta (gasto de llamadas Sonnet). | **Mar 10 sep: SÍ encaja** — falso positivo, retirada del patrón. `de9ae329` la deja pasar (4c: `data ops` + `ai` → excepción) |
| 2026-09-06 | Ingeniero de IA Generativa y Sistemas de Agentes | Synera | RemotoJob | `id_unico 14bcf59d` / `id_url e63ca1c7` | https://remotojob.com/oferta/ingeniero-de-ia-generativa-y-sistemas-de-agentes/ | *Refuerzo del propio `motivo_ia` (encaje_ia = 15):* «ingeniero técnico puro (sistemas de agentes, modelos de lenguaje) que exige experiencia profesional en desarrollo de IA… NO perfil de ingeniero de software, ni experiencia profesional en desarrollo». | **confirmada** (Mar 10 sep) · corregida en `de9ae329` (4c investigación: `generativa` / `sistemas de agentes`) |
| 2026-09-06 | Agentic Python Engineer | Evaboot | We Work Remotely | `id_unico 19335468` / `id_url 5eadab6b` | https://weworkremotely.com/remote-jobs/evaboot-agentic-python-engineer | *Hipótesis de Claude (a validar):* ingeniería de software pura — «strong Python engineering, power user of agentic coding»; entró por «Agentic». Ya archivada como `descartada`. | **confirmada** (Mar 10 sep) · corregida en `de9ae329` (4a `python engineer`) |
| 2026-09-06 | Especialista en Monitorización, Soporte y Procesos de Datos en Entorno Azure | Inetum | RemotoJob | `id_unico ebc8ba8f` / `id_url 282a8f80` | https://remotojob.com/oferta/especialista-en-monitorizacion-soporte-y-procesos-de-datos-en-entorno-azure/ | *Hipótesis de Claude (a validar):* monitorización/soporte de infraestructura de datos en Azure; sin componente de producto ni IA aplicada. Ya archivada como `descartada`. | **confirmada** (Mar 10 sep) · corregida en `de9ae329` (4a `monitorizacion`) |

**Dudosas — NO registradas** (más bien gestión/PM, que el guardarraíl del punto 7
manda conservar; a la espera de que Mar diga si las cuenta): *Technical Program
Manager* ×3 en Nebius (`197d8f2a`, `2aa789bc`, `b743f982`), *Manager / Business
Analyst, Data Operations* en AffirmedRx (`d8c2c57a`, `fd86aacf`).

**Recuento (6 sep 2026):** 6 ofertas registradas → se alcanza el umbral de patrón
(≥ 5). Pendiente: Mar valida/corrige los motivos marcados como hipótesis y da luz
verde a diseñar el endurecimiento del nodo.

**Actualización (10 sep 2026):** Mar revisó las 6. **La #3 (IRIUM, AI Data Ops
Engineer) SÍ encaja** — falso positivo, se retira: quedan **5** ofertas del
patrón, todas confirmadas y corregidas en la iteración 1 (`de9ae329`). Las
*Dudosas* (Technical Program Manager, Manager/Data Operations) **siguen pasando**
a propósito: no llevan `engineer`/`ingeniero` y el punto 7 manda conservar
gestión/PM; se revisarán si Mar enlaza más.

# Análisis del nodo (6 sep 2026) — por qué pasó cada una

Leído el `jsCode` publicado de `Filtro cualificación` (`Jobs · ingesta`
`CXCD8BZUQEQKex2a`). Los criterios **4a (exclusión dura), 4b (exclusión blanda) y
5 (familias objetivo) miran SOLO el título**, con regex de palabra completa.
Traza de las 6 ofertas:

| Oferta | Criterio que la dejó pasar | Por qué |
|---|---|---|
| Kubernetes & Cloud Integration **Engineer** | 5 — familia `integration` | El título contiene «integration», que está en `FAMILIAS_OBJETIVO`. No la para 4a: `EXCLUSION_DURA` no tiene `kubernetes` ni «cloud integration» (solo «cloud engineer», que no es adyacente aquí). |
| AI Enablement **Engineer** | 5 — familia `ai` | Caso clásico: «ai» en el título abre la lista blanca. `EXCLUSION_DURA` sí tiene `ai engineer`, pero no casa con «ai **enablement** engineer» (no adyacente). |
| AI Data Ops **Engineer** | 5 — familias `ai` / `ops` | Igual que la anterior. `data engineer` de `EXCLUSION_DURA` no casa con «data **ops** engineer». |
| Ingeniero de **IA** Generativa y Sistemas de Agentes | 5 — familia `ia` | `EXCLUSION_DURA` tiene `ingeniero de inteligencia artificial` pero **no** `ingeniero de ia`; el título usa la sigla. |
| **Agentic** Python **Engineer** | 5 — familia `agentic` | `EXCLUSION_DURA` lista `java`, `php`, `ruby`, `golang`, `rust`… **pero no `python`**. Y no hay regla de `engineer` suelto. |
| Especialista en Monitorización… **Procesos** de Datos en Azure | 5 — familia `procesos` | Ni «AI» interviene: pasa por «procesos». `EXCLUSION_DURA` no cubre monitorización/infra en español. |

**Conclusión:** el diagnóstico previo («el criterio 5 rescata por IA») es cierto
solo para 1 de 6. El patrón real es más amplio: **el criterio 5 es una lista
blanca demasiado genérica** (`integration`, `procesos`, `agentic`, `ia`, `ops`,
`project`, `program`…) y es la **última** puerta, así que cualquier rol técnico
cuyo título roce una de esas palabras entra. Y **5 de 6 llevan “engineer” /
“ingeniero” en el título** — señal técnica fuerte que el nodo hoy no usa (evita
`engineer` suelto a propósito, para no perder «Automation Engineer»).

## Palancas posibles (a decidir con Mar)

1. **Regla nueva de “ingeniería técnica” antes del criterio 5**, que corte si el
   título trae `engineer`/`ingeniero`/`kubernetes`/`python`/`cloud`/`backend`/…
   **salvo** que también traiga una señal de automatización/operaciones
   (`automation`, `n8n`, `zapier`, `make`, `rpa`, `workflow`, `no code`,
   `ops`/`operations`). Es la más eficaz y la más arriesgada: hay que fijar la
   lista de rescate con Mar.
2. **Rellenar los huecos concretos de `EXCLUSION_DURA`**: `kubernetes`, `python`,
   `ingeniero de ia`, `cloud integration`, `data ops`, `enablement engineer`,
   `integration engineer`, `monitorizacion`/`infraestructura`. Menos agresiva,
   pero es jugar al gato y al ratón.
3. **Combinar 1 + 2** y afinar `FAMILIAS_OBJETIVO` (quitar `integration` y
   `procesos` sueltos, o exigir que vayan con una palabra de negocio).

## Decisiones de Mar (6 sep 2026)

- **AI Engineer sí, ML Engineer no.** Sacar `ai engineer` (y añadir `ai
  engineering`) de `EXCLUSION_DURA` → esos títulos pasan al scoring `encaje_ia`,
  que ya discrimina. **Mantener** `ml engineer` y `machine learning engineer` en
  `EXCLUSION_DURA` (más de investigación/modelado, fuera del objetivo del
  bootcamp). `SENALES_DESTACADA` ya tiene ambos, no se toca. **(8 sep 2026,
  tarea 19: `SENALES_DESTACADA` ya no importa para la hoja — `destacada` ahora
  se calcula en `Aplicar scoring` como `encaje_ia > 80`. La lista sigue en el
  `jsCode` pero su salida se pisa; se puede borrar al endurecer el nodo.)**
- **Validación de los 6 motivos:** Mar los revisa ella misma en este documento
  antes de que Claude diseñe el endurecimiento. Hasta entonces, no se escribe
  draft del nodo.

## Decisiones de Mar (10 sep 2026)

- **La #3 (AI Data Ops Engineer, IRIUM) SÍ encaja.** Falso positivo — el filtro
  no debe descartarla. Las otras 5 (#1, #2, #4, #5, #6): fuera.
- **`engineer`/`ingeniero` a secas descarta**, salvo palabra de rescate.
- **`operations`/`operaciones`/`ops` es palabra de rescate** — «Operations» es el
  título del puesto de Mar en LinkedIn. Pero **`data` + `ops` juntos** en un
  título de ingeniería vuelven a descartar, **salvo que el título mencione IA**
  aplicada (por eso la #3, «**AI** Data Ops Engineer», pasa).
- **`AI`/`IA` a secas NO rescata** — era la causa raíz (colaba #1, #2, #4).
- **`Prompt Engineer`** entra en la lista de «pasan siempre», junto a
  `AI Engineer` / `AI Engineering`.
- Vía libre para publicar (Mar: «puedes publicar y actualizar la documentación»).

## Iteración 1 — implementada (10 sep 2026)

**Nodo:** `Filtro cualificación` de [Jobs · ingesta](jobs-ingesta.md)
(`CXCD8BZUQEQKex2a`, nodo id `5e6da0a2-…`). Publicado por Claude tras verificación
byte a byte: **`versionId == activeVersionId == de9ae329-52d4-4925-b5f8-39149c4d2db6`**.
Cambio **aditivo** — la lógica pasa/descarta del resto de criterios no cambia; el
motivo del nuevo criterio es `perfil: …`, así que **no añade clave a `Metricas`**
(cuenta en el bucket `perfil` que ya existe) y el autochequeo del embudo sigue
cuadrando.

Combinación de palanca 1 + palanca 2 + parte de la 3:

1. **Criterio 4c nuevo** (entre 4b y 5). Si el título trae
   `engineer`/`ingeniero`/`ingeniera`/`ingenieria`:
   - marcador de **investigación/modelado** (`generativa`, `sistemas de agentes`,
     `deep learning`, `machine learning`, `nlp`, `research`, `phd`…) → descarta
     aunque haya rescate;
   - **`data ops` / `data engineer` / `mlops`** sin señal de IA aplicada
     (`ai`, `ia`, `genai`, `llm`, `agentic`) → descarta aunque lleve `ops`;
   - si no hay **rescate** (`automation*`, `n8n`, `zapier`, `rpa`, `workflow`,
     `no code`/`low code`, `citizen developer`, `operations`/`operaciones`/`ops`,
     `ai engineer`/`ai engineering`/`ingeniero de ia`, `prompt engineer`) →
     descarta.
2. **`EXCLUSION_DURA`**: fuera `ai engineer` e `ingeniero de inteligencia
   artificial` (van al scoring `encaje_ia`); dentro `kubernetes`, `k8s`,
   `cloud integration`, `integration engineer`, `python engineer`,
   `python developer`, `programmer`, `enablement engineer`, `site reliability`,
   `monitorizacion`, `monitoring`, `observability`, `observabilidad`,
   `infraestructura`. `ml engineer` / `machine learning engineer` se quedan.
3. **`FAMILIAS_OBJETIVO`**: fuera `integration` / `integraciones` sueltos
   (colaban «Cloud Integration Engineer»). `procesos` se queda (roles de
   coordinación legítimos); #6 la corta ya `monitorizacion` en 4a.

**Prueba unitaria** (25 casos — replay del `jsCode` publicado envuelto en
`new Function` con `$input` simulado, hecho en el scratchpad de la sesión): las
5 ofertas del patrón quedan fuera, la #3
pasa, y siguen pasando *AI Engineer*, *AI Engineering*, *Ingeniero de IA*,
*Automation Engineer*, *AI Automation Engineer*, *Prompt Engineer*,
*Operations Coordinator*, *Business Operations Engineer*, *AI Operations Manager*,
*Workflow Automation Engineer*, *Technical Program Manager*, *Manager, Data
Operations*. Siguen cayendo *Backend/ML/DevOps/Data Engineer*, *Full Stack
Developer*.

**Limpieza no hecha (opcional):** `SENALES_DESTACADA` y la línea
`oferta.destacada = …` siguen en el `jsCode`; su salida la pisa `Aplicar scoring`
(tarea 19). Se puede borrar en una iteración futura.

**Casos límite conocidos, a vigilar:** `monitoring` (inglés) en `EXCLUSION_DURA`
podría cortar algún «… Operations & Monitoring …» legítimo; `RevOps Engineer`
sin `automation` cae por 4c (abreviatura no cubierta). Si aparecen, se relajan.

## Tensión pendiente — resuelta el 10 sep 2026

- «AI Enablement Engineer» (LocalStack): Mar confirmó que **no encaja**. No se
  intenta distinguir «enablement» de dev-tooling de «enablement» de negocio por
  título; se descarta vía `enablement engineer` en `EXCLUSION_DURA`. Si en el
  futuro entra un «… Enablement …» de negocio legítimo y cae, se revisa.

# Relacionados

- [tareas-pendientes.md](tareas-pendientes.md) — tarea 17
- [jobs-ingesta.md](jobs-ingesta.md) — dónde vive `Filtro cualificación`
- [jobs-evaluacion.md](jobs-evaluacion.md) — auditoría del embudo
- [jobs-hoja-formato.md](jobs-hoja-formato.md) — pestaña `Metricas`
