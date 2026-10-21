const CONFIG = {
  spreadsheetName: 'Informes tecnicos - Peajes',
  sheetName: 'Registros',
  driveFolderName: 'Evidencias informes tecnicos',
  reportFolderName: 'Informes PDF tecnicos',
  emailLogSheetName: 'Correos enviados',
  recipients: 'peajefragua@zimaseguridad.com.co,c.recaudo3@zimaseguridad.com.co',
  headers: [
    'Fecha de registro', 'Numero de informe', 'Peaje', 'Fecha', 'Hora inicio',
    'Hora final', 'Duracion', 'Ubicacion', 'Novedad', 'Tipo de actividad',
    'Area o sistema', 'Elemento intervenido', 'Lugar del evento', 'Estado final',
    'Fecha/hora evidencia', 'Descripcion', 'Actividad de correccion',
    'Resumen ejecutivo', 'Materiales', 'Diagnostico', 'Verificaciones',
    'Resultado', 'Recomendacion', 'Responsable', 'Supervisor', 'Fotos', 'PDF'
  ]
};

function doGet(event) {
  if (event && event.parameter && event.parameter.action === 'report') {
    try { return jsonResponse(getStoredReport(event.parameter)); }
    catch (error) { return jsonResponse({ok:false, error:error.message}); }
  }
  if (event && event.parameter && event.parameter.action === 'capabilities') {
    return jsonResponse({ok:true, capabilities:{browserPdf:true, resend:true, reportPreview:true, replacePdf:true}});
  }
  if (event && event.parameter && event.parameter.action === 'history') {
    return jsonResponse(getHistory(event.parameter.q || ''));
  }
  if (event && event.parameter && event.parameter.action === 'sent') {
    return jsonResponse(getSentEmails(event.parameter.q || ''));
  }
  if (event && event.parameter && event.parameter.action === 'regenerate') {
    return jsonResponse(regenerateReports(event.parameter.q || ''));
  }
  return jsonResponse({ ok: true, service: 'informes-tecnicos', version: 2 });
}

function getSentEmails(query) {
  const sheet = getEmailLogSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return { ok: true, total: 0, records: [] };
  const normalizedQuery = String(query).trim().toLowerCase();
  const records = values.slice(1).reverse().filter(function(row) {
    return !normalizedQuery || row.join(' ').toLowerCase().indexOf(normalizedQuery) !== -1;
  }).slice(0, 100).map(function(row) {
    return { fecha: row[0], numero: row[1], destinatarios: row[2], asunto: row[3], estado: row[4], pdf: row[5] };
  });
  return { ok: true, total: records.length, records: records };
}

function getHistory(query) {
  const sheet = getRegisterSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return { ok: true, total: 0, records: [] };
  const normalizedQuery = String(query).trim().toLowerCase();
  const records = values.slice(1).reverse().map(function(row, index) {
    return { row: row, rowNumber: values.length - index };
  }).filter(function(entry) {
    return !normalizedQuery || entry.row.join(' ').toLowerCase().indexOf(normalizedQuery) !== -1;
  }).slice(0, 100).map(function(entry, index) {
    const row = entry.row;
    let pdf = row[26] || '';
    if (!pdf && index < 10) {
      pdf = repairMissingPdf(sheet, row, entry.rowNumber);
    } else if (pdf) {
      ensurePdfAccess(pdf);
    }
    return {
      recordRow: entry.rowNumber, registrado: row[0], numero: row[1], peaje: row[2], fecha: row[3],
      hora: row[5], ubicacion: row[7], novedad: row[8], estado: row[13],
      responsable: row[23], supervisor: row[24], fotos: row[25], pdf: pdf
    };
  });
  return { ok: true, total: records.length, records: records };
}

function repairMissingPdf(sheet, row, rowNumber) {
  try {
    const payload = payloadFromRow(row);
    const pdfLink = saveReportPdf(payload, []);
    sheet.getRange(rowNumber, 27).setValue(pdfLink);
    return pdfLink;
  } catch (error) {
    return '';
  }
}

