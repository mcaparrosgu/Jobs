---
type: Nota
title: Mejora iterativa de `Filtro cualificación` (tarea 17)
description: Brief permanente para el agente. Mar irá enlazando ofertas mal filtradas a lo largo del tiempo; el agente las registra aquí y, cuando haya patrón, endurece el filtro sin descartar roles legítimos.
tags: [n8n, empleo, tarea-17, filtro-cualificacion]
timestamp: 2026-09-04T13:00:00Z
---

# ⏭️ Punto de retomada (actualizado 6 sep 2026)

**Dónde está la tarea:** 6 ofertas registradas (umbral de patrón alcanzado), nodo
analizado y trazado. **Bloqueada esperando 2 cosas de Mar:**

1. **Mar revisa los 6 motivos** de la tabla [Registro de ofertas mal
   filtradas](#registro-de-ofertas-mal-filtradas) — 4 están como *hipótesis de
   Claude a validar* (IRIUM, Synera, Evaboot, Inetum) y 2 son de antes (OpenNebula,
   LocalStack). Que confirme o corrija. Ojo al caso «AI Enablement Engineer»
   (LocalStack): choca con el guardarraíl del punto 7 (conservar *enablement*).
2. **Mar fija la lista de rescate** de la regla nueva «ingeniería técnica dura»:
   qué palabras en el título salvan a un rol aunque lleve «engineer». Propuesta de
   Claude: `automation` / `automatizacion`, `n8n`, `zapier`, `make`, `rpa`,
   `workflow`, `no code` / `low code`, `ops` / `operations`.

**Ya decidido por Mar (6 sep 2026):** *AI Engineer sí, ML Engineer no* — sacar
`ai engineer` de `EXCLUSION_DURA` y añadir `ai engineering`; mantener `ml engineer`
y `machine learning engineer`. Detalle en [Decisiones de Mar](#decisiones-de-mar-6-sep-2026).

**Siguiente paso del agente (cuando Mar responda 1 y 2):** diseñar el
endurecimiento siguiendo [Cuando hay suficientes ejemplos](#cuando-hay-suficientes-ejemplos)
(pasos 4-10). Combinar palanca 1 (regla nueva de «ingeniería técnica» antes del
criterio 5) + palanca 2 (rellenar huecos de `EXCLUSION_DURA`: `kubernetes`,
`python`, `ingeniero de ia`, `cloud integration`, `data ops`, `enablement
engineer`, `integration engineer`, `monitorizacion`). Dejar el `jsCode` en draft
vía `update_workflow` + `updateNodeParameters`, releído byte a byte, `node --check`
si se puede. **No publicar** — lo publica Mar. Valorar el contador
`descartes_tecnico` en `Metricas` (paso 10).

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
| 2026-09-03 | Kubernetes & Cloud Integration Engineer | OpenNebula Systems | Himalayas | `id_unico 4d13f46f` | — | *Hipótesis de Claude (a validar):* rol de infraestructura/cloud puro sobre OpenNebula, sin componente de producto ni de IA aplicada. | registrada |
| 2026-09-03 | AI Enablement Engineer | LocalStack | Himalayas | `id_unico fac88e75` | — | *Hipótesis de Claude (a validar):* «AI Enablement» aquí es tooling/infra para desarrolladores, no producto ni operaciones/PM. | registrada |
| 2026-09-06 | AI DATA OPS ENGINEER – INGLÉS – REMOTO | IRIUM | Himalayas | `id_unico 86a496df` / `id_url d2814a13` | https://himalayas.app/companies/irium/jobs/ai-data-ops-engineer-ingles-remoto | *Hipótesis de Claude (a validar):* rol de Data Ops / ingeniería de datos; entró por «AI» en el título pese a ser ingeniería técnica. Llegó a generar CV + carta (gasto de llamadas Sonnet). | registrada |
| 2026-09-06 | Ingeniero de IA Generativa y Sistemas de Agentes | Synera | RemotoJob | `id_unico 14bcf59d` / `id_url e63ca1c7` | https://remotojob.com/oferta/ingeniero-de-ia-generativa-y-sistemas-de-agentes/ | *Refuerzo del propio `motivo_ia` (encaje_ia = 15):* «ingeniero técnico puro (sistemas de agentes, modelos de lenguaje) que exige experiencia profesional en desarrollo de IA… NO perfil de ingeniero de software, ni experiencia profesional en desarrollo». | registrada |
| 2026-09-06 | Agentic Python Engineer | Evaboot | We Work Remotely | `id_unico 19335468` / `id_url 5eadab6b` | https://weworkremotely.com/remote-jobs/evaboot-agentic-python-engineer | *Hipótesis de Claude (a validar):* ingeniería de software pura — «strong Python engineering, power user of agentic coding»; entró por «Agentic». Ya archivada como `descartada`. | registrada |
| 2026-09-06 | Especialista en Monitorización, Soporte y Procesos de Datos en Entorno Azure | Inetum | RemotoJob | `id_unico ebc8ba8f` / `id_url 282a8f80` | https://remotojob.com/oferta/especialista-en-monitorizacion-soporte-y-procesos-de-datos-en-entorno-azure/ | *Hipótesis de Claude (a validar):* monitorización/soporte de infraestructura de datos en Azure; sin componente de producto ni IA aplicada. Ya archivada como `descartada`. | registrada |

**Dudosas — NO registradas** (más bien gestión/PM, que el guardarraíl del punto 7
manda conservar; a la espera de que Mar diga si las cuenta): *Technical Program
Manager* ×3 en Nebius (`197d8f2a`, `2aa789bc`, `b743f982`), *Manager / Business
Analyst, Data Operations* en AffirmedRx (`d8c2c57a`, `fd86aacf`).

**Recuento (6 sep 2026):** 6 ofertas registradas → se alcanza el umbral de patrón
(≥ 5). Pendiente: Mar valida/corrige los motivos marcados como hipótesis y da luz
verde a diseñar el endurecimiento del nodo.

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

## Tensión pendiente

- «AI Enablement Engineer» (LocalStack) — el punto 7 del protocolo dice conservar
  roles de *enablement*; Mar lo marcó como que NO encaja. Manda el caso concreto,
  pero conviene una regla que distinga «enablement» de dev-tooling de «enablement»
  de negocio (difícil por título solo). A ver qué dice Mar al revisar.

# Relacionados

- [tareas-pendientes.md](tareas-pendientes.md) — tarea 17
- [jobs-ingesta.md](jobs-ingesta.md) — dónde vive `Filtro cualificación`
- [jobs-evaluacion.md](jobs-evaluacion.md) — auditoría del embudo
- [jobs-hoja-formato.md](jobs-hoja-formato.md) — pestaña `Metricas`
