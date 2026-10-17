# Guía de cierre técnico e integración con Shopify

**Estado:** plan de trabajo activo; no equivale a una decisión de distribución ni a autorización para publicar.
**Revisado:** 2026-10-16.
**Referencia normativa del producto:** [`docs/REQUIREMENTS_10.md`](../REQUIREMENTS_10.md).

## Objetivo y criterio de transición

Cerrar el código funcional actual y preparar una instalación fiable para comerciantes, empezando por un piloto privado. La app analiza archivos de productos en el navegador; no importa productos ni promete que Shopify acepte un archivo.

Se considera **cerrado el código funcional**: la suite E2E autenticada pasó (1/1) el 2026-10-16, incluidas las pruebas de flujo principal y del diagnóstico del perfil `.67`; el resultado está registrado en [`docs/PROGRESS.md`](../PROGRESS.md). En ese punto:

- No se añaden nuevas funciones, reglas CSV ni cambios de alcance.
- Se permiten cambios imprescindibles para configuración, persistencia, despliegue e integración con Shopify.
- Si la integración descubre un defecto reproducible, se corrige, se añade cobertura apropiada y se reabre el cierre solo para ese defecto.
- No se da por cerrada una prueba por el mero hecho de que el código exista o el test esté escrito.

La salida de esta etapa habilita el trabajo de integración; **no significa que la app esté lista para venderse ni que Shopify haya aprobado su distribución**.

## Evaluación del MVP funcional

El alcance actual se considera suficiente para un **MVP de piloto**: carga y analiza CSV localmente, diagnostica incidencias, permite revisar y aplicar reparaciones seleccionadas, valida de nuevo y exporta un resultado/informe. No se propone ampliar funciones antes de probar ese valor con comerciantes. La condición de salida es que pase la E2E autenticada acordada.

Este juicio no significa que hoy se pueda ofrecer a comerciantes: faltan los gates de instalación, hosting, persistencia, privacidad y soporte descritos abajo. Una venta pública requiere además resolver App Store, elegibilidad y billing.

## Estado observado del repositorio

- `csv-import-doctor/shopify.app.toml` aún usa `https://example.com` como host de `application_url` y `redirect_urls`. La ruta OAuth se alineó con `authPathPrefix: "/auth"` en `app/shopify.server.ts` y la guía oficial: `/auth/callback`; sustituir el host al preparar un entorno real. El TOML no contiene una clave `distribution`; además, `app/shopify.server.ts` fija `AppDistribution.AppStore`. Verificar en Dev Dashboard el canal de la app de producción y confirmar que coincide con ese modo antes de instalarla.
- `csv-import-doctor/prisma/schema.prisma` usa SQLite (`file:dev.sqlite`). En producción se requiere un volumen realmente persistente con una estrategia de copia de seguridad y una sola instancia compatible, o una base de datos administrada adecuada al hosting.
- Los scopes de Admin API están vacíos, coherentes con el análisis local actual. No añadir scopes para aparentar una integración.
- El perfil `.67` y sus pruebas unitarias se han implementado. Core (108 pruebas), lint, typecheck y build pasaron en la ejecución local anterior. La suite E2E autenticada completa pasó el 2026-10-16 (1/1); incluye el flujo principal, el aviso `.67` con 10.001 variantes candidatas, progreso en archivo de 20 MB y diagnóstico del límite de 100.001 filas. Resultado detallado en `docs/PROGRESS.md`.
- La política de privacidad es un borrador: faltan identidad y contacto del responsable, proveedor y regiones de alojamiento, retención, borrado, subprocesadores y contacto de soporte.
- La ruta scaffold `/app/additional` se eliminó en `8c74c8b`; esa limpieza no sustituye las comprobaciones de despliegue.

Revalidar estos puntos antes de ejecutar el plan, porque la configuración del entorno puede cambiar.

## Ruta de trabajo: piloto privado

### 1. Decidir el canal de distribución

**Bloquea:** elegir el flujo de producción, el tipo de instalación y la posibilidad de cobrar mediante Shopify.

Shopify advierte que el método de distribución no se puede cambiar después de seleccionarlo. La distribución personalizada permite limitar la app a una tienda o a las tiendas elegibles de una organización, pero no incluye Shopify App Billing. La distribución pública requiere App Store y aprobación.

**Cómo encararlo:**

