# Shopify App Store: autorrevisión local

**Fecha:** 2026-10-16  
**Fuente:** checklist vivo obtenido con `npm exec -- shopify doc fetch --url https://shopify.dev/docs/apps/launch/app-store-review/app-store-ai-self-review-requirements --output <archivo-temporal>`. La copia descargada se guardó fuera del repositorio.  
**Alcance:** señales comprobables desde el código/configuración actual de `csv-import-doctor/`; no reemplaza la revisión de Shopify ni comprueba Partner Dashboard, infraestructura de producción o contenido de una ficha aún no creada.

## Resumen

- **Probablemente cumple:** 13 criterios locales.
- **Probablemente incumple:** 0 criterios locales.
- **Requiere revisión o decisión:** 8 criterios.
- **Grupos de categoría omitidos:** 10; ver la lista al final.

No es una aprobación para publicar. La app sigue enlazada a una tienda de desarrollo y `shopify.app.toml` conserva `https://example.com` como URL de ejemplo.

## Probablemente cumple

- **1.1.1 Autenticación en app embebida:** las rutas de la app requieren `authenticate.admin`; el scaffold usa `AppProvider` de `@shopify/shopify-app-react-router`, que incluye App Bridge y la carga del script CDN actual. Referencias: `app/routes/app.tsx`, `app/shopify.server.ts`, `node_modules/@shopify/shopify-app-react-router/src/react/components/AppProvider/AppProvider.tsx`.
- **1.1.2 y 1.1.3 Checkout y temas:** no se encontraron redirecciones de pago externas, creación de pedidos ni funciones para descargar/publicar temas.
- **1.1.13 Información de producto:** la app analiza el CSV elegido por el comerciante en el navegador; no extrae ni copia información de otras tiendas o sitios.
- **2.2.3 App Bridge actual:** se utiliza el scaffold oficial `@shopify/shopify-app-react-router`; el `AppProvider` carga `https://cdn.shopify.com/shopifycloud/app-bridge.js`.
- **2.2.4 GraphQL Admin API:** no hay llamadas REST ni operaciones Admin de lectura/escritura. El producto no depende actualmente de operaciones Admin.
- **2.3.1 y 2.3.2 Inicio e instalación:** configuración embebida y autenticación OAuth de Shopify; no hay un campo de instalación que pida manualmente el dominio de la tienda.
- **3.2 Scopes restringidos:** no se solicitan `read_all_orders`, `write_payment_mandate`, `write_checkout_extensions_apis`, `read_advanced_dom_pixel_events` ni `read_checkout_extensions_chat`.

## Requiere revisión

- **1.1.4 Afirmaciones de la ficha:** la guía de la app evita prometer que Shopify aceptará un archivo, pero todavía no existe una ficha que revisar. Al prepararla, verificar que todas las afirmaciones, idiomas, capturas y vídeo describan funciones presentes y comprobables.
- **1.2.1–1.2.3 Cobro:** no hay planes ni código de billing. Esto es compatible con una app realmente gratuita. Antes de cobrar, definir el modelo y configurar Shopify App Pricing (o una excepción permitida); Shopify prohíbe cobrar por fuera mientras la app se presenta como gratuita. Los cambios de plan y la recuperación tras reinstalación también tendrán que probarse si hay varios planes.
- **2.2.1 Uso de APIs de Shopify:** el código usa autenticación y webhooks, pero no consulta la Admin API para la función principal. Confirmar con Shopify que este uso de plataforma es suficiente para la app de análisis local; no añadir scopes de productos solo para intentar satisfacer el criterio.
- **2.3.3–2.3.4 Redirección y reinstalación:** se ha probado la app instalada en la tienda de desarrollo, pero falta repetir instalación limpia y reinstalación después de desinstalar, comprobando el retorno a la UI y la renovación de sesión.
- **3.1.1 TLS de producción:** no existe host de producción configurado ni certificado que validar. `application_url` y `redirect_urls` en `shopify.app.toml` siguen usando `example.com`.
- **Revisión fuera del checklist local:** antes de distribuir faltan contacto de emergencia/soporte y completar la política pública con responsable, alojamiento/regiones y retención real. Shopify también revisa estos datos y la ficha durante el proceso de publicación.

## Grupos omitidos

- **5.1 Online Store:** no hay theme app extension ni funcionalidad de tienda online.
- **5.2 Payment:** no es una pasarela ni una app de pagos.
- **5.3 Payment facilitator:** grupo opt-in; no solicitado.
- **5.4 Purchase option:** no hay selling plans ni suscripciones de productos.
- **5.5 Product sourcing:** grupo opt-in; no solicitado y la app no gestiona sourcing ni fulfillment.
- **5.6 Checkout customization:** no hay extensión de checkout.
- **5.7 Sales channel:** la app es una app embebida normal, no un canal de ventas.
- **5.8 Post purchase:** no hay extensión postcompra.
- **5.9 Mobile app builders:** grupo opt-in; no solicitado.
- **5.10 Donation:** grupo opt-in; no solicitado.

## Criterios individuales sin señal de aplicabilidad

En el grupo 1.1 no se encontraron funciones de marketplace, pasarela de pago, POS externo, cargos opcionales al comprador, selección de tarifas de envío, conexión con agencias, reembolsos ni préstamos (1.1.6–1.1.10 y 1.1.14–1.1.16). No se activan esos flujos en esta app.

## Referencias oficiales

- [Shopify App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing)
- [Privacy requirements](https://shopify.dev/docs/apps/launch/privacy-requirements)
- [Support your customers](https://shopify.dev/docs/apps/launch/distribution/support-your-customers)
- [App distribution](https://shopify.dev/docs/apps/launch/distribution)
