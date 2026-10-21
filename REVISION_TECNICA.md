# Revisión técnica del sistema de informes

Estado actualizado: 21 de octubre de 2026.

## PDF único para impresión y correo

El formulario genera un PDF carta con pdf-informe.js. Imprimir / Guardar PDF abre un visor propio con las páginas del PDF. Enviar informe reutiliza exactamente los mismos bytes si el contenido no cambió. Code.gs recibe el PDF en base64, lo guarda como application/pdf y adjunta el archivo guardado, sin convertir de nuevo el HTML ni reemplazar las evidencias por enlaces.

La generación se realiza por páginas para evitar lienzos gigantes. Se conservan los logos, las evidencias, sus pies de foto y los bloques de firmas. Los cambios de contenido invalidan la copia en memoria. El visor PDF permite imprimir o guardar el archivo. Las bibliotecas están en vendor y no necesitan descargarse al usar el formulario.

El formulario comprueba que el receptor de Google admita el PDF original antes de enviar. Si la implementación está desactualizada, se detiene sin enviar un adjunto con el formato anterior.

## Informes guardados y reenvío

Historial y Correos enviados permiten reenviar el PDF guardado con su número original. El servidor comprueba la fila o el enlace del PDF antes de enviarlo. Recuperar PDFs faltantes conserva los archivos que ya existen. Los informes antiguos sin PDF pueden reconstruirse con el formato de respaldo; esa reconstrucción no garantiza recuperar un diseño original que nunca se guardó.

## Validación

- Ocho comprobaciones en Chrome: apertura del PDF, múltiples hojas, presencia de evidencias y firmas, reutilización del archivo, igualdad exacta de los bytes enviados, conservación de fotos y páginas, cambio de contenido y bloqueo de receptores antiguos.
- Revisión visual de un PDF de tres páginas con dos evidencias, ambos logos y los dos bloques de firmas.
- Prueba extensa con 180 líneas y diez evidencias: siete páginas carta, aproximadamente 4,7 MB; las mismas comprobaciones de envío satisfactorias.
- Once pruebas del servidor, incluyendo igualdad exacta entre el PDF recibido, guardado y adjunto, rechazo de archivos inválidos, protección de originales y reenvío sin duplicar informes. Se repiten con node verificar-flujos.cjs; puede pasarse como argumento un PDF real.
- No se enviaron correos reales ni se modificaron registros de Google durante estas pruebas.

## Activación y límites actuales

Actualizar Code.gs en el proyecto existente de Apps Script y publicar una nueva versión de la misma implementación. Conservar la URL /exec. Mantener pdf-informe.js y vendor junto al formulario. El código local no actualiza automáticamente Google.

Los PDF anteriores ya enviados no se modifican. Los nuevos PDF conservan su apariencia como imágenes de alta resolución por página; el texto del contenido no es seleccionable. Los documentos mayores de 18 MB se rechazan antes de enviarlos.

La numeración sigue almacenada por navegador y parte como mínimo de 002; no hay reserva central de números entre equipos. El borrador de texto se recupera localmente, pero las fotos deben adjuntarse de nuevo después de recargar.

## Vista previa e impresión de informes anteriores

Vista previa e impresión ahora usan visor-informe.js. El visor presenta las imágenes de cada página del mismo PDF y las imprime como páginas HTML carta, sin el visor de Google Drive ni el complemento PDF del navegador. Espera a que las imágenes estén listas antes de habilitar Imprimir.

Historial y Correos enviados abren el registro mediante historico-informe.js. Para PDF originales modernos se leen las páginas del archivo guardado sin modificar sus bytes. Para formatos antiguos se recuperan los campos y las evidencias privadas de Drive y se prepara una vista corregida con la plantilla actual. Guardar PDF corregido actualiza solo el enlace del PDF del registro; conserva número, datos, evidencias y archivo anterior. Los enlaces antiguos se asocian al PDF actualizado para los siguientes reenvíos.

Verificación en Chrome real mediante CDP (node verificar-visor.cjs): apertura de un informe antiguo con evidencia y firmas; impresión de tres páginas carta con imágenes de contenido; guardado de la corrección sin cambio de número; lectura de las páginas del archivo original; y clic real del botón del formulario con ventana e impresión completas. Servicios de Google simulados, sin envío de correos ni cambios en registros reales. Diecisiete pruebas del servidor satisfactorias con node verificar-flujos.cjs.

Activación: actualizar Code.gs y publicar una nueva versión de la misma implementación; recargar los archivos locales y abrir Vista previa / Imprimir desde el historial. Un enlace de Drive abierto anteriormente conserva el archivo antiguo.
