(function(){
 const css=`
 *{box-sizing:border-box}html,body{margin:0;padding:0;background:#e8edf0;color:#173f52;font-family:Arial,sans-serif}
 .pdf-visor-toolbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 22px;background:#173f52;color:#fff}
 .pdf-visor-actions{display:flex;gap:8px;flex-wrap:wrap}.pdf-visor-toolbar button,.pdf-visor-toolbar a{display:inline-block;background:#fff;color:#173f52;border:0;border-radius:5px;padding:9px 14px;font:600 14px Arial;text-decoration:none;cursor:pointer}.pdf-visor-toolbar button:disabled{opacity:.6;cursor:wait}
 .pdf-visor-status{margin:0;padding:10px 22px;font:13px Arial;background:#fff8e9;color:#6c4c18}
 .pdf-visor-pages{padding:18px 0}.pdf-visor-page{position:relative;width:215.9mm;height:279.4mm;margin:0 auto 18px;background:#fff;box-shadow:0 3px 18px #0002;overflow:hidden}
 .pdf-visor-page img{position:absolute;top:12mm;left:12mm;width:191.9mm;height:auto;display:block;max-height:255.5mm}
 .pdf-visor-footer{position:absolute;bottom:4mm;right:12mm;font:8pt/1 Arial;color:#5a6973}
 @media screen and (max-width:850px){.pdf-visor-pages{overflow-x:auto}.pdf-visor-page{margin-left:12px;margin-right:12px}}
 @page{size:letter portrait;margin:0;@bottom-right{content:none}}
 @media print{html,body.pdf-viewer{width:215.9mm;margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 body.pdf-viewer>.pdf-visor-root{display:block!important}.pdf-visor-toolbar,.pdf-visor-status{display:none!important}.pdf-visor-pages{display:block!important;padding:0!important;margin:0!important;overflow:visible!important}
 .pdf-visor-page{display:block!important;width:215.9mm!important;height:279.4mm!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}
 .pdf-visor-page:last-child{break-after:auto;page-break-after:auto}.pdf-visor-page img{visibility:visible!important;opacity:1!important}}
 `;
 function bytesToBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
 window.pdfGuardadoAVisor=async function(base64,filename){
  const binary=atob(base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const objects=new Map(),images=new Map(),aliases=new Map(),pages=[];
  const pattern=/\b(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g;let match;
  while((match=pattern.exec(binary))){
   const body=match[2],stream=body.match(/stream\r?\n/);
   const header=stream?body.slice(0,stream.index):body;
   const object={body,header};
   if(stream){
    const length=header.match(/\/Length\s+(\d+)\b/);if(!length)throw new Error('No se pudo leer una página del PDF.');
    const offset=match.index+match[0].indexOf(body)+stream.index+stream[0].length;
    object.bytes=bytes.subarray(offset,offset+Number(length[1]));
   }
   objects.set(match[1],object);
   if(/\/Type\s*\/Page\b/.test(header))pages.push(object);
   if(/\/Subtype\s*\/Image\b/.test(header)&&/\/DCTDecode\b/.test(header))images.set(match[1],{data:'data:image/jpeg;base64,'+bytesToBase64(object.bytes)});
  }
  for(const alias of binary.matchAll(/\/(I\d+)\s+(\d+)\s+0\s+R\b/g))aliases.set(alias[1],alias[2]);
  const pageImages=[];
  for(const page of pages){
   const reference=page.header.match(/\/Contents\s+(\d+)\s+0\s+R/),content=reference&&objects.get(reference[1]);
   if(!content?.bytes)throw new Error('El PDF no contiene una página imprimible.');
   let stream=content.bytes;
   if(/\/FlateDecode\b/.test(content.header))stream=new Uint8Array(await new Response(new Blob([stream]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
   const operations=new TextDecoder().decode(stream),image=operations.match(/\/(I\d+)\s+Do\b/),source=image&&images.get(aliases.get(image[1]));
   if(!source)throw new Error('Este PDF utiliza el formato anterior. Abra el registro para corregirlo.');
   pageImages.push(source);
  }
  if(!pageImages.length)throw new Error('El PDF guardado está vacío.');
  const blob=new Blob([bytes],{type:'application/pdf'});
  return {base64,blob,url:URL.createObjectURL(blob),filename,pages:pageImages.length,pageImages};
 };
 window.abrirVisorPdf=async function(artifact,options={}){
  const target=options.targetWindow||window,doc=target.document;
  if(target!==window){doc.open();doc.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>');doc.close();}
  doc.title=artifact.filename;
  const style=doc.createElement('style');style.textContent=css;doc.head.appendChild(style);
  const root=doc.createElement('div');root.className='pdf-visor-root';
  const toolbar=doc.createElement('div');toolbar.className='pdf-visor-toolbar';
  const title=doc.createElement('strong');title.textContent=artifact.filename+' · '+artifact.pages+' página(s) carta';
  const actions=doc.createElement('div');actions.className='pdf-visor-actions';
  const print=doc.createElement('button');print.type='button';print.textContent='Imprimir';print.disabled=true;
  const download=doc.createElement('a');download.href=artifact.url;download.download=artifact.filename;download.textContent='Descargar PDF';
  actions.append(print,download);toolbar.append(title,actions);root.appendChild(toolbar);
  const status=doc.createElement('p');status.className='pdf-visor-status';status.setAttribute('role','status');status.textContent='Preparando las páginas para imprimir...';root.appendChild(status);
  const pages=doc.createElement('div');pages.className='pdf-visor-pages';root.appendChild(pages);
  if(!artifact.pageImages?.length)throw new Error('El PDF no contiene páginas listas para mostrar.');
  artifact.pageImages.forEach((page,index)=>{
   const sheet=doc.createElement('section');sheet.className='pdf-visor-page';sheet.setAttribute('aria-label','Página '+(index+1));
   const img=doc.createElement('img');img.src=page.data;img.alt='Página '+(index+1)+' del informe';
   const footer=doc.createElement('div');footer.className='pdf-visor-footer';footer.textContent='Pagina '+(index+1)+' de '+artifact.pages;
   sheet.append(img,footer);pages.appendChild(sheet);
  });
  doc.body.className='pdf-viewer';doc.body.replaceChildren(root);
  await Promise.all(Array.from(pages.querySelectorAll('img')).map(img=>img.decode()));
  print.disabled=false;status.hidden=true;
  print.addEventListener('click',async()=>{
   print.disabled=true;
   try{await Promise.all(Array.from(pages.querySelectorAll('img')).map(img=>img.decode()));void pages.offsetHeight;target.focus();target.print();}
   catch(error){status.hidden=false;status.textContent='No se pudo preparar la impresión: '+error.message;}
   finally{print.disabled=false;}
  });
  if(options.saveCorrected){
   status.hidden=false;status.textContent='Vista corregida del informe guardado. Guarde esta versión para actualizar el PDF del historial y los próximos reenvíos.';
   const save=doc.createElement('button');save.type='button';save.textContent='Guardar PDF corregido';actions.appendChild(save);
   save.addEventListener('click',async()=>{
    save.disabled=true;status.hidden=false;status.textContent='Guardando PDF corregido...';
    try{await options.saveCorrected(artifact);status.textContent='PDF guardado. Los próximos reenvíos usarán esta versión.';save.remove();}
    catch(error){save.disabled=false;status.textContent=error.message;}
   });
  }
  return {root,printButton:print};
 };
})();
