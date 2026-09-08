---
type: Nota
title: Especificación funcional · Jobs
description: Qué hace Jobs y por qué, en lenguaje funcional sin tecnología. Cubre el sistema construido hoy y, marcado aparte, las mejoras planeadas y aún no construidas (M1, M4, M6, mitad de M7, envío autónomo). Escrito fuera de orden (Paso 5 del método, tras el Paso 4 legal).
tags: [n8n, empleo, spec]
timestamp: 2026-09-04T00:00:00Z
---

> Escrito fuera de orden: no existen `docs/00-problema.md`, `01-historias.md`
> ni `02-mvp.md` — el sistema ya estaba construido cuando se decidió aplicar
> el método. El contexto se reconstruyó leyendo la documentación real del
> pipeline ([index.md](index.md)) y [03-legal.md](03-legal.md).
>
> **Convención de este documento:** lo marcado **[PREVISTO]** describe algo
> decidido pero no construido todavía (ver
> [jobs-evaluacion.md](jobs-evaluacion.md)). Todo lo demás describe el
> comportamiento real de hoy.

# 1. Objetivo

Automatizar el trabajo repetitivo de la búsqueda de empleo de una única
candidata (Mar), para que su tiempo se dedique a decidir y aplicar, no a
buscar y redactar. El sistema recoge ofertas de múltiples fuentes externas,
las filtra según sus criterios (modalidad, salario, cualificación), le deja
elegir a cuáles quiere presentarse, genera un currículum y una carta
adaptados a cada oferta con ayuda de inteligencia artificial, gestiona el
envío o la entrega de esos documentos, y hace seguimiento de las respuestas
que las empresas envían por correo. Nadie más que Mar usa ni ve el sistema.

# 2. Usuarios y permisos

Un único tipo de usuario humano:

- **Mar (dueña y única usuaria).** Ve todas las ofertas, decide cuáles
  trabajar, valida cualquier propuesta que el sistema le hace, y es quien
  aplica manualmente cuando el sistema no puede hacerlo por ella. Tiene
  acceso completo de lectura y escritura sobre todos los datos.

El sistema actúa como un **segundo actor semi-autónomo**, con permisos
limitados por diseño:

- Puede recoger, filtrar, archivar y generar documentos sin pedir permiso en
  cada paso.
- **Nunca decide en solitario un cambio de estado de una candidatura que
  dependa de juicio humano** (por ejemplo, si una respuesta de empresa
  significa "entrevista" o "rechazo"): propone, y Mar valida.
- No envía ninguna candidatura a menos que el tipo de aplicación de la
  oferta sea "por correo"; en cualquier otro caso, prepara los documentos y
  deja que Mar aplique ella misma.

# 3. Recorridos

## 3.1 Ingesta automática de ofertas (sin intervención de Mar)

Dos veces al día, el sistema:

1. Recoge ofertas nuevas de todas las fuentes externas activas.
2. Descarta las que no son teletrabajo, las de salario por debajo del
   umbral (si el salario consta) y las que no encajan con el perfil de Mar.
3. Descarta las que ya estaban guardadas (misma oferta detectada por
   identidad de empresa+puesto o por la misma URL de destino).
4. Guarda las ofertas nuevas supervivientes en el listado de ofertas
   activas, ordenadas por fecha de guardado.
5. Si hay ofertas nuevas, avisa a Mar por correo con el resumen.
6. Si alguna fuente falla, lo registra sin detener a las demás y avisa a Mar
   por correo del error.

Mar no ve ninguna pantalla en este recorrido: el resultado la espera en el
listado de ofertas activas.

## 3.2 Revisión y selección de ofertas

1. Mar abre el listado de ofertas activas cuando quiere.
2. Para cada oferta ve: puesto, empresa, fecha de publicación y de guardado,
   el estado actual de la candidatura, la puntuación de encaje con su motivo,
   la marca de destacada, y los enlaces de aplicación y de los documentos
   generados. Otros datos (resumen de la descripción, fuente, identificadores
   internos) existen en el registro pero están ocultos por defecto porque Mar
   no los consulta; el salario y la modalidad se usan para filtrar en la
   ingesta y **no se guardan** en el listado activo.
3. Mar marca las ofertas que quiere trabajar activando una casilla de
   "generar CV".
