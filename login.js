'use strict';
const loginForm=document.getElementById('loginForm');
document.getElementById('togglePassword').onclick=function(){const password=document.getElementById('password');const show=password.type==='password';password.type=show?'text':'password';this.textContent=show?'Ocultar':'Mostrar';this.setAttribute('aria-pressed',String(show));this.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');};
loginForm.onsubmit=async event=>{
 event.preventDefault();const button=document.getElementById('submit');const message=document.getElementById('message');button.disabled=true;button.textContent='Verificando…';message.textContent='';
 try{await ReportAuth.login(loginForm.username.value.trim(),loginForm.password.value);loginForm.password.value='';location.replace(ReportAuth.nextPage(new URLSearchParams(location.search).get('next')||'home.html'));}
 catch(error){message.textContent=error.message;button.disabled=false;button.textContent='Ingresar';}
};
