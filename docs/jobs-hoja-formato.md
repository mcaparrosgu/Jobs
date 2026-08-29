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
  descuadrar el `append`.

Instalación y verificación: [tareas-manuales.md](../../docs/tareas-manuales.md),
sección «Para cerrar Jobs».

```javascript
const ALTO_FILA   = 21;
const COL_FECHA    = 'fecha_guardado';
const COL_CASILLA  = 'generar_cv_ia';
const HOJAS = [
  { nombre: 'Ofertas_activas', casilla: true  },
  { nombre: 'Archivo',         casilla: false },
];

function mantenimiento() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  HOJAS.forEach(function (cfg) {
    procesarHoja_(ss.getSheetByName(cfg.nombre), cfg.casilla);
  });
}

function procesarHoja_(hoja, conCasilla) {
  if (!hoja) return;
  const ultimaFila = hoja.getLastRow();
  const ultimaCol  = hoja.getLastColumn();
  if (ultimaFila < 2 || ultimaCol < 1) return;

  const cabeceras  = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const idxFecha   = cabeceras.indexOf(COL_FECHA);
  const idxCasilla = cabeceras.indexOf(COL_CASILLA);
  const nFilasDato = ultimaFila - 1;

  if (idxFecha !== -1) {
    hoja.getRange(2, 1, nFilasDato, ultimaCol)
        .sort({ column: idxFecha + 1, ascending: false });
  }

  hoja.setRowHeightsForced(1, hoja.getMaxRows(), ALTO_FILA);

  if (idxCasilla !== -1) {
    const rangoDatos = hoja.getRange(2, idxCasilla + 1, nFilasDato, 1);
    if (conCasilla) {
      const regla = SpreadsheetApp.newDataValidation()
        .requireCheckbox().setAllowInvalid(false).build();
      rangoDatos.setDataValidation(regla);
    } else {
      rangoDatos.clearDataValidations();
      rangoDatos.clearContent();
    }
    const filasSobrantes = hoja.getMaxRows() - ultimaFila;
    if (filasSobrantes > 0) {
      const resto = hoja.getRange(ultimaFila + 1, idxCasilla + 1, filasSobrantes, 1);
      resto.clearDataValidations();
      resto.clearContent();
    }
  }
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

# 29 ago 2026: el Apps Script no estaba corriendo

Entre el 25 y el 29 ago 2026, `Ofertas_activas` acumuló ~260 filas vacías
(filas 20–279) entre los datos hasta el 24 ago y las ofertas del 27–29 ago, que
`Append row in sheet` había escrito a partir de la fila 280. Todas las
ejecuciones de `Jobs · ingesta` de esos días salieron `success` con filas
escritas, pero al abrir la hoja parecía que la ingesta se había parado el día
24. Es el mismo descuadre que este documento describe como evitable —**y era
evitable**: el reformateo manual del 27 ago dejó filas con el contenido borrado
(no las filas), y el Apps Script horario, que tenía que reordenar y purgarlas en
la hora siguiente, **no se ejecutó**. Señales de que estaba caído: orden viejo
en las filas de arriba, `generar_cv_ia` otra vez como texto `FALSE`, hueco
nunca limpiado durante días.

Arreglado a mano vía API el 29 ago (fuera de n8n): borradas las filas vacías,
las dos pestañas reordenadas por `fecha_guardado` desc, casilla reaplicada al
rango de datos de `Ofertas_activas`. En el borrado se quitaron de más 11 filas
con datos (27 ago y parte del 28), recuperadas de las ejecuciones n8n 653,
658 y 662, y reinsertadas. Las del 25 y 26 ago sí se perdieron en el
reformateo manual del 27. Como blindaje en n8n se puso `useAppend: true` en
`Append row in sheet` (ver [jobs-ingesta.md](jobs-ingesta.md)).

**Pendiente:** revisar en la hoja el disparador horario del Apps Script
(Extensiones → Apps Script → Activadores) — comprobar que sigue activo y no ha
fallado por permisos/cuota. Sin ese script vivo, cualquier hueco que deje un
borrado de contenido o un archivado se acumula en vez de limpiarse solo.

# Relacionados

- [Jobs · ingesta](jobs-ingesta.md) — escribe `Ofertas_activas` por cabecera
- [Jobs · archivado](jobs-archivado.md) — mueve filas entre pestañas
- [tareas-manuales.md](../../docs/tareas-manuales.md) — instalar y verificar el
  script
- [tareas-pendientes.md](tareas-pendientes.md) — revisar el disparador del Apps
  Script (tarea 1) y demás tareas abiertas
- [index.md](../../docs/index.md)
