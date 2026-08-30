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
    //    Reconstruir la regla con newDataValidation() lo perdería.
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