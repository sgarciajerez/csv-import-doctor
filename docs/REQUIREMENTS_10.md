# Requisitos para llevar CSV Import Doctor a nivel 10/10

**Estado:** plan activo.
**Responsable de referencia:** Codex y cualquier agente que trabaje en este repositorio.
**Objetivo:** que el producto sea correcto, seguro, comprensible y demostrablemente útil para comerciantes Shopify. La puntuación es una evaluación interna; no equivale a una garantía de importación ni a aprobación de Shopify.

Antes de cerrar cualquier requisito, registrar evidencia verificable en `docs/PROGRESS.md` y, cuando proceda, en `docs/CSV_PROFILE_SOURCES.md` o `docs/TEST_PLAN.md`. No marcarlo completo solo porque exista código.

## Alcance y principios

- La app analiza CSV de productos Shopify en el navegador. No importa ni modifica productos en la tienda.
- El archivo y sus valores permanecen en el dispositivo. No se añaden subidas, telemetría de contenido ni procesamiento remoto del CSV.
- Los resultados son diagnóstico preventivo. La app debe advertir que no puede garantizar el resultado de una importación, que también depende de la tienda y de su estado.
- Las reglas de compatibilidad deben basarse en fuentes oficiales fechadas y versionadas. Si Shopify no documenta una regla con suficiente precisión, la app la presenta como recomendación o no la implementa.
- Los datos desconocidos se preservan. No se borran ni transforman silenciosamente columnas o valores.
- Mantener el backend mínimo para autenticación, sesión y requisitos vigentes de Shopify. No introducir microservicios ni procesamiento de CSV en servidor sin una decisión documentada.

## Requisitos específicos

### R10-01 — Compatibilidad fiel con CSV de Shopify

**Prioridad:** P0.
**Problema que resuelve:** falsos errores o advertencias que podrían hacer que el comerciante cambie un archivo válido o confíe en uno incompatible.

- Mantener un perfil versionado de CSV de productos con URL de fuente oficial, fecha de revisión, cambios y ejemplos en `docs/CSV_PROFILE_SOURCES.md`.
- Diferenciar creación de productos y actualización/sobrescritura. Cubrir los encabezados requeridos, valores requeridos y excepciones de variantes por separado.
- Modelar las filas de continuación de producto, variantes e imágenes sin exigir que campos de producto se repitan cuando el formato permite omitirlos.
- Revisar las dependencias entre columnas de variantes. La ausencia de columnas de opción puede cambiar o eliminar variantes existentes; comunicarlo como riesgo visible y no como error de formato genérico.
- Mantener una matriz de encabezados actuales, encabezados antiguos compatibles y nombres que solo se parecen por capitalización. No autocorregir encabezados con ambigüedad.
- Validar los límites documentados de campos como `URL handle` sin inferir restricciones que Shopify no especifica con claridad; conservar el valor y advertir cuando la interpretación sea incierta.
- Comprobar límites explícitos de valores por producto o variante, como el máximo de 250 tags, 20 códigos de barras y 255 caracteres para `Collection`, distinguiendo el delimitador CSV de los separadores internos y sus escapes, sin modificar contenido.
- Contar filas de imagen por producto según el esquema de continuación de Shopify y advertir al superar 250; distinguir las URL de imagen de producto de las URL que solo asignan una imagen a una variante.
- Comprobar localmente que las URL de imagen sean absolutas HTTPS sin credenciales embebidas; no solicitar esas URL ni afirmar que se comprobó su disponibilidad pública.
- Advertir si `Price`, `Compare-at price` o `Cost per item` contiene texto o símbolos de moneda en vez de un importe numérico sin símbolo. Cubrir los alias antiguos verificados para los campos de precio, preservar los valores y no inferir precisión decimal, positividad ni límites que la documentación no especifica.
- Bloquear con un error trazable la creación de gift cards (`Gift card=true`) mediante CSV en modo crear; Shopify no permite crearlas por esta vía. No emitir esta regla en modo actualizar, donde los datos de gift card existentes sí pueden editarse.
- Advertir si el nombre de archivo en `Product image URL` o `Image Src` termina en los sufijos que Shopify documenta como no válidos (`_thumb`, `_small`, `_medium`), ignorando query strings y sin modificar la URL.
- Preservar columnas desconocidas y valores. Distinguir entre columna desconocida, columna con grafía incorrecta y formato no soportado.
- Detectar CSV de inventario, clientes, catálogos y otros tipos identificables, además de archivos sin cabeceras Shopify de producto reconocibles; explicar cuándo se omite el perfil de productos para no presentar errores de otro esquema.
- Detectar los CSV de catálogos de Shopify Markets y B2B por sus encabezados distintivos, incluidos campos de precio/publicación y reglas de cantidad/precios por volumen, y saltar las validaciones de productos; documentar que la app solo identifica estos formatos, no valida ni repara todavía su esquema de catálogo.
- Tratar delimitadores según el destino Shopify. Shopify documenta comas para el CSV de productos; si se acepta otra entrada para analizarla, indicar claramente cómo se generará un archivo compatible. Cuando el formato no sea un CSV de productos reconocido, preservar el separador de origen al exportar en lugar de imponer el formato de productos.
- Diferenciar el máximo de importación documentado por Shopify (15 MB para CSV de productos) del límite local de análisis del navegador; diagnosticar archivos analizables que superan el límite de importación.
- Documentar qué ocurre con columnas de variantes, imágenes, colección, metafields y mercados. Solo añadir validaciones específicas cuando exista evidencia suficiente; aceptar y preservar datos que la app todavía no interpreta.
- No declarar un archivo «listo para importar» como garantía. Usar una redacción de validación preventiva.

