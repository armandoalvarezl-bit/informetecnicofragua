(function(){
 const params=new URLSearchParams(window.location.search);if(params.get('verInforme')!=='1')return;
 function fechaISO(value){
  const text=String(value||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(text))return text.slice(0,10);
  const match=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);return match?match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0'):'';
 }
 function horaISO(value){const match=String(value||'').match(/(\d{1,2}):(\d{2})/);return match?match[1].padStart(2,'0')+':'+match[2]:'';}
 async function abrirGuardado(){
  showLoading('Abriendo informe guardado','Preparando el documento con sus evidencias y firmas...');
  try{
   const capabilities=await ReportAuth.fetch(APPS_SCRIPT_URL+'?action=capabilities',{cache:'no-store'}).then(response=>response.json());
   if(!capabilities.capabilities?.reportPreview)throw new Error('La vista previa de informes guardados requiere actualizar Code.gs y publicar una nueva versión de la implementación existente.');
   const query=new URLSearchParams({action:'report',numeroInforme:params.get('numero')||'',pdf:params.get('pdf')||'',recordRow:params.get('registro')||''});
   const response=await ReportAuth.fetch(APPS_SCRIPT_URL+'?'+query.toString(),{cache:'no-store'});
   const record=await response.json();if(!record.ok)throw new Error(record.error||'No se pudo abrir el informe guardado.');
   let artifact;
   if(record.pdfBase64&&!record.requiresRepair){artifact=await pdfGuardadoAVisor(record.pdfBase64,record.filename||('Informe_'+record.numeroInforme+'.pdf'));}
   else{
    ids.forEach(id=>{const input=document.getElementById(id);if(input)input.value='';});
    const fields=record.fields||{};
    Object.entries(fields).forEach(([id,value])=>{
     const input=document.getElementById(id);if(!input||!ids.includes(id)||id==='elementoIntervenido')return;
     let text=String(value??'');if(input.type==='date')text=fechaISO(text);if(input.type==='time')text=horaISO(text);
     if(input.type==='datetime-local'){const date=fechaISO(text),time=horaISO(text);text=date&&time?date+'T'+time:'';}
     if(input.tagName==='SELECT'&&text&&!Array.from(input.options).some(option=>option.value===text))input.add(new Option(text,text));
     input.value=text;
    });
    document.getElementById('numeroInforme').value=record.numeroInforme;
    actualizarElementos();const element=document.getElementById('elementoIntervenido'),value=String(fields.elementoIntervenido||'');
    if(value&&!Array.from(element.options).some(option=>option.value===value))element.add(new Option(value,value));element.value=value;
    fotos=record.photos||[];update();
    artifact=await generarPdfInforme(crearDocumentoImpresion(),nombreArchivoPdf());
   }
   hideLoading();
   await abrirVisorPdf(artifact,{saveCorrected:record.requiresRepair?async archivo=>{
    const request={action:'replacePdf',numeroInforme:record.numeroInforme,recordRow:record.recordRow,pdf:record.pdf,pdfBase64:archivo.base64,pdfSource:'browser'};
    const result=await ReportAuth.fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(request)}).then(response=>response.json());
    if(!result.ok||!result.pdfPreserved)throw new Error(result.error||'No se confirmó la actualización del PDF.');
    record.pdf=result.pdf;
   }:null});
   if(params.get('descargar')==='1')document.querySelector('.pdf-visor-actions a[download]')?.click();
  }catch(error){hideLoading();openAppModal('No se pudo abrir la vista previa',error.message,null,'Entendido',false);}
 }
 abrirGuardado();
})();