function regenerateReports(query) {
  const sheet = getRegisterSheet();
  const values = sheet.getDataRange().getDisplayValues();
  const normalizedQuery = String(query).trim().toLowerCase();
  let regenerated = 0, preserved = 0;
  values.slice(1).forEach(function(row, index) {
    if (!row[1] || (normalizedQuery && row.join(' ').toLowerCase().indexOf(normalizedQuery) === -1)) return;
    if (row[26]) { preserved++; return; }
    const links = String(row[25] || '').split(/\r?\n|\\n/).filter(Boolean);
    const pdfLink = saveReportPdf(payloadFromRow(row), links);
    sheet.getRange(index + 2, 27).setValue(pdfLink);
    regenerated++;
  });
  return {ok:true, regenerated:regenerated, preserved:preserved, message:regenerated+' PDF(s) faltantes recuperados. '+preserved+' original(es) conservados.'};
}

function payloadFromRow(row) {
  const fields = {};
  CONFIG.headers.slice(2, 25).forEach(function(header, index) {
    fields[headerToField(header)] = row[index + 2] || '';
  });
  return { numeroInforme: row[1], fecha: row[3], novedad: row[8], fields: fields, photos: [] };
}

function headerToField(header) {
  const fields = {
    'Peaje': 'peaje', 'Fecha': 'fecha', 'Hora inicio': 'horaInicio', 'Hora final': 'hora',
    'Duracion': 'duracion', 'Ubicacion': 'ubicacion', 'Novedad': 'novedad',
    'Tipo de actividad': 'tipoActividad', 'Area o sistema': 'areaSistema',
    'Elemento intervenido': 'elementoIntervenido', 'Lugar del evento': 'lugarEvento',
    'Estado final': 'estado', 'Fecha/hora evidencia': 'evidenciaFecha', 'Descripcion': 'descripcion',
    'Actividad de correccion': 'actividad', 'Resumen ejecutivo': 'resumen', 'Materiales': 'materiales',
    'Diagnostico': 'diagnostico', 'Verificaciones': 'verificaciones', 'Resultado': 'resultado',
    'Recomendacion': 'recomendacion', 'Responsable': 'responsable', 'Supervisor': 'supervisor'
  };
  return fields[header] || header;
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    if (payload.action === 'resend') return jsonResponse(resendReport(payload));
    if (payload.action === 'replacePdf') return jsonResponse(replaceStoredPdf(payload));
    if (!payload.numeroInforme || !payload.fecha || !payload.novedad) {
      throw new Error('Faltan datos basicos del informe.');
    }

    const sheet = getRegisterSheet();
    const photoLinks = savePhotos(payload);
    const fields = payload.fields || {};
    const pdfLink = saveReportPdf(payload, photoLinks);
    const row = [
      new Date(), payload.numeroInforme, fields.peaje || '', fields.fecha || payload.fecha,
      fields.horaInicio || '', fields.hora || '', fields.duracion || '', fields.ubicacion || '',
      fields.novedad || payload.novedad, fields.tipoActividad || '', fields.areaSistema || '',
      fields.elementoIntervenido || '', fields.lugarEvento || '', fields.estado || '',
      fields.evidenciaFecha || '', fields.descripcion || '', fields.actividad || '',
      fields.resumen || '', fields.materiales || '', fields.diagnostico || '',
      fields.verificaciones || '', fields.resultado || '', fields.recomendacion || '',
      fields.responsable || '', fields.supervisor || '', photoLinks.join('\n'), pdfLink
    ];
    sheet.appendRow(row);

    let emailSent = false;
    if (payload.sendEmail === true) {
      emailSent = sendReportEmail(payload, photoLinks, pdfLink);
      logSentEmail(payload, pdfLink);
    }

    return jsonResponse({ ok: true, numeroInforme: payload.numeroInforme, photos: photoLinks, emailSent: emailSent, pdfPreserved: payload.pdfSource === 'browser' && Boolean(payload.pdfBase64) });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}



