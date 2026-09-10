---
type: Nota
title: Case study · Jobs
description: El proyecto Jobs contado hacia fuera — problema, solución, decisiones clave, papel de la IA, cumplimiento legal y resultados reales. Paso 19 del método de 20 pasos, escrito el 10 sep 2026.
tags: [n8n, empleo, case-study]
timestamp: 2026-09-10T00:00:00Z
---

> **Nota de alcance.** Este documento mira hacia fuera: lo puede leer alguien
> que no conoce el proyecto. Se apoya en la documentación real del pipeline
> ([index.md](index.md)), en [04-spec.md](04-spec.md), [03-legal.md](03-legal.md),
> [jobs-evaluacion.md](jobs-evaluacion.md) y en la [bitácora](bitacora.md). El
> proyecto se construyó sin los pasos 1–3 del método (no hay `00-problema.md`,
> `01-historias.md` ni `02-mvp.md`), sin sistema de evals (Paso 14) y sin prueba
> con usuarios; las secciones afectadas lo dicen de forma explícita y no se
> rellenan con cifras inventadas.

# 1. En una frase

**Jobs** hace el trabajo repetitivo de buscar empleo cualificado en remoto
—rastrear ofertas en una docena de portales, filtrarlas, adaptar el CV y la
carta a cada una y seguir las respuestas de las empresas— para **una sola
persona: su autora**. No es un producto ni un servicio; es una herramienta
personal montada con n8n sobre una hoja de cálculo.

# 2. El problema

Buscar trabajo cualificado en remoto obliga a repasar a diario diez o doce
portales, cada uno con su propio formato y su propio buscador. La mayoría de lo
que aparece no encaja: pide un idioma que no se habla, un nivel *senior*, o es
directamente de otra profesión. Descartar esas ofertas una a una consume la
mañana. Y para cada oferta que sí interesa hay que reescribir el CV y la carta
para que hablen de esa empresa y ese puesto concretos.

El tiempo se va en **buscar y redactar**, no en **decidir y aplicar**, que es lo
único que de verdad requiere criterio.

La escala del ruido, medida sobre datos reales del propio sistema: de cada
**248 ofertas** que entran, unas **15** superan los filtros básicos, y de esas
15 buena parte siguen sin encajar y hay que descartarlas a mano. En una pasada
reciente, de 60 ofertas que pasaron el filtro de salario quedaron 21 tras el de
perfil, y su autora las calificó de «no perfectas, pero pasables».

# 3. El usuario

**Mar.** Está en el lado del **candidato**, no del reclutador: filtra *ofertas*
para sí misma, no *personas* para nadie. Viene de un perfil de **operaciones**
(varios años de experiencia) y se está reorientando a **AI Engineering** (un
bootcamp en curso, más un grado universitario previo). Habla español, catalán e
inglés. Es una usuaria técnica: ha construido ella misma el pipeline con ayuda
de Claude Code.

Es la **única** usuaria. Nadie más ve el sistema ni lo usa. Eso condiciona todo
el diseño: la interfaz es su hoja de cálculo, no hay cuentas de usuario, ni
permisos, ni nada pensado para un segundo perfil.

# 4. Qué se construyó

El recorrido del MVP, contado como lo vive Mar:

1. **Ingesta (sin que ella haga nada).** Dos veces al día el sistema recoge
   ofertas de 13 fuentes, descarta las que no son remotas, las de salario bajo,
   las que no encajan con su perfil y las repetidas, y deja las nuevas en una
   hoja (`Ofertas_activas`), ordenadas por fecha. Si hay novedades, recibe un
   correo con el resumen. Si una fuente falla, las demás siguen y le llega un
   aviso.
2. **Revisión.** Abre la hoja cuando quiere. Cada oferta trae puesto, empresa,
   fechas, estado, y una **puntuación de encaje de 0 a 100** con un motivo en una
   frase, para revisar primero las mejores. Marca una casilla «generar CV» en
   las que le interesan.
