/**
 * FARGAU - Backend Google Apps Script
 * Este archivo se ejecuta en Google Apps Script, NO en el navegador.
 * Error "document is not defined" ocurre cuando se pega app.js/HTML dentro de Código.gs.
 *
 * CONFIGURACIÓN:
 * 1. Cree un Google Sheet y una pestaña llamada "Mantenimientos".
 * 2. Extensiones > Apps Script.
 * 3. Pegue este archivo como Código.gs.
 * 4. Ejecute setup() una vez y autorice.
 * 5. Implementar > Nueva implementación > Aplicación web.
 * 6. Ejecutar como: Yo. Acceso: Cualquiera.
 * 7. Use la URL /exec en el frontend.
 */

const SHEET_NAME = 'Mantenimientos';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const headers = [
    'Fecha registro','Número formato','Peaje','Carril','Fecha','Turno','Hora inicio','Hora fin',
    'Tipo','Prioridad','Motivo','Código','Serie','Tipo dispositivo','Ubicación','Marca','Modelo',
    'Estado inicial','Falla','Diagnóstico técnico','Actividades','Pruebas','Repuestos',
    'Estado final','Seguimiento','Próxima revisión','Observaciones','Técnico','Documento técnico',
    'Responsable peaje','Cargo responsable'
  ];
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return 'Configuración completada';
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok:true, service:'FARGAU Mantenimiento', version:'3.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    setup();
    const data = JSON.parse(e.postData.contents || '{}');

    // Soporta el botón "Enviar prueba" del frontend sin escribir una fila vacía en el Sheet.
    if (data.prueba) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, prueba: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME);
    const row = [
      data.fechaRegistro || new Date().toISOString(),
      data.numeroFormato || '',
      'FARGAU',
      data.carril || '',
      data.fecha || '',
      data.turno || '',
      data.horaInicio || '',
      data.horaFin || '',
      data.tipo || '',
      data.prioridad || '',
      data.motivo || '',
      data.codigo || '',
      data.serie || '',
      data.tipoDis || '',
      data.ubicacion || '',
      data.marca || '',
      data.modelo || '',
      data.estadoInicial || '',
      data.falla || '',
      data.diagnostico || '',
      data.actividades || '',
      data.pruebas || '',
      JSON.stringify(data.repuestos || []),
      data.estadoFinal || '',
      data.seguimiento || '',
      data.proxima || '',
      data.observaciones || '',
      data.tecnico || '',
      data.docTecnico || '',
      data.responsable || '',
      data.cargoResponsable || ''
    ];
    sh.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ok:true, numeroFormato:data.numeroFormato}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