function storedReportEntry(request) {
  const sheet = getRegisterSheet();
  const values = sheet.getDataRange().getDisplayValues();
  const normalized = function(value) { return String(value || '').replace(/^0+(?=\d)/, ''); };
  const number = normalized(request.numeroInforme);
  if (!number) throw new Error('Falta el numero del informe.');
  let matches = values.slice(1).map(function(row,index) { return {sheet:sheet,row:row,rowNumber:index+2}; }).filter(function(entry) { return normalized(entry.row[1]) === number; });
  if (request.recordRow) matches = matches.filter(function(entry) { return entry.rowNumber === Number(request.recordRow); });
  if (request.pdf) {
    const id = String(request.pdf).match(/[-\w]{25,}/);
    const mappedIds = {};
    if (id) {
      let mapped = id[0];
      for (let step = 0; step < 30; step++) {
        if (mappedIds[mapped]) break;
        mappedIds[mapped] = true;
        try { mapped = PropertiesService.getScriptProperties().getProperty('pdf_record_'+mapped); } catch (error) { break; }
        if (!mapped || !/^[-\w]{25,}$/.test(mapped)) break;
      }
    }
    matches = matches.filter(function(entry) {
      const current = String(entry.row[26] || '').match(/[-\w]{25,}/);
      return String(entry.row[26]) === String(request.pdf) || (current && mappedIds[current[0]]);
    });
  }
  if (matches.length !== 1) throw new Error(matches.length ? 'Hay varios informes con ese numero. Seleccione el registro desde el historial.' : 'No se encontro el informe seleccionado. Actualice el historial.');
  return matches[0];
}

function getStoredReport(request) {
  const entry = storedReportEntry(request);
  const payload = payloadFromRow(entry.row);
  const result = {ok:true, numeroInforme:String(entry.row[1]).padStart(3,'0'), recordRow:entry.rowNumber, pdf:entry.row[26] || '', fields:payload.fields};
  const link = String(entry.row[26] || '').match(/[-\w]{25,}/);
  if (link) {
    try {
      const blob = DriveApp.getFileById(link[0]).getBlob();
      const text = blob.getDataAsString('ISO-8859-1');
      if (text.indexOf('jsPDF') !== -1 && text.indexOf('/Subtype /Image') !== -1) {
        result.pdfBase64 = Utilities.base64Encode(blob.getBytes());
        result.filename = blob.getName() || ('Informe_'+result.numeroInforme+'.pdf');
        result.requiresRepair = false;
        return result;
      }
    } catch (error) { console.warn('Se preparara una vista corregida: '+error.message); }
  }
  result.requiresRepair = true;
  result.photos = String(entry.row[25] || '').split(/\r?\n|\\n/).filter(Boolean).map(function(url,index) {
    const id = url.match(/[-\w]{25,}/);
    if (!id) throw new Error('No se pudo identificar la evidencia '+(index+1)+'.');
    const blob = DriveApp.getFileById(id[0]).getBlob();
    const mime = blob.getContentType();
    if (!/^image\//.test(mime)) throw new Error('La evidencia '+(index+1)+' no es una imagen valida.');
    return {name:blob.getName() || ('Evidencia '+(index+1)),data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes())};
  });
  return result;
}

function replaceStoredPdf(request) {
  if (!request.pdfBase64 || request.pdfSource !== 'browser') throw new Error('Falta el PDF corregido del formulario.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Hay otra operacion en curso. Intente nuevamente.');
  try {
    const entry = storedReportEntry(request);
    const payload = payloadFromRow(entry.row);
    payload.pdfBase64 = request.pdfBase64;
    payload.pdfSource = 'browser';
    const pdfLink = saveReportPdf(payload, []);
    const oldId = String(entry.row[26] || '').match(/[-\w]{25,}/);
    const newId = String(pdfLink).match(/[-\w]{25,}/);
    if (oldId && newId) PropertiesService.getScriptProperties().setProperty('pdf_record_'+oldId[0],newId[0]);
    entry.sheet.getRange(entry.rowNumber,27).setValue(pdfLink);
    return {ok:true,pdfPreserved:true,numeroInforme:entry.row[1],pdf:pdfLink};
  } finally { lock.releaseLock(); }
}

