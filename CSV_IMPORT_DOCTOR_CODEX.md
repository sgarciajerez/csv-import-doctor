# CSV Import Doctor — Especificación maestra para Codex

> **Estado:** proyecto nuevo. **Objetivo:** MVP funcional, seguro y verificable antes de invertir en monetización y publicación.  
> **Plataforma:** Shopify App Store. **Entorno:** Windows + PowerShell + Git + Codex.  
> **Stack recomendado:** TypeScript end-to-end, React Router, Shopify CLI, componentes oficiales de interfaz de Shopify, Node.js LTS, Vitest y Playwright.  
> **No usar Python en el MVP**: el procesamiento CSV se implementará como biblioteca TypeScript independiente y ejecutable prioritariamente en el navegador del comerciante. Python es opcional en el futuro, si una necesidad concreta lo justifica.

## 0. Instrucciones operativas para Codex

Eres el arquitecto y desarrollador principal de **CSV Import Doctor**. Construye software funcional, no solo documentación. Trabaja con autonomía razonable, ejecuta pruebas, corrige fallos y comunica resultados verificables.

1. Inspecciona primero el entorno local, el repositorio y las versiones de las herramientas. No presupongas que Shopify CLI, Node o Git están instalados.
2. Consulta la **documentación oficial vigente** de Shopify antes de elegir plantilla, scopes, componentes, formato CSV, facturación y requisitos de publicación. Si no tienes acceso a internet, indica qué decisiones necesitan verificación y no inventes contratos de API.
3. Divide el trabajo en fases con resultados ejecutables. Prioriza el motor CSV y la interfaz local antes de construir monetización.
4. Ejecuta pruebas al terminar cada módulo y corrige los errores detectados. No declares tareas completas por haber escrito código.
5. No borres archivos ajenos al proyecto ni ejecutes operaciones destructivas sin autorización.
6. No contrates servicios, compres dominios, crees recursos de pago, publiques la aplicación, subas código a un repositorio remoto ni actives facturación sin aprobación explícita.
7. Mantén secretos en variables de entorno, nunca en Git. Incluye `.env.example` sin credenciales.
8. Al final de cada fase, informa de: archivos modificados, funcionalidades verificadas, pruebas ejecutadas, limitaciones, instrucciones para probar y siguiente paso.
9. Cuando falte una decisión no bloqueante, toma la alternativa más simple, documenta el supuesto y continúa. Pregunta únicamente ante bloqueos reales o acciones con consecuencias externas.
10. Mantén un `docs/PROGRESS.md` con decisiones, hitos, pendientes y pruebas realizadas.

### Requisitos para la calidad objetivo

Antes de planificar o implementar cambios de producto, leer `docs/REQUIREMENTS_10.md`. Trátalo como referencia normativa de calidad y criterios de aceptación para Codex y cualquier agente posterior. Prioriza los requisitos P0, evidencia su cumplimiento con código o pruebas, y actualiza `docs/PROGRESS.md`; no marques un requisito completo sin evidencia. Si una decisión posterior contradice ese documento, actualiza y justifica primero el requisito afectado.

Al cambiar diagnósticos, consulta y actualiza también `docs/DIAGNOSTIC_RULES.md`. Cada regla nueva debe tener una prueba de contrato y una entrada en ese catálogo antes de considerarse terminada.

## 1. Producto y alcance

**Nombre provisional:** CSV Import Doctor.  
**Propuesta de valor:** «Sube tu CSV de productos, descubre los errores, corrige los problemas de forma controlada y descarga un archivo listo para probar en Shopify».

### Usuario objetivo

Comerciantes Shopify que migran productos desde otras plataformas, trabajan con hojas de cálculo o reciben catálogos CSV de proveedores. Su problema es entender por qué un archivo no se importa correctamente y cómo corregirlo sin estropear productos o variantes.

### Flujo MVP

