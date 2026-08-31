---
type: Nota
title: Formato y mantenimiento de la hoja n8n_jobs
description: Cómo se mantiene en forma la hoja n8n_jobs (casilla en generar_cv_ia, orden por fecha, alto de fila) pese a que Jobs · ingesta y Jobs · archivado la reescriben dos veces al día. Incluye el Apps Script que lo automatiza y la trampa de la casilla sin límite.
tags: [n8n, empleo, google-sheets, mantenimiento]
timestamp: 2026-08-29T09:00:00Z
---

# Qué es esto

La hoja `n8n_jobs` (`1JUM8rF4UmfeUI8gQFZ4jKVxjwKWltmVwAicpwG2xm-U`) es la base
de datos del pipeline de empleo. La escriben dos workflows sin que ninguno se
ocupe del formato:

- [Jobs · ingesta](jobs-ingesta.md) — `Append row in sheet` → `Ofertas_activas`
- [Jobs · archivado](jobs-archivado.md) — `Añadir filas a Archivo` → `Archivo`,
  y `Borrar ofertas ofertas_activas` borra filas de `Ofertas_activas`

Desde el 31 ago 2026 hay una **tercera pestaña, `Metricas`** (`gid=1516813991`),
que la escribe la rama de métricas de [Jobs · ingesta](jobs-ingesta.md) (sección
E). Es un registro append-only y **queda fuera del Apps Script `mantenimiento`**
a propósito (ver sección propia más abajo).

Los dos nodos de escritura usan `operation: append` con
`mappingMode: autoMapInputData`: n8n **mapea cada campo contra la cabecera de
la fila 1 por nombre**, no por posición. Consecuencias:

- Da igual que el orden de columnas de `Ofertas_activas` y `Archivo` no
  coincida (y no coincide: `generar_cv_ia` es la **G** en `Ofertas_activas` y
  la **F** en `Archivo`; `destacada` y una columna `⭐` sobrante divergen). Cada
  valor cae bajo su cabecera.
- Si la fila 1 tiene un hueco, una cabecera renombrada o un nombre duplicado,
  el mapeo se descoloca. Por eso el formato **nunca debe tocar la fila 1**.
- Verificado el 27 ago 2026 metiendo 2 filas de prueba que imitaban el
  `append` de la ingesta: cada valor cayó en su columna y `generar_cv_ia`
  recibió la casilla sola. Filas de prueba borradas después.
- **Columna `id_url`** (añadida el 31 ago 2026, tarea 9 / M2): `Ofertas_activas!Q1`
  y `Archivo!R1` — posiciones distintas, pero da igual porque el mapeo es por
  cabecera. La escribe `Filtro duplicados` de la ingesta (hash de la URL
  normalizada; segunda clave de deduplicación junto a `id_unico` — ver
  [jobs-ingesta.md](jobs-ingesta.md), Flujo punto 5). Queda vacía en las filas
  antiguas y en las ofertas por email. Al escribir la cabecera **no se tocó
  nada más de la fila 1**; el alto y el formato los repone `mantenimiento`.
- **Columna `fecha_envio`** (añadida el 31 ago 2026, tarea 12 / mitad de M7):
  `Ofertas_activas!R1` y `Archivo!S1` — otra vez posiciones distintas, mapeo por
  cabecera. La escribe `Actualizar estado cv_enviado` de
  [jobs-generacion-cv.md](jobs-generacion-cv.md) al marcar `estado: cv_enviado`
  (formato `yyyy-MM-dd`). Sólo se rellena en la rama `email`; vacía en el resto.
  La consume la Regla 3 de [jobs-archivado.md](jobs-archivado.md) para archivar
  `cv_enviado` sin respuesta a los 30 días con `estado: sin_respuesta`. Fila 1
  intacta por lo demás; el formato lo repone `mantenimiento`.

# Lo que el formato tiene que reponer

n8n escribe valores, nunca formato. Cada pasada de las 09:00/17:00 deja la hoja
un poco desordenada:

