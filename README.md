# FARGAU — Sistema de formatos de mantenimiento V3

## IMPORTANTE: solución al error `ReferenceError: document is not defined`
NO pegue `index.html`, `style.css` ni `app.js` dentro de `Código.gs`.

- `index.html`, `style.css`, `app.js`: van en el hosting/web del sistema.
- `Código.gs`: va en Google Apps Script y solo contiene funciones `setup`, `doGet` y `doPost`.

## Incluye
- Peaje fijo: FARGAU.
- Formato técnico completo.
- Técnico responsable + documento.
- Responsable del peaje + cargo.
- Firmas digitales dibujadas con mouse/táctil.
- Diagnóstico técnico.
- Falla/síntoma.
- Actividades.
- Pruebas.
- Repuestos.
- Estado inicial/final.
- Seguimiento.
- Evidencias fotográficas.
- PDF A4 profesional institucional.
- Historial.
- Dispositivos.
- Técnicos.
- CSV para Excel.
- Sincronización a Google Sheets mediante Apps Script.
- Compatible con Power Automate/Excel Online mediante URL HTTP.

## Excel Online real
Si desea Microsoft Excel Online:
1. Cree un flujo en Power Automate.
2. Disparador: `When an HTTP request is received`.
3. Reciba el JSON.
4. Acción: `Excel Online (Business) > Add a row into a table`.
5. Pegue la URL del flujo en la sección "Excel Online" del sistema.

## Google Sheets opcional
Si prefiere Google Sheets:
1. Cree un Google Sheet.
2. Abra Extensiones > Apps Script.
3. Pegue `Código.gs`.
4. Ejecute `setup()`.
5. Implemente como aplicación web.
6. Use la URL `/exec` como endpoint en el frontend.

## Despliegue web
Suba `index.html`, `style.css` y `app.js` a su hosting estático.

## PDF
Al guardar se abre una ventana con el formato A4. Pulse `IMPRIMIR / GUARDAR COMO PDF` y seleccione "Guardar como PDF" en Chrome/Edge. También puede regenerarlo desde Historial.
