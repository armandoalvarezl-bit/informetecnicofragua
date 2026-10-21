(function(){
 const style=document.createElement('style');
 style.textContent=`.resend-button{border:1px solid #173f52;background:#fff;color:#173f52;padding:7px 10px;border-radius:5px;cursor:pointer;white-space:nowrap}.resend-dialog{width:min(620px,calc(100% - 32px));max-height:85vh;overflow:auto;border:1px solid #d6e1e5;border-radius:8px;padding:24px;color:#243942;font:14px/1.5 Arial,sans-serif}.resend-dialog::backdrop{background:#173f5266}.resend-dialog h2{margin-top:0;color:#173f52}.resend-dialog pre{white-space:pre-wrap;font:inherit;padding:14px;background:#f6f9fa;border:1px solid #d6e1e5;overflow-wrap:anywhere}.resend-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.resend-dialog button{padding:9px 14px;border-radius:5px;border:1px solid #173f52;cursor:pointer}.resend-dialog button:disabled{opacity:.6;cursor:wait}.resend-confirm{background:#173f52;color:#fff}.resend-dialog-status{white-space:pre-wrap;overflow-wrap:anywhere}`;
 document.head.appendChild(style);
 const dialog=document.createElement('dialog');dialog.className='resend-dialog';
 dialog.setAttribute('aria-labelledby','resendTitle');
 dialog.innerHTML='<h2 id="resendTitle">Reenviar informe</h2><p id="resendDescription"></p><pre id="resendDetails"></pre><p id="resendStatus" class="resend-dialog-status" role="status"></p><div class="resend-dialog-actions"><button type="button" id="resendCancel">Cancelar</button><button type="button" class="resend-confirm" id="resendConfirm">Confirmar reenvío</button></div>';
 document.body.appendChild(dialog);
 const confirm=dialog.querySelector('#resendConfirm'),cancel=dialog.querySelector('#resendCancel'),statusEl=dialog.querySelector('#resendStatus');
 let selected=null,busy=false;
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-resend-numero]');if(!button||busy)return;
  selected={action:'resend',numeroInforme:button.dataset.resendNumero,pdf:button.dataset.resendPdf||'',recordRow:button.dataset.resendRow||''};
  dialog.querySelector('#resendDescription').textContent='Se reenviará el PDF guardado del informe '+selected.numeroInforme+'.';
  dialog.querySelector('#resendDetails').textContent='Para: peajefragua@zimaseguridad.com.co, c.recaudo3@zimaseguridad.com.co\n\nSe conservarán el número, el documento y los datos del informe original. El reenvío quedará registrado en Correos enviados.';
  statusEl.textContent='';confirm.hidden=false;cancel.textContent='Cancelar';dialog.showModal();cancel.focus();
 });
 cancel.addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 confirm.addEventListener('click',async()=>{
  if(busy||!selected)return;
  busy=true;confirm.disabled=true;cancel.disabled=true;statusEl.textContent='Reenviando el informe...';
  try{
   const response=await fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(selected)});
   if(!response.ok)throw new Error('No se pudo conectar con el servicio de correo.');
   let data;try{data=await response.json();}catch{throw new Error('El servidor no confirmó el reenvío. Revise Correos enviados antes de reintentar.');}
   if(!data||data.ok!==true||data.emailSent!==true){
    if(data&&/datos basicos/i.test(data.error||''))throw new Error('El reenvío aún no está habilitado en el servidor. Contacte al administrador para activar la actualización.');
    throw new Error(data?.error||'El servidor no confirmó el reenvío. Revise Correos enviados antes de reintentar.');
   }
   statusEl.textContent='Informe '+selected.numeroInforme+' reenviado correctamente.';confirm.hidden=true;cancel.textContent='Cerrar';
   if(typeof loadSent==='function')loadSent();
  }catch(error){statusEl.textContent=error.message;}
  finally{busy=false;confirm.disabled=false;cancel.disabled=false;}
 });
})();