3. **Generación de CV y carta.** En unos minutos, para cada oferta marcada, el
   sistema adapta su CV y su carta a esa oferta con IA, **en el idioma de la
   oferta**, retoca la redacción para que no suene a plantilla, y crea los dos
   documentos en Google Docs. La hoja pasa a «CV generado» y aparecen los
   enlaces.
4. **Envío.** Si la oferta se aplica **por correo**, el sistema manda los dos
   documentos en PDF y marca «CV enviado». Si se aplica **por un enlace** (la
   gran mayoría), deja los documentos listos y Mar aplica ella misma en el
   portal de la empresa.
5. **Seguimiento.** Cuando una empresa responde por correo, la IA lee el
   mensaje, localiza la candidatura y **propone** un cambio de estado y un
   resumen — pero no lo aplica. Mar valida.
6. **Archivado.** Las candidaturas que marca como «descartada» o «rechazada»
   pasan al archivo **al instante**; una pasada dos veces al día recoge además
   las que llevan mucho tiempo sin movimiento.

# 5. Decisiones clave

## 5.1 La hoja de cálculo se queda como base de datos *y* como interfaz

**Qué se eligió:** seguir usando una hoja de Google como estado del sistema.
**Qué se descartó:** migrar a una base de datos de verdad (PostgreSQL o
similar). **Por qué:** la mitad de los incidentes del proyecto vienen de la hoja
—filas vacías intercaladas, formato que se pierde, dos procesos escribiendo a la
vez sin bloqueo—, así que la tentación de migrar era real. Pero la hoja es
**también la pantalla desde la que Mar trabaja**: ahí marca las ofertas y revisa
las propuestas de la IA. Cambiar la base de datos significaría construir una
interfaz desde cero. En su lugar se estabilizó la hoja con tres medidas (un modo
de escritura que siempre añade al final del bloque de datos, un script de
mantenimiento que corre cada hora, y un guardarraíl que avisa por correo si
reaparecen las filas vacías). El producto con interfaz propia ya existe, además,
como proyecto separado.

## 5.2 Cuatro automatizaciones independientes, no una

**Qué se eligió:** partir el sistema en cuatro piezas —ingesta, generación de
CV, seguimiento, archivado— que se activan y depuran por separado, cada una con
su propio aviso de «he dejado de ejecutarme». **Qué se descartó:** el diseño
original, un único flujo de 71 pasos con dos disparadores. **Por qué:** en el
flujo único, un error en cualquier punto tumbaba todo, incluido lo que no tenía
ninguna relación con el fallo. Ocurrió: una referencia a un paso escrita sin
tilde dejó la ingesta caída **ocho días** sin que saltara ninguna alarma.

## 5.3 La IA propone, la persona decide

**Qué se eligió:** en el punto donde más tienta automatizar del todo
—interpretar si la respuesta de una empresa es un avance o un rechazo— el
sistema **nunca escribe el estado**: lo deja en una casilla aparte para que Mar
lo confirme. **Qué se descartó:** que el agente actualizara el estado
directamente. **Por qué:** un cambio de estado equivocado es caro de detectar y
de revertir, y el criterio humano sobre «qué significa este correo» es
justamente lo que no conviene delegar.

## 5.4 Dos modelos de IA en cadena para el CV, por un motivo concreto

**Qué se eligió:** Claude redacta el CV y la carta; después, un modelo más
barato de OpenAI reescribe **solo la prosa**. **Qué se descartó:** dejar el
texto tal como sale de Claude. **Por qué:** no es una cuestión de calidad. El
texto que genera Claude lleva una marca de agua textual, y reescribir la prosa
con otro modelo la elimina. Si ese segundo paso falla por cualquier motivo, se
usa el texto original de Claude sin bloquear el envío.

# 6. Arquitectura