function resendReport(request) {
 const lock = LockService.getScriptLock();
 if (!lock.tryLock(5000)) throw new Error('Hay otro envio en proceso. Espere y vuelva a intentar.');
 try {
  const entry = storedReportEntry(request);
  const sheet = entry.sheet;
  const payload = payloadFromRow(entry.row);
  const photoLinks = String(entry.row[25] || '').split(/\r?\n|\\n/).filter(Boolean);
  let pdfLink = entry.row[26] || '';
  if (!pdfLink) {
   pdfLink = saveReportPdf(payload, photoLinks);
   sheet.getRange(entry.rowNumber, 27).setValue(pdfLink);
  }
  const emailSent = sendReportEmail(payload, photoLinks, pdfLink);
  if (!emailSent) throw new Error('No se confirmo el reenvio del correo.');
  logSentEmail(payload, pdfLink);
  return {ok:true, emailSent:true, numeroInforme:payload.numeroInforme, pdf:pdfLink};
 } finally { lock.releaseLock(); }
}

function getEmailLogSheet() {
  const files = DriveApp.getFilesByName(CONFIG.spreadsheetName);
  const spreadsheet = files.hasNext() ? SpreadsheetApp.open(files.next()) : SpreadsheetApp.create(CONFIG.spreadsheetName);
  let sheet = spreadsheet.getSheetByName(CONFIG.emailLogSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.emailLogSheetName);
  const headers = ['Fecha de envio', 'Numero de informe', 'Destinatarios', 'Asunto', 'Estado', 'PDF'];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#173f52');
  sheet.setFrozenRows(1);
  [160, 120, 360, 300, 120, 300].forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  return sheet;
}

function logSentEmail(payload, pdfLink) {
  const fields = payload.fields || {};
  getEmailLogSheet().appendRow([
    new Date(), payload.numeroInforme, CONFIG.recipients,
    buildReportEmailSubject(payload),
    'Enviado', pdfLink
  ]);
}

function buildReportEmailSubject(payload) {
  const fields = payload.fields || {};
  const number = payload.numeroInforme;
  const toll = fields.peaje || 'Peaje Fragua';
  return 'Remisión informe técnico ' + number + ' - ' + toll;
}

function buildReportEmailBody(payload) {
  const fields = payload.fields || {};
  const number = payload.numeroInforme;
  const toll = fields.peaje || 'Peaje Fragua';
  const sender = fields.responsable || '[Tu nombre]';
  return [
    'Cordial saludo,',
    '',
    'Por medio del presente, me permito remitir adjunto el Informe Técnico No. ' + number + ', correspondiente al ' + toll + ', generado en formato PDF a través del sistema.',
    '',
    'El documento contiene la información registrada para su respectiva revisión, análisis y gestión, de acuerdo con los procedimientos establecidos.',
    '',
    'Agradezco confirmar la recepción del archivo adjunto y quedo atento a cualquier observación, ajuste o requerimiento adicional que consideren pertinente.',
    '',
    'Atentamente,',
    sender
  ].join('\n');
}

function buildReportEmailHtmlBody(payload) {
  return buildReportEmailBody(payload).split('\n\n').map(function(paragraph) {
    return '<p>' + paragraph.split('\n').map(escapeHtml).join('<br>') + '</p>';
  }).join('');
}

function sendReportEmail(payload, photoLinks, pdfLink) {
  const subject = buildReportEmailSubject(payload);
  const pdf = pdfLink
    ? DriveApp.getFileById(pdfLink.match(/[-\w]{25,}/)[0]).getBlob()
    : createReportPdf(payload, photoLinks);
  MailApp.sendEmail({
    to: CONFIG.recipients,
    subject: subject,
    htmlBody: buildReportEmailHtmlBody(payload),
    body: buildReportEmailBody(payload),
    attachments: [pdf]
  });
  return true;
}

