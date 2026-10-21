const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),assert=require('assert/strict');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function socket(url){const ws=new WebSocket(url),pending=new Map();let id=0;await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}};return {call(method,params={}){return new Promise((resolve,reject)=>{const number=++id;pending.set(number,{resolve,reject});ws.send(JSON.stringify({id:number,method,params}));});},close(){ws.close();}};}
(async()=>{
 const proc=spawn(chrome,['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=0','--user-data-dir='+path.resolve('.cdp-login'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let root,tab;
 try{
  const endpoint=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Chrome no inicio')),15000);proc.stderr.on('data',b=>{output+=b.toString();const m=output.match(/DevTools listening on (ws:\/\/[^\r\n]+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});proc.on('error',reject);});
  root=await socket(endpoint);const target=await root.call('Target.createTarget',{url:'about:blank'});const port=new URL(endpoint).port;
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());tab=await socket(targets.find(t=>t.id===target.targetId).webSocketDebuggerUrl);
  await tab.call('Page.enable');await tab.call('Runtime.enable');await tab.call('Emulation.setDeviceMetricsOverride',{width:1300,height:1100,deviceScaleFactor:1,mobile:false});

  const mock=`const originalFetch=window.fetch;window.fetch=async function(url,options){if(String(url).includes('script.google.com')){const p=JSON.parse(options?.body||'{}');let data={ok:true,total:0,records:[]};if(p.action==='setup'){window.savedSetup=p;data={ok:true};}if(p.action==='login')data=p.username==='tecnico'&&p.password==='Prueba segura 123'?{ok:true,token:'test-token',user:{username:'tecnico',displayName:'Técnico'}}:{ok:false,code:'AUTH_INVALID',error:'Usuario o contraseña incorrectos.'};if(p.action==='session')data=p.authToken==='test-token'?{ok:true,user:{username:'tecnico',displayName:'Técnico'}}:{ok:false,code:'AUTH_REQUIRED',error:'Inicie sesión.'};return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});}return originalFetch.apply(this,arguments);};`;
  await tab.call('Page.addScriptToEvaluateOnNewDocument',{source:mock});
  const base='file:///'+path.resolve('.').replace(/\\/g,'/')+'/';
  async function evaluate(expression){const r=await tab.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function wait(expression){for(let i=0;i<100;i++){await sleep(100);if(await evaluate(expression))return;}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText'));}
  await tab.call('Page.navigate',{url:base+'home.html'});
  await wait("location.pathname.endsWith('/login.html') && !!document.getElementById('loginForm')");console.log('OK Protected page redirects to login.');
  await evaluate("document.getElementById('username').value='tecnico';document.getElementById('password').value='wrong';document.getElementById('loginForm').requestSubmit()");
  await wait("document.getElementById('message').textContent.includes('incorrectos')");console.log('OK Wrong password stays on login with error.');
  await evaluate("document.getElementById('password').value='Prueba segura 123';document.getElementById('loginForm').requestSubmit()");
  await wait("location.pathname.endsWith('/home.html') && !!document.querySelector('.auth-session')");
  assert.equal(await evaluate("getComputedStyle(document.body).visibility"),'visible');console.log('OK Login opens dashboard with session controls.');
  assert.match(await evaluate("document.querySelector('.auth-user').textContent"), /@tecnico/);
  for(const width of [1300,390]){
   await tab.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
   assert(await evaluate("(()=>{const bar=document.querySelector('.auth-session'),button=bar.querySelector('button'),r=button.getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect();return r.top>=0&&r.right<=innerWidth&&header.top>=bar.getBoundingClientRect().bottom&&button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})()"),'Session button visible above dashboard header at '+width);
  }
  console.log('OK Name, username and logout visible on desktop and mobile.');
  await evaluate("document.querySelector('.auth-session button').click()");
  await wait("location.pathname.endsWith('/login.html') && !!document.getElementById('loginForm')");assert.equal(await evaluate("sessionStorage.getItem('informes_sesion')"),null);console.log('OK Logout clears session and returns to login.');
  await tab.call('Page.navigate',{url:base+'configurar-acceso.html'});await wait("!!document.getElementById('setup')");
  await evaluate("document.getElementById('user').value='tecnico';document.getElementById('name').value='Técnico';document.getElementById('pass').value='Prueba segura 123';document.getElementById('confirm').value='Prueba segura 123';document.getElementById('setup').requestSubmit()");
  await wait("!document.getElementById('output').hidden");const settings=await evaluate("({saved:window.savedSetup,password:document.getElementById('pass').value,hidden:document.getElementById('setup').hidden})");assert.equal(settings.saved.username,'tecnico');assert(settings.saved.passwordHash.startsWith('$2b$12$'));assert.equal(settings.saved.secret.length,44);assert.equal(settings.password,'');assert.equal(settings.hidden,true);assert.equal(settings.saved.password,undefined);console.log('OK Setup posts the bcrypt hash and displays server-confirmed success.');
 }finally{if(tab)tab.close();if(root){try{await root.call('Browser.close');}catch{}root.close();}proc.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
