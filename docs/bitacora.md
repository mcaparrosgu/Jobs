# Bitácora del proyecto

Cuaderno de decisiones en orden cronológico. Solo se añade al final: guarda el
**porqué** de cada decisión, qué se descartó y qué costó entender, que es lo que
se pierde con cada `/clear`. No se reescribe ni se corrige hacia atrás; si una
decisión cambió, se anota una entrada nueva que lo diga.

## 2026-08-31 · Hito: rama de métricas del embudo de ingesta (tarea 10 / M3)

- QUÉ SE DECIDIÓ — Pestaña nueva `Metricas` en `n8n_jobs` (una fila por pasada y
  fuente: crudas → tras_teletrabajo → tras_salario → tras_cualificacion →
  nuevas + descartes por criterio) alimentada por una rama aislada
  `Registrar métricas` → `Append métricas` que cuelga en abanico de
  `Filtro duplicados`, en paralelo al `append` principal. Para tener el desglose
  de descartes por criterio, `Filtro cualificación` publica ese recuento
  **por fuente** en `workflowStaticData` y se separa el criterio 5 (etiqueta
  `perfil:` → `encaje:`), sin tocar la decisión pasa/descarta.
- ALTERNATIVAS DESCARTADAS — (a) Rama doble: una segunda rama siempre-activa
  colgando de `Get row(s) in sheet` para cubrir también las pasadas sin ofertas
  nuevas. (b) No tocar `Filtro cualificación` y recalcular los descartes por
  diferencia de recuentos entre etapas — pero eso da el total, no el desglose
  por criterio. (c) Adjuntar el desglose a cada item de salida de
  `Filtro cualificación`.
- POR QUÉ ESTA — Es la que especificaba M3 y Mar ya había aprobado, y la más
  simple. La rama doble añade dos nodos y más lógica para cubrir un caso poco
  frecuente. La opción (c) se pierde si una pasada no deja pasar ninguna oferta
  y ensucia el `append`; `workflowStaticData` es el único canal limpio para que
  un nodo posterior lea algo que no sean los items de salida del anterior.
- QUÉ SE ROMPIÓ — `Append métricas` falló en la ejecución #720 con `Sheet with
  ID gid=1516813991 not found`: se referenció la pestaña nueva por `gid` en modo
  *list* y n8n no la resolvió (con `gid=0` sí funciona en `Append row in sheet`).
  Se arregló pasando `sheetName` a modo **nombre** (`"Metricas"`). El
  `onError: continueRegularOutput` hizo su trabajo: el fallo no tocó el resto del
  pipeline y la ejecución quedó `success`. La #721 salió pasada 100 %
  duplicados, así que la rama de métricas no llegó a ejecutarse y la escritura
  quedó sin verificar — se confirma con la pasada automática del 1 sep 09:00.
- QUÉ QUEDA PENDIENTE DE ENTENDER — Por qué exactamente el modo *list* con `gid=`
  no encuentra una pestaña recién creada cuando `gid=0` sí funciona. Y si la
  limitación de «pasada 100 % duplicados → sin fila en `Metricas`» acabará
  molestando para comparar semanas entre sí; se revisa con dos semanas de datos
  reales, junto con la decisión sobre M4.