function createReportPdf(payload, photoLinks) {
  const fields = payload.fields || {};
  const name = 'Informe_' + payload.numeroInforme + '_' + (fields.peaje || 'Peaje').replace(/[^a-zA-Z0-9]+/g, '_') + '.pdf';
  if (payload.pdfBase64) {
    const encoded = String(payload.pdfBase64);
    if (encoded.length > 26 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('El PDF recibido no es valido.');
    const bytes = Utilities.base64Decode(encoded);
    if (bytes.length < 5 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) throw new Error('El adjunto recibido no es un archivo PDF.');
    return Utilities.newBlob(bytes, MimeType.PDF, name);
  }
  if (payload.pdfSource === 'browser') throw new Error('No se recibio el PDF generado en el formulario.');
  const html = normalizeReportHtml(buildReportHtml(payload, photoLinks), photoLinks, payload);
  return Utilities.newBlob(html, MimeType.HTML, name).getAs(MimeType.PDF).setName(name);
}

function normalizeReportHtml(html, photoLinks, payload) {
  let normalized = String(html);
  if (payload && payload.logoAni) normalized = replaceLogoSource(normalized, 'ani', payload.logoAni);
  if (payload && payload.logoZima) normalized = replaceLogoSource(normalized, 'zima', payload.logoZima);
  normalized = materializeImagesForPdf(normalized, payload);
  normalized = normalized.replace(/@bottom-right\s*\{[^}]*\}/gi, '');
  normalized = normalized.replace(/<style media="print">([\s\S]*?)<\/style>/gi, '<style>$1</style>');
  normalized = normalized.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, function(match, css) {
    return '<style>' + css.replace(/@media\s+print\s*\{([\s\S]*?)\}/gi, '$1') + '</style>';
  });
  normalized = normalized.replace(/<body([^>]*)>/i, '<body$1><div class="pdf-root">');
  normalized = normalized.replace(/<\/body>/i, '</div></body>');
  normalized = normalized.replace('</head>', '<style>@page{ size:letter portrait; margin:12mm;  } html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact} .toolbar,.editor,.history-panel,.modal-backdrop-custom,.loading-overlay{display:none!important} /* Flujo continuo: cada hoja carta usa sus márgenes y el texto puede continuar. */ .sheet{display:block!important;width:100%!important;max-width:none!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;overflow:visible!important;zoom:1!important;position:static!important;break-before:auto;break-after:auto;page-break-after:auto} .sheet + .sheet{margin-top:5mm!important} .sheet + .sheet .header{display:none!important} .sheet .header,.sheet .title,.sheet .signature,.sheet .photo-frame{break-inside:avoid;page-break-inside:avoid} .sheet h2.sec{break-after:avoid;page-break-after:avoid;margin:4mm 0 2mm} .sheet .body,.sheet .step-text,.sheet .recommend,.sheet .result{orphans:3;widows:3;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal} .sheet .body{font-size:10pt;line-height:1.45;margin-bottom:2mm} .sheet .steps,.sheet .step,.sheet .recommend,.sheet .result,.sheet .info{break-inside:auto;page-break-inside:auto;overflow:visible} .sheet .step{display:block;min-height:0;padding:2mm 3mm;border-left:3px solid #c85f24} .sheet .step .num{display:inline-block;background:transparent;color:#c85f24;padding:0 2mm 0 0} .sheet .step-title{display:inline;font-size:10pt;padding:0;font-weight:bold} .sheet .step-text{display:block;font-size:10pt;line-height:1.45;padding:1mm 0 0} .sheet .result{display:block;padding:3mm}.sheet .result .check{display:none} .sheet .recommend{font-size:10pt;line-height:1.45;padding:3mm} .sheet .info{display:block}.sheet .info .item{display:inline-block;width:32%;vertical-align:top;min-height:0;break-inside:avoid;padding:2mm;border:0;border-bottom:1px solid #d6e1e5} .sheet .info .value{font-size:9pt;overflow-wrap:anywhere}.sheet .info .label{font-size:7pt} .sheet .header{padding-bottom:2mm}.sheet .title{margin-top:3mm;padding-bottom:2mm}.sheet .title h1{font-size:19pt} #photosContainer{display:block!important;break-inside:auto;page-break-inside:auto} .sheet .photo-frame{display:inline-block;width:48%;vertical-align:top;margin:0 1% 3mm 0;padding:1mm;box-sizing:border-box} .sheet .photo-frame img{display:block;width:100%;max-width:100%;height:48mm;object-fit:contain} .sheet .caption{white-space:normal;overflow-wrap:anywhere} .sheet .signature{margin-top:5mm;display:grid;grid-template-columns:1fr 1fr} .sheet .footer{position:static;left:auto;right:auto;bottom:auto;margin-top:5mm;padding-top:2mm} .sheet:not(:last-of-type) .footer{display:none} [hidden]{display:none!important}  /* Tabla para conservar las dos firmas tanto en impresion como en el PDF. */ .signature{display:table!important;width:100%;table-layout:fixed;border-collapse:collapse;margin-top:6mm;break-inside:avoid!important;page-break-inside:avoid!important} .signature tr,.signature td{break-inside:avoid!important;page-break-inside:avoid!important} .signature .sigbox{width:47%;padding:3mm;vertical-align:top;border:1px solid #52656d;text-align:center;color:#172b34;background:#fff} .signature .signature-gap{width:6%;border:0} .signature .sighead{font:bold 9pt/1.4 Arial,sans-serif;color:#172b34;background:#fff;padding:0;min-height:9mm} .signature .signature-space{height:20mm;border-bottom:1px solid #263940;margin:0 2mm 2mm} .signature .sigline{padding:0;font:10pt/1.4 Arial,sans-serif;color:#172b34;overflow-wrap:anywhere} .signature .sigline small{display:block;font-size:8pt;margin-top:1mm}  .pdf-root{width:100%;margin:0}.page{max-width:none;width:100%;margin:0;padding:0} .photos{display:block}.photo{display:inline-block;width:48%;vertical-align:top;break-inside:avoid}.photo img{max-width:100%;height:48mm;object-fit:contain}</style></head>');
  return normalized;
}

