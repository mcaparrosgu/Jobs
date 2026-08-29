---
type: Nota
title: Tareas pendientes · Jobs
description: Tareas manuales y de seguimiento abiertas del pipeline de empleo, con contexto y criterio de cierre. Creada el 29 ago 2026 tras el incidente del hueco de filas vacías en Ofertas_activas.
tags: [n8n, empleo, tareas]
timestamp: 2026-08-29T09:00:00Z
---

# Abiertas

## 1. Revisar el disparador horario del Apps Script de `n8n_jobs`

**Prioridad: alta.** Es la causa raíz del incidente del 29 ago 2026 (ver
[jobs-hoja-formato.md](jobs-hoja-formato.md#29-ago-2026-el-apps-script-no-estaba-corriendo)
y [jobs-ingesta.md](jobs-ingesta.md#fallos-conocidos)).

El script `mantenimiento` (Extensiones → Apps Script dentro de la hoja) debería
correr cada hora: reordena las dos pestañas por `fecha_guardado` desc, fuerza
alto de fila 21 px, reaplica/quita la casilla de `generar_cv_ia` y purga
casillas/valores sueltos en filas vacías. Entre el 25 y el 29 ago **no se
ejecutó** y por eso un hueco de ~260 filas vacías dejó las ofertas nuevas
enterradas al fondo sin que nada avisara.

Qué comprobar:
- Extensiones → Apps Script → **Activadores (Triggers)**: que existe el
  disparador time-based de `mantenimiento` cada 1 h y no está en estado de
  error.
- **Ejecuciones** del proyecto Apps Script: buscar fallos recientes
  (autorización caducada, cuota diaria agotada, timeout).
- Si el disparador desapareció o falla: volver a lanzarlo con `crearDisparador()`
  (está en el propio script) y confirmar que la siguiente pasada horaria
  reordena y limpia.

**Cierre:** una ejecución horaria `success` visible en el log de Apps Script y
la hoja ordenada/sin huecos tras ella.

## 2. Guardarraíl que avise si `Ofertas_activas` vuelve a tener huecos

**Prioridad: media.** El incidente fue **silencioso**: `Jobs · ingesta`
terminó `success` y pingueó Healthchecks los días 25–29 aunque las ofertas
caían en la fila 280+. El dead-man's switch no cubre "escribió, pero en el sitio
equivocado".

Idea: en `Jobs · ingesta`, tras `Get row(s) in sheet`, comparar el
`row_number` máximo con el número de filas devueltas. Si difieren en más de un
margen pequeño (hay filas vacías intercaladas), mandar un aviso por la rama de
error / email en vez de seguir como si nada. No bloquea la ingesta, solo avisa.

**Cierre:** una ejecución de prueba con huecos simulados dispara el aviso.

## 3. Decidir qué hacer con las ofertas del 25 y 26 ago 2026

**Prioridad: baja.** Se perdieron en el reformateo manual del 27 ago; no están
en `Ofertas_activas` ni en `Archivo`. Son recuperables desde el output de
`Append row in sheet` de las ejecuciones n8n del 25 ago (#645) y 26 ago (#647)
—mismo método que se usó el 29 ago para las 11 del 27–28—, pero puede que ya no
interesen por antigüedad.

**Cierre:** recuperarlas y reinsertarlas, o decidir explícitamente que se
descartan.

## 4. Verificar la primera ejecución programada con `useAppend: true`

**Prioridad: media.** El cambio se aplicó el 29 ago pero aún no se ha visto una
pasada automática completa. Comprobar en la ejecución de las 17:00 (o la
siguiente) que `Append row in sheet` escribe justo tras el bloque de datos
(fila 41+) y que, tras el Apps Script, las ofertas nuevas quedan arriba del
todo.

**Cierre:** una ejecución `trigger` posterior al 29 ago con las filas nuevas
contiguas y visibles.

## 5. Confirmar que `Borrar ofertas ofertas_activas` (Jobs · archivado) borra todas las filas, no solo la primera

**Prioridad: media.** Durante la investigación del 29 ago se vio que ese nodo
recibe N items (filas a archivar, ordenadas desc por `row_number`) pero su
salida es siempre `[{}]` (1 item). Hay que confirmar que efectivamente elimina
las N filas y no solo la del primer item; si solo borra una por ejecución,
`Ofertas_activas` acumula ofertas viejas que ya se copiaron a `Archivo`
(duplicados lógicos entre pestañas y crecimiento lento de la hoja).

**Cierre:** una ejecución de `Jobs · archivado` con varias filas a archivar,
verificada fila a fila en la hoja (todas fuera de `Ofertas_activas`, todas en
`Archivo`).

# Relacionados

- [jobs-ingesta.md](jobs-ingesta.md)
- [jobs-hoja-formato.md](jobs-hoja-formato.md)
- [jobs-archivado.md](jobs-archivado.md)
