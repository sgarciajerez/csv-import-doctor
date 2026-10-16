import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parseCsv, serializeCsv, validateShopifyProductCsv } from '../src/index.js';

const inventoryFixture = readFileSync(new URL('../../../fixtures/shopify-inventory.csv', import.meta.url), 'utf8');
const availableInventoryFixture = readFileSync(new URL('../../../fixtures/shopify-inventory-available.csv', import.meta.url), 'utf8');
const imageFixture = readFileSync(new URL('../../../fixtures/shopify-product-images.csv', import.meta.url), 'utf8');
const marketFixture = readFileSync(new URL('../../../fixtures/shopify-product-markets.csv', import.meta.url), 'utf8');
const marketCompareAtDependencyFixture = readFileSync(new URL('../../../fixtures/shopify-product-market-compare-at-dependency.csv', import.meta.url), 'utf8');
const marketMoneyFormatFixture = readFileSync(new URL('../../../fixtures/shopify-product-market-money-format.csv', import.meta.url), 'utf8');
const marketSalePriceFixture = readFileSync(new URL('../../../fixtures/shopify-product-market-sale-price.csv', import.meta.url), 'utf8');
const marketIncludedValuesFixture = readFileSync(new URL('../../../fixtures/shopify-product-market-included-values.csv', import.meta.url), 'utf8');
const unsupportedMediaColumnsFixture = readFileSync(new URL('../../../fixtures/shopify-product-unsupported-media-columns.csv', import.meta.url), 'utf8');
const barcodeHeaderOverlapFixture = readFileSync(new URL('../../../fixtures/shopify-product-barcode-header-overlap.csv', import.meta.url), 'utf8');
const productMetafieldsFixture = readFileSync(new URL('../../../fixtures/shopify-product-metafields.csv', import.meta.url), 'utf8');
const legacyMarketsMetafieldsFixture = readFileSync(new URL('../../../fixtures/shopify-product-legacy-markets-metafields.csv', import.meta.url), 'utf8');
const conflictingHeaderAliasesFixture = readFileSync(new URL('../../../fixtures/shopify-product-conflicting-aliases.csv', import.meta.url), 'utf8');
const conflictingImageAliasesFixture = readFileSync(new URL('../../../fixtures/shopify-product-conflicting-image-aliases.csv', import.meta.url), 'utf8');
const conflictingOptionLinkedToHeadersFixture = readFileSync(new URL('../../../fixtures/shopify-product-conflicting-option-linkedto-headers.csv', import.meta.url), 'utf8');
const conflictingMarketCompareAtHeadersFixture = readFileSync(new URL('../../../fixtures/shopify-product-conflicting-market-compare-at-headers.csv', import.meta.url), 'utf8');
const salePriceComparisonFixture = readFileSync(new URL('../../../fixtures/shopify-product-sale-price-comparison.csv', import.meta.url), 'utf8');
const currentProductHeadersFixture = readFileSync(new URL('../../../fixtures/shopify-product-current-headers.csv', import.meta.url), 'utf8');
const googleShoppingHeadersFixture = readFileSync(new URL('../../../fixtures/shopify-product-google-shopping-headers.csv', import.meta.url), 'utf8');
const inventoryDependenciesFixture = readFileSync(new URL('../../../fixtures/shopify-product-inventory-dependencies.csv', import.meta.url), 'utf8');
const partialInventoryDependenciesFixture = readFileSync(new URL('../../../fixtures/shopify-product-inventory-dependencies-partial.csv', import.meta.url), 'utf8');
const inventoryWithoutTrackerFixture = readFileSync(new URL('../../../fixtures/shopify-product-inventory-without-tracker.csv', import.meta.url), 'utf8');
const duplicateVariantOptionsFixture = readFileSync(new URL('../../../fixtures/shopify-product-duplicate-variant-options.csv', import.meta.url), 'utf8');
const blankPriceFixture = readFileSync(new URL('../../../fixtures/shopify-product-blank-price.csv', import.meta.url), 'utf8');
const giftCardCreateFixture = readFileSync(new URL('../../../fixtures/shopify-product-gift-card-create.csv', import.meta.url), 'utf8');
const booleanValuesFixture = readFileSync(new URL('../../../fixtures/shopify-product-boolean-values.csv', import.meta.url), 'utf8');
const weightValuesFixture = readFileSync(new URL('../../../fixtures/shopify-product-weight-values.csv', import.meta.url), 'utf8');
const imageMetadataFixture = readFileSync(new URL('../../../fixtures/shopify-product-image-metadata.csv', import.meta.url), 'utf8');
const seoLimitsFixture = readFileSync(new URL('../../../fixtures/shopify-product-seo-limits.csv', import.meta.url), 'utf8');
const accentedTagsFixture = readFileSync(new URL('../../../fixtures/shopify-product-accented-tags.csv', import.meta.url), 'utf8');
const productCategoryIdsFixture = readFileSync(new URL('../../../fixtures/shopify-product-category-ids.csv', import.meta.url), 'utf8');
const requiredValuesFixture = readFileSync(new URL('../../../fixtures/shopify-product-required-values.csv', import.meta.url), 'utf8');
const optionLinkedToFixture = readFileSync(new URL('../../../fixtures/shopify-product-option-linkedto.csv', import.meta.url), 'utf8');
const duplicateProductHandlesFixture = readFileSync(new URL('../../../fixtures/shopify-product-duplicate-handles.csv', import.meta.url), 'utf8');
const productHandleCharactersFixture = readFileSync(new URL('../../../fixtures/shopify-product-handle-characters.csv', import.meta.url), 'utf8');
const moreThanThreeOptionsFixture = readFileSync(new URL('../../../fixtures/shopify-product-more-than-three-options.csv', import.meta.url), 'utf8');
const diagnosticCatalog = readFileSync(new URL('../../../docs/DIAGNOSTIC_RULES.md', import.meta.url), 'utf8');
const shopifyProfileSource = readFileSync(new URL('../src/shopify-profile.ts', import.meta.url), 'utf8');

describe('parseCsv', () => {
  it('strips a UTF-8 BOM and preserves quoted commas, quotes, newlines, and Unicode', () => {
    const csv = '\uFEFFTitle,Description\r\nMug,"A, \"\"great\"\" mug\nfor cafÃ©"';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['Title', 'Description']);
    expect(result.rows).toEqual([['Mug', 'A, "great" mug\nfor cafÃ©']]);
    expect(result.issues).toEqual([]);
  });

  it('reports duplicate headers and records with the wrong number of cells', () => {
    const result = parseCsv('Title,SKU,sku\nMug,123,456\nCup,789');
    expect(result.issues.map((item) => item.ruleId)).toContain('duplicate-header');
    expect(result.issues).toContainEqual(expect.objectContaining({ ruleId: 'column-count-mismatch', row: 3 }));
  });

  it('normalizes Shopify header identifiers independently of the device locale', () => {
    const localeMethod = String.prototype.toLocaleLowerCase;
    const localeDescriptor = Object.getOwnPropertyDescriptor(String.prototype, 'toLocaleLowerCase');
    Object.defineProperty(String.prototype, 'toLocaleLowerCase', {
      ...localeDescriptor,
      value: function forcedTurkishLowercase(this: string, locales?: string | string[]) {
        return localeMethod.call(this, locales ?? 'tr');
      },
    });

    try {
      const parsed = parseCsv('IMAGE SRC,image src\nhttps://cdn.example.test/a.jpg,https://cdn.example.test/b.jpg');
      expect(parsed.issues).toContainEqual(expect.objectContaining({ ruleId: 'duplicate-header', row: 1 }));
      expect(validateShopifyProductCsv(parsed, { mode: 'create' }))
        .not.toContainEqual(expect.objectContaining({ ruleId: 'unrecognized-product-header' }));
    } finally {
      if (localeDescriptor) Object.defineProperty(String.prototype, 'toLocaleLowerCase', localeDescriptor);
    }
  });

  it('assigns complete, categorized, stable parser diagnostics with unique IDs and logical rows', () => {
    const source = 'Title,Title,Title,Description\nMug,first,second,"line one\nline two"\nCup,third,fourth';
    const firstRun = parseCsv(source);
    const secondRun = parseCsv(source);
    const duplicateHeaders = firstRun.issues.filter((issue) => issue.ruleId === 'duplicate-header');
    const mismatch = firstRun.issues.find((issue) => issue.ruleId === 'column-count-mismatch');

    expect(new Set(firstRun.issues.map((issue) => issue.id)).size).toBe(firstRun.issues.length);
    expect(firstRun.issues.map((issue) => issue.id)).toEqual(secondRun.issues.map((issue) => issue.id));
    expect(duplicateHeaders.map((issue) => issue.id)).toEqual([
      'duplicate-header-1-Title-c2',
      'duplicate-header-1-Title-c3',
    ]);
    expect(mismatch).toMatchObject({ row: 3, category: 'parser', fixSafety: 'manual' });
    for (const issue of firstRun.issues) {
      expect(issue).toMatchObject({
        id: expect.any(String),
        ruleId: expect.any(String),
        severity: 'error',
        category: 'parser',
        message: expect.any(String),
        explanation: expect.any(String),
        fixSafety: 'manual',
      });
    }
  });

  it('supports explicitly selected delimiters', () => {
    const result = parseCsv('Title;URL handle\nMug;mug', { delimiter: ';' });
    expect(result.delimiter).toBe(';');
    expect(result.headers).toEqual(['Title', 'URL handle']);
  });

  it('reports ambiguous delimiter detection and honors the user-selected delimiter on reparse', () => {
    const source = 'Title;Vendor,Status\nMug;Acme,active';
    const detected = parseCsv(source);
    expect(detected.delimiter).toBe(',');
    expect(detected.issues.map((item) => item.ruleId)).toContain('delimiter-ambiguous');

    const confirmed = parseCsv(source, { delimiter: ';' });
    expect(confirmed.delimiter).toBe(';');
    expect(confirmed.issues.map((item) => item.ruleId)).not.toContain('delimiter-ambiguous');
    expect(confirmed.headers).toEqual(['Title', 'Vendor,Status']);
    expect(confirmed.rows).toEqual([['Mug', 'Acme,active']]);
  });

  it('enforces configurable input limits', () => {
    expect(parseCsv('Title\nMug', { maxCharacters: 4 }).issues[0]?.ruleId).toBe('file-too-large');
    expect(parseCsv('Title\nMug\nCup', { maxRows: 1 }).issues[0]?.ruleId).toBe('row-limit-exceeded');
  });

  it('reports malformed quoted fields', () => {
    const result = parseCsv('Title,Description\nMug,"unfinished description');
    const parserIssue = result.issues.find((item) => item.ruleId.startsWith('parser-'));
    expect(parserIssue).toMatchObject({
      id: expect.any(String),
      ruleId: expect.stringMatching(/^parser-/),
      severity: 'error',
      category: 'parser',
      row: 2,
      message: expect.any(String),
      explanation: expect.any(String),
      fixSafety: 'manual',
    });
  });
});