1. Seleccionar o arrastrar un archivo CSV.
2. Detectar codificación y delimitador cuando sea fiable; permitir corregir manualmente la detección.
3. Analizar el formato y validar cada fila contra un perfil documentado de CSV de productos Shopify.
4. Mostrar errores, advertencias y recomendaciones con número de fila, columna, explicación y ejemplo.
5. Presentar propuestas de reparación clasificadas por seguridad.
6. Permitir seleccionar correcciones, previsualizar diferencias y confirmar.
7. Revalidar el resultado y descargar CSV corregido e informe de cambios.
8. Mostrar advertencia de que **validación local no equivale a garantía de importación**; probar los resultados en una tienda de desarrollo.

### Fuera de alcance en el MVP

- Escribir, modificar o eliminar productos directamente en Shopify.
- Importar automáticamente productos en la tienda.
- IA generativa, chatbots o claves de modelos externos.
- Sincronización recurrente con proveedores.
- Procesamiento de millones de filas o trabajos distribuidos.
- Multiusuario complejo, múltiples niveles de suscripción y panel administrativo sofisticado.
- Almacenar permanentemente los CSV originales.

## 2. Stack y decisiones de arquitectura

- **Lenguaje:** TypeScript con configuración estricta.
- **Aplicación:** plantilla oficial vigente de Shopify CLI, preferiblemente React Router si continúa siendo la opción recomendada.
- **Interfaz:** React y componentes oficiales compatibles con la versión actual de Shopify; verificar si corresponde usar Polaris, App Bridge o el sistema de componentes actualizado.
- **Motor CSV:** paquete TypeScript independiente, sin dependencia de Shopify ni de React, compatible con navegador (sin APIs exclusivas de Node.js).
- **Ejecución prioritaria:** procesamiento local en el navegador del comerciante mediante Web Workers cuando el volumen lo justifique; no enviar los CSV al backend.
- **Backend mínimo:** reservar Node.js para autenticación, sesiones, webhooks, verificación de suscripción y requisitos de Shopify; no procesar ni almacenar CSV por defecto.
- **CSV:** biblioteca madura de parsing y serialización (p. ej. Papa Parse o equivalente), evaluando streaming, seguridad, manejo de comillas y saltos de línea.
- **Esquemas internos:** Zod o equivalente.
- **Pruebas:** Vitest (unidad e integración), Playwright (E2E).
- **Persistencia:** la mínima requerida por el mecanismo de sesiones/autenticación oficial; SQLite en local y base de datos adecuada en producción, según plantilla y requisitos de despliegue.
- **CI:** GitHub Actions para lint, typecheck, test y build; configurar sin secretos hasta contar con aprobación.
- **Despliegue:** decidir después de validar el MVP; comparar costes, almacenamiento temporal, límites de memoria y requisitos de Shopify.

### Arquitectura browser-first y costes mínimos (decisión obligatoria)

**Objetivo:** minimizar alojamiento, consumo de CPU y riesgos de privacidad sin sacrificar la integración oficial con Shopify.

1. El comerciante selecciona un archivo con la API `File` del navegador. El contenido permanece en su dispositivo.
2. El motor TypeScript analiza, valida y repara el CSV **en el navegador**. Usar `Web Worker` para evitar bloquear la interfaz con archivos grandes; establecer límites configurables de tamaño y filas.
3. Mostrar incidencias, diferencias y confirmación de cambios en React; generar el CSV corregido y el informe como `Blob` y descargarlo localmente. Revocar los `ObjectURL` temporales al terminar.
4. **No crear endpoints de subida de CSV**, ni guardar contenidos en base de datos, ni enviarlos a servicios de IA, analítica, logging o terceros en el MVP.
5. Mantener backend Node.js mínimo para las necesidades obligatorias de una app embebida: autenticación/sesiones, webhooks y, cuando proceda, facturación y control de planes. Verificar los requisitos actuales de Shopify.
6. Guardar solo metadatos mínimos de tienda, suscripción y contadores de uso necesarios, sin nombres de archivos, filas ni contenido sensible; no confiar en contadores manipulables desde cliente para aplicar límites de pago. Si el límite necesita ser resistente a fraude, diseñar verificación segura sin transmitir el CSV.
7. No prometer coste de infraestructura nulo: la aplicación embebida y sus callbacks siguen necesitando hosting HTTPS disponible y almacenamiento de sesiones adecuado. Comparar despliegue de bajo coste una vez validado el MVP.
8. Si un archivo excede límites del navegador, mostrar un error claro y opciones de reducción/división. **No implementar fallback automático al servidor** sin evaluación explícita de privacidad, coste y autorización.
9. La biblioteca `csv-doctor-core` debe poder ejecutarse en navegador y opcionalmente en Node para pruebas/CLI, sin importar módulos `fs`, `path` u otras dependencias Node-only en el bundle del cliente.
10. Verificar en DevTools/Network que analizar, reparar y exportar archivos **no transmite el contenido del CSV**. Añadir prueba automatizada que compruebe ausencia de solicitudes de subida.