Todo corre en el ordenador de Mar, dentro de **n8n** (una herramienta para
encadenar automatizaciones con poco código). El **estado** del sistema —qué
ofertas hay y en qué punto está cada una— vive en una **hoja de Google**. Cuatro
automatizaciones leen y escriben en esa hoja: una trae ofertas y las filtra,
otra genera los documentos, otra vigila el correo, otra archiva. Los servicios
externos (portales de empleo, Google Docs, Gmail, los modelos de IA) se llaman
por internet; si uno falla, se reintenta, y si sigue fallando se avisa por
correo sin parar el resto.

```
   13 fuentes de empleo
           │
           ▼
      [ INGESTA ]   filtros en cascada:
                    remoto → salario → perfil → duplicados
                    + puntuación de encaje 0–100 (IA, modelo barato)
           │
           ▼
  ┌───────────────  HOJA DE CÁLCULO  ───────────────┐
  │        Ofertas_activas · Archivo · Métricas      │
  └──▲───────────────▲───────────────────▲──────────┘
     │               │                   │
 Mar marca     [ GENERACIÓN CV ]   [ SEGUIMIENTO ]     [ ARCHIVADO ]
"generar CV"   Claude → OpenAI     lee Gmail;          instantáneo al
     │         → Google Docs       la IA propone       marcar descartada
     ▼               │             estado; Mar valida  + red de seguridad
 revisa y        email  (~6 %, automático)             2 ×/día
 prioriza       enlace (~94 %, aplica Mar a mano)
```

Cada una de las cuatro automatizaciones tiene un «hombre muerto»: un servicio
externo espera un ping periódico y avisa si deja de llegar.

# 7. El papel de la IA

## Qué hace la IA

1. **Puntuar el encaje** de cada oferta con el perfil de Mar (0–100 más un
   motivo en una frase), con un modelo barato (Claude Haiku). **Solo informa;
   no descarta ninguna oferta.**
2. **Redactar** el CV y la carta adaptados a cada oferta (Claude Sonnet).
3. **Reescribir la prosa** para quitar el tono genérico y la marca de agua
   (GPT-4.1-mini de OpenAI).
4. **Leer las respuestas de empresas** y proponer un nuevo estado de la
   candidatura (Claude Sonnet, como agente con la hoja como herramienta de
   consulta).

## Qué se resolvió con código normal

Todo el filtrado —modalidad, salario, idioma, nivel de seniority, profesión— son
**reglas explícitas** sobre el título de la oferta. La detección de duplicados
es un *hash* de la empresa y el puesto, más otro de la URL. El archivado son
condiciones de fecha. El reparto por fuente y el embudo de filtrado son
recuentos. La IA no decide ninguna de esas cosas.

## Dónde se paró en la escalera de complejidad, y por qué

La contención fue deliberada. Cada punto donde se decidió **no** subir un
peldaño está anotado con su motivo:

- **No hay ningún agente que aplique a las ofertas por sí solo.** Se estudió y
  se descartó: no existe API de candidato en los portales, varios prohíben la
  automatización en sus términos de servicio, y cada portal exige un recorrido
  distinto (cuenta propia, preguntas específicas, a veces un vídeo). Un envío
  mal rellenado **no se puede deshacer**. La única rama automatizable de punta a
  punta —aplicación por correo— ya lo está, y cubre solo el ~6 % de los casos.
- **El scoring no descarta nada todavía.** Se prefiere perder tiempo revisando
  ofertas de más antes que perder una oferta buena por un umbral mal calibrado.
  La decisión de cortar por debajo de una nota se pospuso a tener semanas de
  datos.
- **El seguimiento no aprende** de las correcciones que hace Mar sobre las
  propuestas de la IA: el volumen (candidaturas de una sola persona) no lo
  justifica.
- **La puntuación de encaje no lee el perfil completo:** se le pasa un resumen,
  para no añadir una dependencia de Google Drive a la ingesta.

# 8. Seguridad y cumplimiento

## Guardrails construidos

- **Aislamiento del texto externo.** El texto de cada oferta y de cada correo se
  envuelve entre delimitadores, se le quita el HTML y se neutralizan los
  caracteres que podrían falsificar las marcas internas del prompt, antes de
  pasárselo a cualquier modelo. Evita que una oferta con instrucciones
  incrustadas secuestre la generación del CV.
