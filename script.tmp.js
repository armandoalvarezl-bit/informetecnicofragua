
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFD8MsHS3c9puq8wzFO8neTPd9oEB6Qe9D3hB7J_1YKSwIjnTdH9TpFC2ZxocbYotNMQ/exec';
const ids=["numeroInforme","fecha","horaInicio","hora","duracion","ubicacion","novedad","tipoActividad","areaSistema","elementoIntervenido","lugarEvento","estado","procedencia","autorizacion","evidenciaFecha","descripcion","actividad","resumen","materiales","diagnostico","verificaciones","resultado","recomendacion","responsable","supervisor","paso1_titulo","paso1_desc","paso2_titulo","paso2_desc","paso3_titulo","paso3_desc","paso4_titulo","paso4_desc"];
const camposRequeridos=["fecha","horaInicio","hora","ubicacion","novedad","tipoActividad","areaSistema","elementoIntervenido","lugarEvento","estado","evidenciaFecha","descripcion","actividad","resumen","resultado","recomendacion","responsable","supervisor"];
let fotos=[];
let modalAction=null;

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

function generarDiagnostico(){
 const texto=(document.getElementById("novedad").value+" "+document.getElementById("descripcion").value+" "+document.getElementById("actividad").value).toLowerCase();
 const area=document.getElementById("areaSistema").value;
 const elemento=document.getElementById("elementoIntervenido").value||"elemento seleccionado";
 let diagnostico=`Se identifica una novedad en ${elemento.toLowerCase()} del área de ${area.toLowerCase()||"mantenimiento"}. Requiere inspección funcional para confirmar la causa.`;
 let verificaciones=`Inspeccionar ${elemento.toLowerCase()}; comprobar conexiones y alimentación; realizar una prueba funcional; registrar el estado final y las evidencias.`;
 if(area==="Equipos de estación"){
  diagnostico=`Posible falla funcional en ${elemento.toLowerCase()} de la estación, pendiente de confirmación mediante pruebas técnicas.`;
  verificaciones=`Revisar el estado físico de ${elemento.toLowerCase()}; comprobar alimentación, conexiones y configuración; ejecutar una prueba operativa y registrar mensajes de error.`;
 }else if(area==="Operación de peaje"){
  diagnostico=`Posible falla operativa en ${elemento.toLowerCase()}, con impacto potencial en la atención y continuidad del servicio del peaje.`;
  verificaciones=`Inspeccionar ${elemento.toLowerCase()} y sus conexiones; realizar una prueba desde la operación del peaje; validar la respuesta del sistema y dejar evidencia del resultado.`;
 }
 if(/eléctric|voltaje|energía|cable|breaker|fusible|corriente/.test(texto)){
  diagnostico="Posible falla eléctrica o pérdida de alimentación en el componente intervenido.";
  verificaciones="Verificar tensión de entrada y salida; revisar cables, terminales, fusibles y protecciones; medir continuidad; probar el sistema bajo condiciones normales.";
 }else if(/red|internet|conexión|wifi|router|switch|comunicación/.test(texto)){
  diagnostico="Posible interrupción de conectividad o falla de comunicación en la red del área intervenida.";
  verificaciones="Revisar energía y enlaces; validar indicadores del equipo; comprobar cableado y puertos; probar conectividad y documentar el resultado.";
 }else if(/sensor|lector|cámara|impresora|pantalla|teclado|software|sistema/.test(texto)){
  diagnostico="Posible falla funcional del equipo o del sistema asociado, pendiente de confirmar mediante pruebas operativas.";
  verificaciones="Revisar conexiones y estado físico; reiniciar si aplica; validar configuración y mensajes de error; ejecutar una prueba funcional completa.";
 }else if(/puerta|cerradura|estructura|techo|piso|señal|iluminación|lámpara|luz/.test(texto)){
  diagnostico="Posible deterioro o condición anormal del elemento físico reportado.";
  verificaciones="Inspeccionar fijaciones, desgaste y seguridad; comprobar funcionamiento; delimitar el área si existe riesgo; registrar medidas correctivas.";
 }
 document.getElementById("diagnostico").value=diagnostico;
 document.getElementById("verificaciones").value=verificaciones;
 update();
}