4. Cada oferta lleva una puntuación de encaje (0-100) y un motivo en una
   frase, calculados automáticamente al entrar, para que Mar priorice la
   revisión por las mejor puntuadas. La puntuación **solo informa, no descarta
   ninguna oferta**. Las ofertas con encaje muy alto se marcan además con una
   estrella ("destacada").

## 3.3 Generación de CV y carta adaptados

Cuando Mar marca una oferta para generar CV:

1. El sistema toma el currículum base de Mar y la descripción de la oferta,
   y genera con inteligencia artificial una versión de CV y una carta de
   presentación adaptadas específicamente a esa oferta, en el idioma de la
   oferta.
2. Un segundo paso de inteligencia artificial revisa y suaviza la
   redacción para que no suene genérica ni mecánica, conservando siempre
   cifras, nombres de empresa, fechas y datos concretos intactos. Si este
   paso falla por cualquier motivo, se usa el texto del primer paso sin
   bloquear el proceso.
3. El sistema genera un documento de CV y un documento de carta a partir de
   las plantillas de Mar, con la información de esta oferta.
4. El estado de la candidatura pasa a "CV generado por IA", y quedan
   disponibles los enlaces a los dos documentos generados.
5. **Si la oferta se aplica por correo:** el sistema descarga ambos
   documentos, los une en un solo archivo, los envía por correo a la
   dirección de la oferta, marca el estado como "CV enviado" y registra la
   fecha de envío.
6. **Si la oferta se aplica por enlace:** el sistema deja los documentos
   listos (con sus enlaces guardados en la oferta) para que Mar aplique
   manualmente donde corresponda; el estado se queda en "CV generado por IA"
   hasta que Mar lo actualice a mano.

## 3.4 Aplicación manual (fuera del sistema)

Para el caso "por enlace" (hoy, la gran mayoría de las ofertas), Mar sigue el
enlace de la oferta, completa el proceso de la empresa (que puede exigir
cuenta propia, preguntas específicas o pasos adicionales fuera del control
del sistema) usando los documentos ya generados, y actualiza el estado de la
candidatura a mano cuando termina.

## 3.5 Seguimiento de respuestas de empresas

1. Cuando llega un correo nuevo a la bandeja dedicada a candidaturas, el
   sistema comprueba primero que no sea un correo enviado por la propia Mar.
2. Analiza el contenido con inteligencia artificial para decidir si es
   realmente la respuesta de una empresa a una candidatura, y si lo es,
   busca a qué oferta corresponde.
3. Si encuentra la candidatura, propone (sin aplicar todavía) un nuevo
   estado y un resumen de lo que dice la respuesta.
4. Mar revisa la propuesta y decide si la acepta, la corrige o la ignora.

## 3.6 Archivado automático

**Inmediato:** en cuanto Mar marca una candidatura como "descartada" o
"rechazada" en el listado activo, pasa **al momento** al archivo histórico,
manteniendo el orden por fecha. Si Mar cambia de opinión, poniendo el estado
"pendiente" a una candidatura del archivo, esta vuelve al listado activo.

**Dos veces al día, tras la ingesta,** una pasada programada archiva además
(y sirve de red de seguridad para las dos anteriores):

1. Toda candidatura marcada "descartada" o "rechazada" que quede en el listado.
2. Toda candidatura "pendiente" con más de 7 días desde que se guardó, sin
   que Mar haya actuado.
3. Toda candidatura "CV enviado" con 30 días o más sin respuesta y sin
   ninguna propuesta pendiente de validar — se archiva con el estado
   "sin respuesta".

Ninguna candidatura con una conversación viva (CV generado sin enviar,
respuesta recibida, entrevista, oferta) se archiva nunca automáticamente.

## 3.7 Seguimiento activo de candidaturas enviadas **[PREVISTO — mitad de M7]**

Una candidatura "CV enviado" que lleva **7 días o más** sin respuesta y sin
ninguna propuesta pendiente generará un aviso a Mar por correo con un
borrador de mensaje de seguimiento, para que decida si lo manda. No existe
todavía; solo el archivado a 30 días (3.6, punto 3) está construido.

## 3.8 Revisión de métricas del embudo

