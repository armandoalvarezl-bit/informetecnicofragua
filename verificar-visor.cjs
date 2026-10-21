const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),assert=require('assert/strict');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function socket(url){const ws=new WebSocket(url),pending=new Map();let id=0;await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}};return {call(method,params={}){return new Promise((resolve,reject)=>{const number=++id;pending.set(number,{resolve,reject});ws.send(JSON.stringify({id:number,method,params}));});},close(){ws.close();}};}
(async()=>{
 const proc=spawn(chrome,['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=0','--user-data-dir='+path.resolve('.cdp-browser'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let root,tab;
 try{
  const endpoint=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Chrome no inicio')),15000);proc.stderr.on('data',b=>{output+=b.toString();const m=output.match(/DevTools listening on (ws:\/\/[^\r\n]+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});proc.on('error',reject);});
  root=await socket(endpoint);const target=await root.call('Target.createTarget',{url:'about:blank'});const port=new URL(endpoint).port;
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());tab=await socket(targets.find(t=>t.id===target.targetId).webSocketDebuggerUrl);
  await tab.call('Page.enable');await tab.call('Runtime.enable');await tab.call('Emulation.setDeviceMetricsOverride',{width:1300,height:1100,deviceScaleFactor:1,mobile:false});
  const logo=fs.readFileSync('img/logo-zima.png').toString('base64');
  const record={ok:true,requiresRepair:true,numeroInforme:'002',recordRow:2,pdf:'https://drive.google.com/file/d/OLD_PDF_1234567890123456789/view',fields:{peaje:'Peaje Fragua',fecha:'2026-10-21',horaInicio:'10:00',hora:'12:00',ubicacion:'Peaje Fragua',novedad:'Revision de carril',tipoActividad:'Mantenimiento correctivo',areaSistema:'Operación de peaje',elementoIntervenido:'Carril de peaje',lugarEvento:'Carril 2',estado:'OPERATIVO',descripcion:Array.from({length:45},(_,i)=>'Registro '+(i+1)+': Se inspecciono el equipo y se verificaron las condiciones de operacion del carril.').join('\n')+' FIN DEL TEXTO',actividad:'Se realizaron las actividades registradas y se verifico la operacion.',verificaciones:'Prueba funcional satisfactoria.',resultado:'Equipo operativo.',recomendacion:'Mantener seguimiento preventivo.',responsable:'RESPONSABLE DE PRUEBA',supervisor:'SUPERVISOR DE PRUEBA'},photos:[{name:'Evidencia.png',data:'data:image/png;base64,'+logo}]};
  const mock=`window.mockPosts=[];const originalFetch=window.fetch;window.fetch=async function(url,options){if(String(url).includes('script.google.com')){if(options?.method==='POST'){window.mockPosts.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,pdfPreserved:true,pdf:'https://drive.google.com/file/d/NEW_PDF_1234567890123456789/view'})};}if(String(url).includes('action=capabilities'))return {ok:true,json:async()=>({ok:true,capabilities:{browserPdf:true,reportPreview:true,replacePdf:true}})};return {ok:true,json:async()=>(${JSON.stringify(record)})};}return originalFetch.apply(this,arguments);};`;
  await tab.call('Page.addScriptToEvaluateOnNewDocument',{source:mock});
  const url='file:///'+path.resolve('index.html').replace(/\\/g,'/')+'?verInforme=1&numero=002&registro=2&pdf='+encodeURIComponent(record.pdf);
  await tab.call('Page.navigate',{url});
  async function evaluate(expression){const r=await tab.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+' '+JSON.stringify(r.exceptionDetails.exception));return r.result.value;}
  let ready=false;for(let i=0;i<150;i++){await sleep(200);ready=await evaluate("document.body.classList.contains('pdf-viewer') && document.querySelector('.pdf-visor-actions button')?.disabled===false");if(ready)break;}
  if(!ready)throw Error(await evaluate("document.getElementById('modalMessage')?.textContent||document.body.innerText.slice(-1500)"));
  const pages=await evaluate("document.querySelectorAll('.pdf-visor-page').length");assert(pages>1);console.log('OK Vista real del informe antiguo: '+pages+' paginas con logos, evidencia y firmas.');
  const shot=await tab.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.visor-real.png',Buffer.from(shot.data,'base64'));
  const print=await tab.call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});const printBytes=Buffer.from(print.data,'base64');fs.writeFileSync('.visor-impreso.pdf',printBytes);
  const pdf=printBytes.toString('latin1'),printed=(pdf.match(/\/Type\s*\/Page\b/g)||[]).length;assert.equal(printed,pages);assert(pdf.includes('/DCTDecode'));assert([...pdf.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].every(m=>m[1].trim()==='0 0 612 792'));
  console.log('OK Impresion real del visor: '+printed+' paginas carta con imagenes de contenido.');
  await evaluate("Array.from(document.querySelectorAll('.pdf-visor-actions button')).find(b=>b.textContent==='Guardar PDF corregido').click()");
  await sleep(150);const posts=await evaluate('window.mockPosts');assert.equal(posts.length,1);assert.equal(posts[0].action,'replacePdf');assert.equal(posts[0].numeroInforme,'002');fs.writeFileSync('.visor-original.pdf',Buffer.from(posts[0].pdfBase64,'base64'));
  console.log('OK Guardar correccion conserva el numero y usa PDF original.');
  const parsed=await evaluate(`(async()=>{const source=window.mockPosts[0].pdfBase64;const parsed=await pdfGuardadoAVisor(source,'Informe_002.pdf');return {pages:parsed.pages,images:parsed.pageImages.length,base64:parsed.base64};})()`);
  assert.equal(parsed.pages,pages);assert.equal(parsed.base64,posts[0].pdfBase64);console.log('OK Lectura del PDF guardado conserva paginas y bytes originales.');
  // Probar tambien el boton del formulario abriendo una ventana real, sin sustituir window.open.
  const formUrl='file:///'+path.resolve('index.html').replace(/\\/g,'/');
  await tab.call('Page.navigate',{url:formUrl});
  for(let i=0;i<100;i++){await sleep(150);if(await evaluate("typeof imprimirConConsecutivo==='function' && !!document.getElementById('elementoIntervenido')"))break;}
  await evaluate(`(()=>{const fields=${JSON.stringify(record.fields)};Object.entries(fields).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&id!=='elementoIntervenido')el.value=value;});actualizarElementos();document.getElementById('elementoIntervenido').value=fields.elementoIntervenido;document.getElementById('numeroInforme').value='002';fotos=[{name:'Evidencia.png',data:'data:image/png;base64,${logo}'}];update();document.querySelector('button[onclick="imprimirConConsecutivo()"]').click();return true;})()`);
  const infos=await root.call('Target.getTargets');const popupInfo=infos.targetInfos.find(info=>info.type==='page'&&info.openerId===target.targetId);assert(popupInfo,'No se abrio la ventana de impresion');
  const allTargets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());const popup=await socket(allTargets.find(info=>info.id===popupInfo.targetId).webSocketDebuggerUrl);
  let popupState;for(let i=0;i<150;i++){await sleep(150);popupState=await popup.call('Runtime.evaluate',{expression:"({ready:document.body.classList.contains('pdf-viewer') && document.querySelector('.pdf-visor-actions button')?.disabled===false,pages:document.querySelectorAll('.pdf-visor-page').length})",returnByValue:true});if(popupState.result.value.ready)break;}assert.equal(popupState.result.value.ready,true);
  await popup.call('Page.enable');const freshPrint=await popup.call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});const freshBytes=Buffer.from(freshPrint.data,'base64');fs.writeFileSync('.visor-nuevo-impreso.pdf',freshBytes);
  assert.equal((freshBytes.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,popupState.result.value.pages);assert(freshBytes.toString('latin1').includes('/DCTDecode'));popup.close();
  console.log('OK Boton del formulario: ventana real e impresion con contenido, sin visor de Drive ni PDF nativo.');

 }finally{if(tab)tab.close();if(root){try{await root.call('Browser.close');}catch{}root.close();}proc.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