function redactarNovedades(){
 const novedad=document.getElementById("novedad").value.trim()||"la novedad reportada";
 const ubicacion=document.getElementById("lugarEvento").value.trim()||"el área indicada";
 const tipo=document.getElementById("tipoActividad").value||"la actividad técnica";
 const area=document.getElementById("areaSistema").value||"el área técnica";
 const elemento=document.getElementById("elementoIntervenido").value||"elemento intervenido";
 const estado=document.getElementById("estado").value||"el estado final registrado";
 document.getElementById("descripcion").value=`Se evidenció ${novedad} en ${ubicacion}, relacionado con ${elemento.toLowerCase()} del área de ${area.toLowerCase()}. La condición fue registrada para realizar ${tipo.toLowerCase()} y determinar las acciones requeridas.`;
 document.getElementById("actividad").value=`Se inspeccionó ${elemento.toLowerCase()}, se identificó la causa probable y se ejecutaron las acciones necesarias para atender la novedad. Finalmente, se realizó una prueba funcional y se verificó ${estado.toLowerCase()}.`;
 update();
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
 const firma1=document.getElementById("firma1");
 const firma2=document.getElementById("firma2");
 if(firma1)firma1.textContent=document.getElementById("responsable").value||"Nombre y firma";
 if(firma2)firma2.textContent=document.getElementById("supervisor").value||"Nombre y firma";
}

function setStatus(message, type = 'info') {
 const status = document.getElementById('cloudStatus');
 if (!status) return;
 status.className = 'status-banner ' + type;
 status.innerHTML = '<span class="status-badge"></span><span>' + message + '</span>';
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
 const overlay = document.getElementById('loadingOverlay');
 if (overlay) overlay.classList.remove('show');
}

function guardarBorrador(){
 const datos={};
 ids.forEach(id=>{if(id!=="numeroInforme"&&id!=="duracion")datos[id]=document.getElementById(id).value;});
 storageSet("informe_borrador",JSON.stringify(datos));
}

function cargarBorrador(){
 try{
  const datos=JSON.parse(storageGet("informe_borrador")||"null");
  if(!datos)return;
  Object.entries(datos).forEach(([id,value])=>{const campo=document.getElementById(id);if(campo)campo.value=value;});
  actualizarElementos();
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
   Object.entries(datos).forEach(([id,value])=>{const campo=document.getElementById(id);if(campo&&id!=="numeroInforme"&&id!=="duracion")campo.value=value;});
   actualizarElementos();update();guardarBorrador();
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
   if(invalido)faltantes++;
 });
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
 fetch(`${APPS_SCRIPT_URL}?action=history&q=${encodeURIComponent(query)}`, { method: 'GET', mode: 'cors', cache: 'no-store' })
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
   results.innerHTML=`<table class="history-table"><thead><tr><th>Número</th><th>Fecha</th><th>Peaje</th><th>Novedad</th><th>Estado</th><th>Responsable</th><th>Evidencias</th></tr></thead><tbody>${data.records.map(record=>`<tr><td><strong>${escaparHtml(record.numero)}</strong></td><td>${escaparHtml(record.fecha)}<br><small>${escaparHtml(record.hora)}</small></td><td>${escaparHtml(record.peaje)}</td><td>${escaparHtml(record.novedad)}<br><small>${escaparHtml(record.ubicacion)}</small></td><td>${escaparHtml(record.estado)}</td><td>${escaparHtml(record.responsable)}</td><td>${record.fotos?record.fotos.split("\\n").filter(Boolean).map((link,index)=>`<a href="${escaparHtml(link)}" target="_blank" rel="noopener">Foto ${index+1}</a>`).join(" · "):"Sin fotos"}</td></tr>`).join("")}</tbody></table>`;
  })
  .catch(error=>{hideLoading(); status.textContent="No se pudo consultar el historial. Verifica la implementación de Apps Script y la URL del proyecto.";results.className="history-empty";results.textContent=error.message;});
}