**Criterios de aceptación:** cada regla de error o advertencia enlaza a una fuente versionada; create y update tienen pruebas separadas; fixtures cubren variantes y filas de continuación; encabezados desconocidos permanecen en el resultado; no hay errores bloqueantes basados solo en supuestos.

### R10-02 — Diagnósticos accionables y trazables

**Prioridad:** P0.

- Mantener el catálogo normativo de `ruleId`, severidad, categoría, explicación y fuente en `docs/DIAGNOSTIC_RULES.md`; las pruebas deben detectar reglas del perfil que no estén catalogadas.
- Indicar fila lógica y columna cuando la incidencia corresponda a una celda o registro; las reglas de archivo completo no deben inventar una ubicación.

- Cada incidencia tiene `ruleId` estable, severidad, mensaje claro, explicacion y nivel de seguridad de reparacion cuando corresponda.
- La fila 1 es la cabecera; las filas posteriores cuentan registros logicos y no saltos de linea dentro de celdas citadas.
- Separar errores del parser, incompatibilidades con el perfil y recomendaciones comerciales.
- Explicar el efecto probable de los errores de alto riesgo, en particular los cambios de variantes al actualizar.
- Los mensajes incluyen una acción sugerida o enlazan a la documentación pertinente; no se limitan a repetir el nombre interno de la regla.
- Evitar severidad `error` cuando Shopify permite el caso o cuando la regla no está confirmada.

**Criterios de aceptación:** pruebas de contrato para los campos de cada incidencia; ninguna regla activa carece de documentación; filas y columnas se verifican con fixtures de referencia.

### R10-03 — Reparaciones seguras y revisables

**Prioridad:** P0.

- Clasificar cambios como seguros, requieren revisión o manuales.
- Mostrar valor original, valor propuesto, ubicación y razón antes de aplicar.
- Aplicar solo cambios seleccionados, sobre una copia del CSV; detectar propuestas obsoletas y volver a validar el documento resultante.
- Permitir deshacer la última aplicación de reparaciones antes de exportar.
- Nunca inventar identificadores, URLs, precios, cantidades de inventario ni valores de catálogo.
- Evitar normalizaciones que alteren datos de Shopify sin aprobación explícita. Si cambia el delimitador o la representación del archivo, explicar el cambio.
- Registrar en el informe los cambios aplicados y las incidencias pendientes, sin incluir el archivo completo ni contenido ajeno a la finalidad del informe.

**Criterios de aceptación:** pruebas de aplicación parcial, deshacer, revalidación, propuestas obsoletas, round-trip y preservación de valores no seleccionados.

### R10-04 — Integridad del parser y de la exportación

**Prioridad:** P0.

- Cubrir UTF-8, BOM, comillas escapadas, delimitadores dentro de campos, saltos de línea dentro de celdas y Unicode.
- Rechazar codificación inválida de forma explícita; no reinterpretar bytes silenciosamente.
- Detectar cabeceras duplicadas, filas truncadas o con celdas adicionales, archivos vacíos, comillas mal formadas y límites excedidos.
- Preservar orden, cabeceras, valores y columnas desconocidas durante análisis y exportación, salvo cambio seleccionado por el usuario.
- Probar delimitador ambiguo y permitir confirmación cuando la detección no sea fiable.
- Bloquear exportaciones que se hayan truncado por límites de filas o por errores sintácticos que impidan reconstruir fielmente el documento.
- No cambiar valores para mitigar fórmulas de hoja de cálculo por defecto; cualquier protección opcional debe enseñar el diff y su posible efecto en Shopify.

