const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyC9Veh9N9OTdfspPS2qRqiAIgznBc1-jLyV4i-d7j1wWTVkG4WvfxlG1D-_5JGg50XuQ/exec';
const ids=["peaje","numeroInforme","fecha","horaInicio","hora","duracion","ubicacion","novedad","tipoActividad","areaSistema","elementoIntervenido","lugarEvento","estado","procedencia","autorizacion","evidenciaFecha","descripcion","actividad","resumen","materiales","diagnostico","verificaciones","resultado","recomendacion","responsable","supervisor","paso1_titulo","paso1_desc","paso2_titulo","paso2_desc","paso3_titulo","paso3_desc","paso4_titulo","paso4_desc"];
const camposRequeridos=["fecha","horaInicio","hora","ubicacion","novedad","tipoActividad","areaSistema","elementoIntervenido","lugarEvento","estado","descripcion","actividad","verificaciones","resultado","recomendacion","responsable","supervisor"];
let fotos=[];
let modalAction=null;
let guardando=false;
let cargandoFotos=false;
let versionFotos=0;

function storageGet(key){
 try{return localStorage.getItem(key);}catch(error){return null;}
}
function storageSet(key,value){
 try{localStorage.setItem(key,value);}catch(error){}
}
function storageRemove(key){
 try{localStorage.removeItem(key);}catch(error){}
}

function openAppModal(title,message,action=null,confirmText="Confirmar",showCancel=true){
 const modal=document.getElementById("appModal");
 document.getElementById("emailPreview").hidden=true;
 modal.querySelector(".modal-card-custom").classList.remove("email-preview-open");
 document.getElementById("modalTitle").textContent=title;
 document.getElementById("modalMessage").textContent=message;
 document.getElementById("modalConfirm").textContent=confirmText;
 document.getElementById("modalCancel").style.display=showCancel?"inline-block":"none";
 modalAction=action;
 modal.classList.add("is-open");
 document.getElementById("modalConfirm").focus();
}

function closeAppModal(){
 document.getElementById("appModal").classList.remove("is-open");
 modalAction=null;
}

document.getElementById("modalConfirm").addEventListener("click",()=>{
 const action=modalAction;
 closeAppModal();
 if(action)action();
});
document.getElementById("modalCancel").addEventListener("click",closeAppModal);
document.getElementById("modalClose").addEventListener("click",closeAppModal);
document.getElementById("appModal").addEventListener("click",event=>{
 if(event.target.id==="appModal")closeAppModal();
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape")closeAppModal();
});

const elementosPorArea={
 "Equipos de estación":["Computador","Monitor","Teclado y mouse","Impresora","UPS o regulador","Equipo de comunicaciones","Cámara","Otro equipo de estación"],
 "Operación de peaje":["Carril de peaje","Plumilla o barrera","Pantalla LED","Semáforo","Lector de tarjetas o dispositivos","Sistema de cobro","Intercomunicador","Otro elemento de operación"]
};

function actualizarElementos(){
 const area=document.getElementById("areaSistema").value;
 const select=document.getElementById("elementoIntervenido");
 select.innerHTML="";
 if(!area || !elementosPorArea[area]){
  select.disabled=true;
  select.add(new Option("Primero seleccione un área o sistema",""));
  return;
 }
 select.disabled=false;
 select.add(new Option("Seleccionar elemento intervenido","",true,true));
 elementosPorArea[area].forEach(elemento=>select.add(new Option(elemento,elemento)));
}

function formatDate(value){
 if(!value)return "";
 return new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z"));
}

function formatTime(value){
 if(!value)return "";
 return value+" horas";
}

function actualizarDuracion(){
 const inicio=document.getElementById("horaInicio").value;
 const fin=document.getElementById("hora").value;
 const duracionInput=document.getElementById("duracion");
 if(!inicio||!fin){
  duracionInput.value="00 h 00 min";
  return;
 }
 let minutos=(parseInt(fin.slice(0,2))*60+parseInt(fin.slice(3)))-(parseInt(inicio.slice(0,2))*60+parseInt(inicio.slice(3)));
 if(minutos<0)minutos+=24*60;
 duracionInput.value=`${Math.floor(minutos/60)} h ${String(minutos%60).padStart(2,"0")} min`;
}