document.getElementById("historyQuery").addEventListener("keydown",event=>{
 if(event.key==="Enter")cargarHistorial();
});

function guardarEnNube(enviarCorreo=false,onComplete=null,silencioso=false){
 const faltantes=validarCampos();
 if(faltantes){
  openAppModal("Faltan datos por completar",`Completa los campos obligatorios antes de guardar (${faltantes} pendientes).`,null,"Entendido",false);
  return;
 }
 if(!APPS_SCRIPT_URL){
  if(onComplete)onComplete();
  if(silencioso)return;
  openAppModal("Falta configurar la conexión","Pega la URL /exec de Apps Script en la constante APPS_SCRIPT_URL de index.html. Consulta CONFIGURACION_APPS_SCRIPT.md para completar el despliegue.",null,"Entendido",false);
  return;
 }
 const fields={};
 ids.forEach(id=>{if(id!=="numeroInforme"&&id!=="duracion")fields[id]=document.getElementById(id).value;});
 const reportStyles=Array.from(document.querySelectorAll("style")).map(style=>style.outerHTML).join("");
 const reportSheets=Array.from(document.querySelectorAll(".sheet")).map(sheet=>sheet.outerHTML).join("");
 const reportHtml=`<!doctype html><html lang="es"><head><meta charset="UTF-8">${reportStyles}</head><body>${reportSheets}</body></html>`;
 const logoAni=document.querySelector(".sheet .header .ani")?.src||"";
 const logoZima=document.querySelector(".sheet .header .zima")?.src||"";
 const payload={numeroInforme:document.getElementById("numeroInforme").value,fecha:document.getElementById("fecha").value,novedad:document.getElementById("novedad").value,fields,photos:fotos,reportHtml,logoAni,logoZima,sendEmail:enviarCorreo};
 const status=document.getElementById("cloudStatus");
 showLoading(enviarCorreo ? 'Enviando informe' : 'Guardando informe', enviarCorreo ? 'Se está enviando el registro a los correos configurados...' : 'Se está guardando la información y las evidencias...');
 setStatus(enviarCorreo ? 'Guardando y enviando informe...' : 'Guardando informe y evidencias...', 'info');
 fetch(APPS_SCRIPT_URL,{
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
    try{return text ? JSON.parse(text) : {ok:true};}catch(error){return {ok:true};}
   });
  })
  .then(data=>{
   if(data && data.ok===false){
    throw new Error(data.error || "La respuesta del servidor indica un error.");
   }
   hideLoading();
   setStatus(enviarCorreo ? 'Informe guardado y enviado correctamente.' : 'Guardado correcto en Google Sheets y Drive.', 'success');
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
  caption.textContent=`Evidencia ${idx+1} · ${document.getElementById("ubicacion").value||"Ubicación"} · ${formatDateTime(document.getElementById("evidenciaFecha").value)||"Fecha/Hora"}`;
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
document.getElementById("diagnosticarBtn").addEventListener("click",generarDiagnostico);
document.getElementById("redactarBtn").addEventListener("click",redactarNovedades);
document.getElementById("areaSistema").addEventListener("change",()=>{actualizarElementos();update();});
document.getElementById("importarArchivo").addEventListener("change",importarBorrador);

function actualizarPeaje(){
 const p=document.getElementById("peaje").value;
 document.getElementById("ubicacion").value=p+" · "+(p==="Peaje Fragua"?"Segovia":"Zaragoza")+", Antioquia";
 document.getElementById("peajeHeader").textContent="TIC – SOPORTE TÉCNICO • "+p;
 document.getElementById("peajeTexto").textContent=p;
 update();
}

document.getElementById("peaje").addEventListener("change",actualizarPeaje);

document.getElementById("fotos").addEventListener("change",e=>{
 fotos=[];
 Array.from(e.target.files).forEach(file=>optimizarImagen(file).then(data=>{
   fotos.push({name:file.name,data});
   updatePhotos();
   updatePreview();
 }));
});

function optimizarImagen(file){
 return new Promise(resolve=>{
  const reader=new FileReader();
  reader.onload=()=>{
   const imagen=new Image();
   imagen.onload=()=>{
    const escala=Math.min(1,1600/Math.max(imagen.width,imagen.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.round(imagen.width*escala);canvas.height=Math.round(imagen.height*escala);
    canvas.getContext("2d").drawImage(imagen,0,0,canvas.width,canvas.height);
    resolve(canvas.toDataURL("image/jpeg",.82));
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
  btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();fotos.splice(idx,1);updatePreview();updatePhotos();};
  item.appendChild(img);
  item.appendChild(btn);
  container.appendChild(item);
 });
}

function imprimirConConsecutivo(){
 const faltantes=validarCampos();
 if(faltantes){
  openAppModal("Faltan datos por completar",`Completa los campos obligatorios antes de generar el PDF (${faltantes} pendientes).`,null,"Entendido",false);
  return;
 }
 const contador=parseInt(document.getElementById("numeroInforme").value)||1;
 storageSet("informe_consecutivo",contador);
 const peaje=document.getElementById("peaje").value.replace("Peaje ","");
 document.title=`Informe_${peaje}_${String(contador).padStart(3,"0")}`;
 guardarEnNube(false,()=>setTimeout(()=>window.print(),100),true);
}

function enviarInforme(){
 const faltantes=validarCampos();
 if(faltantes){
  openAppModal("Faltan datos por completar",`Completa los campos obligatorios antes de enviar el informe (${faltantes} pendientes).`,null,"Entendido",false);
  return;
 }
 openAppModal("Enviar informe automáticamente","Apps Script guardará el registro, almacenará las evidencias y enviará el PDF a peajefragua@zimaseguridad.com.co y c.recaudo3@zimaseguridad.com.co. ¿Deseas continuar?",()=>guardarEnNube(true),"Enviar ahora");
}

function resetForm(){
 openAppModal("¿Limpiar el informe?","Se borrarán todos los datos y las imágenes cargadas. Esta acción no se puede deshacer.",()=>{
  limpiarFormularioSilencioso();
 },"Limpiar todo");
}

function limpiarFormularioSilencioso(){
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

document.getElementById("paso1_titulo").value="Retiro";
document.getElementById("paso1_desc").value="Se realizó la primera actividad requerida para atender la novedad.";
document.getElementById("paso2_titulo").value="Actividad realizada";
document.getElementById("paso2_desc").value="Se ejecutó la segunda actividad requerida para solucionar la novedad.";
document.getElementById("paso3_titulo").value="Autorización";
document.getElementById("paso3_desc").value="El traslado y utilización del elemento se realizaron previa autorización.";
document.getElementById("paso4_titulo").value="Verificación";
document.getElementById("paso4_desc").value="Se verificó el correcto funcionamiento del sistema intervenido.";
const teniaBorrador=Boolean(storageGet("informe_borrador"));
function inicializarNumero(){
 const guardado=parseInt(storageGet("informe_consecutivo"),10);
 const siguiente=Number.isFinite(guardado)?guardado+1:1;
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
try{
 inicializarNumero();
 asegurarLogosDocumento();
 cargarBorrador();
 if(!teniaBorrador)actualizarPeaje();
 update();
 cargarLogosToolbar();
}catch(error){
 console.error(error);
 setStatus("El formulario cargÃ³ con una advertencia. Puedes limpiar el borrador e intentar de nuevo.", "error");
}
