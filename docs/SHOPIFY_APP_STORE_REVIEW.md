# Revisión local de requisitos de Shopify App Store

**Fecha:** 2026-10-16  
**Fuente canónica:** `shopify doc fetch --url https://shopify.dev/docs/apps/launch/app-store-review/app-store-ai-self-review-requirements`, ejecutado con Shopify CLI 4.9.4 desde `csv-import-doctor/`.  
**Alcance:** comprobaciones seleccionadas por Shopify que se pueden contrastar con este repositorio. No sustituye la revisión oficial ni verifica la configuración de Partner Dashboard, la ficha, el entorno de producción o pruebas manuales.

## Resumen

- ✅ **Likely passing:** 20
- ❌ **Likely failing:** 1
- ⚠️ **Needs review:** 9
- ⏭️ **Groups skipped:** 10

Shopify puede añadir o cambiar requisitos. Volver a obtener la lista canónica antes de enviar la app.

## Requisitos que necesitan revisión

### 1.1.4 — Usar información veraz

**Por qué necesita atención:** el texto visible en la aplicación es concreto y coincide con sus límites, pero aún no existe una ficha de App Store que revisar.

**Qué se encontró:** la ruta pública ya no contiene placeholders del scaffold. Falta redactar y contrastar la ficha comercial completa antes de enviarla.

### 1.2.1–1.2.3 — Cobro, gestión de cargos y cambios de plan

**Por qué necesita atención:** el código no cobra a comerciantes. Esto es correcto si la app es realmente gratuita; si se va a cobrar, Shopify exige usar su sistema de cobro y permitir los cambios de plan aplicables.

**Qué se encontró:** no hay Shopify App Pricing, Billing API, planes ni precios configurados. El modelo comercial y si habrá uno o varios planes no están decididos en el repositorio.

### 2.2.1 — Usar APIs de Shopify

**Por qué necesita atención:** Shopify indica que las apps que no usan ni necesitan APIs de Shopify no pueden distribuirse en App Store. Hay que confirmar si la autenticación embebida y los webhooks actuales satisfacen este requisito para una utilidad cuyo procesamiento de CSV es completamente local.

**Qué se encontró:** el proyecto usa la biblioteca oficial de autenticación, App Bridge y webhooks de cumplimiento, pero no solicita permisos de Admin API ni consulta datos de la tienda. No añadir permisos sin una función que los necesite.

### 2.2.4 — Usar GraphQL Admin API

**Por qué necesita atención:** la app no necesita ahora operaciones de Admin API. Si Shopify exige una operación de API para distribuir esta funcionalidad, la integración debe ser GraphQL; la compatibilidad de esa necesidad debe resolverse junto con 2.2.1.

**Qué se encontró:** no se encontraron llamadas REST ni GraphQL de Admin API en el código actual; los permisos están vacíos.

### 2.3.2–2.3.4 — OAuth tras instalar, aceptar permisos y reinstalar

**Por qué necesita atención:** el código usa el flujo oficial de autenticación, pero las pruebas locales se ejecutaron sobre una instalación ya existente. Hace falta verificar la instalación y reinstalación en una tienda limpia.

**Qué se encontró:** `authenticate.admin` protege las rutas de la aplicación y la página pública ya deriva al Admin de Shopify sin pedir el dominio. No hay evidencia de una prueba completa de instalación y reinstalación desde cero.

## Requisito que probablemente falla

### 3.1.1 — Certificado TLS/SSL válido para producción

**Por qué importa:** Shopify requiere que el tráfico entre el navegador y la aplicación esté protegido con un certificado TLS válido.

**Qué se encontró:** `csv-import-doctor/shopify.app.toml` aún contiene `application_url = "https://example.com"` y `redirect_urls = ["https://example.com/api/auth"]`. No hay dominio ni despliegue de producción configurados; la URL temporal de desarrollo no demuestra que la versión publicada vaya a tener TLS operativo.

## Grupos omitidos

- **5.1 Online store** — no hay una extensión de tema `type = "theme"`.
- **5.2 Payment** — no hay extensión de pago ni permiso `write_payment_gateway`.
- **5.3 Payment facilitator** — opt-in; no solicitado.
- **5.4 Purchase option** — no se solicitan permisos de suscripciones o métodos de pago diferido.
- **5.5 Product sourcing** — opt-in; no solicitado.
- **5.6 Checkout customization** — no hay una extensión de checkout UI.
- **5.7 Sales channel** — no hay una extensión `channel_config`.
- **5.8 Post purchase** — no hay una extensión post-compra.
- **5.9 Mobile app builders** — opt-in; no solicitado.
- **5.10 Donation** — opt-in; no solicitado.

## Recursos

- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Best practices for apps](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices)
- [About billing for your app](https://shopify.dev/docs/apps/launch/billing)
- [Submitting your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