function formatDateTime(value){
 if(!value)return "";
 const [date,time]=value.split("T");
 return formatDate(date)+" · "+formatTime(time);
}

function displayValue(id){
 const value=document.getElementById(id).value;
 if(id==="fecha")return formatDate(value);
 if(id==="hora")return formatTime(value);
 if(id==="evidenciaFecha")return formatDateTime(value);
 return value;
}

function update(){
 const numeroField=document.getElementById("numeroInforme");
 if(numeroField && !numeroField.value){
  inicializarNumero();
 }
 actualizarDuracion();
 ids.forEach(id=>{
  const campo=document.getElementById(id);
  if(!campo)return;
  document.querySelectorAll('[data-bind="'+id+'"]').forEach(el=>el.textContent=displayValue(id));
 });
 document.querySelectorAll('[data-bind="peaje"]').forEach(el=>el.textContent=document.getElementById("peaje").value);
 document.getElementById("peajeHeader").textContent="TIC – SOPORTE TÉCNICO • "+document.getElementById("peaje").value;
 document.getElementById("peajeTexto").textContent=document.getElementById("peaje").value;
 document.querySelectorAll(".step").forEach(el=>{el.hidden=![...el.querySelectorAll("[data-bind]")].some(v=>v.textContent.trim());});
 document.querySelectorAll(".sheet [data-bind]").forEach(el=>{if(!el.textContent.trim())el.textContent="No registrado";});
 const estado=document.getElementById("estado").value;
 document.querySelectorAll('[data-bind="estado"]').forEach(el=>el.classList.toggle("green",estado==="OPERATIVO"));
 const resultadoBox=document.querySelector(".result");resultadoBox.classList.toggle("is-pending",estado!=="OPERATIVO");
 updatePhotos();
 const firma1=document.getElementById("firma1");
 const firma2=document.getElementById("firma2");
 if(firma1)firma1.textContent=document.getElementById("responsable").value||"Nombre y firma";
 if(firma2)firma2.textContent=document.getElementById("supervisor").value||"Nombre y firma";
}

function setStatus(message, type = 'info') {
 const status = document.getElementById('cloudStatus');
 if (!status) return;
 status.className = 'status-banner ' + type;
 status.replaceChildren();
 const badge=document.createElement("span");badge.className="status-badge";
 const text=document.createElement("span");text.textContent=message;status.append(badge,text);
}

function showLoading(title = 'Procesando', text = 'Guardando información...') {
 const overlay = document.getElementById('loadingOverlay');
 const titleEl = document.getElementById('loadingTitle');
 const textEl = document.getElementById('loadingText');
 if (!overlay || !titleEl || !textEl) return;
 titleEl.textContent = title;
 textEl.textContent = text;
 overlay.classList.add('show');
}

function hideLoading() {
 guardando=false;
 const overlay = document.getElementById('loadingOverlay');
 if (overlay) overlay.classList.remove('show');
}

function guardarBorrador(){
 const datos={};
 ids.forEach(id=>{if(id!=="duracion")datos[id]=document.getElementById(id).value;});
 storageSet("informe_borrador",JSON.stringify(datos));
}

function cargarBorrador(){
 try{
  const datos=JSON.parse(storageGet("informe_borrador")||"null");
  if(!datos)return;
  Object.entries(datos).forEach(([id,value])=>{const campo=document.getElementById(id);if(campo)campo.value=value;});
  actualizarElementos();
  document.getElementById("elementoIntervenido").value=datos.elementoIntervenido||"";
  }catch(error){
   storageRemove("informe_borrador");
   ids.forEach(id=>{const campo=document.getElementById(id);if(campo&&id!=="numeroInforme"&&id!=="duracion")campo.value="";});
   actualizarElementos();
  }
}

