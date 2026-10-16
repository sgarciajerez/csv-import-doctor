# Progress

## Phase 0 - Bootstrap

- [x] Inspected local tools and project directory.
- [x] Confirmed Node.js v24.21.0, npm 12.2.0, and Git 2.55.0 are available.
- [x] Verified current Shopify guidance and initialized the official React Router app scaffold with Shopify CLI 4.9.4.
- [x] Created and linked the Shopify app `CSV Import Doctor` in the `Digital Apps` organization.
- [x] Created the `CSV Import Doctor Dev` development store and linked it to the app.
- [x] Added the root workspace, `.gitignore`, `.env.example`, README, and project docs.
- [x] Initialized Git with `develop` and `master`; work remains on `develop`. Nothing has been pushed.
- [x] Started the Shopify app locally. The local HTTP route returned 200 and the CLI reported the development preview URL.
- [x] Remove the scaffold's uncommitted nested Git metadata so its files are ordinary worktree files that can be staged in the parent repository on `develop`; preserve the metadata outside the project as a backup.

## Phase 1 - Local CSV core

- [x] Added a browser-compatible Papa Parse wrapper with BOM handling, delimiter selection, row and character limits, duplicate-header and uneven-row diagnostics.
- [x] Added an initial versioned product CSV profile for create/update requirements and variant identity warnings.
- [x] Added valid, invalid, and edge-case CSV fixtures.
- [x] Added parser and Shopify profile tests.

## Phase 2 - Repair and export

- [x] Added reviewable proposals to trim cell whitespace.
- [x] Added explicit selection before applying a repair; repairs copy the input, reject stale targets, and require a revalidation callback.
- [x] Added CSV serialization preserving cell values by default, including quoted delimiters, quotes, line breaks, and Unicode.
- [x] Added optional spreadsheet formula protection. Each changed cell is returned to the caller for a visible diff; Shopify-compatible export leaves values unchanged by default.
- [x] Added a JSON analysis report with issue counts, applied repairs, and unresolved issues.
- [x] Added the first embedded review UI with before/after repair choices.
- [x] Documented the Shopify import tradeoff and limitations of spreadsheet formula mitigation in `docs/REPAIR_EXPORT.md`.

## Phase 3 - Browser workflow

- [x] Added a local file picker, UTF-8 decoding with fatal error handling, create/update mode, issue list, and a ten-row preview.
- [x] Added selected repairs, revalidation, CSV download, and JSON report download.
- [x] Moved UTF-8 decoding, parsing, validation, and repair proposal generation into a cancellable Web Worker. The 20 MB local analysis cap and 100,000-row parser limit bound browser work; product CSVs above Shopify's documented 15 MB import maximum receive an error diagnostic.
- [x] Added severity/text filters for issues and search for repairs, with a 100-item render cap and a prompt to narrow long lists.
- [x] Added an authenticated Playwright E2E workflow over a synthetic fixture. It covers analysis, filtering, selected repair, CSV/report download, and checks request bodies for a unique fixture marker.
- [x] No file upload action or CSV content is sent to the app loader/action.
- [x] Ran the authenticated E2E flow in the embedded Shopify admin: analysis, filtering, selected repair, CSV/report downloads, and the request-body check all pass against the synthetic fixture.

## Phase 4 - Shopify integration

- [x] Integrated the browser workflow into the official React Router app route behind the scaffold's Shopify admin authentication and App Bridge provider.
- [x] Linked the app to the named development store and started `shopify app dev`; CLI reported the admin preview URL and the tunnel/server started.
- [x] Verified upload, repair, and downloads inside the embedded Shopify admin through Playwright using a dedicated authenticated Chrome profile.
- [x] Resolved the nested `.git`; the scaffold files now appear as untracked files in the parent repository worktree on `develop`, ready to be staged with the project changes.
- [x] Synced the local zero-scope configuration to the development app through Shopify CLI; the app was installed on the development store.

## Phase 5 - Requisitos 10/10 y precisiÃ³n del CSV Shopify