function materializeImagesForPdf(html, payload) {
  const folderIterator = DriveApp.getFoldersByName(CONFIG.reportFolderName);
  const folder = folderIterator.hasNext() ? folderIterator.next() : DriveApp.createFolder(CONFIG.reportFolderName);
  const cache = {};
  return String(html).replace(/src=["'](data:image\/[^"']+)["']/gi, function(match, dataUri) {
    if (cache[dataUri]) return 'src="' + cache[dataUri] + '"';
    const parts = dataUri.match(/^data:(image\/[^;]+);base64,(.+)$/i);
    if (!parts) return match;
    try {
      const extension = parts[1].split('/')[1].replace('jpeg', 'jpg');
      const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(parts[2]), parts[1],
        'Informe_' + ((payload && payload.numeroInforme) || 'nuevo') + '_recurso_' + Object.keys(cache).length + '.' + extension));
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (sharingError) {
        console.warn('No se pudo compartir el recurso del PDF: ' + sharingError.message);
      }
      cache[dataUri] = 'https://drive.google.com/uc?export=download&id=' + file.getId();
      return 'src="' + cache[dataUri] + '"';
    } catch (error) {
      return match;
    }
  });
}

function replaceLogoSource(html, logoClass, source) {
  const escapedSource = String(source).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const pattern = new RegExp('(<img\\b[^>]*class=["\\\'][^"\\\']*\\b' + logoClass + '\\b[^"\\\']*["\\\'][^>]*src=["\\\'])[^"\\\']*', 'i');
  return html.replace(pattern, '$1' + escapedSource);
}

function saveReportPdf(payload, photoLinks) {
  const folders = DriveApp.getFoldersByName(CONFIG.reportFolderName);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.reportFolderName);
  const file = folder.createFile(createReportPdf(payload, photoLinks));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    console.warn('No se pudo habilitar el acceso por enlace al PDF: ' + sharingError.message);
  }
  return 'https://drive.google.com/uc?export=download&id=' + file.getId();
}

function ensurePdfAccess(pdfLink) {
  try {
    const match = String(pdfLink).match(/[-\w]{25,}/);
    if (match) DriveApp.getFileById(match[0]).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    console.warn('No se pudo actualizar el acceso del PDF: ' + sharingError.message);
  }
}