1. **Casilla en `generar_cv_ia`.** El campo se guarda como booleano de verdad
   (`false`), pero sin la *validación de datos* tipo casilla Sheets lo pinta
   como el texto `FALSE`. La ingesta no aplica esa validación, y `Jobs ·
   archivado` al borrar filas puede dejar la columna sin ella. Ya pasó el
   **16 ago 2026** (`FALSE` en texto en la fila 32 y en 491–595, arreglado a
   mano), **volvió a pasar el 27 ago 2026** y **otra vez el 29 ago 2026** (esta
   última con hueco de ~260 filas vacías incluido — ver más abajo).
2. **Orden.** Las ofertas nuevas entran al final físico de la hoja, sin
   ordenar. Mar quiere `fecha_guardado` de más reciente a más antigua.
3. **Alto de fila.** Los resúmenes largos con ajuste de texto disparan la
   altura de la fila. Se quiere 21 px uniforme.
4. En `Archivo`, `generar_cv_ia` **no** lleva casilla: son ofertas ya
   descartadas y el campo no sirve. Pero `Jobs · archivado` sigue copiando el
   `false` (mapeo por cabecera), así que hay que vaciarlo.
5. **Desplegable de `estado` (columna E).** Validación `ONE_OF_LIST` estricta,
   orden de ciclo de vida: `pendiente`, `crear_cv_ia`, `cv_ia_creado`,
   `cv_enviado`, `respuesta_recibida`, `entrevista`, `oferta_recibida`,
   `rechazada`, `descartada`. La ingesta escribe `pendiente` como texto plano
   sin la validación, así que las filas nuevas se quedan sin el desplegable.
6. **Color por estado = chip nativo del desplegable.** Cada valor se muestra
   dentro de un óvalo de color (letra oscura para contraste), no como fondo de
   celda. El color del chip **no se puede poner por API** (Sheets no lo expone);
   se configura a mano en Datos → Validación de datos → editar regla de
   `estado` → selector de color por valor. Paleta sugerida abajo. Al perderse la
   validación (punto 5) se pierde también el chip.
7. **Colores alternos (banda).** Los pinta un *banded range*
   (`bandedRangeId 56060992`, cols A–P), no rellenos por celda. No se estira
   solo: si su `endRowIndex` se queda corto, las filas nuevas salen en blanco.

El Apps Script de más abajo cubre los puntos 1–5 y 7 (casilla, orden, alto,
`Archivo`, desplegable de `estado`, banda). El punto **6 (color del chip) se
pone una sola vez a mano** — la API no lo expone — y luego el script lo conserva
porque **copia** la validación de una fila buena en vez de reconstruirla.

Estado dejado el 27 ago 2026: casilla reaplicada en `Ofertas_activas` (solo
filas con datos), las dos pestañas ordenadas por `fecha_guardado` descendente,
alto 21 px, fila 1 de `Archivo` congelada, columna `generar_cv_ia` de `Archivo`
vaciada (validación y valores).

# Trampa: la casilla no puede ir en toda la columna