Mar puede consultar, para cada pasada de ingesta y cada fuente, cuántas
ofertas crudas entraron y cuántas sobrevivieron a cada filtro (modalidad,
salario, cualificación) y cuántas eran realmente nuevas. Sirve para decidir
si una fuente merece seguir activa y para calibrar los filtros.

# 4. Datos

**Oferta de empleo** — el registro central. Se agrupa en cuatro bloques:

- *Datos de la oferta* (los describe la empresa, no cambian): puesto,
  empresa, resumen de la descripción, tipo de aplicación (correo o enlace),
  destino de aplicación (email o URL), plataforma de origen, fecha de
  publicación. El salario y la modalidad de trabajo se capturan para filtrar
  en la ingesta pero **no se guardan** en el listado activo (tarea 19).
- *Estado del proceso* (los gestiona el sistema o Mar): estado actual de la
  candidatura (ver ciclo de vida en la sección 5), fecha en la que se
  guardó, si está marcada como destacada (encaje con IA muy alto), si está
  marcada para generar CV, fecha en la que se envió el CV (si aplica).
- *Trazabilidad de la propuesta de la IA*: el nuevo estado que la IA propone
  al detectar una respuesta de empresa, y un resumen de esa respuesta, ambos
  pendientes de validación por Mar hasta que ella los confirma.
- *Documentos y trazabilidad interna*: enlaces a los documentos de CV y
  carta generados para esa oferta; dos identificadores internos usados solo
  para detectar duplicados (uno por identidad empresa+puesto, otro por URL
  de destino) — no tienen significado para Mar y no se muestran como
  información relevante.
- *Encaje con IA*: puntuación de 0-100 y motivo en una frase, calculados al
  entrar la oferta. La marca de destacada se deriva de esta puntuación.

Una oferta vive primero en el **listado activo** y, cuando se archiva, pasa
al **archivo histórico** con los mismos datos — es el mismo tipo de
registro, solo cambia de ubicación.

**Currículum base de Mar** — un único documento de referencia (formación,
experiencia, habilidades, datos de contacto) que alimenta la generación de
cada CV adaptado. No cambia por oferta.

**Documentos generados** — un CV y una carta por cada oferta trabajada,
derivados del currículum base y de la descripción de esa oferta concreta.

**Métricas del embudo** — un registro por pasada de ingesta y fuente, con
los recuentos de ofertas en cada etapa del filtrado. Es un histórico de solo
lectura para Mar, nadie lo edita a mano.

# 5. Reglas de negocio

- **Una candidatura solo se guarda si no es duplicada.** Se considera
  duplicada si coincide con otra guardada por identidad de empresa+puesto o
  por la URL de destino, ya sea en el listado activo, en el archivo, o
  dentro de la misma pasada de ingesta que la trae.
- **El ciclo de vida del estado de una candidatura es una secuencia
  cerrada:** pendiente → CV solicitado → CV generado por IA → CV enviado →
  respuesta recibida → entrevista / oferta recibida / rechazada, con
  "descartada" como salida manual desde cualquier punto y "sin respuesta"
  como salida automática solo desde "CV enviado" (regla siguiente). El
  sistema no salta estados por su cuenta salvo en esa transición automática
  de archivado.
- **Ninguna candidatura con conversación viva se archiva automáticamente.**
  Solo se archivan en automático: descartada/rechazada (siempre — de forma
  **inmediata** al marcar el estado, o en la pasada programada si algo falla),
  pendiente sin actividad tras 7 días, y CV enviado sin respuesta tras 30 días.
- **El archivado por "descartada"/"rechazada" es reversible:** poner el estado
  "pendiente" a una candidatura del archivo la devuelve al listado activo.
- **El sistema nunca decide en solitario si una respuesta de empresa
  significa avance o rechazo** — siempre dejar la propuesta en un campo
  aparte, pendiente de que Mar la valide, nunca sobrescribir el estado
  directamente.
- **Si el paso de revisión de estilo del texto generado falla, se usa el
  texto original sin bloquear la generación** — nunca dejar a Mar sin CV
  por un fallo de un paso no esencial.
- **El resumen de una oferta se recorta a un tamaño razonable** (~800
  caracteres) al guardarla, después de que todos los filtros la hayan visto
  completa — el recorte no debe influir en ninguna decisión de filtrado, solo
  en cómo se guarda.
- **Una oferta sin salario indicado nunca se descarta por el filtro de
  salario** — el filtro solo actúa cuando el dato existe.
