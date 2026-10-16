# Revisión local de privacidad y transmisión del CSV

**Revisado:** 2026-10-16, rama `develop`.
**Alcance:** fuentes actuales de la app embebida y del núcleo CSV; esta revisión no inspecciona proveedores externos ni sustituye la verificación del entorno desplegado.

## Evidencia examinada

- `csv-import-doctor/app/routes/app._index.tsx`: el selector guarda el `File` en una referencia local, lo envía al Web Worker con `postMessage`, y no lo incluye en una solicitud HTTP. El servidor de la ruta solo ejecuta `authenticate.admin`.
- `csv-import-doctor/app/workers/csv-analysis.worker.ts`: decodifica, analiza y valida el archivo en el Worker; devuelve la matriz y los diagnósticos al hilo de interfaz.
- `packages/csv-doctor-core/src/`: la búsqueda no encuentra uso de `fetch`, `XMLHttpRequest`, `sendBeacon`, `FormData` ni APIs de red.
- Rutas de red del código de app: la búsqueda de `fetch`, `XMLHttpRequest`, `sendBeacon`, `FormData` y `multipart/form-data` no encuentra una ruta de subida CSV.
- Logging local: las únicas llamadas encontradas son errores de renderizado SSR en `entry.server.tsx` y logs de topic/tienda en los webhooks `app/uninstalled` y `app/scopes_update`. No reciben ni registran el `File`, filas, valores o nombres del CSV.
- El E2E autenticado comprueba que marcadores únicos de varios CSV de prueba no aparezcan en URLs ni cuerpos de solicitudes de red; comprueba además que el Worker termine al cancelar el análisis o salir de la ruta.
- El código revoca los `ObjectURL` de descargas y libera la referencia al `File` cuando el análisis termina, falla o se cancela; solo conserva el archivo mientras se necesita confirmar un delimitador ambiguo.

## Resultado

En el código revisado no se encontró transmisión, persistencia, logging ni telemetría del contenido del CSV. El resultado se limita a la aplicación local y a las pruebas ejecutadas; no demuestra qué registros conserva el hosting de producción, Shopify, un proxy, una base de datos externa o un proveedor de copias de seguridad.

## Pendiente antes de distribuir

- Confirmar proveedor y regiones de alojamiento, acceso a logs, copias de seguridad y plazos de retención.
- Completar responsable legal, contacto de privacidad/soporte y política pública con esos datos reales.
- Repetir la comprobación de red en el despliegue de producción antes de abrir acceso a comerciantes.