**Presupuesto objetivo de infraestructura:** aplicación pequeña con servidor Node.js y persistencia mínima; objetivo orientativo de 5–20 €/mes al inicio, **no garantía de precio**. Evitar servicios externos de IA y procesamiento de archivos en producción mientras no exista demanda validada.

### Separación de responsabilidades

```text
csv-import-doctor/
├── app/                         # Aplicación Shopify / UI / rutas
│   ├── routes/
│   ├── components/
│   ├── services/
│   └── ...
├── packages/
│   └── csv-doctor-core/
│       ├── src/
│       │   ├── parser/
│       │   ├── profiles/
│       │   ├── validators/
│       │   ├── fixers/
│       │   ├── reports/
│       │   ├── security/
│       │   └── index.ts
│       └── tests/
├── fixtures/
│   ├── valid/
│   ├── invalid/
│   └── edge-cases/
├── docs/
│   ├── PROGRESS.md
│   ├── DECISIONS.md
│   ├── CSV_PROFILE_SOURCES.md
│   └── TEST_PLAN.md
├── scripts/
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Adapta la estructura a la plantilla oficial realmente generada. No fuerces un monorepo complejo si una estructura más simple cumple los mismos objetivos.

## 3. Especificación del motor CSV

### 3.1 Entrada y parser

- Admitir CSV estándar con campos entrecomillados, comillas escapadas, comas dentro de campos y saltos de línea dentro de celdas.
- Detectar y manejar BOM UTF-8; documentar otras codificaciones compatibles y evitar reinterpretaciones silenciosas.
- Permitir seleccionar delimitador si la detección es ambigua.
- Preservar orden de filas y columnas y, en la medida posible, contenido original.
- Informar de encabezados duplicados, filas con número de columnas inesperado y comillas mal cerradas.
- Imponer límites configurables de tamaño, filas, tiempo y memoria. Evitar que un archivo grande bloquee la interfaz.
- **Procesar por defecto exclusivamente en el navegador**. No enviar el CSV ni fragmentos a terceros ni al backend. Cualquier procesamiento en servidor requerirá decisión arquitectónica posterior y política de retención explícita.

### 3.2 Perfiles de Shopify

Crear perfiles versionados de **CSV de productos** basados en documentación oficial, no en suposiciones. Documentar URL, fecha de consulta, ejemplos oficiales y cambios relevantes en `docs/CSV_PROFILE_SOURCES.md`.

- Diferenciar campos obligatorios, opcionales y condicionales.
- Validar combinaciones de variantes y filas de continuación según reglas documentadas.
- No tratar un SKU repetido como error bloqueante de forma universal.
- No tratar una columna desconocida como motivo automático para eliminar datos.
- Distinguir errores de sintaxis, incompatibilidad con el esquema y recomendaciones comerciales.
- Preservar los encabezados originales cuando sea posible; no cambiar semántica sin consentimiento.
- Mantener pruebas de regresión para los ejemplos oficiales de Shopify.

### 3.3 Reglas iniciales candidatas

Implementar únicamente las reglas respaldadas por el perfil verificado. Prioridad sugerida:

| Regla | Categoría | Autocorrección |
|---|---|---|
| Encabezados duplicados o incompatibles | Estructura | No sin confirmación |
| Filas con columnas desalineadas | Estructura | Solo si inequívoco |
| Campos condicionalmente obligatorios ausentes | Compatibilidad | Normalmente no |
| Formato numérico inválido en precio | Datos | Solo conversión inequívoca |
| Booleanos fuera de valores aceptados | Datos | Solo equivalencias inequívocas |
| Relaciones de variantes inconsistentes | Datos | Normalmente no |
| URL con formato inválido | Datos | No inventar URL |
| SKU repetidos | Advertencia comercial | No |
| Espacios exteriores no deseados | Calidad | Sí, por campo y con vista previa |
| Codificación o delimitador ambiguos | Estructura | Requiere selección |
| Valores de inventario incompatibles | Datos | No inventar cantidades |
| CSV con comillas mal formadas | Sintaxis | Solo si inequívoco |

### 3.4 Modelo de incidencia

Definir un tipo estable, similar a:

```ts
type Severity = 'error' | 'warning' | 'info';
type FixSafety = 'safe' | 'review' | 'manual';