function exportarBorrador(){
 guardarBorrador();
 const datos={version:1,creado:new Date().toISOString(),campos:JSON.parse(storageGet("informe_borrador")||"{}")};
 const enlace=document.createElement("a");
 enlace.href=URL.createObjectURL(new Blob([JSON.stringify(datos,null,2)],{type:"application/json"}));
 enlace.download=`respaldo_informe_${document.getElementById("numeroInforme").value||"nuevo"}.json`;
 enlace.click();
 URL.revokeObjectURL(enlace.href);
}

function importarBorrador(event){
 const archivo=event.target.files[0];
 if(!archivo)return;
 const lector=new FileReader();
 lector.onload=()=>{
  try{
   const respaldo=JSON.parse(lector.result);const datos=respaldo.campos||respaldo;
   Object.entries(datos).forEach(([id,value])=>{const campo=document.getElementById(id);if(campo&&ids.includes(id)&&id!=="numeroInforme"&&id!=="duracion"&&typeof value==="string")campo.value=value;});
   actualizarElementos();document.getElementById("elementoIntervenido").value=datos.elementoIntervenido||"";update();guardarBorrador();
   openAppModal("Respaldo cargado","La información fue recuperada correctamente.",null,"Entendido",false);
  }catch(error){openAppModal("Archivo no válido","No se pudo leer el respaldo seleccionado.",null,"Entendido",false);}
  event.target.value="";
 };
 lector.readAsText(archivo);
}

function validarCampos(){
 let faltantes=0;
 camposRequeridos.forEach(id=>{
   const campo=document.getElementById(id);
   if(!campo)return;
   const field=campo.closest(".field");
   const invalido=!campo.value.trim();
   if(field)field.classList.toggle("invalid",invalido);
   campo.setAttribute("aria-invalid",String(invalido));
   if(invalido){const details=campo.closest("details");if(details)details.open=true;}
   if(invalido)faltantes++;
 });
 if(faltantes)document.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea")?.focus();
 return faltantes;
}

function mostrarHistorial(){
 const panel=document.getElementById("historyPanel");
 panel.hidden=false;
 panel.scrollIntoView({behavior:"smooth",block:"start"});
 cargarHistorial();
}

function ocultarHistorial(){
 document.getElementById("historyPanel").hidden=true;
}