1. Confirmar en Shopify Dev Dashboard cuál es el método de distribución asociado a la app prevista para producción. Shopify recomienda separar el registro de producción del de desarrollo; no reutilizar el client ID de desarrollo por inercia.
2. Decidir si el primer destino será una tienda piloto acordada mediante distribución personalizada o una salida pública a múltiples tiendas. Si se mantiene `AppDistribution.AppStore` en `shopify.server.ts`, confirmar que la app registrada usa distribución pública; si se elige distribución personalizada, ajustar el modo del servidor siguiendo la guía oficial y probarlo antes del despliegue.
3. Registrar la decisión, el alcance de tiendas y si el piloto será gratuito.
4. Si el destino es público, tratar la elegibilidad de App Store como un gate independiente antes de invertir en listing y billing.
5. No cambiar distribución ni crear una configuración de producción hasta haber confirmado la decisión.

**Criterio de salida:** decisión documentada y coherente con la app seleccionada en Dev Dashboard.

Fuente: [Shopify: distribución de apps](https://shopify.dev/docs/apps/launch/distribution).

### 2. Preparar hosting, dominio y persistencia

**Bloquea:** instalar o abrir la app desde Shopify Admin en un entorno estable.

**Cómo encararlo:**

1. Elegir hosting operable con HTTPS y dominio estable; comprobar que la plataforma soporta el modo de ejecución de React Router y el almacenamiento elegido.
2. Registrar `application_url` con el origen exacto del despliegue y `redirect_urls` con `https://<dominio>/auth/callback`, consistente con `authPathPrefix: "/auth"`. No conservar `example.com` en la configuración de producción.
3. Mantener configuración separada para desarrollo y producción, sin sobrescribir las URLs locales/túnel.
4. Inventariar las variables y secretos que necesita la app. Cargarlos en el gestor de secretos del hosting; no subir valores reales al repositorio ni a logs. Comprobar que el contexto de build también excluye `.env*`, `.shopify`, la SQLite local y los perfiles de autenticación del navegador.
5. Resolver SQLite antes del piloto: demostrar persistencia a través de reinicio y redeploy en un único volumen durable, con copia de seguridad y restauración probadas; o migrar a una base de datos administrada y validar las migraciones Prisma. La imagen actual usa el archivo `prisma/dev.sqlite`; verificar el montaje durable en esa ruta si se conserva SQLite.
6. Documentar build, migraciones, despliegue, health check, logs, rollback y recuperación de la base de datos.
7. Construir la imagen desde `csv-import-doctor/` y revisar el contenido/configuración para confirmar que los secretos, la DB local y la sesión de navegador no se copiaron.
8. Desplegar primero un entorno de staging. Validar TLS, URL de aplicación, callback, acceso desde Admin, reinicio y rollback antes de usar producción.

**Criterio de salida:** staging accesible con HTTPS, URL/callback coherentes, secretos fuera del código, base de datos durable y rollback comprobable.

Fuentes: [Shopify: desplegar a un proveedor de hosting](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service) y [Shopify: despliegue](https://shopify.dev/docs/apps/launch/deployment).

### Variables de ejecución según la configuración actual

La guía Shopify para este template identifica `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY` y `SHOPIFY_API_SECRET` como necesarias; `SCOPES` y `PORT` son opcionales. El código de este repositorio añade `SHOP_CUSTOM_DOMAIN` como opción. Antes de copiar valores a un hosting, revisar la tabla contra el canal y la app de producción elegidos.

| Variable | Uso actual | Tratamiento |
|---|---|---|
| `SHOPIFY_APP_URL` | Origen público usado por la librería Shopify; debe coincidir con `application_url` | Configuración de entorno, URL HTTPS estable |
| `SHOPIFY_API_KEY` | Client ID de la app | Configuración de entorno |
| `SHOPIFY_API_SECRET` | Secreto usado para autenticación/webhooks | Secreto del hosting; nunca en Git, imagen ni logs |
| `SCOPES` | Se divide por comas; actualmente no se solicitan permisos | Vacía para el comportamiento actual; no ampliarla sin una función que lo requiera |
| `PORT` | Puerto HTTP; Docker declara `3000` y Vite usa `3000` por defecto | Configurar `3000` salvo que el hosting inyecte el puerto y se ajuste `EXPOSE` |
| `SHOP_CUSTOM_DOMAIN` | Lista opcional de dominios de tienda admitidos por la librería | Omitir salvo que se haya configurado un dominio personalizado |
| `DATABASE_URL` | No se consulta: `schema.prisma` fija `file:dev.sqlite` | No confiar en esta variable hasta cambiar el esquema/configuración Prisma y validar desarrollo, migraciones y producción |

Con la configuración actual, `file:dev.sqlite` está en el directorio `prisma/` de la app; en la imagen, la ruta corresponde a `/app/prisma/dev.sqlite`. Si se conserva SQLite, el hosting debe montar ahí un volumen durable con permisos de escritura para el proceso, hacer backup y restaurar, y ejecutar una sola réplica que use ese volumen. Shopify recomienda configurar la URL de base de datos mediante variable de entorno para permitir almacenamiento distinto en desarrollo y producción; convertir el esquema actual a esa forma es un trabajo pendiente antes de usar `DATABASE_URL` o cambiar de proveedor.

### 3. Cerrar las pruebas E2E y congelar funciones

**Estado:** completado el 2026-10-16. La suite E2E autenticada pasó 1/1; véase `docs/PROGRESS.md`. El código funcional queda congelado según el criterio acordado.

**Cómo encararlo:**

1. Ejecutar la suite E2E autenticada con una sesión Shopify vigente y el servidor/túnel del entorno esperado.
2. Confirmar el flujo principal: carga local, análisis, filtros, reparación seleccionada, revalidación, descarga y ausencia del contenido CSV en solicitudes de red.
3. Ejecutar la E2E de `.67` con más de 10.000 filas candidatas a variantes y comprobar mensaje, explicación condicional y modo crear.
4. Si un diagnóstico queda fuera del límite visual de incidencias, comprobar la experiencia real de búsqueda/filtro; no maquillar la prueba con un fixture que no refleje el formato de Shopify.
5. Ejecutar de nuevo las verificaciones de core, lint, tipos y builds después de cualquier corrección necesaria.
6. Registrar comandos, resultados, duración, entorno y artefactos del trace en `docs/PROGRESS.md`; dejar los cambios revisados y commiteados en `develop`.
7. Una vez verde, declarar el cierre funcional. Desde entonces, limitar los cambios a integración/despliegue y a defectos demostrados.

**Criterio de salida:** cumplido para la suite configurada en este repositorio: todos los E2E acordados pasan en el contexto autenticado; no quedan fallos ignorados ni skips accidentales. No se debe ampliar funcionalidad antes del piloto. Solo cambios de integración y correcciones de defectos reproducibles.

Nota de diagnóstico (2026-10-16): el primer intento de esta sesión registró HTTP `530` al solicitar el iframe desde Cloudflare. Shopify CLI había terminado porque `prisma generate` falló con `EPERM` al reemplazar `query_engine-windows.dll.node`; había otra instancia de `shopify app dev` para este mismo repositorio viva y usando Prisma. Tras detener esa instancia y reiniciar CLI, el iframe cargó. La prueba aislada seleccionó el archivo antes de que el manejador React estuviera listo: el `input[type=file]` conservó su valor y el Worker no arrancó. Por ello, el chequeo `.67` se integró al E2E autenticado principal, después de su interacción normal y con una aserción de que el manejador vacía el input. La última suite completa pasó 1/1; midió 2.406 ms para análisis local de 19.999.975 bytes y 1.001 ms para diagnóstico de 100.001 filas. Estos tiempos corresponden al equipo de desarrollo y no miden memoria máxima. El `410` de un intento anterior no se reprodujo en los traces revisados.

### 4. Probar el ciclo de instalación y los webhooks en staging

**Bloquea:** afirmar que la app está correctamente integrada con Shopify.

**Cómo encararlo:**

1. Instalar la app desde cero en la tienda acordada, completar autenticación embebida y comprobar que el navegador abre la app desde Shopify Admin.
2. Revisar el callback OAuth, emisión/renovación de sesión, reapertura en otra sesión del Admin y comportamiento tras reiniciar la app.
3. Desinstalar y reinstalar. Confirmar que las sesiones antiguas se revocan y que la tienda vuelve a entrar limpiamente.
4. Verificar en staging entrega y respuesta de `app/uninstalled`, `app/scopes_update` y los tres topics de cumplimiento declarados. Registrar códigos HTTP, ids/timestamps y resultado sin guardar payloads de comerciante innecesarios.
5. Para `shop/redact`, comprobar borrado limitado a las sesiones de esa tienda; para `customers/data_request` y `customers/redact`, confirmar que la respuesta coincide con los datos que realmente guarda la app.
6. Probar firma HMAC inválida y validar que se rechaza con `401`; confirmar que eventos válidos reciben respuesta exitosa y no duplican efectos.
7. Revisar logs para que no incluyan tokens, cuerpos sensibles ni contenido CSV.

**Criterio de salida:** evidencia reproducible de instalación, autenticación, reapertura, desinstalación/reinstalación y webhooks en el despliegue HTTPS.

Fuentes: [Autenticación y autorización](https://shopify.dev/docs/apps/build/authentication-authorization) y [privacidad y webhooks de cumplimiento](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance).

### 5. Completar privacidad y soporte del piloto

**Bloquea:** invitar comerciantes externos de forma responsable.

**Cómo encararlo:**

1. Completar [`docs/PRIVACY_POLICY_DRAFT.md`](../PRIVACY_POLICY_DRAFT.md) con nombre legal/domicilio, correo de privacidad y soporte, hosting, regiones, subprocesadores, transferencias, logs, datos de sesión y plazos de retención/borrado.
2. Confirmar esos datos con el proveedor de hosting y compararlos con el comportamiento real del esquema Prisma y los webhooks.
3. Publicar la política en un dominio HTTPS estable y enlazarla desde el lugar requerido de la app y la ficha/instalación.
4. Definir un canal de soporte del piloto, responsables y tiempo objetivo de respuesta.
5. No describir el CSV como almacenado por el servidor: el procesamiento de CSV sigue siendo local; explicar por separado los datos de sesión de Shopify.

**Criterio de salida:** política pública completa y coherente con proveedores y código, más contacto de soporte operativo.

## Calidad técnica complementaria

Estos puntos forman parte del cierre de calidad del producto, aunque no requieren crear nuevas funciones antes de desplegar staging:

- Medir duración y memoria máxima con un dispositivo representativo menos potente, CSV de filas numerosas y archivo cercano al límite local. Registrar navegador, hardware, tamaño, filas y repeticiones en [`docs/PERFORMANCE_BASELINE.md`](../PERFORMANCE_BASELINE.md).
- Completar la revisión manual de teclado, lector de pantalla, contraste real sobre Polaris y anchuras móviles en [`docs/ACCESSIBILITY_REVIEW.md`](../ACCESSIBILITY_REVIEW.md).
- Revisar el CI para asegurar que core, lint, tipos y builds cubren cambios al perfil `.67`; definir cómo se ejecuta el E2E autenticado sin guardar credenciales Shopify en logs o artefactos públicos.
- No autorizar una importación real de producto por inferencia. Si se necesita para el piloto, tratarla como un paso separado con tienda y producto de prueba acordados, resultado registrado y limpieza posterior.

## Ruta adicional si el objetivo es vender públicamente en App Store

Estos requisitos no bloquean por sí solos un staging o un piloto privado, pero sí forman parte de una salida pública:

1. **Elegibilidad de API:** confirmar con Shopify que el análisis local sin scopes de Admin API cumple los requisitos de distribución pública. No pedir scopes de productos sin una necesidad funcional documentada.
2. **Privacidad y cumplimiento:** validar los topics obligatorios, HMAC, respuestas y borrado con el despliegue real. El código/configuración existentes son evidencia parcial, no sustituyen una entrega real.
3. **Listing y soporte:** preparar textos, idioma, icono/capturas, pasos de revisión, política pública, contacto de soporte y respuesta a comerciantes.
4. **Cobro:** decidir gratuito o de pago. Para una app pública de pago, elegir y probar el flujo Shopify compatible con el modelo de precios. La distribución personalizada no sirve para Shopify App Billing.
5. **Revisión:** completar el checklist de requisitos, ejecutar pruebas en tienda limpia y enviar a revisión solo con hosting y listing productivos.

Fuentes: [Requisitos de Shopify App Store](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements), [enviar a revisión](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review), [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing).

## Orden recomendado

1. Confirmar la app de producción y su canal de distribución en Dev Dashboard antes de fijar su configuración.
2. Preparar hosting, dominio, URLs, secretos y base de datos durable en staging.
3. Probar instalación, autenticación, sesiones y webhooks en staging.
4. Completar privacidad y soporte antes de invitar al piloto.
5. Hacer revisión de rendimiento/accesibilidad y recoger feedback del piloto.
6. Cerrar elegibilidad, listing, pricing y review para la publicación en App Store.

## Registro de decisiones y evidencia

| Fecha | Decisión o verificación | Evidencia/enlace | Responsable | Estado |
|---|---|---|---|---|
| 2026-10-16 | Cierre funcional tras suite E2E verde; luego solo integración y correcciones demostradas | Suite autenticada 1/1; detalles y tiempos en `docs/PROGRESS.md` | Santiago / agente | Completado |
| 2026-10-16 | Distribución inicial (piloto personalizado o App Store pública) | Dev Dashboard + decisión documentada aquí | Santiago | Pendiente |
| 2026-10-16 | Hosting, dominio y estrategia durable de DB | Configuración de staging, prueba de reinicio/rollback | Santiago / agente | Pendiente |
| 2026-10-16 | Política y contacto de soporte publicados | URL pública + revisión contra proveedor/código | Santiago | Pendiente |

