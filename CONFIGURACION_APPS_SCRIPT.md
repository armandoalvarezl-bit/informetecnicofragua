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

En `informe.js`, verifica esta linea:

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
- El boton **Enviar informe** genera un PDF en Apps Script y lo envia automaticamente a `peajefragua@zimaseguridad.com.co` y `c.recaudo3@zimaseguridad.com.co`.
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


## Actualizar el sistema existente (impresión y reenvío)

1. En el proyecto de Google Apps Script existente, sustituye el contenido de Code.gs por el archivo Code.gs de esta carpeta y guarda.
2. Abre Implementar > Administrar implementaciones.
3. Edita la implementación web actual con el lápiz, selecciona Nueva versión y pulsa Implementar. Conserva la URL /exec existente; no es necesario crear otro despliegue.
4. Conserva reenvio.js junto a historial.html y correos.html. Recarga las páginas con Ctrl + F5.
5. Busca un informe y pulsa Reenviar. El correo sale solo al confirmar. La impresión del formulario funciona localmente y no necesita guardar ni enviar primero.

Hasta actualizar la implementación de Google, los botones nuevos no podrán ejecutar el reenvío real. El formulario informa de la falta de activación si el receptor antiguo rechaza esa operación.

## PDF idéntico en impresión y correo

El formulario utiliza pdf-informe.js y las bibliotecas locales de vendor. Conserva esa carpeta y los archivos JavaScript junto a index.html.

El nuevo Code.gs acepta el PDF ya generado, lo guarda y adjunta sin volver a convertir HTML. Para activarlo: reemplaza Code.gs en Google, entra en Implementar > Administrar implementaciones > Editar, selecciona Nueva versión e implementa conservando la URL actual. Hasta esa actualización, el formulario detiene el envío para evitar adjuntar un PDF con el formato anterior.

Imprimir / Guardar PDF abre el PDF final en otra pestaña. Desde el visor puedes imprimirlo o guardarlo. Si no se modifica el informe, Enviar informe reutiliza ese mismo archivo. Los reenvíos conservan el PDF almacenado.

## Vista previa correcta de informes antiguos

Publica el Code.gs actualizado como nueva versión de la implementación existente. Conserva visor-informe.js e historico-informe.js junto al formulario y recarga con Ctrl + F5.

Abre Historial > Vista previa / Imprimir. Si el registro usa el formato anterior, la vista recupera sus datos y evidencias y muestra Guardar PDF corregido. Pulsa ese botón para actualizar el archivo utilizado por el historial y los próximos reenvíos; conserva el número del informe. Imprime desde el botón Imprimir del nuevo visor.

Una pestaña que ya estuviera abierta con un enlace de drive.google.com sigue mostrando el PDF antiguo. La nueva vista se abre desde los enlaces actualizados del sistema.