- **Degradación elegante** en todos los pasos con IA o servicios externos: si la
  reescritura de prosa falla, se usa el texto original; si el scoring falla, la
  oferta pasa sin puntuación; si una fuente cae, las demás siguen y se avisa.
- **Guardarraíl de huecos.** Un nodo detecta si las ofertas nuevas dejan de
  escribirse donde deben —un fallo silencioso que ya ocurrió una vez— y avisa
  por correo.
- **La IA nunca cambia el estado** de una candidatura por su cuenta.

## Lo que NO se ha hecho

**No se ha sometido el sistema a una prueba de ataque deliberada (red
teaming).** La defensa contra inyección de instrucciones descrita arriba es
básica y no se ha probado frente a intentos dirigidos. Está identificado como el
siguiente paso pendiente en la especificación.

## Clasificación legal

Análisis de apoyo (no asesoramiento jurídico), revisado y aprobado por la
usuaria. Detalle completo en [03-legal.md](03-legal.md).

- **Reglamento Europeo de IA (AI Act): riesgo mínimo.** La categoría de alto
  riesgo en empleo (Anexo III.4) apunta a herramientas del **lado del
  reclutador** —publicar ofertas dirigidas, filtrar o evaluar candidatos—; Jobs
  es del **lado del candidato** y filtra ofertas para su propia autora. Sin
  obligaciones duras. La «alfabetización en IA» que exige la norma se da por
  cumplida (Mar ha diseñado y construido el sistema).
- **Protección de datos (RGPD):** el tratamiento de los datos propios de Mar
  está exento como actividad doméstica; los datos de los correos de empresas se
  tratan bajo interés legítimo, guardando solo un **resumen corto**, nunca el
  correo completo. No hay categorías especiales de datos en ningún punto del
  pipeline.
- **Sin líneas rojas** para el uso personal actual. El cuadro cambiaría si el
  sistema se ofreciera a terceros (habría que escribir un aviso de privacidad
  formal, y si el destinatario pasara a ser un reclutador entraría en alto
  riesgo); el documento legal tiene una sección aparte para ese escenario.
- **Nota de honestidad, no obligación legal:** el CV y la carta que se envían no
  llevan ninguna marca visible de que la prosa pasó por IA. Queda a criterio de
  la usuaria.

# 9. Resultados

> Buena parte de las métricas de producción **no se han instrumentado como
> tales**. Lo que sigue distingue lo medido de lo pendiente de medir.

## Lo que sí se mide (pestaña `Metricas`, una fila por pasada y fuente)

- **Embudo de filtrado.** En una pasada real reciente entraron 60 ofertas tras
  el filtro de salario y pasaron 21 tras el de perfil; la usuaria las revisó y
  las dio por «no perfectas pero pasables». Calibración histórica: ~15
  supervivientes por cada 248 ofertas crudas.
- **Reparto por fuente.** El grueso de lo útil viene de las fuentes **gratuitas**
  (We Work Remotely, Himalayas, Jobicy, Get on Board). Dos fuentes **de pago** no
  han aportado ni una sola oferta en todo el histórico y están señaladas para
  podarse.
- **Tipo de aplicación:** ~6 % de las ofertas se aplican por correo
  (automatizable de principio a fin); el ~94 % son enlaces donde aplica la
  persona.

## Fiabilidad

- Desde que se publicó la aplicación OAuth de Google (31 ago 2026) hasta el
  cierre de este documento (10 sep 2026): **cero ejecuciones con error o caída**
  en toda la instancia. Antes, las credenciales de Google caducaban cada 7 días
  y tumbaban el pipeline de forma recurrente.
- **Latencia (por diseño, no medida en agregado):** el CV se genera en un máximo
  de ~5 minutos desde que se marca la casilla; la ingesta y el archivado corren
  dos veces al día; el seguimiento de correo, una vez por hora.

## Coste

