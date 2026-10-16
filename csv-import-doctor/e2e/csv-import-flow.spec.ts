import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test, type Frame } from '@playwright/test';
import { parseCsv } from '../../packages/csv-doctor-core/src/index.js';

const require = createRequire(import.meta.url);

async function auditEmbeddedAppAccessibility(frame: Frame) {
  await frame.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return frame.evaluate(async () => {
    type AxeViolation = {
      id: string;
      impact: string | null;
      description: string;
      nodes: Array<{ target: string[]; failureSummary: string | null }>;
    };
    type AxeWindow = Window & {
      axe?: {
        run: (context: Document, options: { runOnly: { type: 'tag'; values: string[] } }) => Promise<{
          violations: AxeViolation[];
        }>;
      };
    };
    const axe = (window as AxeWindow).axe;
    if (!axe) throw new Error('axe-core was not loaded in the Shopify app iframe.');
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return results.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
  });
}

test('analyzes, filters, repairs, and downloads locally without sending CSV data', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!process.env.PLAYWRIGHT_APP_URL || !process.env.PLAYWRIGHT_STORAGE_STATE,
    'Set PLAYWRIGHT_APP_URL and PLAYWRIGHT_STORAGE_STATE from the authenticated Shopify dev preview.');

  const requestBodies: string[] = [];
  const requestUrls: string[] = [];
  page.on('request', (request) => {
    requestUrls.push(request.url());
    const body = request.postDataBuffer();
    if (body) requestBodies.push(body.toString('utf8'));
  });

  await page.goto(process.env.PLAYWRIGHT_APP_URL!);
  const loginHeading = page.getByRole('heading', { name: 'Log in', exact: true });
  if (await loginHeading.isVisible().catch(() => false)) {
    throw new Error('Shopify redirected to its sign-in page. Finish Shopify login in the Playwright browser, close it to save storage state, then rerun this test.');
  }
  await expect.poll(() => page.frames().some((frame) => frame.url().includes('embedded=1'))).toBe(true);
  const appFrame = page.frames().find((frame) => frame.url().includes('embedded=1'));
  if (!appFrame) throw new Error('Shopify did not load the embedded app frame.');
  const app = page.frameLocator('iframe[src*="embedded=1"]');
  await expect(app.locator('s-section').first()).toBeVisible();
  await appFrame.waitForLoadState('networkidle');

  const landingPage = await page.context().newPage();
  await landingPage.goto(new URL('/', appFrame.url()).toString());
  await expect(landingPage.getByRole('heading', { name: 'Revisa tu CSV de productos antes de importarlo' })).toBeVisible();
  await expect(landingPage.getByRole('link', { name: 'Abrir Shopify Admin' })).toHaveAttribute(
    'href',
    'https://admin.shopify.com/apps',
  );
  await expect(landingPage.locator('input[name="shop"]')).toHaveCount(0);
  await expect(landingPage.getByText(/no pide el dominio de tu tienda/)).toBeVisible();
  await landingPage.close();

  const initialAccessibilityViolations = await auditEmbeddedAppAccessibility(appFrame);
  expect(initialAccessibilityViolations, JSON.stringify(initialAccessibilityViolations, null, 2)).toEqual([]);

  const appServerOrigin = process.env.PLAYWRIGHT_APP_SERVER_URL || appFrame.url();
  const complianceEndpoint = new URL('/webhooks/compliance', appServerOrigin).toString();
  const invalidHmacWebhook = await page.request.post(complianceEndpoint, {
    data: {},
    headers: {
      'X-Shopify-Hmac-Sha256': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      'X-Shopify-Topic': 'customers/data_request',
      'X-Shopify-Shop-Domain': 'csv-import-doctor-dev-okolejxc.myshopify.com',
      'X-Shopify-Webhook-Id': 'e2e-invalid-signature',
    },
  });
  expect(invalidHmacWebhook.status()).toBe(401);

  await expect(app.getByText(/el archivo se lee y analiza en este navegador/i)).toBeVisible();
  const privacyPagePromise = page.waitForEvent('popup');
  await app.getByRole('link', { name: /consulta qué datos se guardan/i }).click();
  const privacyPage = await privacyPagePromise;
  await expect(privacyPage.getByRole('heading', { name: 'Privacidad de CSV Import Doctor' })).toBeVisible();
  await expect(privacyPage.getByText(/El contenido del CSV.*Web Worker/i)).toBeVisible();
  await expect(privacyPage.getByText(/tokens de acceso y renovación/i)).toBeVisible();
  await privacyPage.close();

  await app.getByRole('link', { name: 'Guía rápida de uso' }).click();
  await expect.poll(() => appFrame.url()).toContain('/guide');
  await expect(app.getByText(/No importa ni modifica productos en Shopify/i)).toBeVisible();
  await expect(app.getByText(/El navegador analiza hasta 20 MB y 100.000 filas/i)).toBeVisible();
  await expect(app.getByText(/Un análisis sin incidencias garantiza que la importación funcione/i)).toBeVisible();
  await expect(app.getByText(/No con el CSV de productos/i)).toBeVisible();
  await app.getByRole('button', { name: 'Volver al analizador' }).click();
  await expect(app.getByLabel('Tipo de importación')).toBeVisible();

  const importMode = app.getByLabel('Tipo de importación');
  await importMode.focus();
  await page.keyboard.press('Tab');
  const fileInput = app.locator('input[type="file"]');
  await expect(fileInput).toBeFocused();
  const fileInputFocusStyle = await fileInput.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
  });
  expect(fileInputFocusStyle.outlineStyle).not.toBe('none');
  expect(fileInputFocusStyle.outlineWidth).toBeGreaterThan(0);
  await importMode.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(importMode).toHaveValue('update');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(importMode).toHaveValue('create');

  const currentHeaders = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-current-headers.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-current-headers.csv',
    mimeType: 'text/csv',
    buffer: currentHeaders,
  });
  await expect(app.getByRole('status').filter({ hasText: 'Análisis completado:' })).toBeVisible();
  await expect(app.getByRole('table')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const narrowLayout = await appFrame.evaluate(() => {
    const table = document.querySelector('table');
    const tableWrapper = table?.parentElement;
    return {
      documentOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      previewHeaderCount: table?.querySelectorAll('thead th').length ?? 0,
      tableWrapperFitsViewport: Boolean(tableWrapper && tableWrapper.clientWidth <= document.documentElement.clientWidth),
    };
  });
  expect(narrowLayout.documentOverflows).toBe(false);
  expect(narrowLayout.previewHeaderCount).toBe(20);
  expect(narrowLayout.tableWrapperFitsViewport).toBe(true);

  const googleShoppingHeaders = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-google-shopping-headers.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-google-shopping-headers.csv',
    mimeType: 'text/csv',
    buffer: googleShoppingHeaders,
  });
  await expect(app.locator('body')).toContainText('This header may be a typo for "Google Shopping / Age Group".');
  await expect(app.locator('body')).toContainText('Google Shopping / Merchant note');

  const conflictingImageAliases = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-conflicting-image-aliases.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-conflicting-image-aliases.csv',
    mimeType: 'text/csv',
    buffer: conflictingImageAliases,
  });
  await expect(app.locator('body')).toContainText(
    'This file contains multiple headers for the same Shopify field: Product image URL / Image Src.',
  );

  const conflictingOptionLinkedToHeaders = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-conflicting-option-linkedto-headers.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-conflicting-option-linkedto-headers.csv',
    mimeType: 'text/csv',
    buffer: conflictingOptionLinkedToHeaders,
  });
  await expect(app.locator('body')).toContainText(
    'This file contains multiple headers for the same Shopify field: Option1 LinkedTo / Option1 Linked To.',
  );

  const conflictingMarketCompareAtHeaders = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-conflicting-market-compare-at-headers.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-conflicting-market-compare-at-headers.csv',
    mimeType: 'text/csv',
    buffer: conflictingMarketCompareAtHeaders,
  });
  await expect(app.locator('body')).toContainText(
    'This file contains multiple headers for the same Shopify field: Compare At Price / South America / Compare-at price / South America.',
  );

  const barcodeHeaderOverlap = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-barcode-header-overlap.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-barcode-header-overlap.csv',
    mimeType: 'text/csv',
    buffer: barcodeHeaderOverlap,
  });
  await expect(app.locator('body')).toContainText('Review the barcode columns; multiple header spellings may describe the same barcode data.');
  await page.setViewportSize({ width: 1280, height: 900 });

  const fixture = await readFile(resolve(process.cwd(), '..', 'fixtures', 'e2e-review.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'e2e-review.csv',
    mimeType: 'text/csv',
    buffer: fixture,
  });
  await expect(app.locator('input[type="file"]')).toHaveValue('');

  await expect(app.getByText('2 filas', { exact: true })).toBeVisible();
  await expect(app.getByRole('status').filter({ hasText: 'Análisis completado: 2 filas' })).toBeVisible();
  await expect(app.getByRole('table').getByRole('caption')).toHaveText('Vista previa de las primeras 2 filas del CSV');
  await expect(app.getByRole('columnheader', { name: 'Title' })).toHaveAttribute('scope', 'col');
  const analyzedAccessibilityViolations = await auditEmbeddedAppAccessibility(appFrame);
  expect(analyzedAccessibilityViolations, JSON.stringify(analyzedAccessibilityViolations, null, 2)).toEqual([]);
  await app.getByLabel('Filtrar por tipo').selectOption('error');
  await app.getByLabel('Buscar incidencia').fill('missing');
  await expect(app.getByText(/missing its Title value/i)).toBeVisible();
  await expect(app.getByText('Formato Shopify', { exact: true })).toBeVisible();
  await expect(app.getByRole('link', { name: /Fuente de Shopify/ })).toHaveAttribute(
    'href',
    'https://help.shopify.com/en/manual/products/import-export/using-csv',
  );

  await app.getByLabel('Buscar propuesta de reparación').focus();
  await page.keyboard.press('Tab');
  const firstRepairCheckbox = app.locator('input[type="checkbox"]').first();
  await expect(firstRepairCheckbox).toBeFocused();
  await page.keyboard.press('Space');
  const applyRepairButton = app.getByRole('button', { name: /Aplicar 1 seleccionada/ });
  await expect(applyRepairButton).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(applyRepairButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(app.getByRole('status').filter({ hasText: 'Cambios aplicados: 1' })).toBeVisible();
  const repairedAccessibilityViolations = await auditEmbeddedAppAccessibility(appFrame);
  expect(repairedAccessibilityViolations, JSON.stringify(repairedAccessibilityViolations, null, 2)).toEqual([]);

  await app.getByRole('button', { name: 'Deshacer última aplicación' }).click();
  await expect(app.getByText(/Cambios aplicados:/)).not.toBeVisible();
  await app.locator('input[type="checkbox"]').first().check();
  await app.getByRole('button', { name: /Aplicar 1 seleccionada/ }).click();
  await expect(app.getByRole('status').filter({ hasText: 'Cambios aplicados: 1' })).toBeVisible();

  const csvDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar CSV revisado' }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe('e2e-review-reviewed.csv');
  const csvContent = await readFile((await csvDownload.path()), 'utf8');
  const exportedCsv = parseCsv(csvContent);
  expect(csvContent).not.toContain('\r');
  expect(exportedCsv.issues).toEqual([]);
  expect(exportedCsv.headers).toEqual(['Title', 'URL handle', 'Vendor', 'Status']);
  expect(exportedCsv.rows).toEqual([
    ['CSV-DOCTOR-PRIVATE-MARKER-7Q4', 'sample-product', 'Example Supply', 'active'],
    ['', 'untitled-product', 'Example Supply', 'draft'],
  ]);

  const reportDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar informe JSON' }).click();
  const reportDownload = await reportDownloadPromise;
  expect(reportDownload.suggestedFilename()).toBe('e2e-review-report.json');
  const reportContent = await readFile((await reportDownload.path()), 'utf8');
  const report = JSON.parse(reportContent) as { summary: { dataRows: number; appliedRepairCount: number }; unresolvedIssues: Array<{ ruleId: string }> };
  expect(report.summary).toMatchObject({ dataRows: 2, appliedRepairCount: 1 });
  expect(report.unresolvedIssues.map((issue) => issue.ruleId)).toContain('required-title-value');
  expect(reportContent).not.toContain('Example Supply');

  await app.getByLabel('Filtrar por tipo').selectOption('all');
  await app.getByLabel('Buscar incidencia').fill('');
  const ambiguousDelimiterFixture = await readFile(resolve(process.cwd(), '..', 'fixtures', 'e2e-ambiguous-delimiter.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'e2e-ambiguous-delimiter.csv',
    mimeType: 'text/csv',
    buffer: ambiguousDelimiterFixture,
  });
  const ambiguityWarning = app.getByText(/More than one delimiter fits this file\. Confirm the delimiter before relying on the results\./);
  await expect(ambiguityWarning).toBeVisible();
  await expect(app.getByRole('button', { name: 'Descargar CSV revisado' })).toBeDisabled();
  await expect(app.getByRole('button', { name: 'Descargar informe JSON' })).toBeDisabled();
  await expect(app.getByRole('alert')).toContainText('Descarga bloqueada: confirma el separador');
  const pendingDelimiterAccessibilityViolations = await auditEmbeddedAppAccessibility(appFrame);
  expect(pendingDelimiterAccessibilityViolations, JSON.stringify(pendingDelimiterAccessibilityViolations, null, 2)).toEqual([]);
  const delimiterSelect = app.getByLabel('Confirmar separador del CSV');
  await delimiterSelect.selectOption(';');
  await expect(app.getByRole('status').first()).toContainText('Análisis completado: 1 filas');
  await expect(ambiguityWarning).not.toBeVisible();
  await expect(delimiterSelect).toHaveValue(';');
  await expect(app.getByRole('button', { name: 'Descargar CSV revisado' })).toBeEnabled();
  await expect(app.getByRole('button', { name: 'Descargar informe JSON' })).toBeEnabled();
  await expect(app.getByRole('table').getByRole('cell', { name: 'CSV-DOCTOR-AMBIGUOUS-MARKER-3M8' })).toBeVisible();
  await expect(app.getByRole('table').getByRole('cell', { name: 'Acme,active' })).toBeVisible();
  const confirmedDelimiterAccessibilityViolations = await auditEmbeddedAppAccessibility(appFrame);
  expect(confirmedDelimiterAccessibilityViolations, JSON.stringify(confirmedDelimiterAccessibilityViolations, null, 2)).toEqual([]);
  const normalizedDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar CSV revisado' }).click();
  const normalizedDownload = await normalizedDownloadPromise;
  const normalizedCsv = parseCsv(await readFile((await normalizedDownload.path()), 'utf8'));
  expect(normalizedCsv.headers).toEqual(['Title', 'Vendor,Status']);
  expect(normalizedCsv.rows).toEqual([['CSV-DOCTOR-AMBIGUOUS-MARKER-3M8', 'Acme,active']]);

  await app.getByLabel('Filtrar por tipo').selectOption('all');
  await app.getByLabel('Buscar incidencia').fill('');
  await app.getByLabel('Tipo de importación').selectOption('update');
  await expect(app.getByText(/If you enable Shopify overwrite/)).toBeVisible();

  await app.getByLabel('Tipo de importación').selectOption('create');
  const importerSmoke = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-import-smoke.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-import-smoke.csv',
    mimeType: 'text/csv',
    buffer: importerSmoke,
  });
  await expect(app.getByText('2 filas', { exact: true })).toBeVisible();
  await expect(app.getByText('No se encontraron incidencias en las reglas actuales.')).toBeVisible();

  const incompleteOptions = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-option-values-incomplete.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-option-values-incomplete.csv',
    mimeType: 'text/csv',
    buffer: incompleteOptions,
  });
  await expect(app.locator('body')).toContainText('Option1 name has no matching value on this product row.');

  const marketCompareAtDependency = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-market-compare-at-dependency.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-market-compare-at-dependency.csv',
    mimeType: 'text/csv',
    buffer: marketCompareAtDependency,
  });
  await expect(app.locator('body')).toContainText('A fixed Price / South America is required when Compare At Price / South America is set.');
  await expect(app.getByRole('link', { name: /Fuente de Shopify/ })).toHaveAttribute(
    'href',
    'https://help.shopify.com/en/manual/markets/customizations/catalogs',
  );

  const marketIncludedValues = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-market-included-values.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-market-included-values.csv',
    mimeType: 'text/csv',
    buffer: marketIncludedValues,
  });
  await expect(app.locator('body')).toContainText('Review the value in Included / United States for market availability.');
  await expect(app.locator('body')).toContainText('Review the value in Included / South America for market availability.');

  const unsupportedMediaColumns = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-unsupported-media-columns.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-unsupported-media-columns.csv',
    mimeType: 'text/csv',
    buffer: unsupportedMediaColumns,
  });
  await expect(app.locator('body')).toContainText('Shopify product CSV does not import video or 3D media from the "Video URL" column.');
  await expect(app.locator('body')).toContainText('Shopify product CSV does not import video or 3D media from the "3D model URL" column.');

  await app.getByLabel('Tipo de importación').selectOption('update');
  await expect(app.getByText(/If you enable Shopify overwrite/)).toBeVisible();

  const requiredValues = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-required-values.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-required-values.csv',
    mimeType: 'text/csv',
    buffer: requiredValues,
  });
  await expect(app.locator('body')).toContainText('An update row with product data is missing its URL handle value.');
  await expect(app.locator('body')).not.toContainText('A product row is missing its Title value.');

  const duplicateOptions = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-duplicate-variant-options.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-duplicate-variant-options.csv',
    mimeType: 'text/csv',
    buffer: duplicateOptions,
  });
  await expect(app.locator('body')).toContainText('This product repeats an option value combination from row 2.');

  const duplicateProductHandles = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-duplicate-handles.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-duplicate-handles.csv',
    mimeType: 'text/csv',
    buffer: duplicateProductHandles,
  });
  await expect(app.locator('body')).toContainText('This product-start row repeats the handle from row 2.');

  const productHandleCharacters = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-handle-characters.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-handle-characters.csv',
    mimeType: 'text/csv',
    buffer: productHandleCharacters,
  });
  await expect(app.locator('body')).toContainText('This product handle contains characters outside Shopify’s documented letters, numbers, and hyphens.');

  const moreThanThreeOptions = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-more-than-three-options.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-more-than-three-options.csv',
    mimeType: 'text/csv',
    buffer: moreThanThreeOptions,
  });
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; "Option4 name" is outside that limit.');

  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-legacy-option-casing.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Title,URL handle,Option1 Name,Option1 Value,Option4 Name,Option4 Value,Option4 LINKEDTO\nShirt,shirt,Size,Small,Print,Striped,product.metafields.shopify.color',
    ),
  });
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; "Option4 Name" is outside that limit.');
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; "Option4 Value" is outside that limit.');
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; "Option4 LINKEDTO" is outside that limit.');
  await expect(app.locator('body')).not.toContainText('This header may be a typo for "Option3 Name".');

  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-option-header-whitespace.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Title,URL handle,Option4 Name , Option4 Value\nShirt,shirt,Print,Striped',
    ),
  });
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; "Option4 Name " is outside that limit.');
  await expect(app.locator('body')).toContainText('Shopify supports up to three product options; " Option4 Value" is outside that limit.');
  await expect(app.locator('body')).toContainText('A product CSV header has leading or trailing whitespace.');
  await expect(app.locator('body')).not.toContainText('This header may be a typo for "Option3 Name".');
  await expect(app.getByRole('table').getByRole('cell', { name: 'Print' })).toBeVisible();
  await expect(app.getByRole('table').getByRole('cell', { name: 'Striped' })).toBeVisible();

  const inventoryDependencies = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-inventory-dependencies.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-inventory-dependencies.csv',
    mimeType: 'text/csv',
    buffer: inventoryDependencies,
  });
  const appBody = app.locator('body');
  await expect(appBody).toContainText('Inventory quantity must be a number.');
  await expect(appBody).toContainText('Continue selling when out of stock must be deny or continue.');
  await expect(appBody).toContainText('Inventory quantity in a product CSV only applies to stores with one location.');
  await expect(appBody).toContainText('Inventory quantity in a product CSV only applies to stores with one location.');
  await expect(appBody).toContainText('Inventory is tracked but Inventory quantity is blank.');
  await expect(appBody).toContainText('SKU is required when using a custom fulfillment service.');
  await expect(appBody).toContainText('This custom fulfillment service name may not match Shopify’s handle format guidance.');
  await expect(appBody).toContainText('This Inventory tracker value is not listed in Shopify’s current product CSV guide.');

  const accentedTags = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-accented-tags.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-accented-tags.csv',
    mimeType: 'text/csv',
    buffer: accentedTags,
  });
  await expect(appBody).toContainText('Shopify recommends avoiding accented characters in product tags.');

  const productCategoryIds = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-category-ids.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-category-ids.csv',
    mimeType: 'text/csv',
    buffer: productCategoryIds,
  });
  await expect(appBody).toContainText("This Product category ID is not in Shopify's 2026-08 taxonomy release.");

  const optionLinkedTo = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-option-linkedto.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-option-linkedto.csv',
    mimeType: 'text/csv',
    buffer: optionLinkedTo,
  });
  await expect(appBody).toContainText("Option1 LinkedTo should use Shopify's documented product.metafields.shopify taxonomy-attribute format.");

  const partialInventoryDependencies = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-inventory-dependencies-partial.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-inventory-dependencies-partial.csv',
    mimeType: 'text/csv',
    buffer: partialInventoryDependencies,
  });
  await expect(appBody).toContainText('Shopify inventory tracking requires both the inventory policy and fulfillment service when either has a value.');

  const inventoryWithoutTracker = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-inventory-without-tracker.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-inventory-without-tracker.csv',
    mimeType: 'text/csv',
    buffer: inventoryWithoutTracker,
  });
  await expect(appBody).toContainText('Inventory quantity is provided while Inventory tracker is blank.');

  const booleanValues = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-boolean-values.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-boolean-values.csv',
    mimeType: 'text/csv',
    buffer: booleanValues,
  });
  await expect(appBody).toContainText('Published on online store should use the documented value true or false.');
  await expect(appBody).toContainText('Gift card should use the documented value true or false.');

  await app.getByLabel('Tipo de importación').selectOption('create');
  const giftCardCreate = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-gift-card-create.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-gift-card-create.csv',
    mimeType: 'text/csv',
    buffer: giftCardCreate,
  });
  await expect(appBody).toContainText('Shopify does not allow creating gift cards through a product CSV import.');

  const weightValues = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-weight-values.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-weight-values.csv',
    mimeType: 'text/csv',
    buffer: weightValues,
  });
  await expect(appBody).toContainText('Weight value (grams) should be a whole number in grams, without a unit.');
  await expect(appBody).toContainText('Weight unit for display should be g, kg, lb, or oz.');

  const imageMetadata = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-image-metadata.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-image-metadata.csv',
    mimeType: 'text/csv',
    buffer: imageMetadata,
  });
  await expect(appBody).toContainText('Image position must be a number greater than or equal to 1.');
  await expect(appBody).toContainText('Image alt text exceeds Shopify’s 512-character maximum.');

  const seoLimits = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-seo-limits.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-seo-limits.csv',
    mimeType: 'text/csv',
    buffer: seoLimits,
  });
  await expect(appBody).toContainText('SEO title exceeds Shopify’s 70-character limit.');
  await expect(appBody).toContainText('SEO description exceeds Shopify’s 320-character limit.');

  const blankPrice = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-blank-price.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-blank-price.csv',
    mimeType: 'text/csv',
    buffer: blankPrice,
  });
  await expect(appBody).toContainText('This product or variant row has a blank Price; Shopify documentation gives conflicting guidance.');

  const moneyFormat = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-money-format.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-money-format.csv',
    mimeType: 'text/csv',
    buffer: moneyFormat,
  });
  await expect(appBody).toContainText('Price should contain a numeric monetary value without a currency symbol.');
  await expect(appBody).toContainText('Compare-at price should contain a numeric monetary value without a currency symbol.');
  await expect(appBody).toContainText('Cost per item should contain a numeric monetary value without a currency symbol.');

  const salePriceComparison = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-sale-price-comparison.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-sale-price-comparison.csv',
    mimeType: 'text/csv',
    buffer: salePriceComparison,
  });
  await expect(appBody).toContainText('Compare-at price is not higher than Price; Shopify displays a sale price only when the compare-at price is higher.');

  const marketSalePrice = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-market-sale-price.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-market-sale-price.csv',
    mimeType: 'text/csv',
    buffer: marketSalePrice,
  });
  await expect(appBody).toContainText('Compare At Price / South America is not higher than Price / South America; Shopify displays a sale price only when the compare-at price is higher.');
  await expect(appBody).toContainText('Compare-at price / France is not higher than Price / France; Shopify displays a sale price only when the compare-at price is higher.');

  const marketMoneyFormat = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-market-money-format.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-market-money-format.csv',
    mimeType: 'text/csv',
    buffer: marketMoneyFormat,
  });
  await expect(appBody).toContainText('Price / South America should contain a numeric monetary value without a currency symbol.');
  await expect(appBody).toContainText('Compare At Price / South America should contain a numeric monetary value without a currency symbol.');
  await expect(appBody).toContainText('Compare-at price / France should contain a numeric monetary value without a currency symbol.');

  const unitPriceMeasurements = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-unit-price-measurements.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-product-unit-price-measurements.csv',
    mimeType: 'text/csv',
    buffer: unitPriceMeasurements,
  });
  await expect(appBody).toContainText('Unit price measurement fields are incomplete; review all four values together.');

  const marketCatalog = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-market-catalog.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-market-catalog.csv',
    mimeType: 'text/csv',
    buffer: marketCatalog,
  });
  await expect(appBody).toContainText('This looks like a Shopify Markets or B2B catalog CSV; product checks were skipped.');

  const b2bCatalogQuantityRules = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-b2b-catalog-quantity-rules.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-b2b-catalog-quantity-rules.csv',
    mimeType: 'text/csv',
    buffer: b2bCatalogQuantityRules,
  });
  await expect(appBody).toContainText('This looks like a Shopify Markets or B2B catalog CSV; product checks were skipped.');
  await expect(app.getByRole('link', { name: /Fuente de Shopify/ })).toHaveAttribute(
    'href',
    'https://help.shopify.com/en/manual/b2b/catalogs/creating-catalogs',
  );

  const customerCsv = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-customer.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-customer.csv',
    mimeType: 'text/csv',
    buffer: customerCsv,
  });
  await expect(appBody).toContainText('This looks like a Shopify customer CSV; product checks were skipped.');
  await expect(app.getByRole('link', { name: /Fuente de Shopify/ })).toHaveAttribute(
    'href',
    'https://help.shopify.com/en/manual/customers/import-export-customers',
  );

  const orderCsv = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-order-export.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-order-export.csv',
    mimeType: 'text/csv',
    buffer: orderCsv,
  });
  await expect(appBody).toContainText('This looks like a Shopify order export; product checks were skipped.');
  await expect(appBody).not.toContainText('This looks like a Shopify customer CSV');
  await expect(appBody).not.toContainText('An update row with product data is missing its URL handle value.');
  await expect(app.getByRole('link', { name: /Fuente de Shopify/ })).toHaveAttribute(
    'href',
    'https://help.shopify.com/en/manual/fulfillment/managing-orders/exporting-orders',
  );
  const orderCsvDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar CSV revisado' }).click();
  const orderCsvDownload = await orderCsvDownloadPromise;
  const exportedOrderCsv = parseCsv(await readFile(await orderCsvDownload.path(), 'utf8'));
  expect(exportedOrderCsv.headers).toEqual(parseCsv(orderCsv.toString()).headers);
  expect(exportedOrderCsv.rows).toEqual(parseCsv(orderCsv.toString()).rows);

  const unrelatedCsv = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-non-product.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'shopify-non-product.csv',
    mimeType: 'text/csv',
    buffer: unrelatedCsv,
  });
  await expect(appBody).toContainText('No Shopify product CSV headers were recognized; product checks were skipped.');
  await expect(appBody).not.toContainText('Shopify product CSV files use commas between columns');
  await expect(appBody).toContainText('El archivo exportado conserva el separador de origen y los valores de las celdas.');
  const unrelatedCsvDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar CSV revisado' }).click();
  const unrelatedCsvDownload = await unrelatedCsvDownloadPromise;
  const unrelatedCsvContent = await readFile(await unrelatedCsvDownload.path(), 'utf8');
  expect(unrelatedCsvContent).toBe('Order Number;Net Sales\r\n1001;29.99');

  const excessiveTags = Array.from({ length: 251 }, (_, index) => `tag-${index}`).join(',');
  await app.locator('input[type="file"]').setInputFiles({
    name: 'tags-over-limit.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Title,URL handle,Tags\nTag test,tag-test,"${excessiveTags}"`, 'utf8'),
  });
  await expect(appBody).toContainText('This product has 251 tags; Shopify allows a maximum of 250.');

  await app.locator('input[type="file"]').setInputFiles({
    name: 'tag-symbols.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,URL handle,Tags\nTag test,tag-test,summer_sale', 'utf8'),
  });
  await expect(appBody).toContainText('Shopify recommends using letters, numbers, and hyphens in product tags.');

  const excessiveBarcodes = Array.from({ length: 21 }, (_, index) => `code-${index}`).join(';');
  await app.locator('input[type="file"]').setInputFiles({
    name: 'barcodes-over-limit.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Title,URL handle,Option1 name,Option1 value,Barcodes\nBarcode test,barcode-test,Size,Small,"${excessiveBarcodes}"`, 'utf8'),
  });
  await expect(appBody).toContainText('This product or variant has 21 barcodes; Shopify allows a maximum of 20.');

  const longCollection = 'c'.repeat(256);
  await app.locator('input[type="file"]').setInputFiles({
    name: 'collection-over-limit.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Title,URL handle,Collection\nCollection test,collection-test,"${longCollection}"`, 'utf8'),
  });
  await expect(appBody).toContainText('This collection name has 256 characters; Shopify allows a maximum of 255.');

  const productImageRows = Array.from({ length: 251 }, (_, index) => `${index === 0 ? 'Image limit' : ''},image-limit,https://cdn.example.test/image-${index}.jpg`);
  await app.locator('input[type="file"]').setInputFiles({
    name: 'product-images-over-limit.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Title,URL handle,Product image URL\n${productImageRows.join('\n')}`, 'utf8'),
  });
  await expect(appBody).toContainText('This product lists 251 product image URL entries; Shopify allows a maximum of 250 images per product.');

  const privateImageUrlMarker = 'CSV-DOCTOR-IMAGE-PRIVATE-9K2';
  await app.locator('input[type="file"]').setInputFiles({
    name: 'image-url-not-https.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Title,URL handle,Product image URL\nImage URL test,image-url-test,http://cdn.example.test/${privateImageUrlMarker}`, 'utf8'),
  });
  await expect(appBody).toContainText('This image URL uses HTTP; verify it is a public, direct image link before importing.');
  await expect(appBody).toContainText('Because Shopify documentation differs on the scheme, this is informational only.');
  expect(requestUrls.join('\n')).not.toContain(privateImageUrlMarker);
  expect(requestBodies.join('\n')).not.toContain(privateImageUrlMarker);

  const imageSharingLinks = await readFile(resolve(process.cwd(), '..', 'fixtures', 'shopify-product-image-sharing-links.csv'));
  await app.locator('input[type="file"]').setInputFiles({
    name: 'image-sharing-links.csv',
    mimeType: 'text/csv',
    buffer: imageSharingLinks,
  });
  const previewLinkWarning = 'This image URL looks like a Google Drive or Dropbox sharing page, not a direct image file URL.';
  await expect(appBody).toContainText(previewLinkWarning);
  await expect(appBody.getByText(previewLinkWarning, { exact: false }).first()).toBeVisible();
  for (const imageUrlMarker of ['FILE123', 'FILE456', 'FILE789', 'FILE012', 'FILE345', 'FILE678']) {
    expect(requestUrls.join('\n')).not.toContain(imageUrlMarker);
    expect(requestBodies.join('\n')).not.toContain(imageUrlMarker);
  }

  await app.locator('input[type="file"]').setInputFiles({
    name: 'thumbnail-suffix.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,URL handle,Product image URL\nThumbnail test,thumbnail-test,https://cdn.example.test/product_thumb.jpg?size=large', 'utf8'),
  });
  await expect(appBody).toContainText('This product image URL uses a _thumb, _small, or _medium filename suffix.');

  await app.locator('body').evaluate((body) => {
    const windowObject = body.ownerDocument.defaultView!;
    const windowWithTestHooks = windowObject as typeof windowObject & {
      __realWorker?: typeof Worker;
      __terminatedWorkers?: number;
    };
    windowWithTestHooks.__realWorker = windowObject.Worker;
    windowWithTestHooks.__terminatedWorkers = 0;
    windowObject.Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage() {}
      terminate() {
        windowWithTestHooks.__terminatedWorkers! += 1;
      }
    } as unknown as typeof Worker;
  });
  await app.locator('input[type="file"]').setInputFiles({
    name: 'cancel-analysis.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,Vendor\nMug,Example', 'utf8'),
  });
  const analysisStatus = app.getByRole('status').first();
  await expect(analysisStatus).toHaveText('Analizando el archivo localmente.');
  await app.getByRole('button', { name: 'Cancelar' }).click();
  await expect(analysisStatus).toHaveText('Análisis cancelado.');
  expect(await app.locator('body').evaluate((body) => {
    const windowWithTestHooks = body.ownerDocument.defaultView as (Window & { __terminatedWorkers?: number });
    return windowWithTestHooks.__terminatedWorkers;
  })).toBe(1);

  await app.locator('input[type="file"]').setInputFiles({
    name: 'unmount-analysis.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,Vendor\nMug,Example', 'utf8'),
  });
  await expect(analysisStatus).toHaveText('Analizando el archivo localmente.');
  await app.getByRole('link', { name: 'Guía rápida de uso' }).click();
  await expect.poll(() => appFrame.url()).toContain('/guide');
  expect(await app.locator('body').evaluate((body) => {
    const windowWithTestHooks = body.ownerDocument.defaultView as (Window & { __terminatedWorkers?: number });
    return windowWithTestHooks.__terminatedWorkers;
  })).toBe(2);

  await app.locator('body').evaluate((body) => {
    const windowWithTestHooks = body.ownerDocument.defaultView as (Window & { __realWorker?: typeof Worker });
    if (windowWithTestHooks.__realWorker) body.ownerDocument.defaultView!.Worker = windowWithTestHooks.__realWorker;
  });
  await app.getByRole('button', { name: 'Volver al analizador' }).click();
  await expect.poll(() => appFrame.url()).toContain('/app');

  await app.locator('input[type="file"]').setInputFiles({
    name: 'malformed.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,Description\nMug,"unfinished description', 'utf8'),
  });
  await expect(app.getByRole('heading', { name: 'Resultado del análisis' })).toBeVisible();
  await expect(app.getByRole('alert').filter({ hasText: 'Descarga bloqueada' })).toBeVisible();
  await expect(app.getByRole('button', { name: 'Descargar CSV revisado' })).toBeDisabled();
  await expect(app.getByRole('button', { name: 'Descargar informe JSON' })).toBeDisabled();

  await app.locator('input[type="file"]').setInputFiles({
    name: 'invalid-utf8.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([0x54, 0x69, 0x74, 0x6c, 0x65, 0x0a, 0xc3, 0x28]),
  });
  await expect(app.getByRole('alert')).toContainText('No se pudo leer como UTF-8.');
  await expect(app.getByRole('heading', { name: 'Resultado del análisis' })).not.toBeVisible();

  const longDescription = 'x'.repeat(19_999_950);
  const nearLimitCsv = Buffer.from(`Title,Description\nMug,"${longDescription}"\n`, 'utf8');
  expect(nearLimitCsv.byteLength).toBeLessThanOrEqual(20_000_000);
  const nearLimitStartedAt = performance.now();
  await app.locator('input[type="file"]').setInputFiles({
    name: 'near-local-limit.csv',
    mimeType: 'text/csv',
    buffer: nearLimitCsv,
  });
  await expect(app.getByRole('status').first()).toContainText('Análisis completado: 1 filas');
  await expect(app.getByText('Shopify product CSV files cannot exceed 15 MB; split this file before importing.')).toBeVisible();
  await expect(app.locator('a[href="https://help.shopify.com/en/manual/products/import-export/import-products"]')).toBeVisible();
  const renderedDescription = app.getByRole('table').locator('tbody td').nth(1);
  await expect(renderedDescription).toContainText('…');
  expect(await renderedDescription.evaluate((cell) => cell.textContent?.length)).toBe(501);
  console.log(`[perf] ${nearLimitCsv.byteLength}-byte local analysis, Shopify size diagnostic, and preview: ${Math.round(performance.now() - nearLimitStartedAt)} ms`);
  const largeCsvDownloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Descargar CSV revisado' }).click();
  const largeCsvDownload = await largeCsvDownloadPromise;
  const largeCsvExport = parseCsv(await readFile((await largeCsvDownload.path()), 'utf8'));
  expect(largeCsvExport.rows[0]?.[1]?.length).toBe(longDescription.length);

  const overLocalLimitCsv = Buffer.concat([nearLimitCsv, Buffer.alloc(26, 0x20)]);
  expect(overLocalLimitCsv.byteLength).toBe(20_000_001);
  await app.locator('input[type="file"]').setInputFiles({
    name: 'over-local-limit.csv',
    mimeType: 'text/csv',
    buffer: overLocalLimitCsv,
  });
  await expect(app.getByRole('alert')).toContainText('El archivo supera el límite local de análisis de 20 MB.');
  await expect(app.getByRole('heading', { name: 'Resultado del análisis' })).not.toBeVisible();

  const rowLimitCsv = Buffer.from(`Title\n${'Mug\n'.repeat(100_001)}`, 'utf8');
  const rowLimitStartedAt = performance.now();
  await app.locator('input[type="file"]').setInputFiles({
    name: 'row-limit.csv',
    mimeType: 'text/csv',
    buffer: rowLimitCsv,
  });
  await expect(app.getByRole('alert')).toContainText('Descarga bloqueada: el análisis detectó');
  await expect(app.getByRole('button', { name: 'Descargar CSV revisado' })).toBeDisabled();
  await expect(app.getByRole('button', { name: 'Descargar informe JSON' })).toBeDisabled();
  console.log(`[perf] 100,001-row limit diagnosis: ${Math.round(performance.now() - rowLimitStartedAt)} ms`);

  expect(requestBodies.join('\n')).not.toContain('CSV-DOCTOR-PRIVATE-MARKER-7Q4');
  expect(requestBodies.join('\n')).not.toContain('CSV-DOCTOR-AMBIGUOUS-MARKER-3M8');
});
