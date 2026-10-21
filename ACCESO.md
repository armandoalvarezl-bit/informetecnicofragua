El botón «Crear usuario y guardar» registra el primer usuario directamente en Apps Script. La contraseña se transforma en un hash bcrypt en el navegador; el servidor guarda el hash.

Registro inicial:

1. Publica el Code.gs actualizado en la implementación actual, conservando su URL.
2. Abre configurar-acceso.html. Elige tu nombre, usuario y contraseña y pulsa «Crear usuario y guardar».
3. El servidor crea AUTH_USERS y AUTH_SECRET automáticamente. Luego ingresa en login.html.

No se requieren códigos de activación ni crear propiedades manualmente. Mientras no exista un usuario, cualquier persona con el enlace puede completar el primer registro. Crea tu cuenta antes de compartir el sistema. Una vez registrado, el servidor cierra el registro y rechaza nuevos intentos de configuración. Los usuarios existentes se conservan.

La sesión dura 8 horas. Cerrar sesión la revoca en el servidor. Cambiar el passwordHash o desactivar el usuario con disabled:true invalida sus sesiones. Cinco intentos fallidos de login bloquean los intentos durante 15 minutos. Los tokens van por POST y se guardan en sessionStorage. Publica el sitio mediante HTTPS.

Los cambios locales no actualizan la implementación de Google hasta publicar Code.gs. No hay contraseñas predeterminadas. AUTH_USERS y AUTH_SECRET son propiedades privadas del servidor.

El login protege la API. Los PDF compartidos mediante enlaces públicos en Drive conservan esos permisos; el login no revoca enlaces ni adjuntos ya enviados.

Pruebas: node verificar-acceso.cjs y node verificar-login-navegador.cjs. Usan servicios simulados y no envían correos reales. bcryptjs 3.0.2 conserva su licencia BSD en vendor/bcrypt-3.0.2.js y Code.gs.
