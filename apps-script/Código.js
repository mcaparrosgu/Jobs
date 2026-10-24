  const ALTO_FILA    = 21;
  const COL_FECHA    = 'fecha_guardado';
  const COL_CASILLA  = 'generar_cv_ia';
  const COL_ESTADO   = 'estado';
  const HOJAS = [
    { nombre: 'Ofertas_activas', casilla: true,  estado: true,  banda: true },
    // 10 sep 2026 (tarea 23): Archivo tambien lleva desplegable de `estado`, para
    // que desarchivar (poner `pendiente`) sea un clic. La regla la sembro la API
    // (lista de 10 valores, sin color de chip); a partir de aqui el script la
    // propaga a las filas nuevas copiandola de una fila que ya la tenga.
    { nombre: 'Archivo',         casilla: false, estado: true,  banda: true },
    { nombre: 'Metricas',        casilla: false, estado: false, banda: true },
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

  // ---------------------------------------------------------------------------
  // Archivado / desarchivado instantaneo al cambiar `estado` a mano (8 sep 2026)
  // ---------------------------------------------------------------------------
  // onEdit simple: se dispara SOLO con ediciones manuales en la interfaz, nunca
  // con lo que escribe n8n por API ni con lo que hace este mismo script.
  //   Ofertas_activas · estado -> "descartada" / "rechazada"  => mover a Archivo
  //   Archivo         · estado -> "pendiente"                  => mover a Ofertas_activas
  // Mapea por nombre de cabecera (las dos pestanas tienen distinto orden y
  // distintas columnas) y reordena el destino por fecha_guardado desc.
  // `Jobs · archivado` (09:00/17:00) sigue como red de seguridad.

  const MOVER_POR_ESTADO = {
    'Ofertas_activas': { destino: 'Archivo',         valores: ['descartada', 'rechazada'] },
    'Archivo':         { destino: 'Ofertas_activas', valores: ['pendiente'] },
  };

  function onEdit(e) {
    if (!e || !e.range) return;
    const rango = e.range;
    if (rango.getNumRows() !== 1 || rango.getNumColumns() !== 1) return; // no pegados/multi

    const hoja = rango.getSheet();
    const cfg = MOVER_POR_ESTADO[hoja.getName()];
    if (!cfg) return;

    const fila = rango.getRow();
    if (fila < 2) return;

    const cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const idxEstado = cabeceras.indexOf(COL_ESTADO);
    if (idxEstado === -1 || rango.getColumn() !== idxEstado + 1) return;

    const valor = String(rango.getValue()).trim().toLowerCase();
    if (cfg.valores.indexOf(valor) === -1) return;

    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(15000)) return; // ocupado: lo recoge la pasada programada/horaria
    try {
      moverFila_(hoja, cabeceras, fila, cfg.destino, valor);
    } finally {
      lock.releaseLock();
    }
  }

  function moverFila_(hojaOrigen, cabecerasOrigen, fila, nombreDestino, estadoFinal) {
    const hojaDestino = hojaOrigen.getParent().getSheetByName(nombreDestino);
    if (!hojaDestino) return;

    const valores = hojaOrigen.getRange(fila, 1, 1, cabecerasOrigen.length).getValues()[0];
    const registro = {};
    for (let i = 0; i < cabecerasOrigen.length; i++) registro[cabecerasOrigen[i]] = valores[i];
    registro[COL_ESTADO] = estadoFinal;                    // normalizado a minusculas
    if (nombreDestino === 'Ofertas_activas') registro[COL_CASILLA] = false;

    const cabecerasDestino = hojaDestino.getRange(1, 1, 1, hojaDestino.getLastColumn())
                                        .getValues()[0];
    const filaNueva = cabecerasDestino.map(function (c) {
      return Object.prototype.hasOwnProperty.call(registro, c) ? registro[c] : '';
    });

    hojaDestino.appendRow(filaNueva);   // gap-safe: va tras la ultima fila con contenido
    hojaOrigen.deleteRow(fila);

    ordenarPorFecha_(hojaDestino);
    // Repone el desplegable de `estado` en el destino (Ofertas_activas y Archivo
    // lo llevan; en Archivo, desde la tarea 23 del 10 sep 2026).
    aplicarDesplegableEstado_(hojaDestino);
  }

  function ordenarPorFecha_(hoja) {
    const ultimaFila = hoja.getLastRow();
    const ultimaCol  = hoja.getLastColumn();
    if (ultimaFila < 3) return;
    const idxFecha = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].indexOf(COL_FECHA);
    if (idxFecha === -1) return;
    hoja.getRange(2, 1, ultimaFila - 1, ultimaCol)
        .sort({ column: idxFecha + 1, ascending: false });
  }

  // Repone el desplegable de `estado` (con su color de chip) copiandolo de una
  // fila que ya lo tenga -- mismo metodo que procesarHoja_ paso 4.
  function aplicarDesplegableEstado_(hoja) {
    const ultimaFila = hoja.getLastRow();
    if (ultimaFila < 2) return;
    const idxEstado = hoja.getRange(1, 1, 1, hoja.getLastColumn())
                          .getValues()[0].indexOf(COL_ESTADO);
    if (idxEstado === -1) return;
    const colE = idxEstado + 1;
    const nFilas = ultimaFila - 1;
    const fuente = filaConValidacionLista_(hoja, colE, nFilas);
    if (!fuente) return;
    hoja.getRange(fuente, colE).copyTo(
      hoja.getRange(2, colE, nFilas, 1),
      SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  }

  function crearDisparador() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === 'mantenimiento') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('mantenimiento').timeBased().everyHours(1).create();
    mantenimiento();
  }