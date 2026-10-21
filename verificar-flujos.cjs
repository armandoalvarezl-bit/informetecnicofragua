const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('Code.gs','utf8');const context={};vm.createContext(context);vm.runInContext(code,context);
const row=Array(27).fill('');row[1]='002';row[2]='Peaje Fragua';row[3]='2026-10-21';row[8]='Prueba de informe existente';row[23]='Responsable';row[25]='https://drive.google.com/file/d/PHOTO_ID_1234567890123456789/view\nhttps://drive.google.com/file/d/PHOTO_ID_9876543210123456789/view';row[26]='https://drive.google.com/file/d/PDF_ID_123456789012345678901/view';
let rows,mailCalls,logCalls,writes,released,generated,failSend;
function reset(records=[row]){
 rows=[Array(27).fill('Cabecera'),...records.map(r=>r.slice())];mailCalls=[];logCalls=[];writes=[];released=0;generated=[];failSend=false;
 context.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released++})};
 context.getRegisterSheet=()=>({getDataRange:()=>({getDisplayValues:()=>rows}),appendRow:()=>{throw Error('No debe crear otro informe');},getRange:(r,c)=>({setValue:v=>{writes.push([r,c,v]);rows[r-1][c-1]=v;}})});
 context.sendReportEmail=(...args)=>{mailCalls.push(args);if(failSend)throw Error('Error de correo');return true;};
 context.logSentEmail=(...args)=>logCalls.push(args);
 context.saveReportPdf=(...args)=>{generated.push(args);return row[26];};
 context.jsonResponse=data=>data;
 context.requireSession_=()=>({user:{username:'test'}}); // Auth is covered separately in verificar-acceso.cjs.
}
let passed=0;function test(name,fn){fn();passed++;console.log('OK '+name);}
reset();test('Reenvia PDF existente sin crear filas ni cambiar numero',()=>{const response=context.doPost({postData:{contents:JSON.stringify({action:'resend',numeroInforme:'002',recordRow:2,pdf:row[26]})}});assert.equal(response.ok,true);assert.equal(response.emailSent,true);assert.equal(mailCalls[0][0].numeroInforme,'002');assert.equal(mailCalls[0][2],row[26]);assert.equal(rows.length,2);assert.equal(writes.length,0);assert.equal(logCalls.length,1);assert.equal(released,1);});
reset();test('Rechaza registro cambiado sin enviar correo',()=>{assert.throws(()=>context.resendReport({numeroInforme:'003',recordRow:2,pdf:row[26]}));assert.equal(mailCalls.length,0);assert.equal(released,1);});
reset([row,row]);test('Rechaza numero ambiguo',()=>{assert.throws(()=>context.resendReport({numeroInforme:'002'}));assert.equal(mailCalls.length,0);});
reset([row,row]);test('Identifica fila exacta entre numeros repetidos',()=>{context.resendReport({numeroInforme:'002',recordRow:3,pdf:row[26]});assert.equal(mailCalls.length,1);});
const missing=row.slice();missing[26]='';reset([missing]);test('Si falta PDF lo reconstruye con evidencias sin duplicar informe',()=>{context.resendReport({numeroInforme:'002',recordRow:2});assert.equal(generated.length,1);assert.equal(generated[0][1].length,2);assert.equal(writes.length,1);assert.equal(rows.length,2);assert.equal(mailCalls.length,1);});
reset();failSend=true;test('Error de correo no registra exito y libera bloqueo',()=>{const response=context.doPost({postData:{contents:JSON.stringify({action:'resend',numeroInforme:'002',recordRow:2})}});assert.equal(response.ok,false);assert.equal(logCalls.length,0);assert.equal(released,1);});
reset();test('No admite sustituir el adjunto por otro enlace',()=>{assert.throws(()=>context.resendReport({numeroInforme:'002',recordRow:2,pdf:'https://example.com/otro.pdf'}));assert.equal(mailCalls.length,0);});
for(const file of ['informe.js','reenvio.js'])new Function(fs.readFileSync(file,'utf8'));
for(const file of ['historial.html','correos.html'])new Function(fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log(passed+' pruebas del servidor y sintaxis correctas. No se enviaron correos reales.');
// El PDF original no debe pasar por el conversor HTML de Google.
const originalPdf=process.argv[2]?fs.readFileSync(process.argv[2]):Buffer.from('%PDF-1.7\nContenido original de prueba\n%%EOF');
const exact={};vm.createContext(exact);vm.runInContext(code,exact);
let storedBlob=null,attachment=null;
exact.MimeType={PDF:'application/pdf',HTML:'text/html'};
exact.Utilities={base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:(bytes,mime,name)=>({bytes:Array.from(bytes),mime,name,getAs(){throw Error('No debe reconvertir el PDF original');}})};
const file={getId:()=> 'PDF_ORIGINAL_1234567890123456789',setSharing:()=>{},getBlob:()=>storedBlob};
exact.DriveApp={Access:{ANYONE_WITH_LINK:'link'},Permission:{VIEW:'view'},getFoldersByName:()=>({hasNext:()=>true,next:()=>({createFile:blob=>{storedBlob=blob;return file;}})}),getFileById:()=>file};
exact.MailApp={sendEmail:message=>{attachment=message.attachments[0];}};
const originalPayload={numeroInforme:'002',fields:{peaje:'Peaje Fragua'},pdfSource:'browser',pdfBase64:originalPdf.toString('base64')};
test('Guarda y adjunta exactamente el PDF recibido sin convertir HTML',()=>{const url=exact.saveReportPdf(originalPayload,[]);exact.sendReportEmail(originalPayload,[],url);assert.deepEqual(Buffer.from(attachment.bytes),originalPdf);assert.equal(attachment.mime,'application/pdf');});
test('Rechaza contenido que no es PDF',()=>assert.throws(()=>exact.createReportPdf({...originalPayload,pdfBase64:Buffer.from('no es pdf').toString('base64')},[])));
test('No usa otro formato si falta el PDF del navegador',()=>assert.throws(()=>exact.createReportPdf({...originalPayload,pdfBase64:''},[])));
reset([row,missing]);test('Recuperar PDFs faltantes no reemplaza los originales',()=>{const result=context.regenerateReports('');assert.equal(result.preserved,1);assert.equal(result.regenerated,1);assert.equal(writes.length,1);assert.equal(writes[0][0],3);assert.equal(rows[1][26],row[26]);});
console.log('Total: '+passed+' pruebas satisfactorias, sin correos reales.');
// Consulta y reparacion de PDF historicos.
const mappedPdfs=new Map();
context.PropertiesService={getScriptProperties:()=>({getProperty:key=>mappedPdfs.get(key)||null,setProperty:(key,value)=>mappedPdfs.set(key,value)})};
context.Utilities={base64Encode:bytes=>Buffer.from(bytes).toString('base64')};
const imageBlob={getContentType:()=> 'image/png',getName:()=> 'Evidencia.png',getBytes:()=>[137,80,78,71]};
let modernPdf=false;
context.DriveApp={getFileById:id=>({getBlob:()=>id.startsWith('PHOTO_')?imageBlob:{getDataAsString:()=>modernPdf?'%PDF jsPDF /Subtype /Image':'PDF del formato anterior',getBytes:()=>Array.from(originalPdf),getName:()=> 'Informe_002.pdf'}})};
reset();test('Vista antigua recupera campos y todas las evidencias privadas',()=>{const report=context.getStoredReport({numeroInforme:'002',recordRow:2,pdf:row[26]});assert.equal(report.requiresRepair,true);assert.equal(report.photos.length,2);assert(report.photos.every(photo=>photo.data.startsWith('data:image/png;base64,')));assert.equal(report.fields.responsable,'Responsable');});
reset();modernPdf=true;test('Vista moderna devuelve el PDF original sin reconstruirlo',()=>{const report=context.getStoredReport({numeroInforme:'002',recordRow:2,pdf:row[26]});assert.equal(report.requiresRepair,false);assert.deepEqual(Buffer.from(report.pdfBase64,'base64'),originalPdf);assert.equal(generated.length,0);});
reset();const corrected='https://drive.google.com/file/d/CORRECTED_PDF_1234567890123456789/view';context.saveReportPdf=()=>corrected;
test('Corregir PDF modifica solo el enlace y conserva numero y registro',()=>{const response=context.replaceStoredPdf({numeroInforme:'002',recordRow:2,pdf:row[26],pdfSource:'browser',pdfBase64:originalPdf.toString('base64')});assert.equal(response.ok,true);assert.equal(rows.length,2);assert.equal(rows[1][1],'002');assert.equal(writes.length,1);assert.equal(writes[0][1],27);assert.equal(rows[1][26],corrected);assert.equal(mailCalls.length,0);assert.equal(released,1);});
test('Los enlaces antiguos apuntan al registro corregido',()=>{const report=context.getStoredReport({numeroInforme:'002',pdf:row[26]});assert.equal(report.pdf,corrected);assert.equal(report.requiresRepair,false);});
test('Reenviar desde un enlace antiguo adjunta la version corregida',()=>{context.resendReport({numeroInforme:'002',pdf:row[26]});assert.equal(mailCalls.length,1);assert.equal(mailCalls[0][2],corrected);});
test('No modifica PDFs si no coinciden numero y fila',()=>{assert.throws(()=>context.replaceStoredPdf({numeroInforme:'099',recordRow:2,pdf:row[26],pdfSource:'browser',pdfBase64:originalPdf.toString('base64')}));assert.equal(writes.length,1);});
console.log('Total actualizado: '+passed+' pruebas satisfactorias.');
