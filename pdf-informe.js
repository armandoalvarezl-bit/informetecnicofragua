/* Un solo archivo PDF para vista previa, impresion, Drive y correo. */
(function(){
 let cache=null,pendiente=null;
 const urls=[];
 const mmToPx=96/25.4;
 function intervalosDeContenido(doc,alturaPagina){
  const intervals=[];
  const add=rect=>{if(rect.width>0&&rect.height>0&&rect.height<alturaPagina)intervals.push({top:rect.top,bottom:rect.bottom});};
  doc.querySelectorAll('.header,.title,.photo-frame,.signature,.info .item').forEach(el=>add(el.getBoundingClientRect()));
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT,{acceptNode(node){
   if(!node.textContent.trim()||node.parentElement.closest('style,script'))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }});
  while(walker.nextNode()){
   const range=doc.createRange();range.selectNodeContents(walker.currentNode);
   Array.from(range.getClientRects()).forEach(add);range.detach();
  }
  doc.querySelectorAll('h2.sec').forEach(heading=>{
   const next=heading.nextElementSibling;if(!next)return;
   const top=heading.getBoundingClientRect().top;
   const rects=Array.from(next.getClientRects());
   if(rects.length)intervals.push({top,bottom:Math.min(next.getBoundingClientRect().bottom,heading.getBoundingClientRect().bottom+30)});
  });
  return intervals;
 }
 function cortesDePagina(doc,alturaPagina){
  const intervals=intervalosDeContenido(doc,alturaPagina);
  const total=Math.ceil(Math.max(...Array.from(doc.querySelectorAll('.sheet')).map(el=>el.getBoundingClientRect().bottom)));
  const pages=[];let start=0;
  while(start<total-.5){
   let end=Math.min(start+alturaPagina,total);
   for(let attempts=0;attempts<100&&end<total;attempts++){
    const crossing=intervals.filter(rect=>rect.top<end-.1&&rect.bottom>end+.1&&rect.top>start+.5);
    if(!crossing.length)break;
    const next=Math.min(...crossing.map(rect=>rect.top));if(next>=end-.1)break;end=next;
   }
   if(end<=start+1)throw new Error('No se pudo distribuir el contenido en hojas carta.');
   pages.push({start,end});start=end;
  }
  return pages;
 }

 function dibujarImagenesYCaptions(plan,canvas,slice,width){
  const ctx=canvas.getContext('2d'),scale=canvas.width/width;
  ctx.save();ctx.setTransform(scale,0,0,scale,0,-slice.start*scale);
  plan.images.forEach(({img,rect,fit})=>{if(!rect.width||!rect.height||rect.bottom<=slice.start||rect.top>=slice.end)return;

   let w=rect.width,h=rect.height;
   if(fit==='contain'){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);w=img.naturalWidth*ratio;h=img.naturalHeight*ratio;}
   ctx.fillStyle='#ffffff';ctx.fillRect(rect.left,rect.top,rect.width,rect.height);
   ctx.drawImage(img,rect.left+(rect.width-w)/2,rect.top+(rect.height-h)/2,w,h);
  });
  plan.captions.forEach(({caption,rect,style})=>{if(!rect.width||rect.bottom<=slice.start||rect.top>=slice.end)return;
   const padLeft=parseFloat(style.paddingLeft)||0,padTop=parseFloat(style.paddingTop)||0;
   ctx.fillStyle=style.backgroundColor;ctx.fillRect(rect.left,rect.top,rect.width,rect.height);
   ctx.fillStyle=style.color;ctx.font=style.font;ctx.textBaseline='top';
   const lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.3;
   let line='',y=rect.top+padTop;const maxWidth=rect.width-padLeft-(parseFloat(style.paddingRight)||0);
   caption.textContent.split(/\s+/).forEach(word=>{const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,rect.left+padLeft,y);y+=lineHeight;line=word;}else line=next;});
   if(line)ctx.fillText(line,rect.left+padLeft,y);
  });
  ctx.restore();
 }
 function base64Blob(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo preparar el PDF.'));reader.readAsDataURL(blob);});}
 async function construir(snapshot,filename){
  if(typeof html2canvas!=='function'||!window.jspdf?.jsPDF)throw new Error('No se cargó el generador de PDF. Recargue la página.');
  const frame=document.createElement('iframe');frame.title='Preparación del PDF';frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;left:-10000px;top:0;width:191.9mm;height:279.4mm;border:0';
  try{
   const ready=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(new Error('No se pudo preparar el informe.'));});
   frame.srcdoc=snapshot;document.body.appendChild(frame);await ready;
   const doc=frame.contentDocument;if(doc.fonts)await doc.fonts.ready;
   await Promise.all(Array.from(doc.images).map(async img=>{
    if(img.decode)await img.decode();
    if(!img.complete||!img.naturalWidth)throw new Error('No se pudo incluir una imagen del informe. Vuelva a adjuntarla.');
   }));
   const width=doc.body.getBoundingClientRect().width;
   if(width<100||!doc.querySelector('.sheet'))throw new Error('El documento para generar el PDF está vacío.');
   const height=(279.4-24)*width/(215.9-24);
   const pages=cortesDePagina(doc,height);
   const plan={
    images:Array.from(doc.images).map(img=>({img,rect:img.getBoundingClientRect(),fit:doc.defaultView.getComputedStyle(img).objectFit})),
    captions:Array.from(doc.querySelectorAll('.photo-frame .caption')).map(caption=>{const computed=doc.defaultView.getComputedStyle(caption);return {caption,rect:caption.getBoundingClientRect(),style:Object.fromEntries(['paddingLeft','paddingRight','paddingTop','font','lineHeight','fontSize','color','backgroundColor'].map(key=>[key,computed[key]]))};})
   };
   const pageImages=[];
   const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'letter',compress:true});
   pdf.setProperties({title:filename.replace(/\.pdf$/i,''),subject:'Informe técnico de mantenimiento',creator:'Centro de informes técnicos'});
   for(let index=0;index<pages.length;index++){
    const slice=pages[index];
    // Se captura una pagina a la vez: no se crea un lienzo gigante que pueda quedar en blanco.
    const canvas=await html2canvas(doc.body,{backgroundColor:'#ffffff',scale:2,logging:false,useCORS:false,
     x:0,y:slice.start,width:width,height:slice.end-slice.start,scrollX:0,scrollY:0,
     windowWidth:Math.ceil(width),windowHeight:Math.ceil(279.4*mmToPx),imageTimeout:15000});
    if(!canvas.width||!canvas.height)throw new Error('Una página del PDF quedó vacía.');
    dibujarImagenesYCaptions(plan,canvas,slice,width);
    if(index)pdf.addPage('letter','portrait');
    const image=canvas.toDataURL('image/jpeg',.95);
    pageImages.push({data:image});
    pdf.addImage(image,'JPEG',12,12,191.9,(slice.end-slice.start)*191.9/width,undefined,'FAST');
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(90,105,115);
    pdf.text('Pagina '+(index+1)+' de '+pages.length,203.9,273.4,{align:'right'});
    canvas.width=0;canvas.height=0;
   }
   const bytes=pdf.output('arraybuffer');
   if(bytes.byteLength>18*1024*1024)throw new Error('El PDF supera 18 MB. Reduzca la cantidad o resolución de las evidencias.');
   const blob=new Blob([bytes],{type:'application/pdf'}),base64=await base64Blob(blob),url=URL.createObjectURL(blob);
   urls.push(url);
   return {snapshot,filename,blob,base64,url,pages:pages.length,pageImages};
  }finally{frame.remove();}
 }
 window.generarPdfInforme=async function(snapshot,filename){
  if(cache?.snapshot===snapshot&&cache.filename===filename)return cache;
  if(pendiente?.snapshot===snapshot&&pendiente.filename===filename)return pendiente.promise;
  const promise=construir(snapshot,filename);pendiente={snapshot,filename,promise};
  try{const artifact=await promise;cache=artifact;return artifact;}
  finally{if(pendiente?.promise===promise)pendiente=null;}
 };
})();




