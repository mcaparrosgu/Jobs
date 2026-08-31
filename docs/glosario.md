# Glosario del proyecto

Términos técnicos que han aparecido en el proyecto, en orden alfabético. Cada
uno: qué es en corto, una analogía cotidiana, y dónde se usó aquí.

## Fan-out (salida en abanico)

- Un mismo nodo manda su salida a **varios nodos a la vez**; todos reciben una
  copia de los mismos datos y siguen su camino por separado.
- Como una fotocopiadora que reparte la misma hoja a tres personas: cada una
  hace algo distinto con su copia y lo que haga una no afecta a las otras.
- `Filtro duplicados` de [Jobs · ingesta](jobs-ingesta.md) manda sus ofertas
  nuevas a la vez a `Append row in sheet` (que las guarda) y a
  `Registrar métricas` (que solo las cuenta). Añadir el segundo consumidor no
  cambia en nada lo que hace el primero.

## Pasada 100 % duplicados / nodo sin items no se ejecuta

- En n8n, si un nodo recibe **0 items** de entrada, no se ejecuta, y por tanto
  tampoco se ejecuta nada de lo que cuelga de él.
- Como una cadena de montaje: si no llega ninguna pieza, los puestos siguientes
  se quedan parados; no producen una pieza vacía.
- Cuando una pasada de la ingesta trae solo ofertas que ya estaban guardadas,
  `Filtro duplicados` emite 0 items y la rama de métricas (`Registrar métricas`
  → `Append métricas`) no corre: esa pasada no deja fila en `Metricas`. Se
  aceptó como limitación porque pasa poco y la forma del embudo se registra en
  toda pasada con al menos una oferta nueva.

## Rama aislada

- Un trozo de workflow que cuelga del flujo principal para hacer algo
  secundario (avisar, medir, registrar) **sin poder romper** el flujo
  principal: va en paralelo y, si falla, se configura para no cortar la
  ejecución (`onError: continueRegularOutput`).
- Como el cuentakilómetros de un coche: lee lo que hace el motor y lo apunta,
  pero si se estropea el coche sigue andando igual.
- `Guardarráil huecos` → `Aviso huecos` (avisa si la hoja tiene huecos) y
  `Registrar métricas` → `Append métricas` (mide el embudo) son ramas aisladas
  de [Jobs · ingesta](jobs-ingesta.md).

## workflowStaticData

- Un pequeño almacén de datos **pegado al workflow** que sobrevive entre nodos
  (y entre ejecuciones). Un nodo escribe ahí con
  `$getWorkflowStaticData('global')` y otro lo lee después.
- Como una pizarra en la pared de la fábrica: un turno anota un número y el
  turno siguiente lo lee; no hace falta que se lo pasen en mano.
- `Filtro cualificación` calcula el desglose de descartes por fuente y lo deja
  en `workflowStaticData` con un sello de qué ejecución es; `Registrar métricas`
  lo lee más adelante en la misma pasada. Se usa porque un nodo solo puede leer
  del anterior sus **items de salida**, no sus variables internas.