- [x] Detallados los requisitos R10-01 a R10-10, con prioridades, criterios de aceptaciÃ³n y fuentes, en `docs/REQUIREMENTS_10.md`.
- [x] AÃ±adida una instrucciÃ³n normativa en `CSV_IMPORT_DOCTOR_CODEX.md` para que Codex y agentes futuros lean los requisitos, prioricen P0 y registren evidencia.
- [x] Actualizado el perfil versionado del CSV de productos: creaciÃ³n simple sin URL handle, filas de continuaciÃ³n, requisitos de actualizaciÃ³n, riesgo de variantes, imÃ¡genes y delimitador Shopify.
- [x] Detectado el formato de inventario cuando contiene columnas identificadoras de inventario y cantidades conocidas; se omiten las validaciones de productos.
- [x] AÃ±adida la exportaciÃ³n del flujo de Shopify con comas y finales LF aunque el CSV analizado use otro delimitador; el serializador genÃ©rico conserva por defecto el delimitador original.
- [x] AÃ±adidas pruebas para estos casos y para conservar valores que contienen el delimitador de origen.
- [x] Verificado: pruebas del core (41), lint, typecheck y build del core pasan.
- [x] Verificado: lint, typecheck y build de la app pasan.
- [x] Verificado en E2E autenticado: la incidencia de tÃ­tulo muestra la explicaciÃ³n y enlaza a la fuente oficial; anÃ¡lisis, filtro, reparaciÃ³n, descargas, no transmisiÃ³n y aviso condicional de sobrescritura en modo update pasan.
- [x] Contrapuesta la matriz actual con la cabecera de plantilla antigua publicada por Shopify; implementada una allowlist exacta de aliases documentados y cubiertos con pruebas, preservando el texto original. Los nombres histÃ³ricos no incluidos en ese ejemplo siguen sin adivinarse.
- [x] AÃ±adidos fixtures sintÃ©ticos de inventario de estados, exportaciÃ³n Available e imÃ¡genes; el formato identificado no genera errores del perfil de productos.
- [x] Los diagnÃ³sticos del perfil incluyen enlace a la fuente Shopify y versiÃ³n del perfil; la interfaz muestra explicaciÃ³n y enlace.
- [x] Ampliado el E2E para comprobar que una regla visible enlaza directamente a la documentaciÃ³n oficial del formato de productos.
- [x] AÃ±adidas reglas documentadas para `Status` y la colisiÃ³n entre las cabeceras `Barcode` y `Barcodes`.
- [x] Detectada la exportaciÃ³n â€œAvailableâ€ con varias ubicaciones dinÃ¡micas; el candidato de una ubicaciÃ³n queda como ambiguo y mantiene las validaciones de producto.
- [x] Cubiertas las columnas de variante documentadas y los dos encabezados de imagen usados en la guÃ­a Shopify.
- [x] AÃ±adidos avisos condicionales sobre sobrescritura de celdas en blanco, reemplazo de IDs de variante y limpieza de dimensiones empaquetadas.
- [x] Validado el grupo de cuatro dimensiones empaquetadas, unidades `cm`/`in`, valores positivos y excepciÃ³n para `Requires shipping=false`.
- [x] Reconoce encabezados antiguos del formato Shopify (`Handle`, `Body (HTML)`, `Option1 Name`, `Variant SKU`, entre otros) en create/update; preserva encabezados y datos originales.
- [x] Incluye deshacer el ultimo lote de reparaciones; vuelve a validar y omite celdas obsoletas sin sobrescribirlas.
- [x] Cubierta con fixtures sinteticos la heuristica de productos heredados que combinan cabeceras antiguas, filas de continuacion, Markets y metafields de producto; las columnas se preservan y no se clasifican como inventario.
- [x] Reconocidos `Included / [Market]`, `Price / [Market]` y `Compare At Price / [Market]`; se advierte que los metafields de variante no son compatibles con el CSV de productos.
- [x] Ampliar diagnósticos trazables, mantener catálogo y pruebas de contrato, y validar la app embebida con fixtures sintéticos en la tienda de desarrollo.
- [ ] Contrastar importaciones reales de fixtures sintéticos en la tienda de desarrollo para documentar los resultados que dependen del importador Shopify; la app sigue siendo de diagnóstico y no inicia importaciones.