**Criterios de aceptación:** suite de fixtures edge-case; round-trip conserva la matriz de celdas; casos no recuperables no ofrecen una descarga presentada como completa.

### R10-05 — Privacidad y seguridad demostrables

**Prioridad:** P0.

- Mantener parseo, validación, reparación y serialización en el navegador/Web Worker.
- No crear endpoints de subida, almacenamiento de contenido, logging de filas, analítica con contenido ni llamadas de IA con el archivo.
- Comprobar en E2E que un marcador único del CSV no aparece en cuerpos de solicitudes de red.
- Revocar `ObjectURL`, terminar Workers al cancelar o desmontar la interfaz y limpiar referencias al archivo al reiniciar el flujo.
- Mantener secretos fuera del repositorio; los artefactos de autenticación E2E permanecen ignorados por Git.
- Publicar una explicación de privacidad y límites de tratamiento en la interfaz y en la política de privacidad antes de distribuir la app.
- Suscribirse a `customers/data_request`, `customers/redact` y `shop/redact` antes de publicar en Shopify App Store; autenticar y responder correctamente aunque no se almacenen datos de clientes. `shop/redact` debe eliminar los datos de sesión de esa tienda.

**Criterios de aceptación:** prueba automatizada de no transmisión, revisión de Network durante el flujo, búsqueda de logs/telemetría, verificación de que archivos de auth y secretos no aparecen en Git, política pública coherente con datos y retención reales, y webhooks de cumplimiento comprobados antes de distribución.

### R10-06 — Rendimiento y límites comprobados

**Prioridad:** P1.

- Definir tamaños de archivo, filas, tiempo de análisis y memoria objetivo con medidas reproducibles; Shopify limita el CSV de productos a 15 MB, mientras que el navegador puede analizar hasta 20 MB localmente para mostrar diagnósticos. Revisar ambos límites y el límite de 100.000 filas con CSV representativos.
- Ejecutar el trabajo pesado fuera del hilo de UI; mostrar progreso y permitir cancelación que termine el Worker.
- Mantener acotados DOM y tablas para archivos grandes; paginar o virtualizar si las mediciones lo requieren.
- Limitar el texto que la vista previa renderiza por celda; una vista truncada nunca debe cambiar el dato analizado ni el CSV exportado.
- Probar degradación clara ante memoria insuficiente, límites excedidos y errores del Worker.
- No ofrecer fallback remoto automático cuando el navegador alcanza un límite.

**Criterios de aceptación:** resultados medidos en el navegador soportado más modesto elegido; la interfaz sigue respondiendo; cancelación y límites tienen pruebas.

### R10-07 — Experiencia accesible y coherente

**Prioridad:** P1.

- Hacer que selección de archivo, filtros, reparaciones, cancelación y descargas funcionen con teclado y tecnologías de asistencia.
- Asociar cada control a una etiqueta; anunciar estado de análisis, errores y cambios aplicados mediante regiones accesibles.
- Mostrar filtros, búsquedas y conteos sin ocultar errores críticos; permitir localizar rápidamente fila y columna.
- Presentar una vista previa legible en pantallas pequeñas y archivos con muchas columnas.
- Diseñar estados inicial, analizando, cancelado, vacío, con errores, corregido y exportado.
- Mantener una terminología consistente y definir soporte de idiomas antes de ampliar las traducciones.

**Criterios de aceptación:** revisión manual de teclado y lector de pantalla, comprobación de contraste y revisión responsive de los flujos principales.

### R10-08 — Pruebas automatizadas y CI

**Prioridad:** P0 para reglas y datos; P1 para CI completa.

- Ampliar tests unitarios para reglas, parser, reparaciones, round-trip, límites y contrato de informes.
- Añadir fixtures sintéticos que cubran productos simples, variantes, filas de imagen, actualización/sobrescritura y formatos no soportados.
- Añadir tests E2E para modos create/update, errores de archivo, filtros, cancelación, reparaciones, descarga y privacidad de red.
- Verificar el contenido descargado, no solo su nombre, y reparsear el CSV descargado.
- Ejecutar lint, typecheck, unit tests, build y E2E donde la autenticación/infraestructura de CI esté configurada.
- Mantener la autenticación E2E aislada y documentar cómo renovar el estado local sin guardar credenciales en Git.

**Criterios de aceptación:** cada regla P0 tiene tests; pruebas estables sin depender de datos reales de comerciantes; CI bloquea regresiones en los comandos de calidad.