Una validación de casilla aplicada a la columna entera (sin límite de fila)
pone un valor `FALSE` en **todas** las filas vacías de debajo. El `append` de
la Google Sheets API detecta el final de la "tabla" por la última fila con
**algún** valor, así que esos `FALSE` fantasma pueden hacer que n8n escriba las
ofertas nuevas cientos de filas más abajo, dejando un hueco. Es el mismo tipo
de descuadre que ya preocupaba en
[jobs-ingesta.md](jobs-ingesta.md#fallos-conocidos) (huecos de filas vacías).

Por eso la casilla se aplica **solo hasta la última fila con datos**, y hay que
reponerla cuando la ingesta añade filas nuevas. Es lo que resuelve el script de
abajo.

# El Apps Script de mantenimiento

Vive **dentro de la hoja** (Extensiones → Apps Script), con un disparador
horario. No toca n8n. Cada hora, en `Ofertas_activas` y `Archivo`:

- ordena por `fecha_guardado` descendente (fila 1 intacta);
- fuerza el alto de todas las filas a 21 px;
- `Ofertas_activas`: reaplica la casilla a `generar_cv_ia` en las filas con
  datos; `Archivo`: quita la casilla y vacía la columna;
- limpia casillas/valores sueltos en las filas vacías de debajo, para no
  descuadrar el `append`;
- `Ofertas_activas`: propaga el desplegable de `estado` a todas las filas de
  datos **copiándolo** de una fila que ya lo tenga (así conserva el color del
  chip) y estira la banda de colores hasta la última fila.

**No borra filas** — eso es deliberado (auto-borrar sería arriesgado). Las
filas sobrantes se quitan a mano si hiciera falta.

Instalación y verificación: [tareas-manuales.md](../../docs/tareas-manuales.md),
sección «Para cerrar Jobs».

Verificado el 29 ago 2026: con una fila de prueba añadida al final, una pasada
`mantenimiento` le puso el desplegable **con el óvalo de color** (el
`copyTo` / `PASTE_DATA_VALIDATION` sí arrastra el color del chip).

**Verificado end-to-end el 30 ago 2026:** ingesta manual con 3 ofertas nuevas
(`fecha_guardado 2026-08-30`) → el `append` las dejó contiguas al final →
la pasada horaria de `mantenimiento` las reordenó arriba. Mar confirma en
Apps Script → Activadores que el disparador horario corre sin error y en
Ejecuciones que salen `Completado`. Tarea 1 de
[tareas-pendientes.md](../../docs/tareas-pendientes.md) cerrada.

## Copia bajo control de versiones (clasp)

Desde el 30 ago 2026 el proyecto está espejado en el repo con
[`clasp`](https://github.com/google/clasp): carpeta **`apps-script/`**
(`Código.js` = este script; `appsscript.json` = timezone `Europe/Madrid`, V8).
`scriptId` `1Dyyxt6a4bU9xkGDyAiaCAEe2EfiMqem9Ro9tD0oQHMjoRqNO9hUJf83y`.

- Sigue siendo un script **container-bound** a la hoja; clasp es solo un espejo
  para editarlo desde el repo. `clasp push` sube, `clasp pull` baja.
- **clasp fijado a la 2.4.2**: la rama 3.x rompe `clasp login` (`Error 400:
  invalid_request … response_type`). No hacer `npm i -g @google/clasp` sin
  fijar versión.
- `.clasprc.json` (tokens OAuth) y `apps-script/.clasp.json` (ruta absoluta de
  la máquina) están en `.gitignore`.

```javascript
const ALTO_FILA    = 21;
const COL_FECHA    = 'fecha_guardado';
const COL_CASILLA  = 'generar_cv_ia';
const COL_ESTADO   = 'estado';
const HOJAS = [
  { nombre: 'Ofertas_activas', casilla: true,  estado: true,  banda: true  },
  { nombre: 'Archivo',         casilla: false, estado: false, banda: false },
];

function mantenimiento() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  HOJAS.forEach(function (cfg) {
    procesarHoja_(ss.getSheetByName(cfg.nombre), cfg);
  });
}

function procesarHoja_(hoja, cfg) {
  if (!hoja) return;
  const ultimaFila = hoja.getLastRow();
  const ultimaCol  = hoja.getLastColumn();
  if (ultimaFila < 2 || ultimaCol < 1) return;

  const cabeceras  = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const idxFecha   = cabeceras.indexOf(COL_FECHA);
  const idxCasilla = cabeceras.indexOf(COL_CASILLA);
  const idxEstado  = cabeceras.indexOf(COL_ESTADO);
  const nFilasDato = ultimaFila - 1;

  // 1. Orden por fecha_guardado desc (fila 1 intacta).
  if (idxFecha !== -1) {
    hoja.getRange(2, 1, nFilasDato, ultimaCol)
        .sort({ column: idxFecha + 1, ascending: false });
  }

  // 2. Alto de fila uniforme.
  hoja.setRowHeightsForced(1, hoja.getMaxRows(), ALTO_FILA);

  // 3. Casilla generar_cv_ia.
  if (idxCasilla !== -1) {
    const rango = hoja.getRange(2, idxCasilla + 1, nFilasDato, 1);
    if (cfg.casilla) {
      rango.setDataValidation(
        SpreadsheetApp.newDataValidation().requireCheckbox()
          .setAllowInvalid(false).build());
    } else {
      rango.clearDataValidations();
      rango.clearContent();
    }
    const sobra = hoja.getMaxRows() - ultimaFila;
    if (sobra > 0) {
      const resto = hoja.getRange(ultimaFila + 1, idxCasilla + 1, sobra, 1);
      resto.clearDataValidations();
      resto.clearContent();
    }
  }

  // 4. Desplegable de estado en todas las filas de datos.
  //    Se COPIA de una fila que ya lo tenga -> conserva el color del chip.
  //    Reconstruir la regla con newDataValidation() lo perderia.
  if (cfg.estado && idxEstado !== -1) {
    const colE = idxEstado + 1;
    const fuente = filaConValidacionLista_(hoja, colE, nFilasDato);
    if (fuente) {
      hoja.getRange(fuente, colE).copyTo(
        hoja.getRange(2, colE, nFilasDato, 1),
        SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    }
    const sobra = hoja.getMaxRows() - ultimaFila;
    if (sobra > 0) {
      hoja.getRange(ultimaFila + 1, colE, sobra, 1).clearDataValidations();
    }
  }

  // 5. Banda de colores alternos: que llegue justo a la ultima fila de datos.
  if (cfg.banda) {
    hoja.getBandings().forEach(function (b) {
      const r = b.getRange();
      b.setRange(hoja.getRange(r.getRow(), r.getColumn(),
                               ultimaFila - r.getRow() + 1, r.getNumColumns()));
    });
  }
}

// Primera fila (>=2) de la columna `col` cuya validacion es "lista de
// elementos"; null si ninguna.
function filaConValidacionLista_(hoja, col, nFilas) {
  const dvs = hoja.getRange(2, col, nFilas, 1).getDataValidations();
  for (let i = 0; i < dvs.length; i++) {
    const dv = dvs[i][0];
    if (dv && dv.getCriteriaType() ===
        SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      return 2 + i;
    }
  }
  return null;
}

function crearDisparador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'mantenimiento') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('mantenimiento').timeBased().everyHours(1).create();
  mantenimiento();
}
```

# Cuidado al editar la hoja a mano mientras los triggers están armados

El 27 ago 2026, en mitad de un reformateo manual, la ejecución de las 09:00 de
[Jobs · archivado](jobs-archivado.md) (#652) movió 6 ofertas del 2026-08-20 de
`Ofertas_activas` a `Archivo` (llevaban >7 días en `pendiente`). No se perdió
nada —es su trabajo normal—, pero durante un rato pareció que faltaban filas.
Si hay que hacer cambios manuales a fondo, mejor fuera de las ventanas
09:00/17:00, o revisar las ejecuciones de `Jobs · archivado` y `Jobs · ingesta`
después para entender cualquier cambio de recuento.

# 29 ago 2026: el Apps Script no existía

Entre el 25 y el 29 ago 2026, `Ofertas_activas` acumuló ~260 filas vacías
(filas 20–279) entre los datos hasta el 24 ago y las ofertas del 27–29 ago, que
`Append row in sheet` había escrito a partir de la fila 280. Todas las
ejecuciones de `Jobs · ingesta` de esos días salieron `success` con filas
escritas, pero al abrir la hoja parecía que la ingesta se había parado el día
24. Es el mismo descuadre que este documento describe como evitable —**y era
evitable**: el reformateo manual del 27 ago dejó filas con el contenido borrado
(no las filas), y el Apps Script horario, que tenía que reordenar y purgarlas en
la hora siguiente, no lo hizo. Señales: orden viejo en las filas de arriba,
`generar_cv_ia` otra vez como texto `FALSE`, hueco nunca limpiado durante días.

**Al ir a revisar el disparador el 29 ago se descubrió que no había ningún
proyecto Apps Script en la hoja** (Extensiones → Apps Script estaba vacío). No es
que el disparador hubiera caducado o fallado por cuota: el script que este
documento describe **nunca llegó a instalarse ahí**. Lo que el 27 ago se dio por
"automatizado con un Apps Script dentro de la hoja" no quedó guardado en la hoja.

Arreglado a mano vía API el 29 ago (fuera de n8n): borradas las filas vacías,
las dos pestañas reordenadas por `fecha_guardado` desc, casilla reaplicada al
rango de datos de `Ofertas_activas`. En el borrado se quitaron de más 11 filas
con datos (27 ago y parte del 28), recuperadas de las ejecuciones n8n 653,
658 y 662, y reinsertadas. Las del 25 y 26 ago sí se perdieron en el
reformateo manual del 27. Como blindaje en n8n se puso `useAppend: true` en
`Append row in sheet` (ver [jobs-ingesta.md](jobs-ingesta.md)).

**Hecho el 29 ago:** creado el proyecto Apps Script desde cero en la hoja con el
script de este documento y ejecutado `crearDisparador()`. Verificado vía API que
tras esa primera pasada la hoja queda ordenada, sin huecos, con casilla real y
alto 21 px.

**Cerrado el 30 ago 2026:** con datos reales (ingesta manual → 3 ofertas nuevas
→ `append` contiguo → pasada horaria posterior) el disparador `mantenimiento`
reordenó la hoja solo; Mar confirma en Activadores que corre cada hora sin error
y en Ejecuciones que sale `Completado`. Como segunda red, `Jobs · ingesta` avisa
por email si el hueco reaparece (ver [jobs-ingesta.md](jobs-ingesta.md), sección
«D. Guardarraíl de huecos en `Ofertas_activas`»).

# 29 ago 2026: desplegable de `estado` y banda de colores rotos en las filas nuevas

Tras la ingesta, `Ofertas_activas` tenía 39 filas de datos (2–40) ya ordenadas
por `fecha_guardado` desc, pero:

- **`E2:E22` sin el desplegable de `estado`.** La validación `ONE_OF_LIST` sólo
  seguía en `E23:E40`. Son las 21 ofertas nuevas (27–29 ago) que entraron por el
  `append` sin validación y subieron arriba al ordenar; las viejas, con
  validación, bajaron a la 23+.
- **Colores alternos cortados en la fila 19.** El *banded range*
  `bandedRangeId 56060992` tenía `endRowIndex 19`, así que de la fila 20 en
  adelante todo salía en blanco.

Arreglado vía Google Sheets API (`batchUpdate`), sin tocar valores ni la fila 1:

- `updateBanding` sobre `bandedRangeId 56060992` → `range` a
  `startRowIndex 0 / endRowIndex 40`, cols A–P, mismos colores (cabecera teal
  `#26A69A`, banda 1 blanca, banda 2 verde pálido `#DDF2F0`).
- `setDataValidation` sobre `E2:E40` con la regla `ONE_OF_LIST` estricta
  (`showCustomUi`), valores: `cv_enviado`, `cv_ia_creado`, `pendiente`,
  `descartada`, `crear_cv_ia`, `respuesta_recibida`, `entrevista`, `rechazada`,
  `oferta_recibida`. Reaplicarla a `E23:E40` es idempotente.

Verificado por API: banda hasta la fila 40 y `E19:E24` con `dataValidation`,
patrón de color intacto (fila 22 verde, 23 blanca, 24 verde).

**Segunda pasada, mismo día — colores por estado (intento fallido y corrección).**
Primero se recrearon como **9 reglas de formato condicional** `TEXT_EQ` con
fondo de celda + texto oscuro. Mar aclaró que el color de estado **nunca fue
fondo de celda**: es el **chip nativo del desplegable** (la palabra dentro de un
óvalo de color, con la letra en un tono más oscuro para contraste). Las 9 reglas
de formato condicional se **borraron** (`deleteConditionalFormatRule`).

El color del chip **no se puede poner por API** — el `DataValidationRule` de la
API de Sheets no tiene campo de color y `spreadsheets.get` no lo devuelve. Se
configura a mano: Datos → Validación de datos → editar la regla de `estado` →
selector de color junto a cada valor. Paleta sugerida (semáforo), pendiente de
que Mar la valide:

| estado | color del chip |
|---|---|
| `pendiente` | gris claro |
| `crear_cv_ia` | amarillo |
| `cv_ia_creado` | naranja claro |
| `cv_enviado` | azul |
| `respuesta_recibida` | morado |
| `entrevista` | verde claro |
| `oferta_recibida` | verde intenso |
| `rechazada` | rojo |
| `descartada` | gris oscuro |

Se intentó también dar a la validación el rango de **columna entera** (`E2:E`,
sin `endRowIndex`) para que las filas nuevas heredasen sola. **La API lo
normaliza a `endRowIndex 40`** (tamaño de la cuadrícula), así que no cubre las
filas que añada un `append` posterior. Con la hoja recortada a las filas exactas
(diseño anti-huecos), no hay filas de reserva que pre-formatear.

**Causa de fondo:** n8n (`Append row in sheet`) sólo escribe valores, nunca
formato, y no hay herencia de formato en la API de Sheets.

**Resuelto el 29 ago 2026 por la tarde.** Mar coloreó los 9 chips a mano (Datos
→ Validación de datos) y se amplió el Apps Script `mantenimiento` (ver bloque de
código arriba) con dos pasos nuevos para `Ofertas_activas`:
- **paso 4** — propaga el desplegable de `estado` a `E2:E<ultimaFila>`
  **copiándolo** (`Range.copyTo` con `PASTE_DATA_VALIDATION`) de la primera fila
  que ya tenga validación de lista. Reconstruir la regla con
  `newDataValidation()` borraría el color del chip; el `copyTo` **sí lo
  conserva** (verificado con una fila de prueba: la pasada `mantenimiento` le
  puso el desplegable con el óvalo de color).
- **paso 5** — `Banding.setRange()` para que la banda termine en `ultimaFila`.

`mantenimiento` **no borra filas de prueba ni sobrantes** — es deliberado. Se
quitan a mano.

**Disparador:** Mar confirma que el disparador horario está ejecutándose (ver
[tareas-pendientes.md](tareas-pendientes.md), tarea 1).

# La pestaña `Metricas` (31 ago 2026, tarea 10 / M3)

Pestaña nueva `Metricas` (`gid=1516813991`), creada el 31 ago 2026. Registro
**append-only** del embudo de la ingesta: una fila por pasada y fuente. La
escribe la rama aislada `Registrar métricas` → `Append métricas` de
[Jobs · ingesta](jobs-ingesta.md) (sección E), colgando de `Filtro duplicados`,
con `append` + `mappingMode: autoMapInputData` (mapeo por cabecera, igual que
las otras dos pestañas) y `sheetName` **por nombre** (no por `gid`: en modo
*list* n8n no resolvió la pestaña recién creada).

Fila 1 (12 columnas, `snake_case`): `fecha_hora`, `fuente`, `crudas`,
`tras_teletrabajo`, `tras_salario`, `tras_cualificacion`, `nuevas`,
`descartes_idioma`, `descartes_contrato`, `descartes_nivel`, `descartes_perfil`,
`descartes_encaje`. `crudas`…`descartes_*` son números; `fecha_hora` es
`yyyy-MM-dd HH:mm` en `Europe/Madrid`.

**Fuera del Apps Script a propósito.** `mantenimiento` solo itera su allowlist
`const HOJAS = [Ofertas_activas, Archivo]` (`apps-script/Código.js`), así que
`Metricas` no se ordena, ni se le fuerza el alto de fila, ni se le tocan
validaciones. No hace falta excluirla explícitamente; si algún día se quisiera
mantener, habría que añadirla a ese array.

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — escribe `Ofertas_activas` por cabecera y
  `Metricas` (rama de métricas, sección E)
- [Jobs · archivado](jobs-archivado.md) — mueve filas entre pestañas
- [tareas-manuales.md](../../docs/tareas-manuales.md) — instalar y verificar el
  script
- [tareas-pendientes.md](tareas-pendientes.md) — revisar el disparador del Apps
  Script (tarea 1) y demás tareas abiertas
- [index.md](../../docs/index.md)