- [x] Definidos como obligatorios la categoria, la explicacion y el nivel de seguridad; la interfaz distingue parser, perfil Shopify y recomendaciones.
- [x] Creado `docs/DIAGNOSTIC_RULES.md` como catalogo de reglas; una prueba comprueba que cada regla activa del perfil tenga entrada.
- [x] Probados IDs estables y unicos para cabeceras duplicadas y filas logicas despues de celdas multilineas.

- [x] Distinguida cabecera no reconocida, probable errata, diferencia de mayusculas y espacios sobrantes; cada aviso preserva la columna y su contenido.

- [x] E2E comprueba el contenido real del CSV descargado, lo analiza de nuevo y valida campos del informe JSON sin datos de celdas no modificadas.
- [x] E2E verifica la cancelaciÃ³n del Worker (incluida su terminaciÃ³n) y carga un CSV con comillas sin cerrar para comprobar que se bloquean las descargas CSV e informe JSON cuando el anÃ¡lisis sintÃ¡ctico estÃ¡ incompleto.
- [x] Perfil `.10`: un fixture mezcla tres pares de encabezados actuales/antiguos. El analizador muestra advertencias trazables, preserva ambas columnas y no afirma que Shopify rechace la combinaciÃ³n.
- [x] Contrastada la matriz de encabezados actual con la guÃ­a Shopify vigente; un fixture contractual cubre las columnas fijas y ejemplos dinÃ¡micos de Markets, Google Shopping y los tres formatos de cabecera de metafields de producto.
- [x] Perfil `.11`: validaciones con fixtures para cantidades de inventario numÃ©ricas, polÃ­tica `deny`/`continue` y SKU cuando se usa un fulfillment personalizado. La cantidad vacÃ­a con seguimiento se seÃ±ala como advertencia porque las fuentes oficiales documentan comportamientos distintos segÃºn la secciÃ³n.
- [x] Perfil `.12`: detecta combinaciones exactas de opciones duplicadas dentro del mismo handle y no las confunde con la misma combinaciÃ³n perteneciente a otro producto; datos intactos.
- [x] Perfil `.13`: advierte sobre `Price` vacÃ­o en filas de producto/variante ante la contradicciÃ³n de la documentaciÃ³n; ignora filas de continuaciÃ³n que solo contienen imÃ¡genes y no inventa un precio.
- [x] Perfil `.14`: advierte sobre formato sospechoso en el nombre de un servicio de fulfillment personalizado, preserva el valor y remite al comerciante a confirmar el handle configurado en la tienda.
- [x] Perfil `.15`: informa sin bloquear cuando `Inventory tracker` no coincide con los ejemplos documentados; Shopify dice que los valores vÃ¡lidos "incluyen" la lista, por lo que no se asume que sea exhaustiva ni se modifica el valor.
- [x] Perfil `.16`: advierte sobre valores booleanos distintos de `true`/`false` en campos publicados, gift card, impuestos y envÃ­o; cubre variantes y aliases antiguos sin cambiar los valores.
- [x] Perfil `.17`: advierte sobre gramajes con unidades/decimales y unidades de visualizaciÃ³n fuera de la lista Shopify; cubre el alias antiguo y conserva los datos sin conversiones.
- [x] El E2E autenticado carga el fixture de dependencias de inventario y comprueba que los cuatro diagnÃ³sticos aparezcan en la interfaz del admin.
- [x] El typecheck de la app excluye `test-results`, para que traces y artefactos temporales de Playwright no se interpreten como fuentes TypeScript.
- [x] R10-07 (parcial): el flujo principal anuncia inicio, finalización y cancelación del análisis con una región `status`, evita anuncios repetitivos al filtrar, y la vista previa tiene caption y encabezados de columna semánticos.
- [ ] R10-07 pendiente: revisión manual completa con teclado y lector de pantalla, contraste y pantallas pequeñas; las mejoras de marcado no sustituyen esa verificación.
- [x] R10-04: si la detección de delimitador es ambigua, la app bloquea reparaciones y descargas, pide confirmación, reanaliza el mismo archivo en el Worker y conserva la matriz al exportar en el formato de comas de Shopify. Cubierto por fixture sintético, prueba de parser y E2E autenticado.
- [x] Perfil `.20`: distingue el máximo Shopify de 15 MB del límite local de análisis de 20 MB; diagnostica como error los CSV de productos sobredimensionados, sin aplicar esta regla a inventarios detectados, y enlaza la fuente oficial.
- [x] R10-04: E2E autenticado envía bytes con secuencia UTF-8 inválida y confirma el error explícito y la ausencia de resultados parciales.
- [x] R10-06 (parcial): registrado un baseline reproducible en `docs/PERFORMANCE_BASELINE.md`: 19.999.975 bytes (sobre el límite Shopify de 15 MB, bajo el límite local de 20 MB) se analizan y previsualizan en 2.156 ms; 100.001 filas alcanzan y bloquean el límite en 489 ms. La vista previa limita celdas extensas a 500 unidades de texto más elipsis; la exportación conserva el contenido completo.
- [ ] R10-06 pendiente: repetir en el navegador/dispositivo menos potente que se vaya a soportar y medir memoria máxima para un CSV representativo con muchas filas; el baseline actual es una estación de desarrollo de 32 GiB y no mide memoria.

