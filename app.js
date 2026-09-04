const STORE="FARGAU_MANTENIMIENTOS_V3", FLOW="FARGAU_POWER_AUTOMATE_URL", SHEETS="FARGAU_GOOGLE_SHEETS_URL";let records=[],photos=[],sig={};
const $=id=>document.getElementById(id), V=id=>$(id)?.value?.trim()||"", esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
document.addEventListener("DOMContentLoaded",init);
function init(){load();nav();bind();setupSignatures();resetForm();renderAll()}
function load(){try{records=JSON.parse(localStorage.getItem(STORE)||"[]")}catch{records=[]}}
function save(){localStorage.setItem(STORE,JSON.stringify(records));renderAll();setFolio()}
function setFolio(){$("folio").textContent=`FAR-MTTO-${new Date().getFullYear()}-${String(records.length+1).padStart(5,"0")}`}
function nav(){document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)))}
function go(page){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("pageTitle").textContent={dashboard:"Dashboard",nuevo:"Nuevo formato",historial:"Historial",dispositivos:"Dispositivos",tecnicos:"Técnicos",excel:"Excel Online"}[page];$("sidebar").classList.remove("show")}
function bind(){
 $("menu").onclick=()=>$("sidebar").classList.toggle("show");$("addPart").onclick=addPart;$("cancel").onclick=()=>{resetForm();go("dashboard")};
 $("maintenanceForm").onsubmit=saveRecord;
 $("fotos").onchange=e=>{photos=[...e.target.files];previewPhotos()};
 ["search","fType","fState"].forEach(id=>$(id).oninput=renderHistory);$("clearFilters").onclick=()=>{["search","fType","fState"].forEach(id=>$(id).value="");renderHistory()};
 $("saveFlow").onclick=()=>{localStorage.setItem(FLOW,V("flowUrl"));toast("Conexión Power Automate guardada.")};
 $("testFlow").onclick=testFlow;$("csv").onclick=exportCSV;
 $("saveSheets").onclick=()=>{localStorage.setItem(SHEETS,V("sheetsUrl"));toast("Conexión Google Sheets guardada.")};
 $("testSheets").onclick=testSheets;
 document.querySelectorAll("[data-clear]").forEach(b=>b.onclick=()=>clearSig(b.dataset.clear));
 $("flowUrl").value=localStorage.getItem(FLOW)||"";
 $("sheetsUrl").value=localStorage.getItem(SHEETS)||"";
}
function addPart(){let d=document.createElement("div");d.className="part";d.innerHTML=`<div class="row g-2 align-items-end"><div class="col-md-5"><label>Repuesto / material</label><input class="pn"></div><div class="col-md-2"><label>Cantidad</label><input class="pq" type="number" min="1" value="1"></div><div class="col-md-4"><label>Observación</label><input class="po"></div><div class="col-md-1"><button type="button" class="btn btn-outline-danger w-100 del"><i class="bi bi-trash"></i></button></div></div>`;d.querySelector(".del").onclick=()=>{d.remove();toggleEmpty()};$("parts").appendChild(d);toggleEmpty()}
function toggleEmpty(){$("emptyPart").style.display=document.querySelectorAll(".part").length?"none":"block"}
function getParts(){return [...document.querySelectorAll(".part")].map(d=>({nombre:d.querySelector(".pn").value.trim(),cantidad:d.querySelector(".pq").value,observacion:d.querySelector(".po").value.trim()})).filter(x=>x.nombre)}
function setupSignatures(){["sigTecnico","sigResponsable"].forEach(id=>{let c=$(id),ctx=c.getContext("2d");ctx.lineWidth=2;ctx.lineCap="round";let down=false,last;const pos=e=>{let r=c.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}};const start=e=>{e.preventDefault();down=true;last=pos(e)};const move=e=>{if(!down)return;e.preventDefault();let p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p};const end=()=>{down=false};c.addEventListener("mousedown",start);c.addEventListener("mousemove",move);window.addEventListener("mouseup",end);c.addEventListener("touchstart",start,{passive:false});c.addEventListener("touchmove",move,{passive:false});c.addEventListener("touchend",end)})}
function clearSig(id){let c=$(id);c.getContext("2d").clearRect(0,0,c.width,c.height)}
function sigData(id){let c=$(id);return c.toDataURL("image/png")}
function previewPhotos(){$("preview").innerHTML="";photos.forEach(f=>{let i=document.createElement("img");i.src=URL.createObjectURL(f);$("preview").appendChild(i)})}
function collect(){return{numeroFormato:$("folio").textContent,peaje:"FARGAU",carril:V("carril"),fecha:V("fecha"),turno:V("turno"),horaInicio:V("horaInicio"),horaFin:V("horaFin"),tipo:V("tipo"),prioridad:V("prioridad"),motivo:V("motivo"),codigo:V("codigo"),serie:V("serie"),tipoDis:V("tipoDis"),ubicacion:V("ubicacion"),marca:V("marca"),modelo:V("modelo"),estadoInicial:V("estadoInicial"),falla:V("falla"),diagnostico:V("diagnostico"),actividades:V("actividades"),pruebas:V("pruebas"),repuestos:getParts(),estadoFinal:V("estadoFinal"),seguimiento:V("seguimiento"),proxima:V("proxima"),observaciones:V("observaciones"),tecnico:V("tecnico"),docTecnico:V("docTecnico"),responsable:V("responsable"),cargoResponsable:V("cargoResponsable"),firmaTecnico:sigData("sigTecnico"),firmaResponsable:sigData("sigResponsable"),fotos:[],fechaRegistro:new Date().toISOString()}}
async function saveRecord(e){
 e.preventDefault();
 if(!e.target.checkValidity()){e.target.classList.add("was-validated");toast("Complete los campos obligatorios.");return}
 // IMPORTANTE: la ventana del PDF se abre AQUÍ, de forma síncrona con el clic del usuario,
 // antes de cualquier "await". Si se abre después de operaciones asíncronas (fotos, fetch a Excel),
 // el navegador bloquea el pop-up y el PDF nunca aparece. Por eso fallaba antes.
 let pdfWindow=window.open("","_blank");
 if(pdfWindow)pdfWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Generando formato…</title><style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:#0a1a30}.box{text-align:center;color:#fff}.mark{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#1b7cf2,#0a4fb8);display:grid;place-items:center;font-weight:900;font-size:26px;margin:0 auto 16px;animation:pulse 1.1s ease-in-out infinite}.box p{font-size:13px;color:#b8c9dd;margin:0}@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.75}}</style></head><body><div class="box"><div class="mark">F</div><p>Generando formato PDF…</p></div></body></html>`);
 let r=collect();
 r.fotos=await Promise.all(photos.map(toDataURL));
 records.unshift(r);save();
 let sent=await sendToServices(r);
 generatePDF(r,pdfWindow);
 toast(sent.any?`Registro guardado${sent.detail?" y enviado a "+sent.detail:""}.`:"Registro guardado localmente. Configure Excel Online o Google Sheets para sincronizar en la nube.");
 resetForm();go("historial")
}
async function sendToServices(r){
 let flowUrl=localStorage.getItem(FLOW), sheetsUrl=localStorage.getItem(SHEETS);
 let okList=[];
 if(sheetsUrl){
  try{
   // Sin header Content-Type personalizado: evita el preflight OPTIONS que Google Apps Script no responde.
   // doPost() igual puede parsear JSON.parse(e.postData.contents) sin importar el content-type.
   let res=await fetch(sheetsUrl,{method:"POST",body:JSON.stringify(r)});
   if(res.ok)okList.push("Google Sheets")
  }catch(e){/* silencioso: se informa abajo */}
 }
 if(flowUrl){
  try{
   // Power Automate normalmente no expone cabeceras CORS a la respuesta; se envía en modo no-cors
   // para garantizar la entrega aunque no podamos leer el resultado.
   await fetch(flowUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});
   okList.push("Excel Online")
  }catch(e){/* silencioso */}
 }
 return {any:okList.length>0, detail:okList.join(" y ")}
}
async function testFlow(){let u=V("flowUrl");if(!u)return toast("Ingrese la URL del flujo de Power Automate.");try{await fetch(u,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({prueba:true,peaje:"FARGAU",fecha:new Date().toISOString()})});toast("Prueba enviada. Como Power Automate no permite leer la respuesta desde el navegador (CORS), verifique en el historial de ejecuciones del flujo si llegó.")}catch(e){toast("No se pudo conectar. Verifique la URL de Power Automate.")}}
async function testSheets(){let u=V("sheetsUrl");if(!u)return toast("Ingrese la URL de Apps Script (Google Sheets).");try{let res=await fetch(u,{method:"POST",body:JSON.stringify({prueba:true,peaje:"FARGAU",fecha:new Date().toISOString()})});let data=await res.json().catch(()=>null);toast(res.ok?"Prueba enviada correctamente a Google Sheets.":"El endpoint de Apps Script respondió con error: "+res.status)}catch(e){toast("No se pudo conectar. Verifique que la implementación de Apps Script sea 'Cualquier usuario' y que la URL termine en /exec.")}}
function resetForm(){if(!$("maintenanceForm"))return;$("maintenanceForm").reset();$("fecha").value=new Date().toISOString().slice(0,10);$("parts").innerHTML="";photos=[];$("preview").innerHTML="";clearSig("sigTecnico");clearSig("sigResponsable");toggleEmpty();setFolio()}
function renderAll(){renderDash();renderHistory();renderDevices();renderTechs()}
function renderDash(){$("statTotal").textContent=records.length;$("statOp").textContent=records.filter(r=>r.estadoFinal==="Operativo").length;$("statCor").textContent=records.filter(r=>r.tipo==="Correctivo").length;$("statFds").textContent=records.filter(r=>r.estadoFinal==="Fuera de servicio").length;$("recent").innerHTML=records.slice(0,7).map((r,i)=>`<tr><td><b>${esc(r.numeroFormato)}</b></td><td>${esc(r.fecha)}</td><td>${esc(r.codigo)}</td><td>${esc(r.tipo)}</td><td>${esc(r.tecnico)}</td><td>${status(r.estadoFinal)}</td><td><button class="btn btn-sm btn-light" onclick="generatePDF(records[${i}])"><i class="bi bi-file-pdf"></i></button></td></tr>`).join("")||emptyRow(7)}
function renderHistory(){let q=V("search").toLowerCase(),t=V("fType"),s=V("fState");let arr=records.filter(r=>(!q||[r.numeroFormato,r.codigo,r.tecnico,r.responsable,r.diagnostico].join(" ").toLowerCase().includes(q))&&(!t||r.tipo===t)&&(!s||r.estadoFinal===s));$("history").innerHTML=arr.map(r=>{let i=records.indexOf(r);return`<tr><td><b>${esc(r.numeroFormato)}</b></td><td>${esc(r.fecha)}</td><td>${esc(r.codigo)}</td><td>${esc(r.tecnico)}</td><td>${esc(r.tipo)}</td><td>${status(r.estadoFinal)}</td><td class="text-nowrap"><button class="btn btn-sm btn-light" onclick="generatePDF(records[${i}])"><i class="bi bi-file-pdf"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="removeRecord(${i})"><i class="bi bi-trash"></i></button></td></tr>`}).join("")||emptyRow(7)}
function renderDevices(){let m=new Map();records.forEach(r=>{if(!m.has(r.codigo))m.set(r.codigo,r)});$("devices").innerHTML=[...m.values()].map(r=>`<tr><td><b>${esc(r.codigo)}</b></td><td>${esc(r.tipoDis)}</td><td>${esc(r.serie||"-")}</td><td>${esc(r.ubicacion||"-")}</td><td>${esc(r.fecha)}</td><td>${status(r.estadoFinal)}</td></tr>`).join("")||emptyRow(6)}
function renderTechs(){let m={};records.forEach(r=>{m[r.tecnico]??={doc:r.docTecnico||"-",n:0,c:0,last:""};m[r.tecnico].n++;if(r.tipo==="Correctivo")m[r.tecnico].c++;if(!m[r.tecnico].last||r.fecha>m[r.tecnico].last)m[r.tecnico].last=r.fecha});$("techs").innerHTML=Object.entries(m).map(([n,x])=>`<tr><td><b>${esc(n)}</b></td><td>${esc(x.doc)}</td><td>${x.n}</td><td>${x.c}</td><td>${esc(x.last)}</td></tr>`).join("")||emptyRow(5)}
function emptyRow(n){return`<tr><td colspan="${n}" class="text-center p-5 text-muted">No hay registros.</td></tr>`}
function status(s){let c=s==="Fuera de servicio"?"bad":s==="Operativo"?"":"warn";return`<span class="status ${c}">${esc(s)}</span>`}
function removeRecord(i){if(confirm("¿Eliminar este formato definitivamente?")){records.splice(i,1);save();toast("Formato eliminado.")}}
function exportCSV(){if(!records.length)return toast("No hay registros.");let fields=["numeroFormato","peaje","carril","fecha","turno","horaInicio","horaFin","tipo","prioridad","motivo","codigo","serie","tipoDis","ubicacion","marca","modelo","estadoInicial","falla","diagnostico","actividades","pruebas","estadoFinal","seguimiento","proxima","observaciones","tecnico","docTecnico","responsable","cargoResponsable"];let lines=[fields.join(";"),...records.map(r=>fields.map(k=>`"${String(r[k]??"").replaceAll('"','""')}"`).join(";"))];let a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}));a.download="FARGAU_mantenimientos.csv";a.click()}
function toDataURL(file){return new Promise((res,rej)=>{let r=new FileReader;r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function generatePDF(r,w){
 // Si no se pasó una ventana ya abierta (p.ej. al regenerar desde Historial/Dashboard, que sí es
 // un clic síncrono), se abre aquí. Si se pasó una ventana en null porque el navegador la bloqueó,
 // se avisa al usuario.
 if(w===undefined)w=window.open("","_blank");
 if(!w)return toast("El navegador bloqueó la ventana del PDF. Permita ventanas emergentes para este sitio e intente de nuevo.");
 let parts=(r.repuestos||[]).map(p=>`<tr><td>${esc(p.nombre)}</td><td class="ctr">${esc(p.cantidad)}</td><td>${esc(p.observacion)||"—"}</td></tr>`).join("")||`<tr><td colspan="3" class="muted">No se registraron repuestos ni materiales.</td></tr>`;
 let imgs=(r.fotos||[]).map((x,i)=>`<td class="evidcell"><img src="${x}"><div class="cap">Evidencia ${i+1}</div></td>`);
 let imgRows="";
 for(let i=0;i<imgs.length;i+=3)imgRows+=`<tr>${imgs.slice(i,i+3).join("")}${"<td></td>".repeat(Math.max(0,3-(imgs.length-i)))}</tr>`;
 let estadoClass=r.estadoFinal==="Fuera de servicio"?"bad":r.estadoFinal==="Operativo"?"ok":"warn";
 // Layout 100% basado en <table>: es el elemento más estable y predecible al imprimir/guardar como PDF
 // en cualquier navegador (a diferencia de flexbox o grid, que algunos motores de impresión recalculan mal).
 w.document.open();
 w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(r.numeroFormato)}</title><style>
@page{size:A4;margin:12mm 13mm}
*{box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1b2536;font-size:9px;margin:0;line-height:1.4}
table{width:100%;border-collapse:collapse}
.headtbl td{border:0;padding:0;vertical-align:top}
.brandrow{white-space:nowrap}
.mark{display:inline-block;width:30px;height:30px;border-radius:8px;background:#0a4fb8;color:#fff;text-align:center;line-height:30px;font-weight:900;font-size:15px;vertical-align:middle}
.brandtxt{display:inline-block;vertical-align:middle;margin-left:8px}
.brand{font-size:18px;font-weight:900;letter-spacing:1.2px;color:#0a2341}
.sub{font-size:7.5px;color:#64748b;margin-top:1px;letter-spacing:.2px}
.folio{border:1px solid #bcd7fb;background:#f2f8ff;border-radius:8px;padding:8px 13px;text-align:right;color:#0a4fb8}
.folio .lbl{font-size:6.5px;letter-spacing:1px;color:#5b7ba3;font-weight:700}
.folio .num{font-size:12px;font-weight:900;margin:2px 0}
.folio .meta{font-size:8px;color:#5b7ba3}
.headline{border-bottom:3px solid #0a4fb8;padding-bottom:12px;margin-bottom:6px}
h2{font-size:9px;color:#fff;background:#0a2749;padding:7px 10px;margin:14px 0 7px;letter-spacing:.5px}
.fieldtbl{border:1px solid #e2e7ee}
.fieldtbl td{border:1px solid #e2e7ee;padding:6px 8px;vertical-align:top;width:33.33%}
.fieldtbl .lbl{display:block;text-transform:uppercase;color:#7280a0;font-size:6.5px;margin-bottom:3px;letter-spacing:.3px;font-weight:700}
.fieldtbl .val{white-space:pre-wrap;overflow-wrap:anywhere}
.datatbl th,.datatbl td{border:1px solid #e2e7ee;padding:6px 7px;text-align:left;font-size:8.5px}
.datatbl th{background:#eef3f9;font-size:7px;text-transform:uppercase;color:#4a5568;letter-spacing:.3px}
.ctr{text-align:center}
.muted{color:#98a2b3;text-align:center}
.chip{display:inline-block;padding:3px 9px;border-radius:20px;font-size:7px;font-weight:800;letter-spacing:.2px}
.chip.ok{background:#e2f6ec;color:#0b8a56}
.chip.warn{background:#fff2d9;color:#9a5b00}
.chip.bad{background:#fde3e5;color:#b42318}
.signtbl td{border:1px solid #e2e7ee;padding:10px;text-align:center;width:50%}
.signtbl .line{height:60px;vertical-align:bottom}
.signtbl img{max-width:95%;max-height:58px}
.signtbl .who{font-size:8px;font-weight:700;margin-top:6px}
.signtbl .cap{color:#7280a0;font-size:7px}
.evidcell{border:1px solid #e2e7ee;padding:6px;text-align:center;width:33.33%}
.evidcell img{width:100%;height:95px;object-fit:cover;border-radius:4px}
.evidcell .cap{font-size:6.5px;color:#7280a0;margin-top:3px}
.footer{border-top:1px solid #e2e7ee;margin-top:16px;padding-top:7px;color:#8b96a8;font-size:7px}
.footer td{border:0;padding:0}
.print{margin:16px 0 0;padding:10px 18px;background:#176fe0;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:10px;cursor:pointer}
@media print{.print{display:none}}
</style></head><body>

<table class="headtbl"><tr>
<td class="brandrow"><span class="mark">F</span><span class="brandtxt"><div class="brand">FARGAU</div><div class="sub">PEAJE · SISTEMA DE GESTIÓN DE MANTENIMIENTO</div><div class="sub">FORMATO TÉCNICO DE INTERVENCIÓN DE DISPOSITIVOS</div></span></td>
<td style="width:170px;text-align:right"><div class="folio"><span class="lbl">NÚMERO DE FORMATO</span><div class="num">${esc(r.numeroFormato)}</div><span class="meta">${esc(r.fecha)} · ${esc(r.turno||"-")}</span></div></td>
</tr></table>
<div class="headline"></div>

<h2>01 · Identificación de la intervención</h2>
<table class="fieldtbl"><tr>${cell("Peaje",r.peaje)}${cell("Carril",r.carril)}${cell("Fecha",r.fecha)}</tr>
<tr>${cell("Turno",r.turno)}${cell("Horario",`${r.horaInicio||"-"} — ${r.horaFin||"-"}`)}${cell("Tipo",r.tipo)}</tr>
<tr>${cell("Prioridad",r.prioridad)}<td colspan="2">${inner("Motivo / solicitud",r.motivo)}</td></tr></table>

<h2>02 · Dispositivo intervenido</h2>
<table class="fieldtbl"><tr>${cell("Código",r.codigo)}${cell("Número de serie",r.serie)}${cell("Tipo",r.tipoDis)}</tr>
<tr>${cell("Ubicación",r.ubicacion)}${cell("Marca",r.marca)}${cell("Modelo",r.modelo)}</tr>
<tr><td colspan="3">${inner("Estado inicial",r.estadoInicial)}</td></tr></table>

<h2>03 · Diagnóstico e intervención</h2>
<table class="fieldtbl">
<tr><td colspan="3">${inner("Falla / síntoma reportado",r.falla)}</td></tr>
<tr><td colspan="3">${inner("Diagnóstico técnico",r.diagnostico)}</td></tr>
<tr><td colspan="3">${inner("Actividades realizadas",r.actividades)}</td></tr>
<tr><td colspan="3">${inner("Pruebas de funcionamiento",r.pruebas)}</td></tr>
</table>

<h2>04 · Repuestos y materiales</h2>
<table class="datatbl"><thead><tr><th>Repuesto / material</th><th style="width:80px">Cantidad</th><th>Observación</th></tr></thead><tbody>${parts}</tbody></table>

<h2>05 · Cierre de la intervención</h2>
<table class="fieldtbl"><tr>
<td><span class="lbl">Estado final</span><span class="chip ${estadoClass}">${esc(r.estadoFinal)}</span></td>
${cell("Seguimiento",r.seguimiento)}${cell("Próxima revisión",r.proxima||"-")}</tr>
<tr><td colspan="3">${inner("Observaciones finales",r.observaciones)}</td></tr></table>

<h2>06 · Responsables y aceptación</h2>
<table class="fieldtbl"><tr>${cell("Técnico responsable",r.tecnico)}${cell("Documento técnico",r.docTecnico)}${cell("Responsable del peaje",r.responsable)}</tr>
<tr><td colspan="3">${inner("Cargo",r.cargoResponsable)}</td></tr></table>

<table class="signtbl"><tr>
<td><div class="line">${r.firmaTecnico?`<img src="${r.firmaTecnico}">`:""}</div><div class="who">${esc(r.tecnico)}</div><div class="cap">Firma del técnico responsable</div></td>
<td><div class="line">${r.firmaResponsable?`<img src="${r.firmaResponsable}">`:""}</div><div class="who">${esc(r.responsable)}</div><div class="cap">Firma responsable del peaje</div></td>
</tr></table>

${imgRows?`<h2>07 · Evidencias fotográficas</h2><table class="datatbl"><tbody>${imgRows}</tbody></table>`:""}

<table class="footer"><tr><td>FARGAU · Registro de mantenimiento</td><td style="text-align:right">Generado: ${new Date().toLocaleString("es-CO")}</td></tr></table>
<button class="print" onclick="window.print()">IMPRIMIR / GUARDAR COMO PDF</button>
</body></html>`);w.document.close();setTimeout(()=>w.focus(),400)}
function inner(k,v){return`<span class="lbl">${esc(k)}</span><span class="val">${esc(v||"-")}</span>`}
function cell(k,v){return`<td>${inner(k,v)}</td>`}
function toast(t){let d=document.createElement("div");d.className="toastx";d.textContent=t;$("toast").appendChild(d);setTimeout(()=>d.remove(),4000)}