function buildReportHtml(payload, photoLinks) {
  if (payload.reportHtml) {
    let reportHtml = payload.reportHtml;
    if (payload.logoAni) reportHtml = replaceLogoSource(reportHtml, 'ani', payload.logoAni);
    if (payload.logoZima) reportHtml = replaceLogoSource(reportHtml, 'zima', payload.logoZima);
    return reportHtml;
  }
  const fields = payload.fields || {};
  const value = function(key) { return escapeHtml(fields[key] || ''); };
  const number = escapeHtml(payload.numeroInforme);
  const toll = value('peaje') || 'Peaje Fragua';
  const status = value('estado') || 'Pendiente';
  const aniLogo = payload.logoAni ? '<div class="fallback-logo-wrap"><img class="fallback-logo ani-logo" src="' + payload.logoAni + '"><span>ANI</span></div>' : '<div class="brand-mark">ANI</div>';
  const zimaLogo = payload.logoZima ? '<div class="fallback-logo-wrap"><img class="fallback-logo zima-logo" src="' + payload.logoZima + '"><span>ZIMA</span></div>' : '<div class="partner-mark">ZIMA</div>';
  const photos = (payload.photos || []).map(function(photo, index) {
    const data = String(photo.data || '');
    return '<div class="photo"><img src="' + data + '"><p>Evidencia ' + (index + 1) + '</p></div>';
  }).join('') || drivePhotosHtml(photoLinks || []);
  return '<!doctype html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;color:#243942;font-size:11px;margin:0;background:#eef3f5}' +
    '.page{max-width:820px;margin:0 auto;background:#fff;padding:28px}' +
    '.document-header{background:#173f52;color:#fff;border-bottom:5px solid #d96b2b;padding:18px 20px;display:flex;align-items:center;gap:16px}' +
    '.brand-mark{width:48px;height:48px;border:2px solid #f0a36c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;letter-spacing:1px;color:#fff}.partner-mark{padding:8px 9px;border:1px solid #80aab5;color:#fff;font-size:12px;font-weight:bold;letter-spacing:1px;transform:skew(-8deg)}.fallback-logo-wrap{position:relative;display:flex;align-items:center;justify-content:center;background:#fff}.fallback-logo-wrap span{position:absolute;color:#173f52;font-weight:bold;font-size:13px}.fallback-logo{position:relative;z-index:2;display:block;object-fit:contain;background:#fff}.ani-logo{width:58px;height:58px}.zima-logo{width:70px;height:58px}' +
    '.header-copy{flex:1}.header-kicker{font-size:9px;letter-spacing:1.5px;color:#b9d0d7;text-transform:uppercase;margin-bottom:5px}' +
    '.document-header h1{margin:0;color:#fff;font-size:20px;line-height:1.15}.header-subtitle{margin-top:5px;color:#dce9ec;font-size:11px}' +
    '.header-badge{border:1px solid #80aab5;padding:8px 10px;text-align:center;font-size:9px;line-height:1.3}.header-badge strong{display:block;font-size:15px;color:#fff}' +
    'h1{color:#173f52;font-size:20px;border-bottom:3px solid #d96b2b;padding-bottom:10px}' +
    'h2{font-size:13px;color:#173f52;border-left:4px solid #d96b2b;padding-left:8px;margin-top:18px}' +
    '.meta{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #cbd8dd}' +
    '.item{padding:8px;border:1px solid #dce5e8}.label{font-size:8px;color:#52717b;font-weight:bold}.value{margin-top:4px}' +
    '.photos{display:grid;grid-template-columns:1fr 1fr;gap:8px}.photo{border:1px solid #ccd5d9;padding:4px}.photo img{width:100%;height:230px;object-fit:contain}.photo p{font-size:9px;margin:4px}' +
    '</style></head><body><div class="page"><div class="document-header">' + aniLogo + zimaLogo + '<div class="header-copy"><div class="header-kicker">Centro de informes técnicos</div><h1>Informe de mantenimiento e infraestructura</h1><div class="header-subtitle">' + toll + '</div></div><div class="header-badge"><strong>' + number + '</strong>INFORME</div></div>' +
    '<p><b>Registro técnico:</b> ' + number + ' &nbsp; <b>Peaje:</b> ' + toll + ' &nbsp; <b>Estado:</b> ' + status + '</p>' +
    '<div class="meta">' + item('Fecha', value('fecha')) + item('Hora inicio', value('horaInicio')) + item('Hora final', value('hora')) +
    item('Ubicacion', value('ubicacion')) + item('Novedad', value('novedad')) + item('Estado final', value('estado')) +
    item('Area o sistema', value('areaSistema')) + item('Elemento intervenido', value('elementoIntervenido')) + item('Responsable', value('responsable')) + '</div>' +
    section('Resumen ejecutivo', value('resumen')) + section('Descripcion de la novedad', value('descripcion')) +
    section('Actividad de correccion realizada', value('actividad')) + section('Materiales y repuestos utilizados', value('materiales')) +
    section('Hallazgos y causa probable', value('diagnostico')) + section('Pruebas y verificaciones realizadas', value('verificaciones')) +
    section('Resultado operativo', value('resultado')) + section('Consideracion tecnica y recomendacion', value('recomendacion')) +
    '<h2>Evidencia fotografica</h2><div class="photos">' + photos + '</div>' +
    '<h2>Cierre y firmas</h2><table class="signature" role="presentation"><tbody><tr><td class="sigbox"><div class="sighead">RESPONSABLE DE LA INTERVENCIÓN</div><div class="signature-space"></div><div class="sigline">' + value('responsable') + '<small>Firma</small></div></td><td class="signature-gap"></td><td class="sigbox"><div class="sighead">RESPONSABLE / SUPERVISOR</div><div class="signature-space"></div><div class="sigline">' + value('supervisor') + '<small>Firma</small></div></td></tr></tbody></table>' +
    '</div></body></html>';
}

