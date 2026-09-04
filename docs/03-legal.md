---
type: Nota
title: Revisión legal — AI Act y RGPD · Jobs
description: Clasificación de riesgo del pipeline Jobs bajo el Reglamento (UE) 2024/1689 (AI Act) y su estado RGPD, con la sección separada de qué cambia al comercializar (Jobs App). Escrito fuera de orden (Paso 4 del método, tarea 16 de tareas-pendientes.md), tras construir el sistema.
tags: [n8n, empleo, legal, ai-act, rgpd]
timestamp: 2026-09-04T00:00:00Z
---

> **Esto no es asesoramiento jurídico.** Es un análisis de apoyo hecho por
> Claude Code a partir de la documentación del proyecto y de fuentes públicas
> consultadas el 4 sep 2026. Donde la conclusión no sea "riesgo mínimo" claro,
> el documento termina con las preguntas concretas que llevar a un abogado.

# 0. Nota de proceso

Este documento se escribe **fuera de orden**: `Jobs` se construyó sin pasar
por el Paso 4 del método (no existen `docs/00-problema.md`,
`01-historias.md` ni `02-mvp.md`). El contexto de "qué hace el sistema" se ha
reconstruido leyendo los docs reales del pipeline
([index.md](index.md)) en vez de esos tres ficheros. Es la tarea 16 de
[tareas-pendientes.md](tareas-pendientes.md), pedida por Mar el 3 sep 2026.

# 1. Qué hace este sistema en términos legales

`Jobs` es un conjunto de 4 workflows de n8n, **autohospedados** en el
portátil de Mar (Docker local, no n8n Cloud), que automatizan su propia
búsqueda de empleo:

- **[Jobs · ingesta](jobs-ingesta.md)** — recoge ofertas públicas de 13
  fuentes (LinkedIn, Infojobs, RemotoJob, We Work Remotely, RSS/APIs varias),
  las filtra por teletrabajo/salario/cualificación y las guarda en una hoja
  de Google Sheets (`n8n_jobs`).
- **[Jobs · generación CV](jobs-generacion-cv.md)** — cuando Mar marca una
  oferta, adapta su CV y carta de presentación a esa oferta con
  `claude-sonnet-5`, reescribe la prosa con `gpt-4.1-mini` de OpenAI
  ("humanización") y genera los documentos en Google Docs; según el tipo de
  oferta, los envía por email o deja el enlace para que Mar aplique a mano.
- **[Jobs · seguimiento](jobs-seguimiento.md)** — lee las respuestas de
  empresas que llegan a una etiqueta de Gmail, con un agente de IA
  (`claude-sonnet-5`) que propone (nunca aplica solo) un nuevo estado de la
  candidatura.
- **[Jobs · archivado](jobs-archivado.md)** — mueve ofertas descartadas o
  gestionadas de la hoja activa a un archivo.

**Finalidad:** herramienta personal de Mar para buscar empleo para sí misma.
**Quién la usa:** solo Mar. Nadie más tiene acceso ni la usa como servicio.
**Datos que trata:**
- **De Mar:** su CV base (Google Doc/JSON en Drive: formación, experiencia,
  habilidades, contacto), las cartas de presentación generadas, su bandeja de
  Gmail (correspondencia con empresas), su hoja de candidaturas.
- **De terceros — empresas/ofertas:** datos públicos de ofertas de empleo
  (puesto, empresa, salario, modalidad, descripción, enlace) — datos
  mayoritariamente de personas jurídicas, no de personas físicas.
- **De terceros — personas físicas:** el contenido de los emails que
  recruiters/personas de RRHH envían a Mar respondiendo a sus candidaturas
  (nombre, email, texto de la respuesta), leído por
  [Jobs · seguimiento](jobs-seguimiento.md).
- **Sin datos de categorías especiales** (salud, ideología, religión,
  orientación sexual, origen étnico, biometría) en ningún punto del pipeline.
- **Sin menores** implicados.

**Quién responde:** Mar, como responsable del despliegue de herramientas de
terceros (Anthropic, OpenAI, Google) que usa para sí misma — no como
proveedora de un sistema de IA puesto en el mercado (ver sección 6 para el
matiz de "Jobs App").

# 2. Clasificación AI Act

**Fuente verificada hoy (4 sep 2026), no de memoria** — el "Digital Omnibus"
de simplificación del AI Act fue aprobado por el Parlamento Europeo el 16 jun
2026 y por el Consejo el 29 jun 2026, y **aplazó las obligaciones de alto
riesgo del Anexo III** del 2 de agosto de 2026 al **2 de diciembre de 2027**
(las del Anexo I, a agosto de 2028). Lo que **sigue vigente hoy**: las
prohibiciones (art. 5), la alfabetización en IA (art. 4, desde feb 2025) y las
obligaciones de transparencia del art. 50.