describe('validateShopifyProductCsv', () => {
  it('rejects partial values for Shopify inventory-related columns only when a related value is supplied', () => {
    const parsed = parseCsv(partialInventoryDependenciesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const dependencyIssues = issues.filter((issue) => issue.ruleId === 'incomplete-inventory-dependency-values');

    expect(dependencyIssues).toMatchObject([
      {
        severity: 'error',
        category: 'shopify-profile',
        row: 2,
        column: 'Inventory tracker / Continue selling when out of stock / Fulfillment service',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      },
      { row: 3, severity: 'error' },
    ]);
    expect(dependencyIssues.map((issue) => issue.row)).toEqual([2, 3]);
    expect(parsed.rows[0]?.[5]).toBe('continue');
    expect(parsed.rows[0]?.[6]).toBe('');
    expect(parsed.rows[3]?.[5]).toBe('deny');
    expect(issues.filter((issue) => issue.ruleId === 'incomplete-inventory-dependency-values' && (issue.row ?? 0) >= 4)).toEqual([]);
  });

  it('documents every active Shopify profile rule in the diagnostic catalog', () => {
    const ruleIds = [...shopifyProfileSource.matchAll(/makeIssue\(\s*'([^']+)'/gs)].map((match) => match[1]!);
    expect(ruleIds.length).toBeGreaterThan(0);
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    for (const ruleId of ruleIds) {
      expect(diagnosticCatalog, ruleId).toContain(`| \`${ruleId}\` |`);
    }
    for (const parserRuleId of [
      'file-too-large', 'row-limit-exceeded', 'file-empty', 'delimiter-ambiguous',
      'duplicate-header', 'column-count-mismatch', 'parser-<Papa Parse error code>',
    ]) {
      expect(diagnosticCatalog, parserRuleId).toContain(`\`${parserRuleId}\``);
    }
  });

  it('enforces the diagnostic contract and catalog across every CSV fixture and import mode', () => {
    const fixtureDirectory = new URL('../../../fixtures/', import.meta.url);
    const fixtureNames = readdirSync(fixtureDirectory).filter((name) => name.endsWith('.csv')).sort();
    expect(fixtureNames.length).toBeGreaterThan(0);

    for (const fixtureName of fixtureNames) {
      const fixture = readFileSync(new URL(fixtureName, fixtureDirectory), 'utf8');
      const parsed = parseCsv(fixture);
      const parserIssues = parsed.issues;

      for (const issue of parserIssues) {
        expect(issue).toMatchObject({
          id: expect.any(String),
          ruleId: expect.any(String),
          severity: expect.stringMatching(/^(error|warning|info)$/),
          category: 'parser',
          message: expect.any(String),
          explanation: expect.any(String),
          fixSafety: expect.stringMatching(/^(safe|review|manual)$/),
        });
        const catalogRule = issue.ruleId.startsWith('parser-') ? 'parser-<Papa Parse error code>' : issue.ruleId;
        expect(diagnosticCatalog, `${fixtureName}: ${issue.ruleId}`).toContain('`' + catalogRule + '`');
      }

      for (const mode of ['create', 'update'] as const) {
        const issues = validateShopifyProductCsv(parsed, { mode });
        const repeatedRun = validateShopifyProductCsv(parsed, { mode });
        expect(issues.map((issue) => issue.id), `${fixtureName}: unstable issue ids in ${mode} mode`)
          .toEqual(repeatedRun.map((issue) => issue.id));

        for (const issue of issues) {
          expect(issue).toMatchObject({
            id: expect.any(String),
            ruleId: expect.any(String),
            severity: expect.stringMatching(/^(error|warning|info)$/),
            category: expect.stringMatching(/^(shopify-profile|recommendation)$/),
            message: expect.any(String),
            explanation: expect.any(String),
            fixSafety: expect.stringMatching(/^(safe|review|manual)$/),
            sourceUrl: expect.stringMatching(/^https:\/\/(help\.shopify\.com|shopify\.dev|github\.com\/Shopify\/product-taxonomy\/releases)\//),
            profileVersion: expect.stringMatching(/^shopify-product-csv-/),
          });
          if (issue.row !== undefined) expect(issue.row).toBeGreaterThanOrEqual(1);
          if (issue.column !== undefined) expect(issue.column.length).toBeGreaterThan(0);
          expect(diagnosticCatalog, `${fixtureName}/${mode}: ${issue.ruleId}`).toContain('| `' + issue.ruleId + '` |');
        }
      }
    }
  });

  it('requires Title for creation and handle for variant rows', () => {
    const parsed = parseCsv('Title,Option1 name,Option1 value\n,Size,Small');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map((item) => item.ruleId)).toEqual(['required-title-value', 'variant-handle-required']);
  });

  it('warns when a distinct product-start row repeats a handle but allows same-handle continuation rows', () => {
    const parsed = parseCsv(duplicateProductHandlesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.filter((issue) => issue.ruleId === 'duplicate-product-handle')).toEqual([
      expect.objectContaining({
        severity: 'warning',
        category: 'recommendation',
        row: 4,
        column: 'URL handle',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      }),
    ]);
    expect(issues.filter((issue) => issue.ruleId === 'duplicate-product-handle').map((issue) => issue.row)).toEqual([4]);
    expect(parsed.rows.map((row) => row[1])).toEqual(['shared-handle', 'shared-handle', 'shared-handle']);

    const noncontiguousContinuation = parseCsv(
      'Title,URL handle,Option1 name,Option1 value\nShirt,shirt,Size,Small\nCap,cap,Size,One\n,shirt,Size,Medium',
    );
    expect(validateShopifyProductCsv(noncontiguousContinuation, { mode: 'create' })
      .map((issue) => issue.ruleId)).not.toContain('duplicate-product-handle');
  });

  it('requires nonblank product identity values in create and update modes while allowing valid continuations', () => {
    const csv = parseCsv(requiredValuesFixture);
    const createIssues = validateShopifyProductCsv(csv, { mode: 'create' });
    expect(createIssues.filter((issue) => ['required-title-value', 'required-handle-value', 'variant-handle-required'].includes(issue.ruleId)))
      .toMatchObject([
        { ruleId: 'variant-handle-required', row: 5, column: 'URL handle' },
      ]);
    expect(createIssues.map((issue) => issue.ruleId)).not.toContain('required-title-value');

    const updateIssues = validateShopifyProductCsv(csv, { mode: 'update' });
    expect(updateIssues.filter((issue) => ['required-title-value', 'required-handle-value'].includes(issue.ruleId)))
      .toMatchObject([
        { ruleId: 'required-handle-value', row: 4, column: 'URL handle' },
        { ruleId: 'required-handle-value', row: 5, column: 'URL handle' },
      ]);
    expect(updateIssues.map((issue) => issue.ruleId)).not.toContain('required-title-value');

    const blankTitleProduct = validateShopifyProductCsv(parseCsv('Title,URL handle\n,mug'), { mode: 'update' });
    expect(blankTitleProduct).toContainEqual(expect.objectContaining({
      ruleId: 'required-title-value', row: 2, column: 'Title', severity: 'error',
    }));
    const blankUpdateHandle = validateShopifyProductCsv(parseCsv('Title,URL handle\nMug,'), { mode: 'update' });
    expect(blankUpdateHandle).toContainEqual(expect.objectContaining({
      ruleId: 'required-handle-value', row: 2, column: 'URL handle', severity: 'error',
    }));
    const handlelessContinuation = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Vendor\nShirt,shirt,\n,,Acme'),
      { mode: 'update' },
    );
    expect(handlelessContinuation).toContainEqual(expect.objectContaining({
      ruleId: 'required-handle-value', row: 3, column: 'URL handle', severity: 'error',
    }));
    const continuation = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Option1 name,Option1 value\nShirt,shirt,Size,Small\n,shirt,Size,Large'),
      { mode: 'update' },
    );
    expect(continuation.map((issue) => issue.ruleId)).not.toContain('required-title-value');
    expect(continuation.map((issue) => issue.ruleId)).not.toContain('required-handle-value');
  });

  it('checks only the documented taxonomy metafield namespace for Option LinkedTo values', () => {
    const parsed = parseCsv(optionLinkedToFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const linkedToIssues = issues.filter((issue) => issue.ruleId === 'invalid-option-linkedto-format');

    expect(linkedToIssues).toMatchObject([
      {
        severity: 'warning',
        category: 'recommendation',
        row: 3,
        column: 'Option1 LinkedTo',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      },
      {
        severity: 'warning',
        category: 'recommendation',
        row: 3,
        column: 'Option2 LinkedTo',
      },
      {
        severity: 'warning',
        category: 'recommendation',
        row: 4,
        column: 'Option1 LinkedTo',
      },
    ]);
    expect(issues.map((issue) => issue.ruleId)).not.toContain('required-title-value');
    expect(parsed.rows[0]?.[4]).toBe('product.metafields.shopify.color');
    expect(parsed.rows[1]?.[4]).toBe('product.metafields.custom.color');
    expect(parsed.rows[2]?.[4]).toBe('product.metafields.shopify.');
    expect(parsed.rows[0]?.[3]).toBe('gid://shopify/Metaobject/123');

    const officialTemplateSpelling = parseCsv(
      'Title,URL handle,Option1 Linked To\nShirt,shirt,product.metafields.custom.color',
    );
    expect(validateShopifyProductCsv(officialTemplateSpelling, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'invalid-option-linkedto-format',
      column: 'Option1 Linked To',
    }));
    expect(officialTemplateSpelling.rows[0]?.[2]).toBe('product.metafields.custom.color');
  });

  it('recognizes headers from the documented older Shopify product CSV template', () => {
    const legacyCsv = parseCsv(
      'Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price\nshirt,Shirt,Size,Small,SHIRT-S,19.99\nshirt,,Size,Large,SHIRT-L,19.99',
    );
    const createIssues = validateShopifyProductCsv(legacyCsv, { mode: 'create' });
    expect(createIssues).toContainEqual(expect.objectContaining({
      ruleId: 'legacy-product-headers-detected',
      severity: 'info',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    }));
    expect(createIssues.map((issue) => issue.ruleId)).toEqual(['legacy-product-headers-detected']);

    const updateIssues = validateShopifyProductCsv(legacyCsv, { mode: 'update' });
    expect(updateIssues.map((issue) => issue.ruleId)).toEqual([
      'legacy-product-headers-detected',
      'update-overwrite-blank-semantics',
      'variant-option-change-may-replace-ids',
      'variant-option-change-may-replace-ids',
    ]);
  });

  it('warns when current and legacy aliases for the same Shopify field are mixed', () => {
    const parsed = parseCsv(conflictingHeaderAliasesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const aliasWarnings = issues.filter((issue) => issue.ruleId === 'conflicting-header-aliases');

    expect(aliasWarnings.map((issue) => issue.column)).toEqual([
      'URL handle / Handle',
      'Description / Body (HTML)',
      'Price / Variant Price',
    ]);
    for (const issue of aliasWarnings) {
      expect(issue).toMatchObject({
        severity: 'warning',
        category: 'recommendation',
        row: 1,
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
      expect(issue.explanation).toContain('does not specify how both columns are handled together');
    }
    expect(aliasWarnings).toHaveLength(3);
    expect(parsed.headers).toContain('Variant Price');
    expect(parsed.rows[0]).toEqual(['Mug', 'mug-current', 'mug-legacy', 'Current description', 'Legacy description', '12.00', '10.00']);
    expect(issues.map((issue) => issue.ruleId)).not.toContain('required-header-title');
  });

  it('recognizes legacy image headers and warns when current and legacy image aliases coexist', () => {
    const parsed = parseCsv(conflictingImageAliasesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const aliasWarnings = issues.filter((issue) => issue.ruleId === 'conflicting-header-aliases');

    expect(issues).toContainEqual(expect.objectContaining({
      ruleId: 'legacy-product-headers-detected',
      column: 'Image Src / Image Alt Text',
      severity: 'info',
    }));
    expect(aliasWarnings.map((issue) => issue.column)).toEqual([
      'Product image URL / Image Src',
      'Image alt text / Image Alt Text',
    ]);
    expect(aliasWarnings.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
    expect(parseCsv(serializeCsv(parsed).content).headers).toEqual(parsed.headers);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });

  it('warns when current and downloadable-template Option LinkedTo spellings coexist', () => {
    const parsed = parseCsv(conflictingOptionLinkedToHeadersFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const conflict = issues.find((issue) => issue.ruleId === 'conflicting-header-aliases');

    expect(conflict).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      row: 1,
      column: 'Option1 LinkedTo / Option1 Linked To',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(conflict?.explanation).toContain('does not document how both columns are handled together');
    expect(issues.map((issue) => issue.ruleId)).toEqual(['conflicting-header-aliases']);
    expect(parseCsv(serializeCsv(parsed).content).headers).toEqual(parsed.headers);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });

  it('warns when both documented market compare-at header spellings coexist for one market', () => {
    const parsed = parseCsv(conflictingMarketCompareAtHeadersFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const conflict = issues.find((issue) => issue.ruleId === 'conflicting-header-aliases');

    expect(conflict).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      row: 1,
      column: 'Compare At Price / South America / Compare-at price / South America',
      sourceUrl: 'https://help.shopify.com/uk/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(conflict?.explanation).toContain('does not specify how both columns for the same market are handled together');
    expect(issues.map((issue) => issue.ruleId)).toEqual(['conflicting-header-aliases']);
    expect(parseCsv(serializeCsv(parsed).content).headers).toEqual(parsed.headers);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);

    const differentMarkets = parseCsv(
      'Title,URL handle,Price / South America,Compare At Price / South America,Price / Japan,Compare-at price / Japan\nShirt,shirt,19.99,29.99,18.99,28.99',
    );
    expect(validateShopifyProductCsv(differentMarkets, { mode: 'create' }))
      .not.toContainEqual(expect.objectContaining({ ruleId: 'conflicting-header-aliases' }));
  });

  it('allows a simple product without a handle and continuation rows with blank product fields', () => {
    expect(validateShopifyProductCsv(parseCsv('Title\nMug'), { mode: 'create' })).toEqual([]);

    const variants = parseCsv('Title,URL handle,Option1 name,Option1 value\nShirt,shirt,Size,Small\n,shirt,Size,Large');
    expect(validateShopifyProductCsv(variants, { mode: 'create' })).toEqual([]);
  });

  it('requires both current identifier columns for product updates', () => {
    const parsed = parseCsv('SKU\n123');
    expect(validateShopifyProductCsv(parsed, { mode: 'update' }).map((item) => item.ruleId)).toEqual([
      'required-header-title',
      'required-header-handle',
      'variant-identity-columns-missing',
      'update-overwrite-blank-semantics',
    ]);
  });

  it('warns about non-comma source delimiters so Shopify-compatible export can normalize them', () => {
    const parsed = parseCsv('Title;URL handle\nMug;mug');
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'product-csv-delimiter-not-comma',
      severity: 'warning',
    }));
  });

  it('reports Shopify product CSVs above 15 MB without applying that product limit to inventory files', () => {
    const product = parseCsv('Title,Description\nMug,A cup');
    expect(validateShopifyProductCsv(product, { mode: 'create', fileSizeBytes: 15_000_000 })
      .map((issue) => issue.ruleId)).not.toContain('product-csv-exceeds-size-limit');
    const oversizedIssue = validateShopifyProductCsv(product, { mode: 'create', fileSizeBytes: 15_000_001 })
      .find((issue) => issue.ruleId === 'product-csv-exceeds-size-limit');
    expect(oversizedIssue).toMatchObject({
      ruleId: 'product-csv-exceeds-size-limit',
      severity: 'error',
      category: 'shopify-profile',
      message: 'Shopify product CSV files cannot exceed 15 MB; split this file before importing.',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/import-products',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(oversizedIssue?.row).toBeUndefined();
    expect(oversizedIssue?.column).toBeUndefined();

    const inventory = parseCsv('Location,On hand (new)\nMain,5');
    const inventoryIssues = validateShopifyProductCsv(inventory, { mode: 'create', fileSizeBytes: 15_000_001 });
    expect(inventoryIssues.map((issue) => issue.ruleId)).toEqual(['inventory-csv-format-detected']);
  });

  it('detects inventory files and skips product-profile checks', () => {
    const issues = validateShopifyProductCsv(parseCsv(inventoryFixture), { mode: 'update' });
    expect(issues).toEqual([expect.objectContaining({
      ruleId: 'inventory-csv-format-detected',
      severity: 'warning',
      column: 'Location',
      sourceUrl: 'https://help.shopify.com/en/manual/inventory-and-locations/setup/inventory-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    })]);
  });

  it('detects inventory import layouts that identify variants by SKU', () => {
    const issues = validateShopifyProductCsv(
      parseCsv('SKU,Location,Bin name,On hand (current),On hand (new)\nTSHIRT-RED-M,Warehouse-A,A-2-3,150,142'),
      { mode: 'update' },
    );
    expect(issues.map((issue) => issue.ruleId)).toEqual(['inventory-csv-format-detected']);
  });

  it('detects Available inventory exports with location names as headers', () => {
    const issues = validateShopifyProductCsv(parseCsv(availableInventoryFixture), { mode: 'update' });
    expect(issues).toEqual([expect.objectContaining({
      ruleId: 'inventory-csv-format-detected',
      severity: 'warning',
      sourceUrl: 'https://help.shopify.com/en/manual/inventory-and-locations/setup/inventory-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    })]);
  });

  it('recognizes market-specific price and availability headers without mistaking them for inventory locations', () => {
    const parsed = parseCsv(marketFixture);
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })).toEqual([]);
    expect(parsed.headers).toContain('Compare At Price / South America');
    expect(validateShopifyProductCsv(parsed, { mode: 'update' }).map((issue) => issue.ruleId)).toEqual([
      'update-overwrite-blank-semantics',
    ]);
  });

  it('recognizes the full current product-header matrix published by Shopify', () => {
    const parsed = parseCsv(currentProductHeadersFixture);
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })).toEqual([]);
    expect(parsed.headers).toContain('Tax code');
    expect(parsed.headers).toContain('Unit price total measure');
    expect(parsed.headers).toContain('Unit price base measure unit');
    expect(parsed.headers).toContain('Variant Barcodes');
    expect(parsed.headers).toContain('Option1 Linked To');
    expect(parsed.headers).toContain('Compare At Price / South America');
    expect(parsed.headers).toContain('Fabric; (product.metafields.shopify.fabric_blend)');
    expect(parsed.headers).toContain('product.metafields.custom.related_products');
  });

  it('preserves both documented product metafield header forms and values', () => {
    const parsed = parseCsv(productMetafieldsFixture);
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })).toEqual([]);
    expect(parsed.headers).toContain('Fabric (product.metafields.shopify.fabric)');
    expect(parsed.headers).toContain('product.metafields.custom.related_products');
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });

  it('validates a legacy product fixture that combines continuation rows, Markets, and product metafields', () => {
    const parsed = parseCsv(legacyMarketsMetafieldsFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map((issue) => issue.ruleId)).toEqual(['legacy-product-headers-detected']);
    expect(issues[0]).toMatchObject({
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    });
    expect(issues.map((issue) => issue.ruleId)).not.toContain('inventory-csv-format-detected');

    const roundTrip = parseCsv(serializeCsv(parsed).content);
    expect(roundTrip.headers).toEqual(parsed.headers);
    expect(roundTrip.rows).toEqual(parsed.rows);
  });

  it('warns for unsupported variant metafield headers and preserves them', () => {
    const parsed = parseCsv(
      'Title,URL handle,Option1 name,Option1 value,variant.metafields.custom.material,Material (variant.metafields.custom.finish)\nShirt,shirt,Size,Small,Cotton,Matte',
    );
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(issue).toMatchObject({
        ruleId: 'unsupported-variant-metafield-header',
        severity: 'warning',
        category: 'shopify-profile',
        row: 1,
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
    }
    expect(parsed.headers.slice(-2)).toEqual([
      'variant.metafields.custom.material',
      'Material (variant.metafields.custom.finish)',
    ]);
  });

  it('treats a one-location dynamic inventory column as ambiguous and preserves legacy product data columns', () => {
    const possibleInventory = validateShopifyProductCsv(parseCsv('Handle,Title,Ottawa\njam,Jam,10'), { mode: 'create' });
    expect(possibleInventory).toContainEqual(expect.objectContaining({
      ruleId: 'inventory-csv-format-possible',
      severity: 'info',
    }));

    const legacyProduct = validateShopifyProductCsv(parseCsv('Handle,Title,Price\njam,Jam,10.00'), { mode: 'create' });
    expect(legacyProduct.map((issue) => issue.ruleId)).not.toContain('inventory-csv-format-detected');
    expect(legacyProduct.map((issue) => issue.ruleId)).not.toContain('inventory-csv-format-possible');
  });

  it('accepts image continuation rows with a handle and reports rows missing it', () => {
    const valid = parseCsv(imageFixture);
    expect(validateShopifyProductCsv(valid, { mode: 'create' })).toEqual([
      expect.objectContaining({ ruleId: 'legacy-product-headers-detected', column: 'Image Src', severity: 'info' }),
    ]);

    const invalid = parseCsv('Title,URL handle,Image Src\nBlack Shirt,black-shirt,https://cdn.example.test/front.jpg\n,,https://cdn.example.test/back.jpg');
    expect(validateShopifyProductCsv(invalid, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'image-row-handle-required',
      severity: 'error',
      row: 3,
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
    }));
  });

  it('validates image position and alt text limits across image continuation rows', () => {
    const parsed = parseCsv(imageMetadataFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map(({ ruleId, row, column }) => ({ ruleId, row, column }))).toEqual([
      { ruleId: 'legacy-product-headers-detected', row: 1, column: 'Image Src' },
      { ruleId: 'invalid-image-position', row: 4, column: 'Image position' },
      { ruleId: 'invalid-image-position', row: 5, column: 'Image position' },
      { ruleId: 'image-alt-text-exceeds-limit', row: 6, column: 'Image alt text' },
    ]);
    expect(issues).toMatchObject([
      { severity: 'info', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues' },
      { severity: 'warning', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv' },
      { severity: 'warning', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv' },
      { severity: 'warning', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv' },
    ]);
    expect(parsed.rows[0]?.[4]).toHaveLength(512);
    expect(parsed.rows[4]?.[4]).toHaveLength(513);
  });

  it('warns when product SEO text exceeds Shopify limits and accepts values at the boundary', () => {
    const parsed = parseCsv(seoLimitsFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map(({ ruleId, row, column }) => ({ ruleId, row, column }))).toEqual([
      { ruleId: 'seo-title-exceeds-limit', row: 3, column: 'SEO title' },
      { ruleId: 'seo-description-exceeds-limit', row: 3, column: 'SEO description' },
    ]);
    expect(issues).toMatchObject([
      { severity: 'warning', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv' },
      { severity: 'warning', category: 'recommendation', sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv' },
    ]);
    expect(parsed.rows[0]?.[2]).toHaveLength(70);
    expect(parsed.rows[0]?.[3]).toHaveLength(320);
    expect(parsed.rows[2]?.[2]).toHaveLength(72);
    expect(parsed.rows[2]?.[3]).toHaveLength(322);
  });

  it('recognizes Product image URL and Image Src as documented image headers', () => {
    const issues = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Product image URL\nBlack Shirt,black-shirt,https://cdn.example.test/front.jpg\n,,https://cdn.example.test/back.jpg'),
      { mode: 'create' },
    );
    expect(issues.map((issue) => issue.ruleId)).toEqual(['image-row-handle-required']);
  });

  it('recognizes documented variant columns when checking update identity dependencies', () => {
    const variantColumns = [
      'Barcodes', 'Compare-at price', 'Cost per item', 'Charge tax', 'Inventory tracker',
      'Inventory quantity', 'Continue selling when out of stock', 'Weight unit for display',
      'Packed product length', 'Packed product width', 'Packed product height',
      'Packed product dimension unit', 'Requires shipping', 'Fulfillment service', 'Variant image URL',
    ];
    for (const column of variantColumns) {
      const issues = validateShopifyProductCsv(parseCsv(`Title,URL handle,${column}\nMug,mug,value`), { mode: 'update' });
      expect(issues, column).toContainEqual(expect.objectContaining({ ruleId: 'variant-identity-columns-missing' }));
    }
  });

  it('validates Status values only when the column is present', () => {
    expect(validateShopifyProductCsv(parseCsv('Title\nMug'), { mode: 'create' })).toEqual([]);
    expect(validateShopifyProductCsv(parseCsv('Title,Status\nMug,\nCup,future'), { mode: 'create' }).map((issue) => issue.ruleId)).toEqual([
      'required-status-value',
      'invalid-product-status',
    ]);
  });

  it('warns on undocumented boolean spellings without changing values and supports legacy aliases', () => {
    const parsed = parseCsv(booleanValuesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'invalid-product-boolean-value');
    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 3, column: 'Published on online store' },
      { row: 3, column: 'Gift card' },
      { row: 3, column: 'Requires shipping' },
      { row: 3, column: 'Charge tax' },
      { row: 5, column: 'Charge tax' },
    ]);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(parsed.rows[1]).toEqual(['Cup', 'cup', 'yes', 'maybe', 'sometimes', 'TRUE']);

    const legacy = validateShopifyProductCsv(
      parseCsv('Title,Handle,Published,Variant Requires Shipping,Variant Taxable\nMug,mug,YES,yes,no'),
      { mode: 'create' },
    ).filter((issue) => issue.ruleId === 'invalid-product-boolean-value');
    expect(legacy.map((issue) => issue.column)).toEqual(['Published', 'Variant Requires Shipping', 'Variant Taxable']);
  });

  it('blocks gift card creation through product CSV but allows gift-card updates', () => {
    const parsed = parseCsv(giftCardCreateFixture);
    const createIssues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(createIssues).toContainEqual(expect.objectContaining({
      ruleId: 'gift-card-create-not-supported',
      severity: 'error',
      category: 'shopify-profile',
      row: 2,
      column: 'Gift card',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
    expect(parsed.rows[0]?.[2]).toBe('true');

    const updateIssues = validateShopifyProductCsv(parsed, { mode: 'update' });
    expect(updateIssues.map((issue) => issue.ruleId)).not.toContain('gift-card-create-not-supported');
  });

  it('checks documented weight format and units without converting source values', () => {
    const parsed = parseCsv(weightValuesFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map(({ ruleId, row, column }) => ({ ruleId, row, column }))).toEqual([
      { ruleId: 'invalid-weight-grams-format', row: 3, column: 'Weight value (grams)' },
      { ruleId: 'unrecognized-weight-unit', row: 3, column: 'Weight unit for display' },
      { ruleId: 'invalid-weight-grams-format', row: 5, column: 'Weight value (grams)' },
      { ruleId: 'unrecognized-weight-unit', row: 5, column: 'Weight unit for display' },
    ]);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(parsed.rows[1]).toEqual(['Shirt', 'shirt', 'Size', 'Small', '5.25', 'pound']);

    const legacy = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Option1 name,Option1 value,Variant Grams\nMug,mug,Size,Small,125.5'),
      { mode: 'create' },
    );
    expect(legacy).toContainEqual(expect.objectContaining({
      ruleId: 'invalid-weight-grams-format',
      column: 'Variant Grams',
      row: 2,
    }));
  });

  it('gives Shopify profile diagnostics a stable contract, source, and logical location', () => {
    const parsed = parseCsv('Title,URL handle,Status,Description\nMug,mug,unknown,"line one\nline two"\nCup,cup,future,ok');
    const firstRun = validateShopifyProductCsv(parsed, { mode: 'create' });
    const secondRun = validateShopifyProductCsv(parsed, { mode: 'create' });
    const statusIssues = firstRun.filter((issue) => issue.ruleId === 'invalid-product-status');

    expect(statusIssues.map((issue) => issue.id)).toEqual(secondRun
      .filter((issue) => issue.ruleId === 'invalid-product-status')
      .map((issue) => issue.id));
    expect(statusIssues.map((issue) => ({ row: issue.row, column: issue.column }))).toEqual([
      { row: 2, column: 'Status' },
      { row: 3, column: 'Status' },
    ]);
    for (const issue of firstRun) {
      expect(issue).toMatchObject({
        id: expect.any(String),
        ruleId: expect.any(String),
        severity: expect.stringMatching(/^(error|warning|info)$/),
        category: expect.stringMatching(/^(shopify-profile|recommendation)$/),
        message: expect.any(String),
        explanation: expect.any(String),
        fixSafety: 'manual',
        sourceUrl: expect.stringMatching(/^https:\/\/help\.shopify\.com\//),
        profileVersion: expect.stringMatching(/^shopify-product-csv-/),
      });
    }

    const recommendation = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Option1 name,Option1 value\nShirt,shirt,Size,Large'),
      { mode: 'update' },
    ).find((issue) => issue.ruleId === 'variant-option-change-may-replace-ids');
    expect(recommendation?.category).toBe('recommendation');
  });

  it('rejects files that contain both legacy Barcode and current Barcodes headers', () => {
    expect(validateShopifyProductCsv(parseCsv('Title,Barcode,Barcodes\nMug,123,456'), { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'barcode-columns-conflict',
      severity: 'error',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
  });

  it('advises on ambiguous barcode header combinations from the current template', () => {
    const parsed = parseCsv(barcodeHeaderOverlapFixture);
    for (const mode of ['create', 'update'] as const) {
      const warning = validateShopifyProductCsv(parsed, { mode }).find((issue) => issue.ruleId === 'ambiguous-barcode-template-headers');
      expect(warning).toMatchObject({
        ruleId: 'ambiguous-barcode-template-headers',
        severity: 'warning',
        category: 'recommendation',
        row: 1,
        column: 'Barcode / Variant Barcodes',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
      expect(warning?.explanation).toContain('does not assert that Shopify will reject this combination');
      expect(validateShopifyProductCsv(parsed, { mode }).map((issue) => issue.ruleId))
        .not.toContain('barcode-columns-conflict');
    }
    expect(parsed.rows).toEqual([['Mug', 'mug', '123456789012', '123456789012']]);
  });

  it('requires a handle for variants declared through any option value column', () => {
    const parsed = parseCsv('Title,Option2 value\nMug,Large');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map((item) => item.ruleId)).toContain('variant-handle-required');
  });

  it('advises when a product-start row names an option without its value, but allows continuation rows to omit option names', () => {
    const source = 'Title,URL handle,Option1 Name,Option1 Value,Option2 Name,Option2 Value,SKU\n'
      + 'Incomplete options,shirt,Size,,Color,,SKU-INCOMPLETE\n'
      + 'Default variant,default-variant,Title,Default Title,,,SKU-DEFAULT\n'
      + 'Color shirt,color-shirt,Color,Red,,,SKU-RED\n'
      + ',color-shirt,,Blue,,,SKU-BLUE';
    const parsed = parseCsv(source);

    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode });
      expect(issues.filter((item) => item.ruleId === 'product-option-name-missing-value')).toMatchObject([
        {
          severity: 'warning',
          category: 'recommendation',
          row: 2,
          column: 'Option1 Value',
          sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
          profileVersion: 'shopify-product-csv-2026-10-16.56',
        },
        { row: 2, column: 'Option2 Value' },
      ]);
    }

    expect(parsed.rows[0]).toEqual(['Incomplete options', 'shirt', 'Size', '', 'Color', '', 'SKU-INCOMPLETE']);
  });

  it('warns when an update contains variant data without both option identity columns', () => {
    const parsed = parseCsv('Title,URL handle,SKU\nMug,mug,123');
    const issues = validateShopifyProductCsv(parsed, { mode: 'update' });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'variant-identity-columns-missing', severity: 'warning' }));
  });

  it('warns when a product handle contains whitespace without rewriting it', () => {
    const parsed = parseCsv('Title,URL handle\nMug,summer mug');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues).toContainEqual(expect.objectContaining({
      ruleId: 'product-handle-contains-spaces',
      severity: 'warning',
      category: 'recommendation',
      row: 2,
      column: 'URL handle',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
    expect(parsed.rows[0]?.[1]).toBe('summer mug');
    expect(validateShopifyProductCsv(parseCsv('Title,URL handle\nMug,summer-mug'), { mode: 'create' })
      .map((issue) => issue.ruleId)).not.toContain('product-handle-contains-spaces');
    expect(validateShopifyProductCsv(parseCsv('Title,URL handle\nMug," summer-mug "'), { mode: 'create' })
      .map((issue) => issue.ruleId)).toContain('product-handle-contains-spaces');
  });

  it('advises on handle punctuation outside Shopify documented characters while allowing Unicode letters', () => {
    const parsed = parseCsv(productHandleCharactersFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.filter((issue) => issue.ruleId === 'product-handle-contains-undocumented-characters')).toMatchObject([
      { severity: 'warning', category: 'recommendation', row: 3, column: 'URL handle' },
      { severity: 'warning', category: 'recommendation', row: 4, column: 'URL handle' },
    ]);
    expect(issues.find((issue) => issue.ruleId === 'product-handle-contains-undocumented-characters'))
      .toMatchObject({
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
    expect(issues.filter((issue) => issue.ruleId === 'product-handle-contains-undocumented-characters').map((issue) => issue.row))
      .toEqual([3, 4]);
    expect(issues.filter((issue) => issue.ruleId === 'product-handle-contains-spaces').map((issue) => issue.row))
      .toEqual([6]);
    expect(parsed.rows.map((row) => row[1])).toEqual([
      'camiseta-azul-42', 'camiseta_azul', 'summer/sale', 'niño-azul', 'summer sale',
    ]);
  });

  it('distinguishes unsupported fourth product options from general unknown headers and preserves their values', () => {
    const parsed = parseCsv(moreThanThreeOptionsFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.filter((issue) => issue.ruleId === 'unsupported-product-option-column')).toMatchObject([
      {
        severity: 'warning',
        category: 'recommendation',
        row: 1,
        column: 'Option4 name',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      },
      { row: 1, column: 'Option4 value' },
    ]);
    expect(issues.map((issue) => issue.ruleId)).not.toContain('unrecognized-product-header');
    expect(parsed.rows[0]?.slice(-2)).toEqual(['Print', 'Striped']);

    const legacyCasing = parseCsv(
      'Title,URL handle,Option1 Name,Option1 Value,Option4 Name , Option4 Value,Option4 LINKEDTO\nShirt,shirt,Size,Small,Print,Striped,product.metafields.shopify.color',
    );
    const legacyIssues = validateShopifyProductCsv(legacyCasing, { mode: 'create' });
    expect(legacyIssues.filter((issue) => issue.ruleId === 'unsupported-product-option-column').map((issue) => issue.column))
      .toEqual(['Option4 Name ', ' Option4 Value', 'Option4 LINKEDTO']);
    expect(legacyIssues.filter((issue) => issue.ruleId === 'header-whitespace').map((issue) => issue.column))
      .toEqual(['Option4 Name ', ' Option4 Value']);
    expect(legacyIssues.map((issue) => issue.ruleId)).not.toContain('probable-header-typo');
    expect(legacyCasing.rows[0]?.slice(-3)).toEqual(['Print', 'Striped', 'product.metafields.shopify.color']);
  });

  it('warns above Shopify’s 255-character Collection limit and preserves the value', () => {
    const collectionAtLimit = 'c'.repeat(255);
    const collectionOverLimit = `${collectionAtLimit}c`;
    const valid = parseCsv(`Title,URL handle,Collection\nMug,mug,"${collectionAtLimit}"`);
    const invalid = parseCsv(`Title,URL handle,Collection\nMug,mug,"${collectionOverLimit}"`);

    expect(validateShopifyProductCsv(valid, { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('collection-name-exceeds-limit');
    expect(validateShopifyProductCsv(invalid, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'collection-name-exceeds-limit',
      severity: 'warning',
      category: 'recommendation',
      message: 'This collection name has 256 characters; Shopify allows a maximum of 255.',
      row: 2,
      column: 'Collection',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
    expect(invalid.rows[0]?.[2]).toBe(collectionOverLimit);
  });

  it('counts product image URL rows per handle and warns only once above 250', () => {
    const makeImageCsv = (count: number) => [
      'Title,URL handle,Product image URL',
      ...Array.from({ length: count }, (_, index) => `${index === 0 ? 'Shirt' : ''},shirt,https://cdn.example.test/image-${index}.jpg`),
    ].join('\n');
    const valid = validateShopifyProductCsv(parseCsv(makeImageCsv(250)), { mode: 'create' });
    const invalidCsv = parseCsv(makeImageCsv(252));
    const invalid = validateShopifyProductCsv(invalidCsv, { mode: 'create' });
    const imageLimitIssues = invalid.filter((issue) => issue.ruleId === 'product-image-count-exceeds-limit');
    const separateProductsCsv = [
      ...makeImageCsv(200).split('\n'),
      ...Array.from({ length: 100 }, (_, index) => `${index === 0 ? 'Hat' : ''},hat,https://cdn.example.test/hat-${index}.jpg`),
    ].join('\n');
    const imageSrcIssues = validateShopifyProductCsv(
      parseCsv(makeImageCsv(252).replace('Product image URL', 'Image Src')),
      { mode: 'create' },
    );

    expect(valid.map((issue) => issue.ruleId)).not.toContain('product-image-count-exceeds-limit');
    expect(validateShopifyProductCsv(parseCsv(separateProductsCsv), { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('product-image-count-exceeds-limit');
    expect(imageSrcIssues.map((issue) => issue.ruleId)).toContain('product-image-count-exceeds-limit');
    expect(imageLimitIssues).toHaveLength(1);
    expect(imageLimitIssues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      message: 'This product lists 251 product image URL entries; Shopify allows a maximum of 250 images per product.',
      row: 252,
      column: 'Product image URL',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(invalidCsv.rows[250]?.[2]).toBe('https://cdn.example.test/image-250.jpg');
  });

  it('checks image URL structure locally without claiming public reachability', () => {
    const csv = parseCsv([
      'Title,URL handle,Product image URL,Variant image URL',
      'Mug,mug,https://cdn.example.test/front.jpg?size=large,',
      ',mug,,http://cdn.example.test/variant.jpg',
      ',mug,/images/relative.jpg,',
      ',mug,,https://user:secret@cdn.example.test/private.jpg',
    ].join('\n'));
    const issues = validateShopifyProductCsv(csv, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'image-url-not-public-https');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 3, column: 'Variant image URL' },
      { row: 4, column: 'Product image URL' },
      { row: 5, column: 'Variant image URL' },
    ]);
    for (const issue of issues) {
      expect(issue).toMatchObject({
        severity: 'warning',
        category: 'recommendation',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
      expect(issue.explanation).toContain('does not request the URL');
    }
    expect(csv.rows[1]?.[3]).toBe('http://cdn.example.test/variant.jpg');
  });

  it('warns on documented product image filename suffixes, not query strings or variant references', () => {
    const csv = parseCsv([
      'Title,URL handle,Product image URL,Variant image URL',
      'Mug,mug,https://cdn.example.test/cup_thumb.jpg?width=400,',
      ',mug,https://cdn.example.test/cup_small.webp?token=1,',
      ',mug,https://cdn.example.test/cup_medium,',
      ',mug,https://cdn.example.test/product.jpg?name=_thumb,https://cdn.example.test/variant_thumb.jpg',
      ',mug,https://cdn.example.test/cup_thumbed.jpg,',
    ].join('\n'));
    const issues = validateShopifyProductCsv(csv, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'image-filename-uses-thumbnail-suffix');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 2, column: 'Product image URL' },
      { row: 3, column: 'Product image URL' },
      { row: 4, column: 'Product image URL' },
    ]);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(csv.rows[0]?.[2]).toBe('https://cdn.example.test/cup_thumb.jpg?width=400');
  });

  it('warns above Shopify’s 250-tag product maximum and preserves the cell', () => {
    const tagsAtLimit = Array.from({ length: 250 }, (_, index) => `tag-${index}`).join(',');
    const tagsOverLimit = `${tagsAtLimit},tag-250`;
    const valid = parseCsv(`Title,URL handle,Tags\nMug,mug,"${tagsAtLimit}"`);
    const invalid = parseCsv(`Title,URL handle,Tags\nMug,mug,"${tagsOverLimit}"`);

    expect(validateShopifyProductCsv(valid, { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('product-tag-count-exceeds-limit');
    expect(validateShopifyProductCsv(invalid, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'product-tag-count-exceeds-limit',
      severity: 'warning',
      category: 'recommendation',
      message: 'This product has 251 tags; Shopify allows a maximum of 250.',
      row: 2,
      column: 'Tags',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
    expect(invalid.rows[0]?.[2]).toBe(tagsOverLimit);
  });

  it('recommends avoiding accented Latin characters in tags without rejecting or changing them', () => {
    const parsed = parseCsv(accentedTagsFixture);
    for (const mode of ['create', 'update'] as const) {
      const accentedTagIssues = validateShopifyProductCsv(parsed, { mode })
        .filter((issue) => issue.ruleId === 'product-tags-contain-accented-characters');
      expect(accentedTagIssues).toEqual([expect.objectContaining({
        ruleId: 'product-tags-contain-accented-characters',
        severity: 'info',
        category: 'recommendation',
        row: 2,
        column: 'Tags',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      })]);
      expect(accentedTagIssues[0]?.explanation).toContain('does not document an import failure');
    }
    expect(parsed.rows[0]?.[2]).toBe('café, edición limitada');

    const decomposedAccent = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Tags\nTea,tea,"cafe\u0301, tea"'),
      { mode: 'create' },
    );
    expect(decomposedAccent.map((issue) => issue.ruleId)).toContain('product-tags-contain-accented-characters');

    const plainTags = validateShopifyProductCsv(parseCsv('Title,URL handle,Tags\nMug,mug,"coffee, mug"'), { mode: 'create' });
    expect(plainTags.map((issue) => issue.ruleId)).not.toContain('product-tags-contain-accented-characters');
  });

  it('informs on punctuation and symbols in tags but accepts spaces, hyphens, and letters from other scripts', () => {
    const fixture = readFileSync(new URL('../../../fixtures/shopify-product-symbol-tags.csv', import.meta.url), 'utf8');
    const parsed = parseCsv(fixture);

    for (const mode of ['create', 'update'] as const) {
      const symbolIssues = validateShopifyProductCsv(parsed, { mode })
        .filter((issue) => issue.ruleId === 'product-tags-contain-symbols');
      expect(symbolIssues.map(({ row }) => row)).toEqual([2, 3, 4]);
      expect(symbolIssues.every((issue) => issue.severity === 'info' && issue.category === 'recommendation')).toBe(true);
      expect(symbolIssues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/import-export/using-csv')).toBe(true);
      expect(symbolIssues.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
    }

    expect(parsed.rows.map((row) => row[2])).toEqual(['summer_sale', "women's", 'special ✨', 'summer-sale', 'summer sale', '夏']);
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })
      .map((issue) => issue.ruleId)).not.toContain('unrecognized-product-header');
  });

  it('checks category IDs against a pinned Shopify taxonomy and leaves localized breadcrumbs alone', () => {
    const parsed = parseCsv(productCategoryIdsFixture);
    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode })
        .filter((issue) => issue.ruleId === 'unrecognized-shopify-product-category-id');
      expect(issues).toEqual([expect.objectContaining({
        ruleId: 'unrecognized-shopify-product-category-id',
        severity: 'info',
        category: 'recommendation',
        message: "This Product category ID is not in Shopify's 2026-08 taxonomy release.",
        row: 3,
        column: 'Product category',
        sourceUrl: 'https://github.com/Shopify/product-taxonomy/releases/tag/v2026-08',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      })]);
    }
    expect(parsed.rows.map((row) => row[2])).toEqual([
      'hg-15-1-2',
      'zz-999-99',
      'aa',
      'Home & Garden > Linens & Bedding > Bedding > Bed Sheets',
    ]);
  });

  it('counts Shopify Barcodes separators without splitting escaped semicolons', () => {
    const csvFor = (barcodes: string, header = 'Barcodes') => parseCsv(
      `Title,URL handle,Option1 name,Option1 value,${header}\nMug,mug,Size,Small,"${barcodes}"`,
    );
    const atLimit = Array.from({ length: 20 }, (_, index) => `code-${index}`).join(';');
    const overLimit = `${atLimit};code-20`;
    const escapedSemicolon = [String.raw`gtin:123\;45`, ...Array.from({ length: 19 }, (_, index) => `code-${index}`)].join(';');
    const escapedBackslashBeforeSeparator = ['code\\\\;next', ...Array.from({ length: 18 }, (_, index) => `code-${index}`)].join(';');
    const atLimitCsv = csvFor(atLimit);
    const overLimitCsv = csvFor(overLimit);

    expect(validateShopifyProductCsv(atLimitCsv, { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('variant-barcode-count-exceeds-limit');
    expect(validateShopifyProductCsv(csvFor(escapedSemicolon), { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('variant-barcode-count-exceeds-limit');
    expect(validateShopifyProductCsv(csvFor(escapedBackslashBeforeSeparator), { mode: 'create' }).map((issue) => issue.ruleId))
      .not.toContain('variant-barcode-count-exceeds-limit');
    expect(validateShopifyProductCsv(overLimitCsv, { mode: 'create' })).toContainEqual(expect.objectContaining({
      ruleId: 'variant-barcode-count-exceeds-limit',
      severity: 'warning',
      category: 'recommendation',
      message: 'This product or variant has 21 barcodes; Shopify allows a maximum of 20.',
      row: 2,
      column: 'Barcodes',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    }));
    expect(overLimitCsv.rows[0]?.[4]).toBe(overLimit);
    expect(validateShopifyProductCsv(csvFor(overLimit, 'Variant Barcodes'), { mode: 'create' })).toContainEqual(
      expect.objectContaining({
        ruleId: 'variant-barcode-count-exceeds-limit',
        column: 'Variant Barcodes',
      }),
    );
  });

  it('warns about variant ID replacement risk when updating option values', () => {
    const issues = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Option1 name,Option1 value\nShirt,shirt,Size,Large'),
      { mode: 'update' },
    );
    expect(issues).toContainEqual(expect.objectContaining({
      ruleId: 'variant-option-change-may-replace-ids',
      severity: 'warning',
      row: 2,
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
    }));
  });

  it('validates packed dimension groups and exempts non-shippable variants', () => {
    const headers = 'Title,URL handle,Option1 name,Option1 value,Packed product length,Packed product width,Packed product height,Packed product dimension unit,Requires shipping';
    const partial = validateShopifyProductCsv(
      parseCsv(`${headers}\nShirt,shirt,Size,Small,10,,20,cm,true`),
      { mode: 'create' },
    );
    expect(partial).toContainEqual(expect.objectContaining({
      ruleId: 'packed-dimension-values-incomplete',
      severity: 'error',
      row: 2,
    }));

    const nonShippable = validateShopifyProductCsv(
      parseCsv(`${headers}\nE-book,ebook,Format,PDF,10,,20,cm,false`),
      { mode: 'update' },
    );
    expect(nonShippable.map((issue) => issue.ruleId)).not.toContain('packed-dimension-values-incomplete');
    expect(nonShippable).toContainEqual(expect.objectContaining({
      ruleId: 'non-shippable-variant-clears-packed-dimensions',
      severity: 'warning',
    }));
  });

  it('checks documented inventory and fulfillment value dependencies without overblocking blanks', () => {
    const issues = validateShopifyProductCsv(parseCsv(inventoryDependenciesFixture), { mode: 'create' });
    expect(issues.map(({ ruleId, row }) => ({ ruleId, row }))).toEqual([
      { ruleId: 'inventory-quantity-single-location-only', row: undefined },
      { ruleId: 'invalid-inventory-policy', row: 2 },
      { ruleId: 'inventory-quantity-missing-with-tracker', row: 2 },
      { ruleId: 'sku-required-for-custom-fulfillment', row: 2 },
      { ruleId: 'invalid-inventory-quantity', row: 5 },
      { ruleId: 'custom-fulfillment-service-handle-format', row: 6 },
      { ruleId: 'unlisted-inventory-tracker', row: 7 },
    ]);
    expect(issues.find((issue) => issue.ruleId === 'inventory-quantity-missing-with-tracker')).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    });
    expect(issues.find((issue) => issue.ruleId === 'sku-required-for-custom-fulfillment')).toMatchObject({
      severity: 'error',
      category: 'shopify-profile',
      row: 2,
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
    });
    expect(issues.find((issue) => issue.ruleId === 'custom-fulfillment-service-handle-format')).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      row: 6,
      column: 'Fulfillment service',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(issues.find((issue) => issue.ruleId === 'custom-fulfillment-service-handle-format')?.explanation)
      .toContain('replacing spaces with hyphens');
    expect(issues.find((issue) => issue.ruleId === 'unlisted-inventory-tracker')).toMatchObject({
      severity: 'info',
      category: 'recommendation',
      row: 7,
      column: 'Inventory tracker',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(issues.find((issue) => issue.ruleId === 'unlisted-inventory-tracker')?.explanation)
      .toContain('not treated as invalid');
  });

  it('warns when a quantity is supplied with an explicitly blank tracker, but preserves both cells', () => {
    const parsed = parseCsv(inventoryWithoutTrackerFixture);
    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode });
      const singleLocationNotice = issues.find((issue) => issue.ruleId === 'inventory-quantity-single-location-only');
      expect(singleLocationNotice).toMatchObject({
        ruleId: 'inventory-quantity-single-location-only',
        severity: 'info',
        category: 'recommendation',
        column: 'Inventory quantity',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      });
      expect(singleLocationNotice?.row).toBeUndefined();
      expect(issues.filter((issue) => issue.ruleId === 'inventory-quantity-single-location-only')).toHaveLength(1);
      expect(issues).toContainEqual(expect.objectContaining({
        ruleId: 'inventory-quantity-without-tracker',
        severity: 'warning',
        category: 'recommendation',
        row: 2,
        column: 'Inventory tracker',
        sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
        profileVersion: 'shopify-product-csv-2026-10-16.56',
      }));
    }
    expect(parsed.rows).toEqual([['Untracked quantity', 'untracked-quantity', '', '12']]);

    const legacyAlias = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Variant Inventory Tracker,Variant Inventory Qty\nLegacy,legacy,,5'),
      { mode: 'create' },
    );
    expect(legacyAlias).toContainEqual(expect.objectContaining({
      ruleId: 'inventory-quantity-without-tracker',
      column: 'Variant Inventory Tracker',
      row: 2,
    }));

    const conflictingAliases = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Inventory tracker,Variant Inventory Tracker,Inventory quantity\nAmbiguous,ambiguous,,shopify,5'),
      { mode: 'update' },
    );
    expect(conflictingAliases.map((issue) => issue.ruleId)).toContain('conflicting-header-aliases');
    expect(conflictingAliases.map((issue) => issue.ruleId)).not.toContain('inventory-quantity-without-tracker');

    const noTrackerColumn = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Inventory quantity\nMug,mug,12'),
      { mode: 'update' },
    );
    expect(noTrackerColumn.map((issue) => issue.ruleId)).not.toContain('inventory-quantity-without-tracker');

    const validTrackedRow = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Inventory tracker,Inventory quantity\nMug,mug,shopify,12'),
      { mode: 'create' },
    );
    expect(validTrackedRow.map((issue) => issue.ruleId)).not.toContain('inventory-quantity-without-tracker');

    const blankQuantity = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Inventory tracker,Inventory quantity\nMug,mug,shopify,'),
      { mode: 'create' },
    );
    expect(blankQuantity.map((issue) => issue.ruleId)).not.toContain('inventory-quantity-single-location-only');

    const separateInventoryCsv = validateShopifyProductCsv(parseCsv(inventoryFixture), { mode: 'create' });
    expect(separateInventoryCsv.map((issue) => issue.ruleId)).not.toContain('inventory-quantity-single-location-only');
  });

  it('reports duplicate option-value combinations only within the same product handle', () => {
    const issues = validateShopifyProductCsv(parseCsv(duplicateVariantOptionsFixture), { mode: 'create' });
    expect(issues).toEqual([expect.objectContaining({
      ruleId: 'duplicate-variant-option-combination',
      severity: 'error',
      category: 'shopify-profile',
      row: 3,
      column: 'Option1 value / Option2 value',
      message: 'This product repeats an option value combination from row 2.',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    })]);
  });

  it('warns for blank product and variant prices, but not image-only continuation rows', () => {
    const issues = validateShopifyProductCsv(parseCsv(blankPriceFixture), { mode: 'create' })
      .filter((issue) => issue.ruleId === 'blank-price-may-fail-import');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 2, column: 'Price' },
      { row: 3, column: 'Price' },
    ]);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(issues[0]?.explanation).toContain('default of 0.00');
  });

  it('warns when a market compare-at price lacks a fixed price for the same market', () => {
    const parsed = parseCsv(marketCompareAtDependencyFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'market-compare-at-requires-fixed-price');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 2, column: 'Compare At Price / South America' },
    ]);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/markets/customizations/catalogs',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(parsed.rows[0]).toEqual(['Cotton Shirt', 'cotton-shirt', '', '32.00', '24.00', '30.00']);

    const missingPriceColumn = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Compare At Price / France\nShirt,shirt,24.99'),
      { mode: 'update' },
    );
    expect(missingPriceColumn).toContainEqual(expect.objectContaining({
      ruleId: 'market-compare-at-requires-fixed-price',
      row: 2,
      column: 'Compare At Price / France',
    }));

    const noFixedCompareAt = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Price / France,Compare At Price / France\nShirt,shirt,,'),
      { mode: 'create' },
    );
    expect(noFixedCompareAt.map((issue) => issue.ruleId)).not.toContain('market-compare-at-requires-fixed-price');
  });

  it('identifies video and 3D media columns as unsupported by the product CSV while preserving data', () => {
    const parsed = parseCsv(unsupportedMediaColumnsFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const mediaIssues = issues.filter((issue) => issue.ruleId === 'unsupported-product-media-column');

    expect(mediaIssues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 1, column: 'Video URL' },
      { row: 1, column: 'Product video URL' },
      { row: 1, column: '3D model URL' },
      { row: 1, column: 'Product 3D model URL' },
    ]);
    expect(mediaIssues.every((issue) => issue.severity === 'warning' && issue.category === 'recommendation')).toBe(true);
    expect(mediaIssues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/import-export/using-csv')).toBe(true);
    expect(issues.map((issue) => issue.ruleId)).not.toContain('unrecognized-product-header');
    expect(parsed.rows[0]).toEqual([
      'Example Media', 'example-media', 'https://cdn.example.test/video.mp4',
      'https://cdn.example.test/product-video.mp4', 'https://cdn.example.test/model.glb',
      'https://cdn.example.test/product-model.glb', 'https://cdn.example.test/photo.jpg',
    ]);
    expect(validateShopifyProductCsv(parsed, { mode: 'update' })
      .filter((issue) => issue.ruleId === 'unsupported-product-media-column').map(({ row, column }) => ({ row, column })))
      .toEqual([
        { row: 1, column: 'Video URL' },
        { row: 1, column: 'Product video URL' },
        { row: 1, column: '3D model URL' },
        { row: 1, column: 'Product 3D model URL' },
      ]);

    const typoCase = validateShopifyProductCsv(parseCsv('Title,URL handle,video url\nMedia,media,https://cdn.example.test/video.mp4'), { mode: 'create' });
    expect(typoCase.map((issue) => issue.ruleId)).toEqual([
      'unsupported-product-media-column',
      'header-case-mismatch',
    ]);

    const whitespace = validateShopifyProductCsv(parseCsv('Title,URL handle,Video URL \nMedia,media,https://cdn.example.test/video.mp4'), { mode: 'create' });
    expect(whitespace.map((issue) => issue.ruleId)).toEqual([
      'unsupported-product-media-column',
      'header-whitespace',
    ]);
  });

  it('advises on undocumented market inclusion values without claiming import failure', () => {
    const parsed = parseCsv(marketIncludedValuesFixture);

    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode })
        .filter((issue) => issue.ruleId === 'unrecognized-market-included-value');

      expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
        { row: 4, column: 'Included / United States' },
        { row: 4, column: 'Included / South America' },
      ]);
      expect(issues.every((issue) => issue.severity === 'info' && issue.category === 'recommendation')).toBe(true);
      expect(issues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/import-export/using-csv')).toBe(true);
      expect(issues.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
      expect(issues.every((issue) => issue.explanation.includes('does not assert that Shopify will reject it'))).toBe(true);
    }

    expect(parsed.rows).toEqual([
      ['Cotton Shirt', 'cotton-shirt', 'true', 'false'],
      ['Mug', 'mug', 'TRUE', 'FALSE'],
      ['Strange', 'odd', 'yes', 'not-available'],
      ['Blank', 'blank', '', ''],
    ]);
  });

  it('advises on nonnumeric or currency-formatted product money while preserving values', () => {
    const parsed = parseCsv([
      'Title,URL handle,Price,Compare-at price,Cost per item,Variant Price,Variant Compare-at Price',
      'Valid,valid,0,9.99,-1.25,12,10.00',
      'Invalid,invalid,$9.99,EUR 12.50,unknown,€7.25,£6.00',
    ].join('\n'));
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'invalid-product-money-format');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 3, column: 'Price' },
      { row: 3, column: 'Compare-at price' },
      { row: 3, column: 'Cost per item' },
      { row: 3, column: 'Variant Price' },
      { row: 3, column: 'Variant Compare-at Price' },
    ]);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      category: 'recommendation',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/using-csv',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(parsed.rows[1]).toEqual(['Invalid', 'invalid', '$9.99', 'EUR 12.50', 'unknown', '€7.25', '£6.00']);
    expect(validateShopifyProductCsv(parseCsv('Title,URL handle,Price\nZero,zero,0'), { mode: 'create' }))
      .not.toContainEqual(expect.objectContaining({ ruleId: 'invalid-product-money-format' }));
  });

  it('advises on nonnumeric or currency-formatted fixed market amounts without changing them', () => {
    const parsed = parseCsv(marketMoneyFormatFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' })
      .filter((issue) => issue.ruleId === 'invalid-product-money-format');

    expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
      { row: 3, column: 'Price / South America' },
      { row: 4, column: 'Compare At Price / South America' },
      { row: 5, column: 'Price / South America' },
      { row: 6, column: 'Compare At Price / South America' },
      { row: 6, column: 'Compare-at price / France' },
    ]);
    expect(issues.every((issue) => issue.severity === 'warning' && issue.category === 'recommendation')).toBe(true);
    expect(issues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/import-export/using-csv')).toBe(true);
    expect(issues.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
    expect(parsed.rows).toEqual([
      ['Valid', 'valid', '19.99', '29.99', '10', '12'],
      ['Price symbol', 'price-symbol', '$19.99', '29.99', '10', '12'],
      ['Compare symbol', 'compare-symbol', '19.99', 'USD 29.99', '10', '12'],
      ['Text price', 'text-price', '19,99', '29.99', '10', '12'],
      ['Text compare', 'text-compare', '19.99', 'not-a-price', '10', '12 EUR'],
      ['Blank', 'blank', '', '', '10', ''],
    ]);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });

  it('recommends a higher compare-at price for displayed sale pricing without claiming import failure', () => {
    const parsed = parseCsv(salePriceComparisonFixture);

    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode });
      const salePriceIssues = issues.filter((issue) => issue.ruleId === 'compare-at-price-not-higher-than-price');

      expect(salePriceIssues.map(({ row, column }) => ({ row, column }))).toEqual([
        { row: 3, column: 'Price / Compare-at price' },
        { row: 4, column: 'Price / Compare-at price' },
        { row: 8, column: 'Price / Compare-at price' },
      ]);
      expect(salePriceIssues.every((issue) => issue.severity === 'warning' && issue.category === 'recommendation')).toBe(true);
      expect(salePriceIssues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/details/product-pricing/sale-pricing')).toBe(true);
      expect(salePriceIssues.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
    }

    const legacyHeaders = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Variant Price,Variant Compare-at Price\nLegacy,legacy,19.99,18.99'),
      { mode: 'create' },
    );
    expect(legacyHeaders).toContainEqual(expect.objectContaining({
      ruleId: 'compare-at-price-not-higher-than-price',
      row: 2,
      column: 'Variant Price / Variant Compare-at Price',
    }));

    const ambiguousAliases = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Price,Variant Price,Compare-at price\nAmbiguous,ambiguous,10,100,9'),
      { mode: 'create' },
    );
    expect(ambiguousAliases.map((issue) => issue.ruleId)).not.toContain('compare-at-price-not-higher-than-price');
    expect(parsed.rows.map((row) => row.slice(2))).toEqual([
      ['19.99', '29.99'],
      ['19.99', '19.99'],
      ['19.99', '17.99'],
      ['$19.99', '29.99'],
      ['', ''],
      ['9.9999999999999999999999999999999999', '10'],
      ['9.9999999999999999999999999999999999', '9.9999999999999999999999999999999998'],
    ]);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });

  it('recommends a higher fixed compare-at price for market prices and skips ambiguous pairs', () => {
    const parsed = parseCsv(marketSalePriceFixture);
    for (const mode of ['create', 'update'] as const) {
      const issues = validateShopifyProductCsv(parsed, { mode })
        .filter((issue) => issue.ruleId === 'compare-at-price-not-higher-than-price');
      expect(issues.map(({ row, column }) => ({ row, column }))).toEqual([
        { row: 3, column: 'Price / South America / Compare At Price / South America' },
        { row: 3, column: 'Price / France / Compare-at price / France' },
        { row: 4, column: 'Price / South America / Compare At Price / South America' },
        { row: 4, column: 'Price / France / Compare-at price / France' },
        { row: 8, column: 'Price / South America / Compare At Price / South America' },
      ]);
      expect(issues.every((issue) => issue.severity === 'warning' && issue.category === 'recommendation')).toBe(true);
      expect(issues.every((issue) => issue.sourceUrl === 'https://help.shopify.com/en/manual/products/details/product-pricing/sale-pricing')).toBe(true);
      expect(issues.every((issue) => issue.profileVersion === 'shopify-product-csv-2026-10-16.56')).toBe(true);
    }

    const ambiguousPriceHeader = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Price / France,Price / France,Compare At Price / France\nShirt,shirt,10,11,9'),
      { mode: 'create' },
    );
    expect(ambiguousPriceHeader.map((issue) => issue.ruleId)).not.toContain('compare-at-price-not-higher-than-price');
    expect(ambiguousPriceHeader.map((issue) => issue.ruleId)).not.toContain('market-compare-at-requires-fixed-price');

    expect(parsed.rows.map((row) => row.slice(2))).toEqual([
      ['19.99', '29.99', '10', '12'],
      ['19.99', '19.99', '10', '10.00'],
      ['19.99', '17.99', '10', '9.99'],
      ['$19.99', '29.99', '10', '12'],
      ['', '', '10', ''],
      ['10', '12', '10', '12'],
      ['10.0000000000000000000000000000000001', '10', '10', '10.0000000000000000000000000000000001'],
    ]);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);

    const conflictingAliases = validateShopifyProductCsv(
      parseCsv('Title,URL handle,Price / France,Compare At Price / France,Compare-at price / France\nShirt,shirt,10,9,12'),
      { mode: 'create' },
    );
    expect(conflictingAliases.map((issue) => issue.ruleId)).not.toContain('compare-at-price-not-higher-than-price');
  });

  it('warns when blank packed dimensions clear existing update values and rejects invalid dimensions', () => {
    const headers = 'Title,URL handle,Option1 name,Option1 value,SKU,Packed product length,Packed product width,Packed product height,Packed product dimension unit';
    const blankDimensions = validateShopifyProductCsv(
      parseCsv(`${headers}\nShirt,shirt,Size,Small,SHIRT-SMALL,,,,`),
      { mode: 'update' },
    );
    expect(blankDimensions).toContainEqual(expect.objectContaining({
      ruleId: 'packed-dimensions-cleared-on-update',
      severity: 'warning',
      row: 2,
    }));

    const invalidDimensions = validateShopifyProductCsv(
      parseCsv(`${headers},Requires shipping\nShirt,shirt,Size,Small,SHIRT-SMALL,0,2,3,mm,true`),
      { mode: 'create' },
    );
    expect(invalidDimensions.map((issue) => issue.ruleId)).toContain('invalid-packed-dimension-value');
    expect(invalidDimensions.map((issue) => issue.ruleId)).toContain('invalid-packed-dimension-unit');
  });

  it('does not treat duplicate SKUs or unknown headers as blocking errors', () => {
    const parsed = parseCsv('Title,URL handle,SKU,Custom column\nMug,mug,123,x\nCup,cup,123,y');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues).toContainEqual(expect.objectContaining({
      ruleId: 'unrecognized-product-header',
      severity: 'info',
      category: 'recommendation',
      column: 'Custom column',
    }));
    expect(issues.some((issue) => issue.severity === 'error')).toBe(false);
    expect(parsed.headers).toContain('Custom column');
    const exported = parseCsv(serializeCsv(parsed).content);
    expect(exported.headers).toEqual(parsed.headers);
    expect(exported.rows).toEqual(parsed.rows);
  });

  it('distinguishes header case errors, whitespace, probable typos, and unrelated unknown columns', () => {
    const caseIssue = validateShopifyProductCsv(parseCsv('title,URL handle\nMug,mug'), { mode: 'create' })
      .find((issue) => issue.ruleId === 'header-case-mismatch');
    expect(caseIssue).toMatchObject({
      severity: 'warning', category: 'recommendation', column: 'title', row: 1,
    });

    const whitespaceIssue = validateShopifyProductCsv(parseCsv('Title ,URL handle\nMug,mug'), { mode: 'create' })
      .find((issue) => issue.ruleId === 'header-whitespace');
    expect(whitespaceIssue).toMatchObject({
      severity: 'warning', category: 'recommendation', column: 'Title ', row: 1,
    });

    const typoIssue = validateShopifyProductCsv(parseCsv('Titl,URL handle\nMug,mug'), { mode: 'create' })
      .find((issue) => issue.ruleId === 'probable-header-typo');
    expect(typoIssue?.message).toContain('Title');
    expect(typoIssue?.fixSafety).toBe('manual');

    const unknownIssue = validateShopifyProductCsv(parseCsv('Title,URL handle,Vendor code\nMug,mug,V-1'), { mode: 'create' })
      .find((issue) => issue.ruleId === 'unrecognized-product-header');
    expect(unknownIssue).toMatchObject({ severity: 'info', column: 'Vendor code' });
  });

  it('recognizes only documented Google Shopping headers and diagnoses a misspelling without changing data', () => {
    const parsed = parseCsv(googleShoppingHeadersFixture);
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    const typoIssue = issues.find((issue) => issue.column === 'Google Shopping / Age Grup');
    const unknownIssue = issues.find((issue) => issue.column === 'Google Shopping / Merchant note');

    expect(issues).not.toContainEqual(expect.objectContaining({
      column: 'Google Shopping / Age Group',
      ruleId: expect.any(String),
    }));
    expect(issues).not.toContainEqual(expect.objectContaining({
      column: 'Google Shopping / Manufacturer part number (MPN)',
      ruleId: expect.any(String),
    }));
    expect(typoIssue).toMatchObject({
      ruleId: 'probable-header-typo',
      severity: 'warning',
      column: 'Google Shopping / Age Grup',
      sourceUrl: 'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      profileVersion: 'shopify-product-csv-2026-10-16.56',
    });
    expect(typoIssue?.message).toContain('Google Shopping / Age Group');
    expect(unknownIssue).toMatchObject({ ruleId: 'unrecognized-product-header', severity: 'info' });
    expect(parseCsv(serializeCsv(parsed).content).headers).toEqual(parsed.headers);
    expect(parseCsv(serializeCsv(parsed).content).rows).toEqual(parsed.rows);
  });
});