function drivePhotosHtml(photoLinks) {
  return photoLinks.map(function(link, index) {
    try {
      const match = String(link).match(/[-\w]{25,}/);
      if (!match) return '';
      const blob = DriveApp.getFileById(match[0]).getBlob();
      const data = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
      return '<div class="photo"><img src="' + data + '"><p>Evidencia ' + (index + 1) + '</p></div>';
    } catch (error) {
      return '';
    }
  }).join('');
}

function section(title, content) {
  return '<h2>' + title + '</h2><p>' + content.replace(/\n/g, '<br>') + '</p>';
}

function item(label, content) {
  return '<div class="item"><div class="label">' + label + '</div><div class="value">' + content + '</div></div>';
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getRegisterSheet() {
  const files = DriveApp.getFilesByName(CONFIG.spreadsheetName);
  const spreadsheet = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : SpreadsheetApp.create(CONFIG.spreadsheetName);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.headers);
  }
  configureRegisterSheet(sheet);
  return sheet;
}

function configureRegisterSheet(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, CONFIG.headers.length);
  headerRange.setValues([CONFIG.headers]);
  headerRange.setFontWeight('bold').setFontColor('#ffffff').setBackground('#173f52');
  headerRange.setHorizontalAlignment('center').setVerticalAlignment('middle');
  headerRange.setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 34);
  const widths = [150, 110, 145, 100, 90, 90, 90, 210, 210, 160, 160, 180, 160, 145, 150, 280, 280, 280, 220, 280, 280, 240, 280, 170, 170, 260, 260];
  widths.forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  if (!sheet.getFilter() && sheet.getLastRow() >= 1) {
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), CONFIG.headers.length).createFilter();
  }
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG.headers.length)
      .setVerticalAlignment('top').setWrap(true);
  }
}

function savePhotos(payload) {
  const photos = payload.photos || [];
  if (!photos.length) return [];
  const folders = DriveApp.getFoldersByName(CONFIG.driveFolderName);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.driveFolderName);
  return photos.map(function(photo, index) {
    const match = String(photo.data || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return '';
    const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1],
      (payload.numeroInforme || 'informe') + '_evidencia_' + (index + 1) + '.jpg');
    return folder.createFile(blob).getUrl();
  }).filter(Boolean);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