- **Coste por interacción: pendiente de medición.** No se ha instrumentado el
  gasto por oferta ni por CV. Datos sueltos: la generación de un CV usa hasta
  8.000 tokens de salida de Claude; la puntuación de encaje usa un modelo barato
  con respuestas de ~300 tokens; hay dos fuentes de rastreo de pago en revisión.
- Una auditoría encontró que, antes de un arreglo, se pagaban **6 llamadas al
  modelo caro por cada CV y se usaba 1**. Corregido a 1 llamada por ejecución.

## Evals de la parte de IA

- **No hay sistema de evals** (Paso 14 del método, no realizado). No existe un
  dataset de referencia ni métricas de acierto para el scoring, la generación de
  CV o el clasificador de correos.
- La verificación ha sido **caso a caso, con revisión humana**. Ejemplo
  concreto: tras añadir la puntuación de encaje, una oferta de «Ingeniero de IA
  Generativa y Sistemas de Agentes» —título con «IA», del tipo que antes se
  colaba— obtuvo **15/100**, con un motivo que explicaba que exige experiencia
  profesional de ingeniería de software que Mar no tiene. Confirma que el
  scoring discrimina el caso que se buscaba resolver.

## Prueba con usuarios

- **No se hizo** una prueba con cinco personas: el sistema tiene una sola
  usuaria, que es además su autora.
- Sí hubo un ciclo continuo de **supervisar generaciones reales y corregir**.
  Esa supervisión detectó y arregló cuatro fallos en la generación del CV: se
  perdía un título académico, los documentos se guardaban en la carpeta
  equivocada, los encabezados no se traducían en los CV en inglés, y se pagaban
  llamadas de más al modelo. Los cuatro, corregidos y verificados en
  generaciones posteriores.

# 10. Qué aprendí y qué haría distinto

- **«Publicar no es guardar».** Varias veces un cambio quedó guardado pero no
  activo en producción porque faltó un paso de publicación explícito. Cuesta
  detectarlo porque el sistema no da error: sigue ejecutando la versión vieja.
  Ahora, después de cada cambio se comprueba que la versión activa es la última.
- **«Validar no es verificar».** Una referencia a un paso escrita sin tilde pasó
  todas las validaciones automáticas y tuvo la ingesta caída ocho días. Desde
  entonces: releer las conexiones y mirar una ejecución real, siempre.
- **El «hombre muerto» no cubre «escribió, pero en el sitio equivocado».** El
  incidente de las ~260 filas vacías fue silencioso: el sistema reportaba éxito
  mientras las ofertas nuevas caían fuera de la vista. Hubo que añadir un
  guardarraíl específico para ese modo de fallo.
- **Elegir la hoja de cálculo fue acertado para la interfaz y caro para la
  fiabilidad.** La mitad de los incidentes del proyecto vienen de ahí. La
  separación correcta —datos en una base de datos, interfaz aparte— es justo la
  que se hizo en el proyecto hermano con frontend. Para una herramienta
  personal, la hoja sigue siendo la opción sensata; pero con los guardarraíles
  desde el primer día, no después del incidente.
- **El método se aplicó tarde y a trozos.** El sistema se construyó sin
  definición de problema, sin historias de usuario, sin especificación y sin
  análisis legal; esos documentos se escribieron después, hacia atrás. Sirvió
  para ordenar lo que ya existía, pero el análisis legal, hecho **al principio**,
  habría sido un buen filtro antes de invertir en la parte de IA.
- **Falta lo que más dice de si el sistema funciona:** evals de la parte de IA y
  medición del coste real por candidatura. Están identificados como pendientes,
  no hechos.
- **Qué haría igual:** partir pronto en piezas pequeñas, cada una con su propia
  vigilancia; y aplicar el patrón «la IA propone, la persona confirma» en todo
  punto irreversible.

# Relacionado

- [Índice de docs](index.md)
- [Especificación funcional](04-spec.md)
- [Revisión legal — AI Act y RGPD](03-legal.md)
- [Evaluación del pipeline y mejoras propuestas](jobs-evaluacion.md)
- [Bitácora del proyecto](bitacora.md)
