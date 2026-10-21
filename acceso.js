(function(){
 'use strict';
 const endpoint='https://script.google.com/macros/s/AKfycbyC9Veh9N9OTdfspPS2qRqiAIgznBc1-jLyV4i-d7j1wWTVkG4WvfxlG1D-_5JGg50XuQ/exec';
 const key='informes_sesion';
 const publicPage=/\/(login|configurar-acceso)\.html$/.test(location.pathname);
 let token='';try{token=sessionStorage.getItem(key)||'';}catch(error){}
 function nextPage(value){
   try{const url=new URL(value,location.href);if(url.origin===location.origin && /\/(home|index|historial|correos)\.html$/.test(url.pathname))return url.pathname.split('/').pop()+url.search;}catch(error){}
   return 'home.html';
 }
 function redirect(){
   try{sessionStorage.removeItem(key);}catch(error){}token='';
   const next=nextPage(location.href);location.replace('login.html?next='+encodeURIComponent(next));
 }
 async function request(payload){
   const response=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
   if(!response.ok)throw new Error('No se pudo conectar con el servidor.');
   let data;try{data=await response.clone().json();}catch(error){throw new Error('El servidor no respondió correctamente.');}
   if(data.code==='AUTH_REQUIRED' && !publicPage){redirect();throw new Error(data.error);}
   return {response:response,data:data};
 }
 let ready=Promise.resolve(null);
 if(!publicPage){
   const style=document.createElement('style');style.id='auth-guard';style.textContent='body{visibility:hidden!important}';document.head.appendChild(style);
   ready=(async()=>{
     if(!token){redirect();throw new Error('Inicie sesión.');}
     const result=await request({action:'session',authToken:token});
     if(!result.data.ok)throw new Error(result.data.error||'No se pudo validar la sesión.');
     const user=result.data.user;
     const mount=()=>{
       style.remove();
       const bar=document.createElement('div');bar.className='auth-session';
       const name=document.createElement('span');name.className='auth-user';name.textContent='Sesión: '+(user.displayName||user.username)+(user.username?' (@'+user.username+')':'');name.title=name.textContent;
       const button=document.createElement('button');button.type='button';button.textContent='Cerrar sesión';
       button.onclick=async()=>{button.disabled=true;try{const result=await request({action:'logout',authToken:token});if(!result.data.ok)throw new Error(result.data.error);redirect();}catch(error){button.disabled=false;alert(error.message);}};
       bar.setAttribute('role','region');bar.setAttribute('aria-label','Sesión de usuario');bar.append(name,button);document.body.classList.add('has-auth-session');document.body.prepend(bar);
     };
     if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
     return user;
   })();
   ready.catch(error=>{
     if(!token)return;
     const show=()=>{
       style.remove();document.body.replaceChildren();
       const box=document.createElement('main');box.className='auth-failure';
       const title=document.createElement('h1');title.textContent='No se pudo validar el acceso';
       const message=document.createElement('p');message.textContent=error.message;
       const retry=document.createElement('button');retry.textContent='Volver a intentar';retry.onclick=()=>location.reload();
       const login=document.createElement('a');login.href='login.html';login.textContent='Ir al inicio de sesión';box.append(title,message,retry,login);document.body.append(box);
     };if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
   });
 }
 const css=document.createElement('style');css.textContent='.auth-session{position:sticky;top:0;z-index:60;box-sizing:border-box;height:56px;display:flex;justify-content:flex-end;align-items:center;gap:16px;padding:9px 24px;background:#123344;color:#fff;font:14px Arial,sans-serif}.auth-user{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auth-session button{flex-shrink:0}.has-auth-session .topbar{top:56px}.has-auth-session .dashboard-sidebar{top:144px;height:calc(100vh - 144px)}.has-auth-session .page-shell.dashboard-layout{padding-top:172px}@media(max-width:900px){.has-auth-session .page-shell.dashboard-layout{padding-top:162px}.has-auth-session .dashboard-sidebar{height:auto}}@media(max-width:560px){.auth-session{gap:8px;padding:9px 12px;font-size:12px}}.auth-session button,.auth-failure button{border:1px solid #a6bac2;border-radius:5px;background:transparent;color:inherit;padding:6px 12px;cursor:pointer}.auth-failure{margin:15vh auto;max-width:520px;padding:24px;font:16px Arial;color:#173f52}.auth-failure a{display:block;margin-top:20px}@media print{.auth-session{display:none!important}.has-auth-session .topbar{top:0}.has-auth-session .page-shell.dashboard-layout{padding-top:0}}';document.head.append(css);
 window.ReportAuth={ready:ready,nextPage:nextPage,
   setup:async function(payload){
     const result=await request(Object.assign({},payload,{action:'setup'}));
     if(!result.data.ok)throw new Error(result.data.error||'No se pudo crear el usuario.');
     return result.data;
   },
   login:async function(username,password){
     const result=await request({action:'login',username:username,password:password});
     if(!result.data.ok)throw new Error(result.data.error||'No se pudo iniciar sesión.');
     if(!result.data.token)throw new Error('Actualice Code.gs: el servidor aún no tiene el acceso habilitado.');
     token=result.data.token;sessionStorage.setItem(key,token);return result.data;
   },
   fetch:async function(url,options){
     await ready;
     const target=new URL(url,location.href);
     if(target.origin!==new URL(endpoint).origin || target.pathname!==new URL(endpoint).pathname)throw new Error('Destino de conexión no permitido.');
     const payload=options&&options.body?JSON.parse(options.body):Object.fromEntries(target.searchParams);
     // Capabilities are public; request through GET, without exposing a session token.
     if(payload.action==='capabilities')return fetch(endpoint+'?action=capabilities',{cache:'no-store'});
     payload.authToken=token;
     return (await request(payload)).response;
   }
 };
})();
