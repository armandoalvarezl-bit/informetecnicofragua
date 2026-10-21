document.getElementById('setup').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget;const status=document.getElementById('status');const password=document.getElementById('pass').value;
 if(password!==document.getElementById('confirm').value){status.textContent='Las contraseñas no coinciden.';return;}
 if(bcrypt.truncates(password)){status.textContent='La contraseña no debe superar 72 bytes UTF-8.';return;}
 const button=form.querySelector('button');button.disabled=true;status.textContent='Creando y guardando el usuario…';
 try{
   const hash=await bcrypt.hash(password,12);const bytes=crypto.getRandomValues(new Uint8Array(32));
   await ReportAuth.setup({username:document.getElementById('user').value.trim().toLowerCase(),displayName:document.getElementById('name').value.trim(),passwordHash:hash,secret:btoa(String.fromCharCode(...bytes))});
   document.getElementById('output').hidden=false;
   form.reset();form.hidden=true;status.textContent='';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
};