function escaparHtml(value){
 return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function cargarHistorial(){
 const status=document.getElementById("historyStatus");
 const results=document.getElementById("historyResults");
 const query=document.getElementById("historyQuery").value.trim();
 if(!APPS_SCRIPT_URL){
  status.textContent="Configura la URL de Apps Script para consultar el historial.";
  return;
 }
 status.textContent="Consultando informes guardados...";
 results.innerHTML="";
 ReportAuth.fetch(`${APPS_SCRIPT_URL}?action=history&q=${encodeURIComponent(query)}`, { method: 'GET', mode: 'cors', cache: 'no-store' })
  .then(response=>{
   if(!response.ok){
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
   }
   return response.json();
  })
  .then(data=>{
   hideLoading();
   if(!data.ok)throw new Error(data.error||"No se pudo consultar el historial.");
   status.textContent=`${data.total} informe(s) encontrado(s).`;
   if(!data.records.length){results.className="history-empty";results.textContent="No hay informes que coincidan con la búsqueda.";return;}
   results.className="";
   results.innerHTML=`<table class="history-table"><thead><tr><th>Número</th><th>Fecha</th><th>Peaje</th><th>Novedad</th><th>Estado</th><th>Responsable</th><th>Evidencias</th></tr></thead><tbody>${data.records.map(record=>`<tr><td><strong>${escaparHtml(record.numero)}</strong></td><td>${escaparHtml(record.fecha)}<br><small>${escaparHtml(record.hora)}</small></td><td>${escaparHtml(record.peaje)}</td><td>${escaparHtml(record.novedad)}<br><small>${escaparHtml(record.ubicacion)}</small></td><td>${escaparHtml(record.estado)}</td><td>${escaparHtml(record.responsable)}</td><td>${record.fotos?record.fotos.split(/\r?\n|\\n/).filter(Boolean).map((link,index)=>`<a href="${escaparHtml(link)}" target="_blank" rel="noopener">Foto ${index+1}</a>`).join(" · "):"Sin fotos"}</td></tr>`).join("")}</tbody></table>`;
  })
  .catch(error=>{hideLoading(); status.textContent="No se pudo consultar el historial. Verifica la implementación de Apps Script y la URL del proyecto.";results.className="history-empty";results.textContent=error.message;});
}

document.getElementById("historyQuery").addEventListener("keydown",event=>{
 if(event.key==="Enter")cargarHistorial();
});

async function guardarEnNube(enviarCorreo=false,onComplete=null,silencioso=false){
 if(guardando)return;
 if(cargandoFotos){openAppModal("Evidencias en proceso","Espere a que terminen de cargar las imágenes.",null,"Entendido",false);return;}
 const faltantes=validarCampos();
 if(faltantes){
  openAppModal("Faltan datos por completar",`Completa los campos obligatorios antes de guardar (${faltantes} pendientes).`,null,"Entendido",false);
  return;
 }
 if(!APPS_SCRIPT_URL){
  if(onComplete)onComplete();
  if(silencioso)return;
  openAppModal("Falta configurar la conexión","Pega la URL /exec de Apps Script en la constante APPS_SCRIPT_URL de informe.js. Consulta CONFIGURACION_APPS_SCRIPT.md para completar el despliegue.",null,"Entendido",false);
  return;
 }
 guardando=true;
 const fields={};
 ids.forEach(id=>{if(id!=="numeroInforme")fields[id]=document.getElementById(id).value;});
 update();
 const reportHtml=crearDocumentoImpresion();
 const logoAni=document.querySelector(".sheet .header .ani")?.src||"";
 const logoZima=document.querySelector(".sheet .header .zima")?.src||"";
 const payload={numeroInforme:document.getElementById("numeroInforme").value,fecha:document.getElementById("fecha").value,novedad:document.getElementById("novedad").value,fields,photos:fotos,reportHtml,logoAni,logoZima,sendEmail:enviarCorreo};
 const status=document.getElementById("cloudStatus");
 showLoading(enviarCorreo ? 'Enviando informe' : 'Guardando informe', enviarCorreo ? 'Se está enviando el registro a los correos configurados...' : 'Se está guardando la información y las evidencias...');
 setStatus(enviarCorreo ? 'Guardando y enviando informe...' : 'Guardando informe y evidencias...', 'info');
 try{
  const capabilityResponse=await ReportAuth.fetch(APPS_SCRIPT_URL+'?action=capabilities',{cache:'no-store'});
  const service=await capabilityResponse.json();
  if(!capabilityResponse.ok||service?.capabilities?.browserPdf!==true)throw new Error('El servicio de correo necesita la actualización para adjuntar el PDF original. No se ha enviado el informe.');
  const archivo=await generarPdfInforme(reportHtml,nombreArchivoPdf());
  payload.pdfBase64=archivo.base64;
  payload.pdfFileName=archivo.filename;
  payload.pdfPageCount=archivo.pages;
  payload.pdfSource='browser';
 }catch(error){
  hideLoading();setStatus(error.message,'error');
  openAppModal("No se generó el PDF",error.message,null,"Entendido",false);
  return;
 }
 ReportAuth.fetch(APPS_SCRIPT_URL,{
  method:"POST",
  mode:"cors",
  cache:"no-store",
  headers:{"Content-Type":"text/plain;charset=utf-8"},
  body:JSON.stringify(payload)
 })
  .then(response=>{
   if(!response.ok){
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
   }
   return response.text().then(text=>{
    try{return JSON.parse(text);}catch(error){throw new Error("El servidor no confirmó el registro. El formulario conserva sus datos.");}
   });
  })
  .then(data=>{
   if(!data || data.ok!==true || data.pdfPreserved!==true || (enviarCorreo && data.emailSent!==true)){
    throw new Error(data?.error || "El servidor no confirmó la operación solicitada. Verifique el historial antes de reintentar.");
   }
   hideLoading();
   setStatus(enviarCorreo ? 'Informe guardado y enviado correctamente.' : 'Guardado correcto en Google Sheets y Drive.', 'success');
   const numeroConfirmado=Number(payload.numeroInforme);
   storageSet("informe_consecutivo",Math.max(Number(storageGet("informe_consecutivo"))||1,numeroConfirmado));
   if(enviarCorreo)limpiarFormularioSilencioso();
   if(onComplete)onComplete();
   if(!silencioso)openAppModal(enviarCorreo?"Informe enviado":"Informe guardado",enviarCorreo?"El informe fue guardado, enviado y el formulario quedó listo para el siguiente registro.":"El registro y sus evidencias fueron enviados a la nube.",null,"Entendido",false);
  })
  .catch(error=>{hideLoading(); setStatus('No se pudo conectar con Apps Script. Revisa la URL y permisos.', 'error'); if(onComplete)onComplete(); if(!silencioso)openAppModal("Error de conexión",error.message||"Revisa la URL /exec, la implementación y los permisos de Apps Script.",null,"Entendido",false);});
}

function updatePhotos(){
 const container=document.getElementById("photosContainer");
 if(!container) return;
 container.innerHTML="";
 container.style.display=fotos.length?"grid":"none";
 fotos.forEach((foto,idx)=>{
  const frame=document.createElement("div");
  frame.className="photo-frame";
  const img=document.createElement("img");
  img.src=foto.data;
  const caption=document.createElement("div");
  caption.className="caption";
  caption.textContent=`Evidencia ${idx+1} · ${document.getElementById("ubicacion").value||"Ubicación"} · ${formatDateTime(document.getElementById("evidenciaFecha").value)||"Fecha/hora no registrada"}`;
  frame.appendChild(img);
  frame.appendChild(caption);
  container.appendChild(frame);
 });
}

ids.forEach(id=>{
 const campo=document.getElementById(id);
 if(!campo)return;
 campo.addEventListener("input",()=>{
 update();
 guardarBorrador();
 const field=campo.closest(".field");
 if(field)field.classList.remove("invalid");
 });
});
document.getElementById("areaSistema").addEventListener("change",()=>{actualizarElementos();update();guardarBorrador();});
document.getElementById("importarArchivo").addEventListener("change",importarBorrador);

function actualizarPeaje(){
 const p=document.getElementById("peaje").value;
 document.getElementById("ubicacion").value=p+" · "+(p==="Peaje Fragua"?"Segovia":"Zaragoza")+", Antioquia";
 document.getElementById("peajeHeader").textContent="TIC – SOPORTE TÉCNICO • "+p;
 document.getElementById("peajeTexto").textContent=p;
 update();
}

document.getElementById("peaje").addEventListener("change",()=>{actualizarPeaje();guardarBorrador();});

document.getElementById("fotos").addEventListener("change",async e=>{
 const version=++versionFotos;
 const archivos=Array.from(e.target.files);
 cargandoFotos=true;
 try{
  const nuevas=await Promise.all(archivos.map(async file=>{
   if(!file.type.startsWith("image/"))throw new Error("Seleccione únicamente archivos de imagen.");
   return {name:file.name,data:await optimizarImagen(file)};
  }));
  if(version!==versionFotos)return;
  fotos=nuevas;updatePhotos();updatePreview();
 }catch(error){
  if(version===versionFotos)openAppModal("No se cargaron las evidencias",error.message,null,"Entendido",false);
 }finally{if(version===versionFotos)cargandoFotos=false;}
});

function optimizarImagen(file){
 return new Promise((resolve,reject)=>{
  const fallo=()=>reject(new Error("No se pudo leer la imagen: "+file.name));
  const reader=new FileReader();reader.onerror=fallo;
  reader.onload=()=>{
   const imagen=new Image();imagen.onerror=fallo;
   imagen.onload=()=>{
    try{
     const escala=Math.min(1,1600/Math.max(imagen.width,imagen.height));
     const canvas=document.createElement("canvas");
     canvas.width=Math.round(imagen.width*escala);canvas.height=Math.round(imagen.height*escala);
     canvas.getContext("2d").drawImage(imagen,0,0,canvas.width,canvas.height);
     resolve(canvas.toDataURL("image/jpeg",.82));
    }catch(error){fallo();}
   };
   imagen.src=reader.result;
  };
  reader.readAsDataURL(file);
 });
}

function updatePreview(){
 const container=document.getElementById("imagePreviewContainer");
 container.innerHTML="";
 fotos.forEach((foto,idx)=>{
  const item=document.createElement("div");
  item.className="preview-item";
  const img=document.createElement("img");
  img.src=foto.data;
  const btn=document.createElement("button");
  btn.className="preview-remove";
  btn.innerHTML="×";
  btn.type="button";btn.setAttribute("aria-label","Eliminar evidencia "+(idx+1));
  btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();fotos.splice(idx,1);updatePreview();updatePhotos();};
  item.appendChild(img);
  item.appendChild(btn);
  container.appendChild(item);
 });
}