## Decisions and constraints

- CSV parsing, validation, repair, and export run in the browser core. Do not upload, persist, or log CSV contents.
- The core package must not import Node-only APIs.
- Shopify validation rules are advisory; verify actual import behavior in a development store.
- The MVP requests no Admin API scopes: CSV analysis does not read or write Shopify data. The local app config has an empty `scopes` value, and Shopify CLI synced it to the development app.
- Do not implement billing, product writes, or publication in the MVP.
- Browser file decoding rejects invalid UTF-8; the browser workflow is implemented in the embedded app.
- The Shopify scaffold lives in `csv-import-doctor/` and its UI imports the browser core directly. Its initial empty nested Git metadata is preserved at `D:\Proyectos\Shopify\CSV_Import_Doctor-scaffold-git-backup-20261016`; the app files are now ordinary worktree files in the parent repository on `develop`.

## Verified commands

- `npm run lint` - pass.
- `npm run typecheck` - pass.
- `npm test` - pass (66 tests, including create/update required-value cases and diagnostic-contract coverage across all CSV fixtures).
- `npm run build` - pass.
- App `npm run typecheck` - pass.
- App `npm run build` - pass.
- App `npm run test:unit` - pass (5 compliance webhook tests, including a valid HMAC-authenticated sample through Shopify's React Router `authenticate.webhook` and rejection when the signed raw body is altered).
- App targeted ESLint for the route, Worker, and E2E spec - pass.
- `npm run test:e2e -- --list` - pass (discovers one authenticated workflow).
- `npm run test:e2e` - pass (1 authenticated embedded-admin flow; checks Shopify source, update overwrite notice and required identifiers, category badge, repair/undo/reapply, CSV bytes plus parse round-trip, report contents, ambiguous delimiter confirmation and reanalysis with repair/download blocking and normalized export, duplicate-variant diagnosis, inventory/fulfillment diagnostics, 15 MB Shopify import-size diagnosis, blank price, boolean, weight, image metadata, SEO limits, accessible analysis states and table headers, file-input reset, cancellation/Worker termination, malformed CSV and invalid UTF-8 rejection, near-20 MB local preview/export integrity, local-size and 100,001-row blocking, and network no-transmission).
- La primera repetición de E2E se omitió por variables ausentes; se reutilizó después `playwright/.auth/shopify.json` (ignorado por Git) y la URL de la tienda. E2E autenticado pasó (1 flujo), incluyendo estados accesibles, caption y encabezados de la tabla.
- Shopify Polaris App Home validator (component snippet) - pass. The validator could not typecheck the full React Router route in its isolated environment because it lacks the app's Shopify server modules; the app's own typecheck/build cover that route.
- [x] Perfil `.21`: añade una advertencia trazable para handles Shopify con espacios en blanco según la guía oficial; conserva el valor original y no infiere restricciones adicionales. Cubierto por una prueba de contrato unitaria.

- E2E autenticado tras el perfil .21 - pass (1 flujo); análisis de 19.999.975 bytes con diagnóstico Shopify en 3.328 ms y diagnóstico del límite de 100.001 filas en 1.028 ms en la estación de desarrollo. La ejecución sin sesión se omite por configuración; con el estado de autenticación local pasó.

- [x] Perfil .22: advierte cuando el campo Tags contiene más de 250 etiquetas no vacías según el límite Shopify; cubre límite exacto y exceso, conserva el valor y registra la regla en el catálogo.
- E2E autenticado con comprobación visible del nuevo límite de 250 tags - pass (1 flujo).
- [x] Perfil .23: limita los Barcodes a 20 por producto/variante y cuenta separadores ; solo cuando no están escapados; prueba cubre 20/21, \\; y \\\\; y preservación de contenido.
- E2E autenticado con comprobación visible del aviso de 21 barcodes - pass (1 flujo).
- [x] Perfil .24: advierte si Collection excede 255 caracteres en una fila de producto, cuenta puntos de código Unicode y conserva el texto; prueba de límite 255/256 y aserción E2E visible.
- E2E autenticado tras .24 - pass (1 flujo), con diagnóstico visible para Collection de 256 caracteres.
- [x] Perfil .25: cuenta las filas de Product image URL/Image Src por handle, advierte una vez al llegar a la 251.ª entrada y no transforma URL; test cubre 250/251, distintos productos, ambos encabezados y filas de continuación.
- E2E autenticado tras .25 - pass (1 flujo), con aviso visible para 251 filas de imagen de un mismo producto.
- [x] Perfil .26: comprueba localmente las URL de imagen de producto y variante; advierte por valor no absoluto HTTPS o credenciales embebidas sin hacer solicitudes externas ni afirmar que se verificó disponibilidad pública. Unit test cubre HTTPS, HTTP, ruta relativa y credenciales.
- E2E autenticado tras .26 - pass (1 flujo); aviso visible y marcador de la URL privada ausente de todas las URL y cuerpos de solicitudes observados.
- [x] Perfil .27: advierte cuando el nombre en Product image URL/Image Src termina en _thumb, _small o _medium; ignora parámetros de consulta, conserva la URL y no aplica la regla a Variant image URL. Pruebas cubren extensiones, query y falso positivo de sufijo parecido.
- E2E autenticado tras .27 - pass (1 flujo), con mensaje de sufijo visible en la app.
- [x] Perfil .28: advierte cuando Price, Compare-at price o Cost per item no contiene un importe numérico sin símbolo de moneda; incluye alias antiguos verificados para los encabezados de precio, conserva el valor y no impone precisión ni rangos no documentados. Unit test cubre números válidos, símbolos, códigos monetarios, texto y preservación.
- E2E autenticado tras .28 - pass (1 flujo), con los tres avisos de formato monetario visibles en la app.
- [x] Perfil .29: bloquea con error trazable `Gift card=true` en modo crear porque Shopify no permite crear gift cards por CSV; no lo emite al actualizar y conserva el valor. Unit tests cubren ambos modos.
- E2E autenticado tras .29 - pass (1 flujo), con el error visible en modo crear.

- [ ] R10-05 (parcial): la interfaz enlaza una política de privacidad que describe el tratamiento real del CSV y los campos de sesión Prisma; el TOML configura los tres webhooks de cumplimiento y `shop/redact` elimina sesiones de forma idempotente. 5 pruebas de unidad cubren firma HMAC válida con secreto sintético, rechazo si cambia el cuerpo firmado, borrado repetido por tienda, solicitudes de clientes sin acceso a sesiones y topics inesperados; E2E autenticado confirma la divulgación, la página pública y el rechazo HTTP 401 de HMAC inválido. También verifica reset del input, terminación del Worker al cancelar y reanálisis con delimitador confirmado. El código libera la referencia `File` tras análisis normal, cancelación y errores; solo la retiene mientras puede volver a analizar un delimitador ambiguo. Pendiente validar una entrega firmada contra el entorno local integrado y completar responsable/contacto, hosting, regiones y retención antes de distribuir.
- [x] R10-09: alineada la versión de la Admin API de Shopify en el servidor y en los webhooks a `2026-10`, la versión estable más reciente a 2026-10-16; se eliminó el TOML `2027-01` (release candidate) y la discrepancia con el servidor `2026-07`.
- [x] R10-02: prueba de contrato recorre cada fixture CSV en modos crear y actualizar; comprueba IDs estables, metadatos requeridos, referencias de fila/columna, trazabilidad de diagnósticos Shopify y presencia de cada regla emitida en el catálogo. Core: 54 pruebas pasan.
- [ ] R10-08 (parcial): workflow de GitHub Actions configurado para ejecutar en push y pull request a `develop`/`master` lint, typecheck, unit tests y build del core y la app Shopify en Node 22.12. El conjunto de comandos pasa localmente (66 pruebas del core y 5 de webhooks); falta observar una ejecución real en GitHub. E2E autenticadas siguen siendo locales porque requieren sesión de una tienda de desarrollo; deben añadirse al CI si se configura un entorno seguro de autenticación.

- [x] Perfil `.30`: avisa cuando `Inventory quantity` tiene valor y la columna presente `Inventory tracker` esta vacia, segun la guia Shopify que define el tracker vacio como inventario no rastreado. Pide confirmar la intencion, preserva los datos y no se activa si la columna se omite o si aparecen alias en conflicto; los tests cubren cabeceras actuales y antiguas, create/update y casos sin aviso.
- [x] Perfil `.31`: muestra una nota informativa unica cuando el CSV de productos contiene una cantidad de inventario no vacia, ya que Shopify limita este campo a tiendas con una ubicacion; enlaza el formato separado para inventario multiubicacion sin inferir la configuracion de la tienda.

- [x] Perfil `.32`: recomienda evitar caracteres acentuados latinos en Tags como informacion, ya que Shopify los desaconseja sin documentar que fallen en importacion; detecta Unicode compuesto y descompuesto, conserva el texto y no propone borrado ni traduccion.
- [x] Perfil `.33`: contrasta IDs con forma de categoria `Product category` contra el release oficial Shopify Taxonomy `2026-08`; IDs no reconocidos generan solo informacion con enlace versionado. No valida breadcrumbs localizados ni cambia valores. Fixture cubre ID raiz, anidado, ID desconocido y breadcrumb.
- [x] Perfil `.34`: crea y actualiza con `Title` no vacío en filas de producto; al actualizar, requiere `URL handle` no vacío en filas con datos de producto o de continuación. Las continuaciones con handle repetido pueden omitir `Title`; los handles no se inventan. Fixture cubre create/update, filas de continuación y valores vacíos. Core: 66 pruebas pasan; lint, typecheck y builds del core y la app pasan.
- E2E del perfil `.34`: pass (1 flujo autenticado en Admin). La ruta genérica de vista previa dejaba el iframe vacío; al abrir la ruta instalada `/apps/csv-import-doctor-3/app`, el flujo completo pasó e incluyó el fixture de valores requeridos. Shopify CLI y Prisma arrancaron correctamente después de detener los procesos huérfanos de la ejecución anterior.
