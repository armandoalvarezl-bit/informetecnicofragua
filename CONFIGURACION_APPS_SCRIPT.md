# Conexion con Google Apps Script

## 1. Crear el receptor

1. Abre `https://script.google.com/` con la cuenta corporativa.
2. Crea un proyecto nuevo.
3. Copia el contenido de `Code.gs` de esta carpeta y pegalo en `Code.gs` del proyecto.
4. Guarda el proyecto.

El codigo configura automaticamente la hoja `Registros`: encabezado con formato, filtros, primera fila congelada, ajuste de texto y anchos de columna. Si la hoja ya existe, conserva los registros y actualiza su presentacion.

## 2. Publicar como aplicacion web

1. Selecciona **Implementar > Nueva implementacion**.
2. Tipo: **Aplicacion web**.
3. Ejecutar como: **Yo**.
4. Acceso: **Cualquier usuario** o el alcance definido por la organizacion.
5. Autoriza los permisos de Google Drive y Google Sheets.
6. Copia la URL que termina en `/exec`.

## 3. Pegar la URL en el formulario

En `index.html`, verifica esta linea:

```js
const APPS_SCRIPT_URL = 'URL_DEL_DESPLIEGUE';
```

Pega la URL entre las comillas. Luego abre de nuevo `index.html`.

## 4. Resultado

- Cada informe se agrega como una fila en la hoja `Registros` del archivo `Informes tecnicos - Peajes`.
- Las fotografias se guardan en la carpeta `Evidencias informes tecnicos` de Google Drive.
- Cada informe genera tambien un PDF en la carpeta `Informes PDF tecnicos`; el enlace **Descargar** aparece en `historial.html`.
- El boton **Imprimir / Guardar PDF** guarda automaticamente el informe en la nube antes de abrir la impresion local.
- El PDF enviado por correo usa las hojas completas renderizadas por el formulario, conservando el mismo diseno, logos, fotos y paginacion del informe original.
- Antes de convertir a PDF, Apps Script convierte las imagenes incrustadas en recursos de Drive para evitar que el conversor las omita.
- Si un PDF ya fue generado antes de esta correccion, debe regenerarse desde `historial.html`; los archivos descargados anteriormente no se modifican por si solos.
- El boton **Enviar informe** genera un PDF en Apps Script y lo envia automaticamente a `peajefragua@zimaseguridad.com.co` y `cord.recaudo1@zimaseguridad.com.co`.
- La pagina `historial.html` consulta los registros guardados y permite buscar por numero, fecha, peaje o novedad. Los enlaces de fotos abren las evidencias almacenadas en Drive.
- La pagina `correos.html` consulta la pestaña `Correos enviados` y muestra el seguimiento de cada correo remitido, su estado y el PDF.
- El formulario conserva tambien el borrador local y permite exportar un respaldo JSON.

## Actualizar la implementacion

Cada vez que cambies `Code.gs`, selecciona **Implementar > Administrar implementaciones**, edita la implementacion web y crea una nueva version. El HTML usa la URL `/exec` y no necesita cambiar si la implementacion se actualiza.

Despues de actualizar, abre la URL `/exec` una vez en el navegador. Eso inicializa la hoja y aplica el formato automaticamente. Luego abre `historial.html` y pulsa **Buscar**.

## Permisos del primer envio

La primera ejecucion puede pedir autorizacion para Google Sheets, Google Drive y Gmail. Debe aceptarla la cuenta indicada en **Ejecutar como**. Revisa tambien la cuota diaria de correo de Apps Script si se envian muchos informes.

## Seguridad y permisos

La URL del despliegue permite recibir datos desde el formulario. No incluyas contrasenas, tokens ni claves privadas en `index.html`. Para una organizacion con datos restringidos, configura el acceso del despliegue con las politicas de Google Workspace y limita quien puede abrir el formulario.