### R10-09 — Integración y publicación Shopify

**Prioridad:** P1 antes de piloto ampliado; P2 para publicación.

- Mantener el scaffold y la autenticación oficiales vigentes, permisos mínimos y procesamiento del CSV sin llamadas Admin API innecesarias.
- El punto de entrada publico no pide al comerciante escribir un dominio `myshopify.com`; la instalacion comienza en una superficie Shopify y la pagina publica explica el producto sin texto de plantilla.
- Probar instalación, apertura, navegación, sesiones y desinstalación en una tienda de desarrollo limpia.
- Separar las comprobaciones de compatibilidad CSV del proceso de importación real; nunca iniciar una importación sin una decisión de producto posterior.
- Revisar requisitos actuales de distribución, privacidad, soporte, seguridad, webhooks y ficha de Shopify antes de solicitar publicación.
- Mantener el autochequeo local de requisitos App Store en `docs/SHOPIFY_APP_STORE_REVIEW.md` y volver a obtener la lista canónica antes de cada envío.
- No implementar billing ni publicar la app hasta tener alcance comercial, requisitos vigentes y autorización correspondiente.

**Criterios de aceptación:** checklist Shopify actualizado con fuentes oficiales y entorno de pruebas repetible; el punto de entrada publico no solicita el dominio de la tienda ni muestra placeholders del scaffold; no hay scopes innecesarios ni secretos de producción en el repositorio.

### R10-10 — Validación con comerciantes y operación

**Prioridad:** P1 antes de declarar validado el producto; P2 para operación continua.

- Probar con comerciantes que migren, actualicen y reciban catálogos de proveedores; incluir casos con variantes e imágenes.
- Usar archivos anonimizados o fixtures derivados con consentimiento; no conservar CSV sensibles como telemetría.
- Registrar falsos positivos, errores pasados por alto, tiempo para resolver incidencias y abandonos del flujo.
- Mantener una lista de limitaciones visibles y proceso para actualizar el perfil cuando Shopify cambie el formato.
- Preparar guía de uso, preguntas frecuentes y canal de reporte de reglas incorrectas.

**Criterios de aceptación:** existe evidencia de sesiones piloto, problemas priorizados y cambios de reglas motivados por datos; no se afirma que el producto esté listo para todo caso sin esta validación.

## Orden de trabajo

### P0 — Confianza en los resultados

1. Auditar el perfil actual frente a la guía oficial de CSV de productos.
2. Añadir matriz de reglas, variantes, alias, límites de soporte y ejemplos de entrada/salida.
3. Ampliar fixtures y tests para create/update, encabezados, filas de continuación y dependencias de variantes.
4. Asegurar integridad de parser/export y ausencia de transmisión del CSV.
5. Resolver defectos de reparación que puedan cambiar datos sin revisión o sin posibilidad de recuperación.

### P1 — Producto usable con datos reales

1. Medir rendimiento y probar cancelación/límites con archivos representativos.
2. Completar accesibilidad, estados vacíos/error y claridad de diagnósticos.
3. Ampliar E2E y configurar CI para calidad automatizada.
4. Ejecutar pilotos controlados y corregir falsos positivos/negativos.

### P2 — Preparación de distribución

1. Confirmar canal de distribución, privacidad, soporte y requisitos actuales de Shopify.
2. Completar checklist de instalación, desinstalación y despliegue.
3. Decidir billing solo si el modelo comercial lo requiere y existe autorización.

## Criterio para declarar 10/10

No asignar 10/10 mientras haya un requisito P0 sin evidencia, reglas críticas sin fuente oficial, una fuga de contenido CSV, un defecto conocido de integridad, o afirmaciones comerciales sin validación de comerciantes. Los requisitos P1 y P2 deben declararse como pendientes o aceptados explícitamente con su impacto documentado.

## Fuentes oficiales iniciales

Revisadas el 2026-10-16:

- [Using CSV files to import and export products](https://help.shopify.com/en/manual/products/import-export/using-csv) — formatos, columnas requeridas, dependencias, variantes, metafields, mercados e imágenes.
- [Importing products with a CSV file](https://help.shopify.com/en/manual/products/import-export/import-products/) — importación, pruebas en tienda de desarrollo y errores habituales.
- [Exporting and importing inventory with a CSV file](https://help.shopify.com/en/manual/products/inventory/setup/inventory-csv) — formato separado para inventario.

Verificar las fuentes oficiales otra vez antes de actualizar reglas o iniciar distribución; Shopify puede cambiar los formatos y requisitos.