let imprimiendo=false;

function crearDocumentoImpresion(){
 update();
 const estilos=Array.from(document.querySelectorAll("style")).map(style=>style.outerHTML.replace(' media="print"','')).join("\n");
 const hojas=Array.from(document.querySelectorAll(".sheet")).map(sheet=>sheet.outerHTML).join("\n");
 if(!hojas.trim())throw new Error("No hay contenido del informe para imprimir.");
 const titulo="Informe_"+document.getElementById("numeroInforme").value;
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+titulo+'</title>'+estilos+'</head><body>'+hojas+'</body></html>';
}

function nombreArchivoPdf(){
 return 'Informe_'+document.getElementById('numeroInforme').value+'_'+document.getElementById('peaje').value.replace(/[^a-zA-Z0-9]+/g,'_')+'.pdf';
}

async function imprimirConConsecutivo(){
 if(imprimiendo||guardando)return;
 if(cargandoFotos){openAppModal("Evidencias en proceso","Espere a que terminen de cargar las imágenes.",null,"Entendido",false);return;}
 const faltantes=validarCampos();
 if(faltantes){openAppModal("Faltan datos por completar",'Complete los campos obligatorios antes de generar el PDF ('+faltantes+' pendientes).',null,"Entendido",false);return;}
 const preview=window.open('','_blank');
 if(preview){preview.document.title='Preparando PDF';preview.document.body.textContent='Preparando el PDF del informe...';}
 imprimiendo=true;showLoading('Preparando PDF','Incluyendo el contenido, las evidencias y las firmas...');
 try{
  const archivo=await generarPdfInforme(crearDocumentoImpresion(),nombreArchivoPdf());
  if(preview&&!preview.closed){await abrirVisorPdf(archivo,{targetWindow:preview});}
  else{
   openAppModal('PDF listo','Abra el PDF para imprimirlo o guardarlo.',null,'Cerrar',false);
   const enlace=document.createElement('a');enlace.href='#';enlace.addEventListener('click',async event=>{event.preventDefault();const target=window.open('','_blank');if(target)await abrirVisorPdf(archivo,{targetWindow:target});});enlace.textContent='Abrir PDF';enlace.className='btn btn-primary mt-3';
   document.getElementById('modalMessage').append(document.createElement('br'),enlace);
  }
 }catch(error){if(preview&&!preview.closed)preview.close();openAppModal('No se pudo generar el PDF',error.message,null,'Entendido',false);}
 finally{imprimiendo=false;hideLoading();}
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

function enviarInforme(){
 if(guardando)return;
 const fields={};
 ids.forEach(id=>{fields[id]=document.getElementById(id).value;});
 const payload={numeroInforme:fields.numeroInforme,fields};
 openAppModal("Vista previa del correo","Revise el mensaje y el nombre del PDF adjunto antes de confirmar el envío.",()=>guardarEnNube(true),"Confirmar envío");
 document.getElementById("emailPreviewTo").textContent="peajefragua@zimaseguridad.com.co, c.recaudo3@zimaseguridad.com.co";
 document.getElementById("emailPreviewSubject").textContent=buildReportEmailSubject(payload);
 document.getElementById("emailPreviewBody").textContent=buildReportEmailBody(payload);
 document.getElementById("emailPreviewAttachment").textContent='Informe_'+payload.numeroInforme+'_'+(fields.peaje||'Peaje').replace(/[^a-zA-Z0-9]+/g,'_')+'.pdf';
 document.getElementById("emailPreview").hidden=false;
 document.querySelector("#appModal .modal-card-custom").classList.add("email-preview-open");
 document.getElementById("modalCancel").focus();
}

function resetForm(){
 openAppModal("¿Limpiar el informe?","Se borrarán todos los datos y las imágenes cargadas. Esta acción no se puede deshacer.",()=>{
  limpiarFormularioSilencioso();
 },"Limpiar todo");
}

function limpiarFormularioSilencioso(){
 versionFotos++;cargandoFotos=false;
 ids.forEach(id=>document.getElementById(id).value="");
 document.getElementById("peaje").value="Peaje Fragua";
 actualizarElementos();
 document.getElementById("fotos").value="";
 fotos=[];
 inicializarNumero();
 document.getElementById("imagePreviewContainer").innerHTML="";
 updatePhotos();
 actualizarPeaje();
 storageRemove("informe_borrador");
}

const teniaBorrador=Boolean(storageGet("informe_borrador"));
function inicializarNumero(){
 const guardado=parseInt(storageGet("informe_consecutivo"),10);
 const siguiente=Math.max(2,Number.isFinite(guardado)?guardado+1:2);
 document.getElementById("numeroInforme").value=String(siguiente).padStart(3,"0");
}
function crearLogoSvg(label){
 return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
   <svg xmlns="http://www.w3.org/2000/svg" width="120" height="52" viewBox="0 0 120 52">
     <rect width="120" height="52" rx="8" fill="#ffffff"/>
     <text x="50%" y="55%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#173f52">${label}</text>
   </svg>
 `)}`;
}
function asegurarLogosDocumento(){
 document.querySelectorAll(".sheet .header img").forEach(img=>{
  const label=img.classList.contains("zima")?"ZIMA":"ANI";
  img.alt=label;
  img.addEventListener("error",()=>{img.src=crearLogoSvg(label);});
  if(!img.getAttribute("src"))img.src=crearLogoSvg(label);
 });
}
function cargarLogosToolbar(){
 const toolbarLogos=document.getElementById("toolbarLogos");
 if(!toolbarLogos) return;
 toolbarLogos.innerHTML="";
 const header=document.querySelector(".sheet .header");
 const marcas=[{label:"ANI", className:"ani", src:(header&&header.querySelector(".ani")?.getAttribute("src"))||crearLogoSvg("ANI")},{label:"ZIMA", className:"zima", src:(header&&header.querySelector(".zima")?.getAttribute("src"))||crearLogoSvg("ZIMA")}];
 marcas.forEach(marca=>{
   const slot=document.createElement("span");
   slot.className="toolbar-logo-slot";
   slot.classList.add("is-fallback");
   const img=document.createElement("img");
   img.className=marca.className;
   img.alt=marca.label;
   img.src=marca.src || crearLogoSvg(marca.label);
   img.addEventListener("load",()=>slot.classList.remove("is-fallback"));
   img.addEventListener("error",()=>{
     img.src=crearLogoSvg(marca.label);
     slot.classList.add("is-fallback");
   });
   const fallback=document.createElement("span");
   fallback.className="toolbar-logo-fallback";
   fallback.textContent=marca.label;
   slot.appendChild(img);
   slot.appendChild(fallback);
   toolbarLogos.appendChild(slot);
 });
}
camposRequeridos.forEach(id=>{const campo=document.getElementById(id);campo.required=true;campo.setAttribute("aria-describedby","error_"+id);document.querySelector('label[for="'+id+'"]')?.append(" *");});
try{
 inicializarNumero();
 asegurarLogosDocumento();
 cargarBorrador();
 if(!teniaBorrador)actualizarPeaje();
 if(!/^\d+$/.test(document.getElementById("numeroInforme").value)||Number(document.getElementById("numeroInforme").value)<2)inicializarNumero();
 update();
 cargarLogosToolbar();
}catch(error){
 console.error(error);
 setStatus("El formulario cargó con una advertencia. Puedes limpiar el borrador e intentar de nuevo.", "error");
}