interface CsvIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  row?: number;          // Número visible para usuario, aclarar si incluye encabezado
  column?: string;
  message: string;
  explanation?: string;
  originalValue?: string;
  suggestedValue?: string;
  fixSafety?: FixSafety;
}
```

No introducir datos privados innecesarios en logs, analítica ni mensajes de error.

### 3.5 Reparaciones

- `safe`: transformaciones mecánicas inequívocas, siempre visibles en un diff.
- `review`: propuestas razonables que necesitan confirmación explícita.
- `manual`: no existe solución fiable automática.
- Ninguna reparación debe inventar precios, SKU, stock, imágenes, variantes o identificadores.
- Aplicar cambios sobre una copia inmutable o con mecanismo equivalente de reversión.
- Mostrar antes/después, regla aplicada, filas afectadas y total de cambios.
- Revalidar después de reparar y permitir descargar tanto CSV como reporte.
- No eliminar filas ni columnas de manera silenciosa.

### 3.6 Exportación segura

- Serializar CSV con escape correcto de comillas y delimitadores.
- Implementar mitigación documentada de **CSV formula injection** para archivos abiertos en Excel/hojas de cálculo; equilibrar seguridad y compatibilidad de importación Shopify, y evitar alterar datos silenciosamente.
- Añadir pruebas para valores que comiencen por `=`, `+`, `-`, `@`, tabulaciones y caracteres de control, considerando contexto y reglas del formato.
- Preservar Unicode y saltos de línea válidos.
- Descargar reporte JSON o CSV con cambios, incidencias no resueltas y fecha de análisis, sin incluir secretos.

## 4. Interfaz y experiencia de usuario

### Pantallas MVP

1. **Inicio / carga:** seleccionar archivo, límites, aviso de privacidad.
2. **Resultado del análisis:** número de filas, errores, advertencias, lista filtrable, detalles por incidencia.
3. **Reparaciones:** seleccionar propuestas, vista previa de diferencias, confirmación explícita.
4. **Exportación:** estado final, incidencias pendientes, descarga CSV e informe.

### Requisitos UX

- Explicaciones claras, sin jerga innecesaria.
- Estados de carga, progreso cuando sea posible y mensajes de error recuperables.
- Accesibilidad básica: teclado, etiquetas, foco y contraste.
- No prometer «100 % compatible» ni «importación garantizada».
- Diseño coherente con aplicaciones integradas Shopify.
- Preparar la interfaz para internacionalización, pero lanzar inicialmente en inglés salvo decisión distinta.

## 5. Seguridad, privacidad y cumplimiento

- Validar tipo, tamaño y contenido real del archivo; no confiar en extensión o MIME.
- Evitar ejecución de código o fórmulas desde los CSV.
- Aplicar límites de memoria/CPU, timeouts y protección contra archivos patológicos.
- Minimizar permisos (scopes) de Shopify. Para el MVP sin lectura/escritura de productos, investigar si basta autenticación básica de aplicación y scopes mínimos.
- Gestionar autenticación y sesiones con librerías oficiales vigentes; no implementar OAuth artesanal.
- Separar datos por tienda y comprobar autorización en cada petición.
- El CSV debe permanecer en memoria del navegador y descargarse localmente; no persistirlo en servidor, localStorage, IndexedDB ni herramientas de telemetría por defecto. Liberar referencias y blobs cuando dejen de usarse.
- Preparar política de privacidad, contacto de soporte, desinstalación y los webhooks/procesos de privacidad que Shopify exija para apps públicas.
- Mantener secretos fuera del repositorio y evitar registrar contenido completo de CSV.
- Verificar requisitos de revisión y publicación en Shopify App Store antes del envío.

## 6. Monetización: hipótesis, no implementación inicial

### Planes a investigar

- **Free:** análisis de hasta 100 filas por archivo, con límites transparentes.
- **Pro:** hipótesis de **7,99 USD/mes**, límites superiores, reparaciones por lotes, varios archivos e informes.
- **Alternativa:** pago por archivo o créditos, porque la importación CSV puede ser un uso ocasional.

No implementar facturación hasta disponer de MVP funcional y haber decidido el modelo. Cuando corresponda, utilizar la solución de facturación oficial vigente y probar compra, cancelación, reinstalación, límites y errores. No asumir que 7,99 USD es un precio validado.

### Métricas mínimas y respetuosas con privacidad

- Instalaciones y desinstalaciones.
- Archivos analizados y número de filas, agregados.
- Porcentaje de análisis completados y descargas.
- Tipos de error más frecuentes, sin guardar contenido privado.
- Activación de prueba, conversiones a pago y cancelaciones cuando exista monetización.

## 7. Fases y criterios de aceptación

### Fase 0 — Bootstrap

**Acciones:** comprobar herramientas; consultar documentación Shopify; generar proyecto oficial; inicializar Git; README; `.env.example`; scripts de lint, typecheck, test y build.

**Hecho cuando:** aplicación de plantilla inicia localmente, build funciona y repositorio tiene instrucciones reproducibles.

### Fase 1 — Núcleo CSV local (prioridad máxima)

**Acciones:** parser browser-compatible, perfil oficial versionado, incidencias estructuradas, primeras reglas, fixtures, pruebas; prohibir dependencias Node-only en el bundle del navegador.

**Hecho cuando:** el motor procesa CSV válidos, detecta casos malformados y supera tests de regresión sin depender de Shopify.

### Fase 2 — Reparación y exportación

**Acciones:** clasificar reparaciones, aplicar cambios seleccionados, diff, revalidación, exportación segura, reporte.

**Hecho cuando:** ninguna modificación se produce sin visibilidad y el CSV exportado conserva los datos no modificados.

### Fase 3 — UI local funcional

**Acciones:** carga con File API, análisis en navegador (Web Worker cuando proceda), filtros, vista previa, corrección, descarga mediante Blob y verificación de ausencia de subida de contenido.

**Hecho cuando:** el flujo completo se ejecuta manualmente y con pruebas E2E sobre fixtures.

### Fase 4 — Integración Shopify

**Acciones:** integrar en la plantilla oficial, autenticación, sesión, componentes y navegación de app embebida; instalar en tienda de desarrollo.

**Hecho cuando:** el flujo funciona dentro del admin Shopify y se verifica en tienda de desarrollo.

### Fase 5 — Robustez y validación real

**Acciones:** límites, seguridad, archivos grandes, compatibilidad con CSV oficiales, pruebas de importación manual en tienda de desarrollo, privacidad.

**Hecho cuando:** los casos críticos están cubiertos y los CSV resultantes se han probado en Shopify; documentar límites conocidos.

### Fase 6 — Comercialización y publicación (solo con aprobación)

**Acciones:** decidir Free/Pro o créditos; integrar billing y controles de planes sin enviar contenido CSV; alojamiento mínimo HTTPS para sesiones/webhooks; política de privacidad; soporte; ficha comercial; revisión de Shopify.

**Hecho cuando:** cumple requisitos vigentes, pasa QA de instalación/facturación/desinstalación y se envía a revisión tras autorización.

> **Estimación no contractual:** prototipo local en ~1 semana de trabajo parcial si el alcance se mantiene pequeño; integración y publicación pueden requerir más tiempo por requisitos, incidencias y revisión externa.

## 8. Plan de pruebas mínimo

Crear fixtures sintéticos y ejemplos oficiales permitidos para:

- CSV válido sencillo.
- Productos con múltiples variantes y filas relacionadas.
- Celdas con comas, comillas, saltos de línea y Unicode.
- BOM UTF-8, delimitadores ambiguos y codificaciones no soportadas.
- Encabezados duplicados, columnas extra y orden alterado.
- Filas con columnas de más/de menos.
- Precio y stock inválidos según perfil documentado.
- SKU repetidos que deban ser advertencia, no bloqueo.
- Fórmulas maliciosas y caracteres de control.
- Archivos vacíos, muy grandes, truncados y comillas sin cerrar.
- Reparaciones seguras, ambiguas, rechazadas y revertidas.
- Round-trip parsear → exportar → parsear sin pérdida no autorizada.
- Aislamiento entre tiendas y sesiones una vez exista backend Shopify.

Comandos de calidad que deben existir (adaptar al package manager elegido):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 9. Inicio en Windows / PowerShell

Primero comprobar:

```powershell
node --version
npm --version
git --version
```

Si faltan, instalar versiones oficiales actuales. Instalar Shopify CLI según documentación oficial vigente. Una vía habitual es:

```powershell
npm install -g @shopify/cli@latest
```

Crear carpeta y proyecto:

```powershell
New-Item -ItemType Directory -Force D:\Proyectos\CSVImportDoctor
Set-Location D:\Proyectos\CSVImportDoctor
shopify app init
```

Seguir el asistente oficial y seleccionar la plantilla recomendada actual para apps integradas, preferentemente React Router + TypeScript si está disponible. Evitar sobrescribir archivos existentes. Una vez configurado:

```powershell
shopify app dev
```

El comando puede requerir iniciar sesión, crear/vincular una aplicación y seleccionar tienda de desarrollo. **Codex debe pedir intervención del usuario** cuando se requiera autenticación, aprobación o crear recursos externos.

## 10. Fuentes oficiales a consultar

- Desarrollo de apps: https://shopify.dev/docs/apps/build
- Publicación: https://shopify.dev/docs/apps/launch
- CSV de productos: https://help.shopify.com/en/manual/products/import-export/using-csv
- Shopify CLI: https://shopify.dev/docs/api/shopify-cli
- Documentación general: https://shopify.dev/docs

La documentación cambia: verificar rutas, requisitos, API y recomendaciones actuales antes de implementar.

## 11. Entregables esperados

1. Repositorio con aplicación Shopify y motor CSV independiente.
2. MVP funcional de carga, análisis, corrección controlada y exportación.
3. Suite de pruebas automatizadas y fixtures.
4. `README.md` con instalación, ejecución, límites y demostración.
5. `docs/PROGRESS.md` actualizado tras cada fase.
6. `docs/CSV_PROFILE_SOURCES.md` con fuentes oficiales y fecha de verificación.
7. Capturas o grabación de demostración solo cuando el flujo funcione realmente.
8. Preparación de despliegue y publicación **sin ejecutar acciones externas no autorizadas**.

## 12. Criterios adicionales de aceptación: procesamiento local

- El análisis, reparación, revalidación y exportación funcionan desconectados del backend **después de cargar la interfaz**, excepto las operaciones de autenticación y suscripción que necesiten conexión.
- Inspección de red confirma que no hay POST/PUT ni telemetría con contenido CSV.
- Los archivos grandes dentro de los límites admitidos no congelan perceptiblemente la interfaz; el usuario puede cancelar el trabajo.
- El CSV original no se altera; los cambios son explícitos y reversibles antes de descargar.
- No hay dependencia de servidor para ejecutar reglas de validación o generar descargas.
- La integración Shopify sigue funcionando con autenticación oficial, backend mínimo y alojamiento HTTPS.

## 13. Orden inmediata de ejecución para Codex

**Empieza ahora por Fase 0 y Fase 1.** Inspecciona el equipo y el directorio. Verifica la documentación oficial disponible. Inicializa el proyecto sin introducir infraestructura innecesaria. Implementa el núcleo CSV con tests. Ejecuta los tests y el build. Corrige cualquier fallo. Registra resultados y pendientes en `docs/PROGRESS.md`.

No te detengas para pedir decisiones menores de estilo. No implementes facturación ni publiques nada hasta que el usuario lo apruebe. Si el entorno carece de acceso a Shopify o internet, avanza con el motor independiente y deja explícitas las reglas de formato pendientes de confirmar.
