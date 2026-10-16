# MVP comercial: criterios de salida

**Estado:** pendiente de las decisiones y comprobaciones externas marcadas abajo.
**Revisado:** 2026-10-16.

Este documento separa un piloto limitado de la venta pública a comerciantes. La app actual analiza y repara copias de CSV localmente; no importa productos ni garantiza que Shopify acepte un archivo.

## Estado actual comprobable

- La app embebida y el núcleo CSV están implementados; el análisis, las reparaciones y la exportación ocurren en el navegador.
- Los scopes de Admin API están vacíos. La función principal no lee ni modifica el catálogo de la tienda.
- Hay pruebas unitarias, E2E autenticadas y CI para lint, typecheck, pruebas y builds. El E2E de la tienda de desarrollo valida la interfaz y el comportamiento local, no sustituye una importación real en Shopify.
- La configuración de la app aún apunta a `https://example.com`; no hay despliegue de producción listo.
- La política enlazada no está lista para publicar: faltan responsable/contacto, alojamiento y regiones, y retención aplicable.
- No están definidos el precio ni los planes. No hay integración/configuración de cobro.
- Falta validar el producto con comerciantes y cerrar una revisión manual de accesibilidad.

## Ruta A: piloto limitado

Adecuada para probar utilidad con un comerciante o una organización elegible antes de lanzar públicamente. La distribución personalizada de Shopify no sirve para vender ampliamente a comercios independientes.

### Criterios de salida

- [ ] Elegir una tienda de prueba y acordar quién usará la app y qué problema concreto evaluará.
- [ ] Desplegar una URL HTTPS estable y reemplazar todas las URLs de ejemplo en configuración y redirecciones.
- [ ] Completar política de privacidad y canal de soporte para el piloto.
- [ ] Probar instalación, uso, actualización de sesión y desinstalación en una instalación limpia.
- [ ] Ejecutar sesiones de uso con CSV anonimizados o con consentimiento; registrar falsos positivos, reglas omitidas y tiempo hasta resolver cada problema, sin guardar el contenido del CSV.
- [ ] Decidir si se hará una prueba controlada del importador de Shopify con `fixtures/shopify-product-import-smoke.csv`. Registrar explícitamente el resultado y eliminar el producto de prueba si se importa.
- [ ] Revisar manualmente teclado, lector de pantalla, contraste y pantallas estrechas antes de invitar a comerciantes externos.

## Ruta B: venta pública a varios comerciantes

Para distribuir a muchas tiendas independientes, Shopify requiere una app de distribución pública y aprobación para App Store. Las apps públicas nuevas que cobran deben usar Shopify App Pricing cuando el modelo esté soportado; los planes se configuran en Partner Dashboard. La distribución personalizada no permite cobrar mediante el sistema de billing de Shopify.

### Bloqueos de publicación y venta

- [ ] Confirmar que Shopify acepta el valor principal de análisis local con uso mínimo o nulo de Admin API. No añadir scopes de productos solo para aparentar integración.
- [ ] Crear entorno de producción: hosting operado, TLS, dominio, secretos fuera del repositorio, despliegue y rollback documentados.
- [ ] Sustituir `example.com` en `application_url` y `redirect_urls`; validar la configuración con Shopify CLI y probar OAuth en producción.
- [ ] Definir responsable, correo de soporte, privacidad, regiones de alojamiento, datos de sesión retenidos y plazos de eliminación; publicar política coherente con la implementación.
- [ ] Completar la ficha de App Store: nombre, descripción, idiomas, capturas, precio y pasos reproducibles de revisión. Todas las promesas deben corresponder a funciones verificables.
- [ ] Decidir si el producto será gratuito o de pago. Si se cobra, configurar Shopify App Pricing, definir límites de plan y probar aprobación, rechazo, cambio de plan y reinstalación.
- [ ] Completar el checklist canónico de revisión de Shopify desde el código y Partner Dashboard; enviar solo cuando la app y la ficha estén listas para producción.
- [ ] Pilotar con comerciantes y revisar incidencias antes de ampliar la distribución.

## Decisiones pendientes del propietario

1. ¿La primera salida será un piloto gratuito limitado o venta pública en Shopify App Store?
2. ¿El lanzamiento público será gratuito al principio o cobrará desde el inicio? Si será de pago, falta definir precio y límites del plan.
3. ¿Se autoriza una importación de prueba controlada en la tienda de desarrollo, con eliminación posterior del producto de prueba?

No se debe afirmar “listo para vender” hasta cerrar la ruta elegida y todos sus criterios bloqueantes. La autorización de publicar o cobrar es una decisión separada y explícita.

## Fuentes oficiales

- [Distribución de apps Shopify](https://shopify.dev/docs/apps/launch/distribution)
- [Requisitos de Shopify App Store](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Proceso de revisión de App Store](https://shopify.dev/docs/apps/launch/app-store-review/review-process)
- [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing)
- [Enviar la app a revisión](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
