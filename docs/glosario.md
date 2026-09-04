# Glosario del proyecto

Términos técnicos que han aparecido en el proyecto, en orden alfabético. Cada
uno: qué es en corto, una analogía cotidiana, y dónde se usó aquí.

## AI Act (Reglamento UE 2024/1689) y Anexo III / alto riesgo

- La ley europea que regula los sistemas de inteligencia artificial según el
  riesgo que suponen para las personas. El Anexo III es la lista cerrada de
  usos que la ley considera "alto riesgo" (empleo, crédito, educación,
  biometría...) y que llevan obligaciones fuertes (supervisión humana,
  registro, evaluación de conformidad).
- Como el carné de conducir por puntos: no todo el mundo lleva las mismas
  obligaciones — un camión de mercancías peligrosas pasa controles que un
  coche particular no pasa, aunque los dos circulen por la misma carretera.
- `docs/03-legal.md` clasifica a `Jobs` como **riesgo mínimo**: el Anexo
  III.4 (empleo) apunta a herramientas del lado del reclutador (filtrar
  candidatos), y `Jobs` es del lado del candidato (filtra ofertas para Mar).

## Digital Omnibus

- Un paquete de reformas de la UE (aprobado jun 2026) que simplifica y
  retrasa parte del calendario del AI Act, sin cambiar la clasificación de
  riesgo en sí.
- Como un aplazamiento de la ITV: la norma sigue existiendo, pero el plazo
  para cumplirla se mueve más adelante.
- Aplazó las obligaciones de alto riesgo del Anexo III del 2 ago 2026 al 2
  dic 2027 — corrigiendo una fecha que `tareas-pendientes.md` (tarea 16)
  daba por vigente desde antes de verificarla en fuente el 4 sep 2026.

## Exención de actividad doméstica (RGPD)

- El RGPD no se aplica a un tratamiento de datos personales que sea
  puramente privado o doméstico, sin conexión con una actividad profesional
  o comercial.
- Como las cámaras de seguridad de una vivienda particular apuntando solo al
  propio jardín: la ley de protección de datos existe, pero no está pensada
  para regular eso.
- En `03-legal.md` cubre sin duda los datos propios de Mar, pero con matiz
  para los emails de recruiters que procesa `Jobs · seguimiento` a través de
  un proveedor cloud de IA — zona gris tratada de forma conservadora, sin
  jurisprudencia directa que la resuelva (ver bitácora del 4 sep 2026).

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

## Prefill (turno "assistant" precompletado)

- Técnica de la API de Anthropic: en vez de solo pedir por instrucción que
  la respuesta tenga un formato concreto, se manda un último mensaje con
  `role: "assistant"` y un contenido inicial (p. ej. `"{"`), y el modelo
  **continúa** desde ahí en vez de empezar de cero. La API nunca devuelve
  ese texto de arranque en la respuesta — solo la continuación.
- Como darle a alguien la primera palabra de una frase para que no pueda
  empezar por otro sitio: "termina esta frase: 'El resultado es...'" saca
  una respuesta más predecible que "dame el resultado".
- `Scoring encaje` de [Jobs · ingesta](jobs-ingesta.md) (M1, tarea 22)
  prefilla `"{"` para forzar que `claude-haiku-4-5` responda JSON limpio sin
  explicaciones alrededor; `Aplicar scoring` repone la llave antes de hacer
  `JSON.parse`, porque la API no la incluye en `content[0].text`.

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

## Responsable del despliegue vs. proveedor (AI Act)

- Dos papeles distintos ante la ley: el **proveedor** construye un sistema
  de IA y lo pone en el mercado; el **responsable del despliegue** usa un
  sistema de IA de otro (o propio) para sus propios fines. Las obligaciones
  no son las mismas — el proveedor carga con más.
- Como la diferencia entre el fabricante de un coche y quien lo conduce: al
  fabricante le exigen homologación y airbags; al conductor, carné y
  seguro. No es la misma responsabilidad aunque ambos estén "usando" el
  coche.
- En `03-legal.md`, Mar es **responsable del despliegue** de Claude y
  OpenAI para su propio uso; si `Jobs App` llega a ofrecerse a terceros,
  Mar pasaría a ser también **proveedora** de ese producto.

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