- **[PREVISTO — M1]** La puntuación de encaje nunca descarta una oferta por
  sí sola al introducirse; es solo información para priorizar la revisión de
  Mar, hasta que se decida lo contrario con datos reales.

# 6. Casos límite

- **Una fuente externa no responde o da error:** se registra el fallo, se
  avisa a Mar por correo, y el resto de fuentes sigue su curso con
  normalidad — un fallo aislado nunca detiene la pasada completa.
- **Ninguna oferta nueva en una pasada:** no pasa nada visible para Mar; no
  se manda aviso de "ofertas nuevas" (solo se manda si hay al menos una).
- **Ninguna candidatura que archivar en una pasada:** el sistema debe
  registrar igualmente que la pasada ha corrido con normalidad, aunque no
  haya movido nada.
- **Dos procesos escriben sobre la misma candidatura casi a la vez** (por
  ejemplo, llega una respuesta de empresa justo cuando corre la ingesta):
  ambos escriben en columnas distintas de la misma oferta, así que no se
  pisan entre sí siempre que no coincidan exactamente en el mismo instante;
  el sistema separa sus horarios para minimizar la ventana de solape.
- **Una respuesta de empresa no se puede vincular a ninguna candidatura
  conocida:** el sistema no propone nada y sigue sin error; Mar puede
  revisarlo manualmente si hace falta.
- **La oferta trae datos incompletos** (sin empresa, sin salario, resumen
  vacío): se guarda igual con el valor que falte marcado como "no
  especificado"; nunca se descarta solo por faltar un dato no esencial.
- **El texto de una oferta intenta interferir con las instrucciones de
  generación del CV** (contenido malicioso incrustado en la descripción):
  el sistema aísla y limpia el texto de la oferta antes de usarlo, y nunca
  dejaría que ese texto sustituyera las instrucciones que sigue el
  generador. (Ver hueco pendiente en la sección 9 — esta defensa nunca se
  ha probado a fondo frente a intentos deliberados.)
- **Se genera un CV o carta con un dato inventado que no está en el
  currículum base:** no debería ocurrir por diseño (el generador solo debe
  usar los datos que se le entregan), pero no hay una verificación
  automática que lo detecte si ocurriera — hoy depende de que Mar lo revise
  antes de enviar.
- **Falla la generación de un documento a mitad de proceso** (por ejemplo,
  un fallo temporal del servicio que crea el documento): el sistema
  reintenta automáticamente varias veces antes de darse por vencido y
  avisar del error.

# 7. Requisitos no funcionales

- **Privacidad y protección de datos** — ver [03-legal.md](03-legal.md)
  completo. En resumen: sistema de uso estrictamente personal (riesgo mínimo
  bajo el AI Act), datos propios de Mar sin restricción especial, datos de
  contacto de recruiters que responden por correo tratados bajo interés
  legítimo con minimización (solo se guarda un resumen corto, nunca el
  correo completo), sin datos de categorías especiales en ningún punto.
- **Retención:** los datos se conservan indefinidamente mientras el sistema
  esté en uso activo; las candidaturas resueltas o caducadas se mueven a un
  archivo histórico en vez de borrarse. No hay una purga automática por
  antigüedad.
- **Cadencia, no tiempo real:** la ingesta y el archivado corren dos veces
  al día en horario fijo; el seguimiento de respuestas reacciona en cuanto
  llega un correo nuevo; la generación de CV corre cuando Mar marca una
  oferta, sin un tiempo de respuesta garantizado más allá de "en la próxima
  pasada o al momento, según el paso".
- **Idioma:** el sistema detecta el idioma de cada oferta (español o inglés)
  y genera el CV, la carta y las notificaciones en ese idioma
  automáticamente, sin que Mar tenga que elegirlo.
- **Resiliencia frente a fallos de servicios externos:** cualquier paso que
  dependa de un servicio de terceros (fuentes de ofertas, generación de
  documentos, envío de correo, generación de texto con IA) debe reintentar
  automáticamente antes de darse por vencido, y un fallo en un paso no
  esencial nunca debe impedir que el resto del proceso continúe.
- **Vigilancia:** cada proceso automático debe poder detectarse a sí mismo
  si deja de ejecutarse cuando debería, y avisar a Mar — no basta con que
  "no dé error", tiene que confirmarse que corrió.
