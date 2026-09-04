---
type: Nota
title: Mejora iterativa de `Filtro cualificación` (tarea 17)
description: Brief permanente para el agente. Mar irá enlazando ofertas mal filtradas a lo largo del tiempo; el agente las registra aquí y, cuando haya patrón, endurece el filtro sin descartar roles legítimos.
tags: [n8n, empleo, tarea-17, filtro-cualificacion]
timestamp: 2026-09-04T13:00:00Z
---

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
| 2026-09-03 | Kubernetes & Cloud Integration Engineer | OpenNebula Systems | (por confirmar) | `id_unico 4d13f46f` | — | *Hipótesis de Claude (a validar):* rol de infraestructura/cloud puro sobre OpenNebula, sin componente de producto ni de IA aplicada; entró solo por mencionar «AI». | registrada |
| 2026-09-03 | AI Enablement Engineer | LocalStack | (por confirmar) | `id_unico fac88e75` | — | *Hipótesis de Claude (a validar):* «AI Enablement» aquí es tooling/infra para desarrolladores, no producto ni operaciones/PM. | registrada |

# Relacionados

- [tareas-pendientes.md](tareas-pendientes.md) — tarea 17
- [jobs-ingesta.md](jobs-ingesta.md) — dónde vive `Filtro cualificación`
- [jobs-evaluacion.md](jobs-evaluacion.md) — auditoría del embudo
- [jobs-hoja-formato.md](jobs-hoja-formato.md) — pestaña `Metricas`