- [Calendario del EU AI Act 2026: fechas y Digital Omnibus](https://joseenrique.es/calendario-cumplimiento-eu-ai-act/)
- [AI Act: obligaciones desde el 2 de agosto de 2026 (y qué se aplaza a 2027)](https://www.lisdatasolutions.com/es/blog/reglamento-europeo-de-ai-act-que-cambia-2026/)
- [Ómnibus Digital: qué cambia del AI Act (y qué no) en 2026](https://evosysthemia.com/omnibus-digital-ai-act-que-cambia-2026/)
- [IA en RRHH: Sistemas de alto riesgo y multas en 2026 (Anexo III.4)](https://www.audidat.com/blog/inteligencia-artificial-responsable/ley-de-inteligencia-artificial-en-2026-sistemas-empleo/)

**Anexo III.4 (empleo)** clasifica como alto riesgo los sistemas de IA
destinados a **reclutar o seleccionar personas** — publicar ofertas de forma
dirigida, filtrar candidaturas, evaluar candidatos, o decidir sobre
condiciones laborales, promoción o despido. Es el lado del **empleador/
reclutador**.

`Jobs` está en el lado contrario: es Mar, como **candidata**, filtrando
*ofertas* para sí misma. No evalúa personas, no decide sobre nadie, no lo usa
ninguna empresa para seleccionar candidatos. **No encaja en Anexo III.4.**

**Veredicto: riesgo mínimo.**

**Papel de Mar:** responsable del despliegue (art. 3.4 AI Act) de los
sistemas de IA de terceros que integra (Claude/Anthropic, GPT-4.1-mini/
OpenAI) para su propio uso — no proveedora de un sistema de IA que pone en el
mercado. Anthropic y OpenAI son los proveedores de los modelos subyacentes;
sus obligaciones de proveedor (marcado de contenido sintético, documentación
técnica, gestión de riesgos del modelo) son suyas, no de Mar.

# 3. Salida rápida

Riesgo mínimo confirmado → **se puede pasar al Paso 5 sin más trámite**. Las
pocas obligaciones que aun así aplican:

1. **Alfabetización en IA (art. 4)** — ya cumplida de facto: Mar conoce el
   funcionamiento, los límites y los riesgos de los sistemas de IA que usa
   (bootcamp de AI Engineering en curso, y ha construido el propio pipeline).
2. **Prohibiciones del art. 5** — ninguna práctica prohibida presente
   (no hay manipulación subliminal, scoring social, categorización
   biométrica sensible, ni explotación de vulnerabilidades). No requiere
   ninguna acción.
3. **Nota de transparencia (no una obligación estricta del art. 50, ver
   sección 4)** sobre el contenido generado — buena práctica, no bloqueo.

No se infla más este documento: no aplican registro en base de datos de la
UE, evaluación de conformidad, marcado CE, ni human oversight formal — esas
son obligaciones de alto riesgo que no tocan a `Jobs`.

# 4. Obligaciones convertidas en requisitos verificables

Como riesgo mínimo, no hay obligaciones legales duras que traducir a la
spec. Las dos siguientes son recomendaciones de buena práctica, verificables,
que sí merece la pena dejar escritas:

- **[Recomendado, no obligatorio] El CV y la carta que `Jobs` genera y envía
  a una empresa real no llevan ninguna marca de que su prosa fue reescrita
  por IA.** El art. 50 AI Act obliga a etiquetar contenido sintético en
  supuestos concretos (deepfakes de imagen/audio/vídeo, texto publicado para
  informar al público sobre asuntos de interés general sin revisión humana);
  un CV enviado a un reclutador no encaja en ninguno de esos supuestos, así
  que **no hay obligación legal de etiquetarlo**. Sigue siendo una zona gris
  de honestidad frente al empleador — criterio de Mar, no requisito legal.
- **[Ya cumplido] Cualquier fallo de la humanización con OpenAI cae al texto
  original de Claude, sin bloquear el envío** — evita que un contenido a
  medio generar o corrupto llegue a una empresa real. Ya implementado
  (`_humanizado: false` + fallback, ver [jobs-generacion-cv.md](jobs-generacion-cv.md)).

# 5. RGPD

**Base legal de cada tratamiento:**
- Datos propios de Mar (CV, candidaturas, correspondencia) — no aplica el
  RGPD entre Mar y sí misma; el reglamento regula cómo trata datos de
  *otros*.
- Datos de contacto y correspondencia de recruiters que responden por email —
  **interés legítimo** (art. 6.1.f): gestionar sus propias candidaturas de
  empleo es un interés legítimo evidente, proporcional, y el tratamiento
  (leer un email dirigido a ella, clasificarlo con IA para proponer un
  estado) no afecta desproporcionadamente al recruiter.
- Datos de ofertas de empleo (empresa, puesto, salario) — información
  pública ya publicada por la propia empresa; en su mayoría datos de persona
  jurídica, fuera del RGPD.

**Exención de actividad doméstica (art. 2.2.c RGPD) — con matiz, no
blanco o negro:**
- Para los **datos propios** de Mar, el tratamiento es puramente personal:
  exento sin duda.
- Para los **datos de terceros** (el contenido de los emails de recruiters),
  la jurisprudencia del TJUE (caso *Lindqvist*, C-101/01) recorta la
  exención doméstica cuando los datos se exponen a un número indefinido de
  personas o se procesan con medios que superan lo puramente privado. Aquí
  no hay publicación ni difusión — el email se queda entre Mar, el agente de
  IA (que corre local) y las llamadas a la API de Anthropic para
  clasificarlo — pero sí hay un proveedor cloud de por medio. **Postura
  conservadora recomendada:** tratar ese tratamiento concreto (lectura y
  clasificación de emails de terceros) como si el RGPD aplicara en su
  totalidad, aunque la exención probablemente lo cubra. No cambia nada en la
  práctica porque los puntos siguientes (minimización, plazo, proveedores)
  ya se cumplen o son fáciles de cumplir.

**Minimización — qué datos NO se piden ni se guardan:**
- No se piden datos de categorías especiales en ningún formulario ni prompt.
- El agente de seguimiento solo extrae `id_unico`, `estado_propuesto` y
  `resumen_respuesta` del email — no guarda el email completo ni datos de
  contacto del recruiter en la hoja.

**Plazo de conservación:** indefinido mientras el proyecto esté activo (es
una herramienta de trabajo en uso, no un archivo histórico); las ofertas
descartadas se mueven a `Archivo` en vez de borrarse. Sin plazo de purga
definido — no es un problema legal (los datos son en su mayoría propios o de
interés legítimo activo), pero sí sería higiene razonable revisar
`Archivo` de vez en cuando y borrar lo que ya no sirva.

**Dónde se alojan los datos:**
- **n8n:** autohospedado en el portátil de Mar (Docker local,
  `C:\AI Engineering\n8n\Docker n8n`) — no sale de su máquina salvo las
  llamadas a las APIs de terceros.
- **Hoja de cálculo y documentos:** Google Sheets/Docs/Drive — Google es
  encargado del tratamiento bajo su propio Acuerdo de Tratamiento de Datos
  (DPA) de Google Workspace/Cuenta personal.
- **Gmail:** ídem, Google como encargado.
- **Anthropic (Claude):** recibe el CV base, la oferta y el texto de los
  emails de seguimiento vía API — encargado del tratamiento, DPA propio.
- **OpenAI (gpt-4.1-mini):** recibe el HTML del CV/carta para "humanizar" la
  prosa — encargado del tratamiento, DPA propio.

**Transferencias fuera de la UE:** tanto Anthropic como OpenAI son empresas
estadounidenses; sus DPA se apoyan en Cláusulas Contractuales Tipo (SCC) de
la Comisión Europea. Es el mismo mecanismo que usa cualquier empresa europea
que use estas APIs — no hay nada específico de `Jobs` que lo agrave.

**Encargados del tratamiento:** Google, Anthropic, OpenAI — los tres bajo sus
DPA estándar, aceptados al crear la cuenta/API key. No hace falta un DPA
adicional porque Mar es usuaria particular, no una organización que
subcontrata en nombre de terceros.

**Derechos de los interesados:** los recruiters cuyos emails procesa
`Jobs · seguimiento` podrían, en teoría, ejercer derechos RGPD (acceso,
supresión) sobre el resumen que la IA guarda de su respuesta. En la
práctica, el volumen de datos guardado de ellos es mínimo (un resumen corto
de la respuesta, no el email completo) y no hay canal de contacto publicado
para ejercerlos — riesgo bajo, pero si algún día alguien lo pidiera, Mar
puede borrar la fila/celda correspondiente a mano.

**DPIA (evaluación de impacto):** no requerida. No hay tratamiento a gran
escala, no hay categorías especiales, no hay decisiones automatizadas sobre
personas con efectos jurídicos, y el volumen (candidaturas de una sola
persona) está muy lejos de los umbrales que la disparan.

# 6. Líneas rojas

**Ninguna que obligue a rediseñar `Jobs` tal y como está.** El uso personal
actual no toca ninguna prohibición ni ningún supuesto de alto riesgo.

**Lo que sí cambiaría al comercializar ("Jobs App"):** Mar ya tiene un MVP
separado, **Jobs App** (`Jobs App · ingesta`, `Rw4dTNjQa5tR3Eo4`), pensado
para ofrecerse a otras personas. `Jobs` (este proyecto) seguirá siendo de uso
personal — esta sección cubre solo qué cambiaría **si Jobs App** empezara a
dar servicio a reclutadores o empresas para filtrar/evaluar candidatos de
terceros (no si se limita a replicar el rol de "asistente del candidato" para
más usuarios, que seguiría siendo riesgo mínimo, solo que ahora sí como
proveedor de un producto):

1. **Si Jobs App se ofrece a candidatos** (mismo rol que `Jobs`, para más
   gente): sigue en riesgo mínimo, pero Mar pasa a ser **proveedora** de un
   sistema de IA en el mercado (no solo responsable del despliegue) —
   aplicarían los deberes ligeros de transparencia del art. 50 de forma más
   estricta (informar claramente que el CV/carta pasan por IA) y un aviso de
   privacidad RGPD formal (ya no cubre la exención doméstica, hay usuarios
   terceros).
2. **Si Jobs App se ofrece a empresas/reclutadores** para publicar ofertas
   dirigidas, filtrar candidaturas o evaluar candidatos: **entra en Anexo
   III.4, alto riesgo**, con obligaciones exigibles desde el 2 de diciembre
   de 2027 — sistema de gestión de riesgos, supervisión humana significativa,
   registro en la base de datos de la UE, evaluación de conformidad,
   documentación técnica y DPIA obligatoria en RGPD. Es un salto de
   complejidad y coste real; recomendación de Claude si ese escenario llega a
   plantearse en serio: tratarlo como un proyecto legal aparte, con abogado
   especializado en AI Act desde el diseño, no como una extensión de este
   documento.

# 7. Alfabetización en IA

El art. 4 AI Act exige a proveedores y responsables del despliegue "medidas
para garantizar, en la mayor medida posible, un nivel suficiente de
alfabetización en IA" de su personal y de cualquier persona que opere el
sistema en su nombre. Para Mar, que es la única usuaria y además quien lo ha
diseñado y construido con ayuda de Claude Code, esto ya está cubierto por su
propia formación (bootcamp de AI Engineering) y por el propio proceso de
construcción del pipeline (entender cómo funcionan los prompts, los
límites de la IA, por qué puede alucinar, por qué hace falta el fallback de
humanización, etc.). No requiere ninguna acción adicional mientras `Jobs`
siga siendo de uso estrictamente personal.

# 8. Qué hay que volver a mirar antes de publicar

Lista corta para el Paso 17, **solo si `Jobs` deja de ser de uso
estrictamente personal** (se comparte con otra persona, se ofrece como
servicio, o se convierte en la base de Jobs App):

1. Releer la sección 6 (líneas rojas) y confirmar en qué escenario cae la
   nueva versión (candidato vs. reclutador).
2. Si hay usuarios terceros: escribir un aviso de privacidad RGPD real (ya no
   cubre la exención doméstica) — base legal, plazo de conservación,
   derechos, y encargados del tratamiento (Google/Anthropic/OpenAI) listados
   explícitamente.
3. Si hay usuarios terceros: verificar que el art. 50 (transparencia de
   contenido generado por IA) se cumple de forma visible en el producto, no
   solo en la documentación interna.
4. Si el destinatario pasa a ser una empresa/reclutador (no un candidato):
   parar y tratarlo como proyecto de alto riesgo del Anexo III.4 desde cero,
   con asesoría legal — no extender este documento.
5. Volver a comprobar en fuente oficial (Comisión Europea / EUR-Lex / AEPD)
   si el calendario del Digital Omnibus (dic 2027 para Anexo III) se ha
   movido otra vez — el propio documento que verificó esta fecha (4 sep 2026)
   señala que ya se ha movido una vez.

# Preguntas para un abogado (si `Jobs` cambia de escenario)

Solo aplica si se activa alguno de los escenarios de la sección 6. Con el
uso personal actual, no hace falta consultar a nadie:

1. ¿La exención de actividad doméstica del art. 2.2.c RGPD cubre el
   tratamiento de los emails de recruiters vía API de terceros (Anthropic),
   o conviene tratarlo como tratamiento no exento desde ya, con registro de
   actividades de tratamiento?
2. Si Jobs App se ofrece a candidatos como producto: ¿qué formato mínimo de
   aviso de transparencia del art. 50 basta para un CV/carta generado con
   IA?
3. Si Jobs App se ofrece a reclutadores: alcance exacto de "supervisión
   humana significativa" exigible bajo Anexo III.4 y coste estimado de la
   evaluación de conformidad.

# Relacionado

- [Índice de docs](index.md)
- [Evaluación del pipeline y mejoras propuestas (M1–M8)](jobs-evaluacion.md) —
  M6 es el plan de comercialización que activaría la sección 6 de este doc.
- [Tareas pendientes](tareas-pendientes.md) — tarea 16.