- **Accesibilidad:** no aplica como requisito formal — un único usuario
  técnico, sin necesidad de adaptar la interfaz a perfiles distintos.
- **Transparencia del contenido generado por IA:** no es una obligación
  legal en el uso actual (ver [03-legal.md](03-legal.md) sección 4), pero es
  buena práctica que el propio CV/carta no contenga ninguna marca de agua
  o artefacto que delate su origen de forma involuntaria — ya cubierto por
  el paso de revisión de estilo (3.3, punto 2).

# 8. Fuera de alcance

- **Envío autónomo de candidaturas sin revisión humana** a portales
  distintos del correo. Barreras confirmadas: no existe API de candidato en
  los principales portales, los términos de servicio de varios de ellos
  prohíben la automatización, y cada portal exige un recorrido distinto
  (cuenta propia, preguntas específicas, pasos adicionales) que hace
  arriesgado un envío sin que una persona lo revise antes. **[PREVISTO,
  solo si los datos lo justifican]** un primer paso mide a qué dominio
  final lleva cada enlace de "aplicar", y solo si un patrón claro emerge se
  plantearía un asistente que deja el formulario listo pero nunca envía sin
  que Mar dé la confirmación final. Automatizar el envío en portales que
  prohíben la automatización, en particular LinkedIn, queda descartado.
- **Multiusuario o roles distintos.** El sistema está diseñado para una
  única usuaria; no hay previsto compartirlo ni ofrecerlo a terceros bajo
  ningún caso de uso.
- **Evaluación o selección de candidatos por parte de terceros.** El sistema
  no se usa nunca desde el lado de un empleador; si en el futuro se
  planteara ese uso, sería un proyecto distinto y no una extensión de este
  (ver [03-legal.md](03-legal.md) sección 6).
- **Poda de fuentes de pago sin datos que la respalden [M4]**, y **mover el
  sistema fuera del ordenador de Mar [M6]** — ambas evaluadas y aplazadas
  hasta tener más datos o justificar el coste; no forman parte de este spec
  mientras sigan en esa situación.
- **La versión comercial del producto ("Jobs App")** es un proyecto aparte,
  con sus propias restricciones y su propio spec — no se documenta aquí.

# 9. Preguntas abiertas

1. **Seguridad frente a manipulación del contenido de las ofertas y de los
   correos de respuesta** (inyección de instrucciones): el sistema tiene una
   defensa básica (aislar y limpiar el texto externo antes de usarlo en los
   prompts), pero nunca se ha sometido a una prueba deliberada de ataque. Es
   el Paso 16 (red team) pendiente de programar — ¿lo hacemos antes o
   después de construir M1 (que añade otro punto donde el texto de la
   oferta llega a un generador de IA)?
2. **Umbral y momento de descarte automático por la puntuación de encaje
   [M1]:** hoy la decisión es "solo puntuar, no descartar al principio".
   ¿Qué umbral y con cuántas semanas de datos se decide activar el descarte
   automático?
3. **Qué pasa si Mar corrige repetidamente la misma propuesta de la IA en el
   seguimiento de respuestas** (3.5): hoy no hay ningún mecanismo que
   aprenda de esas correcciones. ¿Merece la pena, o el volumen es
   demasiado bajo para justificarlo?
4. **Purga de datos antiguos:** no hay política de borrado por antigüedad
   (sección 7). ¿Se define alguna, o se deja indefinido mientras el
   proyecto siga activo?
5. **Alcance exacto del "asistente que deja el formulario listo" (sección
   8, envío autónomo, paso 2):** solo se construye si el paso de medición
   (paso 1) muestra que la mayoría de ofertas caen en un número reducido de
   portales estandarizados. ¿Confirmamos ese criterio de decisión antes de
   invertir tiempo en medirlo?

---

No olvides invocar `/bitacora` para registrar las decisiones de esta fase
mientras siguen frescas.

# Relacionado

- [Índice de docs](index.md)
- [Revisión legal — AI Act y RGPD](03-legal.md)
- [Evaluación del pipeline y mejoras propuestas (M1–M8)](jobs-evaluacion.md) —
  fuente de todo lo marcado [PREVISTO]
- [Tareas pendientes](tareas-pendientes.md)
