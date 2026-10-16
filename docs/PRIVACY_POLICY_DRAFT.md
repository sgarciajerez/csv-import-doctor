# Borrador de privacidad de CSV Import Doctor

Este borrador describe el comportamiento comprobado en el código. No está listo para publicarse: faltan los datos del responsable, contacto y proveedor de alojamiento, además de revisar sus ubicaciones, transferencias y retención de logs/copias de seguridad.

El texto visible está en `csv-import-doctor/app/routes/privacy.tsx`. Mantenerlo sincronizado con este inventario y revisarlo si cambia la autenticación, el esquema de sesión, la configuración de scopes, el procesamiento del CSV o el hosting.

## Datos tratados hoy

- **Archivo CSV:** se decodifica, analiza, valida, repara y serializa dentro del navegador/Web Worker. El servidor no recibe el archivo ni filas, cabeceras, incidencias o valores de reparación. Estos datos permanecen en memoria de la pestaña; el usuario puede descargarlos localmente.
- **Autenticación e instalación:** el adaptador Prisma almacena el modelo `Session`, que incluye tienda, estado de sesión, token de acceso, vencimiento, permisos, identificador de usuario y, cuando los devuelve Shopify, nombre, correo, idioma y atributos de cuenta. El esquema actual incluye también refresh token y vencimiento.
- **Datos de tienda:** la configuración solicita scopes vacíos. El producto no consulta ni modifica productos, inventario, pedidos o clientes. Los webhooks de privacidad autentican la solicitud; `shop/redact` elimina todas las sesiones de la tienda y los webhooks de clientes responden sin almacenar payloads.
- **Telemetría:** no hay analítica de producto configurada. Revisar los logs del servidor y del proveedor antes de distribución; no registrar tokens, contenido CSV ni payloads de webhooks.
- **Proveedores:** Shopify procesa la autenticación. El proveedor de hosting y base de datos aún no está definido; completar su nombre, ubicación, subprocesadores y transferencias internacionales antes de publicar.
- **Conservación:** la sesión se elimina con `app/uninstalled` y `shop/redact`. Falta fijar los plazos y borrado de logs, backups y datos residuales del alojamiento.

## Datos obligatorios por completar antes de distribución

1. Nombre legal y domicilio del responsable.
2. Email de privacidad y soporte; proceso para solicitudes de acceso, corrección y eliminación.
3. Hosting, base de datos, regiones, subprocesadores y mecanismos de transferencia aplicables.
4. Retención exacta de sesiones, logs y copias de seguridad, incluyendo plazos de borrado.
5. Revisión jurídica de obligaciones según jurisdicciones y publicación de una URL estable enlazada desde la ficha de Shopify.

Shopify requiere los tres webhooks de cumplimiento para apps distribuidas por su App Store y una política enlazada desde la ficha; ver [Privacy requirements](https://shopify.dev/docs/apps/launch/privacy-requirements) y [Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance). Esta lista es un control de producto, no asesoramiento jurídico.
