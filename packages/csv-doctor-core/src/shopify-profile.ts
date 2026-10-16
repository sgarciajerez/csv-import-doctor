import type { CsvIssue, ParsedCsv, ValidationOptions } from './types.js';
import { SHOPIFY_PRODUCT_CATEGORY_IDS, SHOPIFY_TAXONOMY_VERSION } from './shopify-taxonomy.js';

export const SHOPIFY_PRODUCT_CSV_PROFILE = 'shopify-product-csv-2026-10-16.51';
const PRODUCT_CSV_SOURCE = 'https://help.shopify.com/en/manual/products/import-export/using-csv';
const PRODUCT_CSV_IMPORT_SOURCE = 'https://help.shopify.com/en/manual/products/import-export/import-products';
const MARKET_CATALOGS_SOURCE = 'https://help.shopify.com/en/manual/markets/customizations/catalogs';
const INVENTORY_CSV_SOURCE = 'https://help.shopify.com/en/manual/inventory-and-locations/setup/inventory-csv';
const MAX_SHOPIFY_PRODUCT_CSV_BYTES = 15_000_000;
const MAX_SHOPIFY_PRODUCT_TAGS = 250;
const MAX_SHOPIFY_BARCODES_PER_VARIANT = 20;
const MAX_SHOPIFY_COLLECTION_LENGTH = 255;
const MAX_PRODUCT_IMAGES = 250;
const RECOMMENDATION_RULES = new Set([
  'inventory-csv-format-detected',
  'inventory-csv-format-possible',
  'legacy-product-headers-detected',
  'update-overwrite-blank-semantics',
  'variant-option-change-may-replace-ids',
  'packed-dimensions-cleared-on-update',
  'non-shippable-variant-clears-packed-dimensions',
  'header-case-mismatch',
  'header-whitespace',
  'probable-header-typo',
  'unrecognized-product-header',
  'conflicting-header-aliases',
  'inventory-quantity-missing-with-tracker',
  'inventory-quantity-without-tracker',
  'inventory-quantity-single-location-only',
  'product-tags-contain-accented-characters',
  'product-tags-contain-symbols',
  'unrecognized-shopify-product-category-id',
  'blank-price-may-fail-import',
  'invalid-product-money-format',
  'custom-fulfillment-service-handle-format',
  'unlisted-inventory-tracker',
  'invalid-product-boolean-value',
  'invalid-weight-grams-format',
  'unrecognized-weight-unit',
  'invalid-image-position',
  'image-alt-text-exceeds-limit',
  'seo-title-exceeds-limit',
  'seo-description-exceeds-limit',
  'product-handle-contains-spaces',
  'product-tag-count-exceeds-limit',
  'variant-barcode-count-exceeds-limit',
  'collection-name-exceeds-limit',
  'product-image-count-exceeds-limit',
  'image-url-not-public-https',
  'image-filename-uses-thumbnail-suffix',
  'invalid-option-linkedto-format',
  'duplicate-product-handle',
  'product-handle-contains-undocumented-characters',
  'unsupported-product-option-column',
  'product-option-name-missing-value',
  'market-compare-at-requires-fixed-price',
  'unsupported-product-media-column',
  'unrecognized-market-included-value',
  'ambiguous-barcode-template-headers',
]);
const LEGACY_HEADER_ALIASES: Record<string, string[]> = {
  'URL handle': ['Handle'],
  'Description': ['Body (HTML)'],
  'Published on online store': ['Published'],
  'Option1 name': ['Option1 Name'],
  'Option1 value': ['Option1 Value'],
  'Option2 name': ['Option2 Name'],
  'Option2 value': ['Option2 Value'],
  'Option3 name': ['Option3 Name'],
  'Option3 value': ['Option3 Value'],
  'SKU': ['Variant SKU'],
  'Weight value (grams)': ['Variant Grams'],
  'Inventory tracker': ['Variant Inventory Tracker'],
  'Inventory quantity': ['Variant Inventory Qty'],
  'Continue selling when out of stock': ['Variant Inventory Policy'],
  'Fulfillment service': ['Variant Fulfillment Service'],
  'Price': ['Variant Price'],
  'Compare-at price': ['Variant Compare-at Price'],
  'Requires shipping': ['Variant Requires Shipping'],
  'Charge tax': ['Variant Taxable'],
  'Barcode': ['Variant Barcode'],
  'Product image URL': ['Image Src'],
  'Image alt text': ['Image Alt Text'],
};

function headerIndex(headers: string[], canonical: string): number | undefined {
  const currentIndex = headers.indexOf(canonical);
  if (currentIndex >= 0) return currentIndex;
  for (const alias of LEGACY_HEADER_ALIASES[canonical] ?? []) {
    const legacyIndex = headers.indexOf(alias);
    if (legacyIndex >= 0) return legacyIndex;
  }
  return undefined;
}

function unicodeCodePointLength(value: string): number {
  return [...value].length;
}

function containsAccentedLatinCharacter(value: string): boolean {
  return /\p{Script=Latin}\p{M}/u.test(value.normalize('NFD'));
}

function containsDiscouragedTagSymbol(value: string): boolean {
  return [...value].some((character) => character !== '-' && /[\p{P}\p{S}]/u.test(character));
}

function countBarcodeEntries(value: string): number {
  let entries = 0;
  let hasValue = false;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      hasValue = true;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ';') {
      if (hasValue) entries += 1;
      hasValue = false;
    } else if (!/\s/u.test(character)) {
      hasValue = true;
    }
  }

  if (hasValue || escaped) entries += 1;
  return entries;
}

const VARIANT_COLUMNS = [
  'Option1 name', 'Option1 value', 'Option1 LinkedTo', 'Option2 name', 'Option2 value', 'Option2 LinkedTo',
  'Option3 name', 'Option3 value', 'Option3 LinkedTo', 'SKU', 'Barcodes', 'Barcode', 'Price',
  'Compare-at price', 'Cost per item', 'Charge tax', 'Inventory tracker', 'Inventory quantity',
  'Continue selling when out of stock', 'Weight value (grams)', 'Weight unit for display',
  'Packed product length', 'Packed product width', 'Packed product height', 'Packed product dimension unit',
  'Requires shipping', 'Fulfillment service', 'Variant image URL',
  'Variant Barcodes', 'Tax code', 'Unit price total measure', 'Unit price total measure unit',
  'Unit price base measure', 'Unit price base measure unit',
  'Option1 Linked To', 'Option2 Linked To', 'Option3 Linked To',
];
const PRODUCT_BOOLEAN_HEADERS = new Set(['Published on online store', 'Published', 'Gift card']);
const VARIANT_BOOLEAN_HEADERS = new Set(['Charge tax', 'Requires shipping', 'Variant Taxable', 'Variant Requires Shipping']);
const WEIGHT_GRAMS_HEADERS = new Set(['Weight value (grams)', 'Variant Grams']);
const SEO_TEXT_LIMITS = [
  { header: 'SEO title', ruleId: 'seo-title-exceeds-limit', limit: 70 },
  { header: 'SEO description', ruleId: 'seo-description-exceeds-limit', limit: 320 },
];

const ADDITIONAL_SHOPIFY_TEMPLATE_HEADERS = new Set([
  'Variant Barcodes', 'Option1 Linked To', 'Option2 Linked To', 'Option3 Linked To', 'Tax code',
  'Unit price total measure', 'Unit price total measure unit', 'Unit price base measure', 'Unit price base measure unit',
]);

const GOOGLE_SHOPPING_HEADERS = new Set([
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  // These additional spellings are present in Shopify's downloadable product template.
  'Google Shopping / Manufacturer part number (MPN)',
  'Google Shopping / Ad group name',
  'Google Shopping / Google product category',
  'Google Shopping / Age group',
  'Google Shopping / Ads labels',
  'Google Shopping / Custom product',
  'Google Shopping / Custom label 0',
  'Google Shopping / Custom label 1',
  'Google Shopping / Custom label 2',
  'Google Shopping / Custom label 3',
  'Google Shopping / Custom label 4',
]);

const STATIC_PRODUCT_HEADERS = new Set([
  'Title', 'URL handle', 'Collection', 'Description', 'Body (HTML)', 'Vendor', 'Product category', 'Type', 'Tags',
  'Published on online store', 'Published', 'Status', 'Product image URL', 'Image position',
  'Image alt text', 'Gift card', 'SEO title', 'SEO description', ...VARIANT_COLUMNS,
  ...ADDITIONAL_SHOPIFY_TEMPLATE_HEADERS,
  ...GOOGLE_SHOPPING_HEADERS,
  ...Object.keys(LEGACY_HEADER_ALIASES), ...Object.values(LEGACY_HEADER_ALIASES).flat(),
]);
const NORMALIZED_STATIC_PRODUCT_HEADERS = new Set([...STATIC_PRODUCT_HEADERS].map((header) => header.toLowerCase()));
const UNSUPPORTED_PRODUCT_MEDIA_HEADERS = new Set([
  'Video URL', 'Product video URL', '3D model URL', 'Product 3D model URL',
]);
const NORMALIZED_UNSUPPORTED_PRODUCT_MEDIA_HEADERS = new Set(
  [...UNSUPPORTED_PRODUCT_MEDIA_HEADERS].map((header) => header.toLowerCase()),
);

const PRODUCT_DATA_HEADERS = new Set([
  'description', 'body (html)', 'vendor', 'product category', 'type', 'tags',
  'published on online store', 'status', 'sku', 'barcode', 'barcodes',
  'option1 name', 'option1 value', 'option1 linkedto', 'option2 name', 'option2 value', 'option2 linkedto',
  'option3 name', 'option3 value', 'option3 linkedto', 'price', 'compare-at price', 'cost per item',
  'charge tax', 'inventory tracker', 'inventory quantity', 'continue selling when out of stock',
  'weight value (grams)', 'weight unit for display', 'packed product length', 'packed product width',
  'packed product height', 'packed product dimension unit', 'requires shipping', 'fulfillment service',
  'image src', 'product image url', 'image position', 'image alt text', 'variant image url',
  'gift card', 'seo title', 'seo description', 'google shopping / google product category', 'collection',
  'variant sku', 'variant grams', 'variant inventory tracker', 'variant inventory qty',
  'variant inventory policy', 'variant fulfillment service', 'variant price', 'variant compare-at price',
  'variant requires shipping', 'variant taxable', 'variant barcode', 'published',
  'variant barcodes', 'tax code', 'unit price total measure', 'unit price total measure unit',
  'unit price base measure', 'unit price base measure unit', 'option1 linked to', 'option2 linked to', 'option3 linked to',
]);

function isProductDataHeader(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return PRODUCT_DATA_HEADERS.has(normalized)
    || /^(included|price|compare-at price|compare at price)\s*\//.test(normalized)
    || normalized.startsWith('google shopping /')
    || normalized.includes('product.metafields.');
}

function isVariantMetafieldHeader(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return normalized.startsWith('variant.metafields.') || normalized.includes('(variant.metafields.');
}

function hasExactDynamicProductHeader(header: string): boolean {
  return /^(Included|Price|Compare At Price|Compare-at price) \/ .+$/.test(header)
    || header.startsWith('product.metafields.')
    || header.includes('(product.metafields.');
}

function hasKnownDynamicProductHeaderCaseInsensitively(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return /^(included|price|compare at price|compare-at price) \/ .+$/.test(normalized)
    || normalized.startsWith('product.metafields.')
    || normalized.includes('(product.metafields.')
    || NORMALIZED_UNSUPPORTED_PRODUCT_MEDIA_HEADERS.has(normalized);
}

function isUnsupportedProductMediaHeader(header: string): boolean {
  return NORMALIZED_UNSUPPORTED_PRODUCT_MEDIA_HEADERS.has(header.trim().toLowerCase());
}

function differsByOneEdit(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length === right.length) {
      if (
        leftIndex + 1 < left.length
        && rightIndex + 1 < right.length
        && left[leftIndex] === right[rightIndex + 1]
        && left[leftIndex + 1] === right[rightIndex]
      ) {
        leftIndex += 2;
        rightIndex += 2;
      } else {
        leftIndex += 1;
        rightIndex += 1;
      }
    } else if (left.length > right.length) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }
  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits === 1;
}

function looksLikeInventoryQuantity(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'not stocked' || /^-?\d+(?:\.\d+)?$/.test(normalized);
}

function makeIssue(
  ruleId: string,
  severity: CsvIssue['severity'],
  message: string,
  row?: number,
  column?: string,
  explanation?: string,
  sourceUrl = PRODUCT_CSV_SOURCE,
): CsvIssue {
  const item: CsvIssue = {
    id: `${ruleId}-${row ?? 'file'}-${column ?? ''}`,
    ruleId,
    severity,
    category: RECOMMENDATION_RULES.has(ruleId) ? 'recommendation' : 'shopify-profile',
    message,
    fixSafety: 'manual',
    explanation: explanation ?? 'This check compares the CSV with Shopify’s documented product format. Review the indicated location and linked guidance before changing the file.',
    sourceUrl,
    profileVersion: SHOPIFY_PRODUCT_CSV_PROFILE,
  };
  if (row !== undefined) item.row = row;
  if (column !== undefined) item.column = column;
  if (explanation !== undefined) item.explanation = explanation;
  return item;
}

export function validateShopifyProductCsv(csv: ParsedCsv, options: ValidationOptions): CsvIssue[] {
  const issues: CsvIssue[] = [];
  const normalizedHeaders = new Set(csv.headers.map((header) => header.trim().toLowerCase()));
  const inventorySpecificColumns = [
    'on hand (current)',
    'on hand (new)',
    'available (not editable)',
  ];
  const isInventoryCsv = normalizedHeaders.has('location')
    && inventorySpecificColumns.some((header) => normalizedHeaders.has(header));

  const handleHeaderIndex = csv.headers.findIndex((header) => ['handle', 'url handle'].includes(header.trim().toLowerCase()));
  const titleHeaderIndex = csv.headers.findIndex((header) => header.trim().toLowerCase() === 'title');
  const dynamicLocationHeaders = csv.headers
    .map((header, index) => ({ header, index }))
    .filter(({ header, index }) => index !== handleHeaderIndex
      && index !== titleHeaderIndex
      && !isProductDataHeader(header));
  const hasProductSpecificColumns = csv.headers.some(isProductDataHeader);
  const quantityCellsOnly = dynamicLocationHeaders.length > 0
    && csv.rows.length > 0
    && dynamicLocationHeaders.every(({ index }) => csv.rows.some((row) => (row[index] ?? '').trim() !== ''))
    && csv.rows.every((row) => dynamicLocationHeaders.every(({ index }) => looksLikeInventoryQuantity(row[index] ?? '')));
  const hasAvailableInventoryShape = handleHeaderIndex >= 0
    && titleHeaderIndex >= 0
    && !hasProductSpecificColumns
    && quantityCellsOnly;
  const isWideAvailableInventoryCsv = hasAvailableInventoryShape && dynamicLocationHeaders.length >= 2;
  const couldBeSingleLocationInventoryCsv = hasAvailableInventoryShape && dynamicLocationHeaders.length === 1;

  if (isInventoryCsv || isWideAvailableInventoryCsv) {
    issues.push(makeIssue(
      'inventory-csv-format-detected',
      'warning',
      `This looks like a Shopify ${isWideAvailableInventoryCsv ? 'Available inventory' : 'inventory'} CSV; product checks were skipped.`,
      1,
      isWideAvailableInventoryCsv ? undefined : 'Location',
      isWideAvailableInventoryCsv
        ? 'Shopify Available inventory exports use location names as quantity-column headers. This format has no product-specific columns, and its location values are numeric quantities.'
        : 'Shopify inventory CSVs use a separate format for locations and stock quantities. Analyze this file with an inventory-specific profile when available.',
      INVENTORY_CSV_SOURCE,
    ));
    return issues;
  }

  if (couldBeSingleLocationInventoryCsv) {
    issues.push(makeIssue(
      'inventory-csv-format-possible',
      'info',
      'This file might be a Shopify Available inventory CSV with one location column.',
      1,
      dynamicLocationHeaders[0]?.header,
      'A single numeric custom product column can look the same. Product checks continue; confirm the file type before relying on the results.',
      INVENTORY_CSV_SOURCE,
    ));
  }

  const looksLikeProductCsv = titleHeaderIndex >= 0 || handleHeaderIndex >= 0 || hasProductSpecificColumns;
  if (!couldBeSingleLocationInventoryCsv
    && looksLikeProductCsv
    && (options.fileSizeBytes ?? 0) > MAX_SHOPIFY_PRODUCT_CSV_BYTES) {
    issues.push(makeIssue(
      'product-csv-exceeds-size-limit',
      'error',
      'Shopify product CSV files cannot exceed 15 MB; split this file before importing.',
      undefined,
      undefined,
      'Shopify documents a 15 MB maximum for product CSV imports. CSV Import Doctor can analyze files up to its separate 20 MB local limit, but an oversized product CSV must be split before Shopify will accept it.',
      PRODUCT_CSV_IMPORT_SOURCE,
    ));
  }

  if (csv.delimiter !== ',') {
    issues.push(makeIssue(
      'product-csv-delimiter-not-comma',
      'warning',
      'Shopify product CSV files use commas between columns; the reviewed export will use commas.',
      1,
      undefined,
      `This file was parsed using ${csv.delimiter === '\t' ? 'a tab' : `delimiter "${csv.delimiter}"`}. Shopify documents comma-separated product CSV files.`,
    ));
  }

  const indices = new Map(csv.headers.map((header, index) => [header, index]));
  const titleIndex = headerIndex(csv.headers, 'Title');
  const handleIndex = headerIndex(csv.headers, 'URL handle');
  const collectionIndex = csv.headers.indexOf('Collection');
  const productCategoryIndex = csv.headers.indexOf('Product category');
  const tagsIndex = csv.headers.indexOf('Tags');
  const marketIncludedIndices = csv.headers
    .map((header, columnIndex) => /^Included \/ .+$/.test(header) ? columnIndex : -1)
    .filter((columnIndex) => columnIndex >= 0);
  const barcodesIndices = csv.headers
    .map((header, index) => ['Barcodes', 'Variant Barcodes'].includes(header) ? index : -1)
    .filter((index) => index >= 0);
  const giftCardIndex = csv.headers.indexOf('Gift card');
  const imageIndices = [...new Set(['Product image URL', 'Image Src']
    .map((header) => headerIndex(csv.headers, header))
    .filter((index): index is number => index !== undefined))];
  const imageUrlIndices = [...new Set([
    ...imageIndices,
    headerIndex(csv.headers, 'Variant image URL'),
  ].filter((index): index is number => index !== undefined))];
  const imagePositionIndex = headerIndex(csv.headers, 'Image position');
  const imageAltTextIndices = csv.headers
    .map((header, index) => ['Image alt text', 'Image Alt Text'].includes(header) ? index : -1)
    .filter((index) => index >= 0);
  const statusIndex = headerIndex(csv.headers, 'Status');
  const priceIndex = headerIndex(csv.headers, 'Price');
  const monetaryHeaders = new Set(['Price', 'Compare-at price', 'Cost per item', 'Variant Price', 'Variant Compare-at Price']);
  const monetaryColumnIndices = csv.headers
    .map((header, index) => monetaryHeaders.has(header) ? index : -1)
    .filter((index) => index >= 0);
  const marketCompareAtColumns = csv.headers
    .map((header, columnIndex) => {
      const match = /^(?:Compare At Price|Compare-at price) \/ (.+)$/.exec(header);
      if (!match) return undefined;
      const matchingPriceColumn = csv.headers.indexOf(`Price / ${match[1]}`);
      return { header, market: match[1], columnIndex, matchingPriceColumn };
    })
    .filter((column): column is { header: string; market: string; columnIndex: number; matchingPriceColumn: number } =>
      column !== undefined);
  const optionValueIndices = ['Option1 value', 'Option2 value', 'Option3 value']
    .map((header) => headerIndex(csv.headers, header))
    .filter((index): index is number => index !== undefined);
  const optionLinkedToIndices = csv.headers
    .map((header, index) => /^Option[123] Linked(?:To| To)$/.test(header) ? index : -1)
    .filter((index) => index >= 0);
  const variantDataIndices = VARIANT_COLUMNS
    .map((header) => headerIndex(csv.headers, header))
    .filter((index): index is number => index !== undefined);
  const weightGramsIndices = csv.headers
    .map((header, index) => WEIGHT_GRAMS_HEADERS.has(header) ? index : -1)
    .filter((index) => index >= 0);
  const weightUnitIndices = csv.headers
    .map((header, index) => header === 'Weight unit for display' ? index : -1)
    .filter((index) => index >= 0);
  const packedDimensionHeaders = [
    'Packed product length', 'Packed product width', 'Packed product height', 'Packed product dimension unit',
  ];
  const packedDimensionIndices = packedDimensionHeaders
    .map((header) => headerIndex(csv.headers, header))
    .filter((index): index is number => index !== undefined);
  const requiresShippingIndex = headerIndex(csv.headers, 'Requires shipping');
  const skuIndex = headerIndex(csv.headers, 'SKU');
  const inventoryTrackerIndex = headerIndex(csv.headers, 'Inventory tracker');
  const inventoryTrackerColumnCount = ['Inventory tracker', ...LEGACY_HEADER_ALIASES['Inventory tracker']!]
    .filter((header) => indices.has(header)).length;
  const inventoryQuantityIndex = headerIndex(csv.headers, 'Inventory quantity');
  const inventoryPolicyIndex = headerIndex(csv.headers, 'Continue selling when out of stock');
  const fulfillmentServiceIndex = headerIndex(csv.headers, 'Fulfillment service');
  const builtInFulfillmentServices = new Set(['manual', 'shipwire', 'webgistix', 'amazon_marketplace_web', 'gift_card']);

  if (inventoryQuantityIndex !== undefined && csv.rows.some((row) => Boolean((row[inventoryQuantityIndex] ?? '').trim()))) {
    issues.push(makeIssue(
      'inventory-quantity-single-location-only',
      'info',
      'Inventory quantity in a product CSV only applies to stores with one location.',
      undefined,
      csv.headers[inventoryQuantityIndex],
      'Shopify documents that the product CSV Inventory quantity field applies only to stores with a single location. This analyzer cannot inspect your store configuration. For inventory across multiple locations, Shopify provides a separate inventory CSV format; the product data remains unchanged.',
    ));
  }

  const usedLegacyHeaders = Object.values(LEGACY_HEADER_ALIASES).flat().filter((alias) => indices.has(alias));
  if (usedLegacyHeaders.length > 0) {
    issues.push(makeIssue(
      'legacy-product-headers-detected',
      'info',
      'This file uses headers from Shopify’s older product CSV template.',
      1,
      usedLegacyHeaders.join(' / '),
      'Shopify maintains backward compatibility with older column names. The file is preserved as supplied; consider switching to the current template headers for future compatibility.',
      'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    ));
  }

  Object.entries(LEGACY_HEADER_ALIASES).forEach(([currentHeader, legacyHeaders]) => {
    const matchingHeaders = [currentHeader, ...legacyHeaders].filter((header) => indices.has(header));
    if (matchingHeaders.length < 2) return;
    issues.push(makeIssue(
      'conflicting-header-aliases',
      'warning',
      `This file contains multiple headers for the same Shopify field: ${matchingHeaders.join(' / ')}.`,
      1,
      matchingHeaders.join(' / '),
      `The profile recognizes these current and older header names as aliases for "${currentHeader}". Shopify documents backward compatibility with older templates, but does not specify how both columns are handled together. Confirm which column contains the intended data; both columns and their values are preserved.`,
      'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    ));
  });

  csv.headers.filter(isVariantMetafieldHeader).forEach((header) => {
    issues.push(makeIssue(
      'unsupported-variant-metafield-header',
      'warning',
      'Variant metafields are not supported by Shopify product CSV import/export.',
      1,
      header,
      'Shopify supports product metafields in product CSV but excludes variant metafields. The app preserves this column; manage variant metafields with Shopify’s variant bulk editor instead.',
    ));
  });

  const reportedHeaderDiagnostics = new Set<string>();
  csv.headers.forEach((header) => {
    const trimmed = header.trim();
    if (!trimmed || isVariantMetafieldHeader(header)) return;
    if (isUnsupportedProductMediaHeader(header)) {
      issues.push(makeIssue(
        'unsupported-product-media-column',
        'warning',
        `Shopify product CSV does not import video or 3D media from the "${trimmed}" column.`,
        1,
        header,
        'Shopify documents product image URLs as the supported media in product CSV files; videos and 3D models are not supported by this import format. Upload those media through Shopify admin instead. The column and all values are preserved.',
        PRODUCT_CSV_SOURCE,
      ));
      if (UNSUPPORTED_PRODUCT_MEDIA_HEADERS.has(header)) return;
    }
    const unsupportedOptionHeader = /^Option(\d+) (?:name|value|LinkedTo)$/i.exec(trimmed);
    if (unsupportedOptionHeader && Number(unsupportedOptionHeader[1]) > 3) {
      issues.push(makeIssue(
        'unsupported-product-option-column',
        'warning',
        `Shopify supports up to three product options; "${header}" is outside that limit.`,
        1,
        header,
        'Shopify’s product CSV guide documents Option1, Option2, and Option3 and states that a product can have at most three options. Verify the source column or map its data manually; the app preserves the header and values and does not claim a specific importer outcome.',
      ));
      if (header !== trimmed) {
        issues.push(makeIssue(
          'header-whitespace',
          'warning',
          'A product CSV header has leading or trailing whitespace.',
          1,
          header,
          'Shopify warns that extra whitespace in a header can cause header errors. Remove the surrounding whitespace manually; the app leaves the header unchanged.',
        ));
      }
      return;
    }
    if (STATIC_PRODUCT_HEADERS.has(header) || hasExactDynamicProductHeader(header)) return;

    const normalized = trimmed.toLowerCase();
    let ruleId: string;
    let message: string;
    let explanation: string;
    if (header !== trimmed && (NORMALIZED_STATIC_PRODUCT_HEADERS.has(normalized) || hasKnownDynamicProductHeaderCaseInsensitively(header))) {
      ruleId = 'header-whitespace';
      message = 'A product CSV header has leading or trailing whitespace.';
      explanation = 'Shopify documents exact header names and warns that extra whitespace in the header row can cause header errors. Remove the surrounding whitespace manually; the app leaves the header unchanged.';
    } else if (NORMALIZED_STATIC_PRODUCT_HEADERS.has(normalized) || hasKnownDynamicProductHeaderCaseInsensitively(header)) {
      ruleId = 'header-case-mismatch';
      message = 'A product CSV header differs in capitalization from a documented Shopify header.';
      explanation = 'Shopify requires the documented header spelling. Correct the capitalization in the source file; the app does not rename headers automatically.';
    } else {
      const possibleTypo = [...STATIC_PRODUCT_HEADERS].find((knownHeader) => differsByOneEdit(normalized, knownHeader.toLowerCase()));
      if (possibleTypo) {
        ruleId = 'probable-header-typo';
        message = `This header may be a typo for "${possibleTypo}".`;
        explanation = 'This suggestion is based only on the header spelling. Confirm the intended field before editing; the app does not rename the column or its values.';
      } else {
        ruleId = 'unrecognized-product-header';
        message = 'This header is not recognized by the current Shopify product CSV profile.';
        explanation = 'The column and its values are preserved. Verify the name against the current or documented older template; Shopify can ask you to choose a matching column heading when a header is incorrect.';
      }
    }

    const diagnosticKey = `${ruleId}:${header}`;
    if (reportedHeaderDiagnostics.has(diagnosticKey)) return;
    reportedHeaderDiagnostics.add(diagnosticKey);
    issues.push(makeIssue(
      ruleId,
      ruleId === 'unrecognized-product-header' ? 'info' : 'warning',
      message,
      1,
      header,
      explanation,
      'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
    ));
  });

  if (titleIndex === undefined) {
    issues.push(makeIssue(
      'required-header-title', 'error', 'The product CSV needs a Title column.', 1, 'Title',
      'Add the documented Title header to the first row. Shopify requires it for both product creation and updates.',
    ));
  }
  if (options.mode === 'update' && handleIndex === undefined) {
    issues.push(makeIssue(
      'required-header-handle', 'error', 'Product updates require a URL handle column.', 1, 'URL handle',
      'Add the current URL handle header, or use the documented exact legacy Handle header, so Shopify can match each product being updated.',
    ));
  }
  const hasSingularBarcodeHeader = headerIndex(csv.headers, 'Barcode') !== undefined;
  const hasCurrentPluralBarcodeHeader = csv.headers.includes('Barcodes');
  const hasTemplatePluralBarcodeHeader = csv.headers.includes('Variant Barcodes');
  if (hasSingularBarcodeHeader && hasCurrentPluralBarcodeHeader) {
    issues.push(makeIssue(
      'barcode-columns-conflict',
      'error',
      'Use either Barcode or Barcodes; Shopify does not accept both columns in one file.',
      1,
      'Barcode / Barcodes',
      'Shopify documents the singular Barcode column as an older header and says a file containing both Barcode and Barcodes fails to import.',
    ));
  } else if ((hasSingularBarcodeHeader || hasCurrentPluralBarcodeHeader) && hasTemplatePluralBarcodeHeader) {
    issues.push(makeIssue(
      'ambiguous-barcode-template-headers',
      'warning',
      'Review the barcode columns; multiple header spellings may describe the same barcode data.',
      1,
      csv.headers.filter((header) => ['Barcode', 'Variant Barcode', 'Barcodes', 'Variant Barcodes'].includes(header)).join(' / '),
      'Shopify states that a product CSV containing both singular `Barcode` and plural `Barcodes` fails to import. The downloadable product template uses `Variant Barcodes`, but Shopify does not document how that spelling interacts with the other barcode headers. Confirm which column is intended; the app preserves all columns and does not assert that Shopify will reject this combination.',
      PRODUCT_CSV_SOURCE,
    ));
  }

  const hasVariantColumns = VARIANT_COLUMNS.some((header) => headerIndex(csv.headers, header) !== undefined);
  const hasOptionIdentity = headerIndex(csv.headers, 'Option1 name') !== undefined && headerIndex(csv.headers, 'Option1 value') !== undefined;
  if (options.mode === 'update' && hasVariantColumns && !hasOptionIdentity) {
    issues.push(makeIssue(
      'variant-identity-columns-missing',
      'warning',
      'Variant data is present without both Option1 name and Option1 value columns.',
      1,
      'Option1 name / Option1 value',
      'Shopify documents that variant-related columns depend on variant option columns. An update can otherwise replace existing variants with a default variant.',
    ));
  }

  if (options.mode === 'update' && csv.headers.some((header) => header !== 'Title' && headerIndex([header], 'URL handle') !== 0)) {
    issues.push(makeIssue(
      'update-overwrite-blank-semantics',
      'info',
      'If you enable Shopify overwrite, blank cells in included columns can clear existing values.',
      1,
      undefined,
      'Columns omitted from the file leave existing values unchanged. This analysis cannot see the store or determine whether you will select Shopify overwrite.',
    ));
  }

  if (packedDimensionIndices.length > 0 && packedDimensionIndices.length < packedDimensionHeaders.length) {
    issues.push(makeIssue(
      'packed-dimension-column-set-incomplete',
      'warning',
      'Packed product dimensions use four related columns; include all four or omit all four.',
      1,
      packedDimensionHeaders.filter((header) => !indices.has(header)).join(' / '),
      'Shopify documents that partial packed-dimension column sets can cause import errors. Values in all four columns can also clear or update saved variant dimensions.',
    ));
  }

  let currentProductImageGroup = '';
  let anonymousProductCounter = 0;
  const firstVariantRowByCombination = new Map<string, number>();
  const firstProductRowByHandle = new Map<string, number>();
  const productImageEntryCountByGroup = new Map<string, number>();
  const reportedProductImageLimits = new Set<string>();
  csv.rows.forEach((row, index) => {
    const visibleRow = index + 2;
    const rawHandle = handleIndex === undefined ? '' : (row[handleIndex] ?? '');
    const handle = rawHandle.trim();
    const title = titleIndex === undefined ? '' : (row[titleIndex] ?? '').trim();
    const hasImageUrl = imageIndices.some((imageIndex) => Boolean((row[imageIndex] ?? '').trim()));
    const hasDataOtherThanTitle = row.some((value, columnIndex) =>
      columnIndex !== titleIndex && Boolean((value ?? '').trim()));
    const hasOptionValue = optionValueIndices.some((index) => Boolean((row[index] ?? '').trim()));
    const hasVariantData = variantDataIndices.some((index) => Boolean((row[index] ?? '').trim()));
    const requiresShipping = requiresShippingIndex === undefined
      ? ''
      : (row[requiresShippingIndex] ?? '').trim().toLowerCase();
    const sku = skuIndex === undefined ? '' : (row[skuIndex] ?? '').trim();
    const inventoryTracker = inventoryTrackerIndex === undefined ? '' : (row[inventoryTrackerIndex] ?? '').trim();
    const inventoryQuantity = inventoryQuantityIndex === undefined ? '' : (row[inventoryQuantityIndex] ?? '').trim();
    const inventoryPolicy = inventoryPolicyIndex === undefined ? '' : (row[inventoryPolicyIndex] ?? '').trim();
    const price = priceIndex === undefined ? '' : (row[priceIndex] ?? '').trim();
    const fulfillmentService = fulfillmentServiceIndex === undefined ? '' : (row[fulfillmentServiceIndex] ?? '').trim();
    const packedDimensionValues = packedDimensionHeaders.map((header) => {
      const columnIndex = headerIndex(csv.headers, header);
      return columnIndex === undefined ? '' : (row[columnIndex] ?? '').trim();
    });
    const populatedPackedDimensionCount = packedDimensionValues.filter(Boolean).length;
    const startsProduct = Boolean(title)
      || Boolean(handle && !firstProductRowByHandle.has(handle))
      || (!handle && index === 0);
    if (startsProduct) {
      currentProductImageGroup = handle
        ? `handle:${handle}`
        : `unkeyed-product:${++anonymousProductCounter}`;
      if (handle) {
        const firstProductRow = firstProductRowByHandle.get(handle);
        if (firstProductRow !== undefined) {
          issues.push(makeIssue(
            'duplicate-product-handle',
            'warning',
            `This product-start row repeats the handle from row ${firstProductRow}.`,
            visibleRow,
            csv.headers[handleIndex ?? 0],
            'Shopify uses URL handle as the unique identifier for a product. A repeated handle on another row with a Title can indicate that two product records were assigned the same handle. Check that this is a continuation row and that each product has its intended unique handle; the app preserves the handle and does not assume Shopify will reject the file.',
          ));
        } else {
          firstProductRowByHandle.set(handle, visibleRow);
        }
      }
    } else if (handle) {
      currentProductImageGroup = `handle:${handle}`;
    }

    if (startsProduct) {
      for (const columnIndex of marketIncludedIndices) {
        const value = (row[columnIndex] ?? '').trim();
        if (!value || /^(?:true|false)$/i.test(value)) continue;

        issues.push(makeIssue(
          'unrecognized-market-included-value',
          'info',
          `Review the value in ${csv.headers[columnIndex]} for market availability.`,
          visibleRow,
          csv.headers[columnIndex],
          'Shopify describes Included / [Market] as whether the product is available in that market and documents true as the default, but does not list all accepted value spellings. Confirm that this value matches the intended market availability; this note does not assert that Shopify will reject it. The app preserves the cell.',
          PRODUCT_CSV_SOURCE,
        ));
      }

      for (const optionNumber of [1, 2, 3]) {
        const optionNameIndex = headerIndex(csv.headers, `Option${optionNumber} name`);
        const optionValueIndex = headerIndex(csv.headers, `Option${optionNumber} value`);
        const optionName = optionNameIndex === undefined ? '' : (row[optionNameIndex] ?? '').trim();
        const optionValue = optionValueIndex === undefined ? '' : (row[optionValueIndex] ?? '').trim();
        if (!optionName || optionValue || optionValueIndex === undefined) continue;

        issues.push(makeIssue(
          'product-option-name-missing-value',
          'warning',
          `Option${optionNumber} name has no matching value on this product row.`,
          visibleRow,
          csv.headers[optionValueIndex],
          `Shopify documents option names and values as the data used to create product variants. Supply the intended Option${optionNumber} value. If this is a single default variant, verify Shopify's documented Default Title value. This is an advisory; the app preserves the cells and does not assert a specific import result.`,
          PRODUCT_CSV_SOURCE,
        ));
      }
    }

    if (options.mode === 'create'
      && startsProduct
      && giftCardIndex !== -1
      && (row[giftCardIndex] ?? '').trim() === 'true') {
      issues.push(makeIssue(
        'gift-card-create-not-supported',
        'error',
        'Shopify does not allow creating gift cards through a product CSV import.',
        visibleRow,
        'Gift card',
        'Shopify documents that a gift card cannot be created by importing a product CSV. Create and activate the gift card in Shopify admin; this diagnostic applies to create mode only and does not change the value.',
        PRODUCT_CSV_SOURCE,
      ));
    }

    for (const columnIndex of monetaryColumnIndices) {
      const value = (row[columnIndex] ?? '').trim();
      if (value && !/^[+-]?\d+(?:\.\d+)?$/.test(value)) {
        issues.push(makeIssue(
          'invalid-product-money-format',
          'warning',
          `${csv.headers[columnIndex]} should contain a numeric monetary value without a currency symbol.`,
          visibleRow,
          csv.headers[columnIndex],
          'Shopify says Price, Compare-at price, and Cost per item must contain the monetary value without a currency symbol (for example, 9.99). Confirm this value and edit it manually; the analyzer preserves it and does not infer currency, precision, or an intended replacement.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }

    for (const { header, market, columnIndex, matchingPriceColumn } of marketCompareAtColumns) {
      const compareAtPrice = (row[columnIndex] ?? '').trim();
      const marketPrice = matchingPriceColumn < 0 ? '' : (row[matchingPriceColumn] ?? '').trim();
      if (!compareAtPrice || marketPrice) continue;

      issues.push(makeIssue(
        'market-compare-at-requires-fixed-price',
        'warning',
        `A fixed Price / ${market} is required when ${header} is set.`,
        visibleRow,
        header,
        `Shopify documents that a fixed compare-at price for a market requires a fixed price for the same product in that market. Add the intended Price / ${market}, or verify the catalog pricing setup; this advisory does not modify either value.`,
        MARKET_CATALOGS_SOURCE,
      ));
    }

    if (handle && /\s/u.test(rawHandle)) {
      issues.push(makeIssue(
        'product-handle-contains-spaces',
        'warning',
        'This product handle contains whitespace; Shopify says valid handles cannot contain spaces.',
        visibleRow,
        csv.headers[handleIndex ?? 0],
        'Shopify documents URL handles as letters, dashes, and numbers, and explicitly says they cannot contain spaces. This advisory flags whitespace only; it does not rewrite the handle or infer other invalid characters.',
        PRODUCT_CSV_SOURCE,
      ));
    }
    if (handle && /[^\p{L}\p{N}\s-]/u.test(rawHandle)) {
      issues.push(makeIssue(
        'product-handle-contains-undocumented-characters',
        'warning',
        'This product handle contains characters outside Shopify’s documented letters, numbers, and hyphens.',
        visibleRow,
        csv.headers[handleIndex ?? 0],
        'Shopify describes valid URL handles as letters, dashes, and numbers, and says they cannot contain spaces. This advisory flags punctuation and symbols without assuming the importer will reject them; it preserves the value and leaves any edit to you.',
        PRODUCT_CSV_SOURCE,
      ));
    }
    const imageEntryColumns = imageIndices.filter((imageIndex) => (row[imageIndex] ?? '').trim() !== '');
    if (imageEntryColumns.length > 0) {
      const group = currentProductImageGroup || `unassigned-row:${visibleRow}`;
      const imageCount = (productImageEntryCountByGroup.get(group) ?? 0) + imageEntryColumns.length;
      productImageEntryCountByGroup.set(group, imageCount);
      if (imageCount > MAX_PRODUCT_IMAGES && !reportedProductImageLimits.has(group)) {
        reportedProductImageLimits.add(group);
        issues.push(makeIssue(
          'product-image-count-exceeds-limit',
          'warning',
          `This product lists ${imageCount} product image URL entries; Shopify allows a maximum of ${MAX_PRODUCT_IMAGES} images per product.`,
          visibleRow,
          imageEntryColumns.map((imageIndex) => csv.headers[imageIndex]).join(' / '),
          'Shopify allows up to 250 product images and documents one row per image in a product CSV. This count includes nonblank Product image URL and Image Src cells across rows grouped by handle; it does not count Variant image URL references. The original rows and URLs are preserved.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }
    for (const imageUrlIndex of imageUrlIndices) {
      const imageUrl = (row[imageUrlIndex] ?? '').trim();
      if (!imageUrl) continue;
      let isAbsolutePublicHttpsUrl = false;
      try {
        const parsedImageUrl = new URL(imageUrl);
        isAbsolutePublicHttpsUrl = parsedImageUrl.protocol === 'https:'
          && !parsedImageUrl.username
          && !parsedImageUrl.password;
      } catch {
        // Invalid, relative, and non-URL values are reported below without making a network request.
      }
      if (!isAbsolutePublicHttpsUrl) {
        issues.push(makeIssue(
          'image-url-not-public-https',
          'warning',
          'Shopify expects a publicly accessible HTTPS image URL without password protection.',
          visibleRow,
          csv.headers[imageUrlIndex],
          'Shopify requires publicly accessible image URLs over HTTPS. This value is not an absolute HTTPS URL without embedded credentials. CSV Import Doctor does not request the URL, so it cannot confirm that the image exists or is publicly accessible. The original value is preserved.',
          PRODUCT_CSV_SOURCE,
        ));
        continue;
      }

      if (imageIndices.includes(imageUrlIndex)) {
        try {
          const imagePath = new URL(imageUrl).pathname;
          const rawFilename = imagePath.split('/').pop() ?? '';
          const filename = decodeURIComponent(rawFilename);
          if (/_(?:thumb|small|medium)(?:\..+)?$/i.test(filename)) {
            issues.push(makeIssue(
              'image-filename-uses-thumbnail-suffix',
              'warning',
              'This product image URL uses a _thumb, _small, or _medium filename suffix.',
              visibleRow,
              csv.headers[imageUrlIndex],
              'Shopify instructs merchants not to use image filenames with _thumb, _small, or _medium suffixes. Use the final full-size image URL; the analyzer does not fetch the image or alter the URL.',
              PRODUCT_CSV_SOURCE,
            ));
          }
        } catch {
          // URL errors have already been reported by image-url-not-public-https.
        }
      }
    }
    if (startsProduct || hasOptionValue || hasVariantData) {
      for (const columnIndex of barcodesIndices) {
        const barcodeValue = row[columnIndex] ?? '';
        const barcodeCount = countBarcodeEntries(barcodeValue);
        if (barcodeCount > MAX_SHOPIFY_BARCODES_PER_VARIANT) {
          issues.push(makeIssue(
            'variant-barcode-count-exceeds-limit',
            'warning',
            `This product or variant has ${barcodeCount} barcodes; Shopify allows a maximum of ${MAX_SHOPIFY_BARCODES_PER_VARIANT}.`,
            visibleRow,
            csv.headers[columnIndex],
            'Shopify documents up to 20 barcodes per product or variant. The current product template also uses the Variant Barcodes header. Values are separated by semicolons; escaped semicolons and backslashes are part of a barcode value and are not counted as separators. The app preserves the original cell.',
            PRODUCT_CSV_SOURCE,
          ));
        }
      }
    }

    if (imagePositionIndex !== undefined) {
      const imagePosition = (row[imagePositionIndex] ?? '').trim();
      if (imagePosition && (!Number.isFinite(Number(imagePosition)) || Number(imagePosition) < 1)) {
        issues.push(makeIssue(
          'invalid-image-position',
          'warning',
          'Image position must be a number greater than or equal to 1.',
          visibleRow,
          'Image position',
          'Shopify uses Image position to order product images in ascending order starting at 1. Enter a numeric position of at least 1; the app does not reorder images.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }
    for (const columnIndex of imageAltTextIndices) {
      const altText = row[columnIndex] ?? '';
      if (unicodeCodePointLength(altText) > 512) {
        issues.push(makeIssue(
          'image-alt-text-exceeds-limit',
          'warning',
          'Image alt text exceeds Shopify’s 512-character maximum.',
          visibleRow,
          csv.headers[columnIndex],
          'Shopify documents a maximum of 512 characters for image alt text. This check counts Unicode code points; shorten the text manually and review the resulting description before changing it.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }
    for (const columnIndex of optionLinkedToIndices) {
      const linkedTo = (row[columnIndex] ?? '').trim();
      if (linkedTo && (!linkedTo.startsWith('product.metafields.shopify.')
        || linkedTo.length === 'product.metafields.shopify.'.length)) {
        issues.push(makeIssue(
          'invalid-option-linkedto-format',
          'warning',
          `${csv.headers[columnIndex]} should use Shopify's documented product.metafields.shopify taxonomy-attribute format.`,
          visibleRow,
          csv.headers[columnIndex],
          'Shopify documents Option LinkedTo values as product.metafields.shopify.{taxonomy_attribute}. Confirm the category metafield key for this product; this local check verifies only the documented namespace prefix and a non-empty attribute name, and preserves the supplied value.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }
    if (startsProduct) {
      if (productCategoryIndex >= 0) {
        const categoryValue = (row[productCategoryIndex] ?? '').trim();
        if (/^[A-Za-z]{2}(?:-\d+)*$/.test(categoryValue) && !SHOPIFY_PRODUCT_CATEGORY_IDS.has(categoryValue)) {
          issues.push(makeIssue(
            'unrecognized-shopify-product-category-id',
            'info',
            `This Product category ID is not in Shopify's ${SHOPIFY_TAXONOMY_VERSION} taxonomy release.`,
            visibleRow,
            csv.headers[productCategoryIndex],
            `Shopify accepts a standard category ID or full category breadcrumb. This ID is absent from the pinned ${SHOPIFY_TAXONOMY_VERSION} English taxonomy data, which might be older than your store's current taxonomy. Verify the value against Shopify before changing it; this diagnostic does not assert import failure and the cell remains unchanged. Breadcrumbs are not validated because they may be localized.`,
            `https://github.com/Shopify/product-taxonomy/releases/tag/v${SHOPIFY_TAXONOMY_VERSION}`,
          ));
        }
      }
      if (collectionIndex >= 0) {
        const collectionName = row[collectionIndex] ?? '';
        const collectionLength = unicodeCodePointLength(collectionName);
        if (collectionLength > MAX_SHOPIFY_COLLECTION_LENGTH) {
          issues.push(makeIssue(
            'collection-name-exceeds-limit',
            'warning',
            `This collection name has ${collectionLength} characters; Shopify allows a maximum of ${MAX_SHOPIFY_COLLECTION_LENGTH}.`,
            visibleRow,
            csv.headers[collectionIndex],
            'Shopify documents a maximum length of 255 characters for the product CSV Collection value. Shorten the name manually if appropriate; this advisory counts Unicode code points and preserves the original value.',
            PRODUCT_CSV_SOURCE,
          ));
        }
      }
      if (tagsIndex >= 0) {
        const tagsValue = row[tagsIndex] ?? '';
        const tagCount = tagsValue.split(',').filter((tag) => tag.trim() !== '').length;
        if (tagCount > MAX_SHOPIFY_PRODUCT_TAGS) {
          issues.push(makeIssue(
            'product-tag-count-exceeds-limit',
            'warning',
            `This product has ${tagCount} tags; Shopify allows a maximum of ${MAX_SHOPIFY_PRODUCT_TAGS}.`,
            visibleRow,
            csv.headers[tagsIndex],
            'Shopify documents a maximum of 250 tags per product and separates tags with commas in the CSV cell. This count ignores empty comma-separated entries; check the separators and remove excess tags manually. The original cell is preserved.',
            PRODUCT_CSV_SOURCE,
          ));
        }
        if (containsAccentedLatinCharacter(tagsValue)) {
          issues.push(makeIssue(
            'product-tags-contain-accented-characters',
            'info',
            'Shopify recommends avoiding accented characters in product tags.',
            visibleRow,
            csv.headers[tagsIndex],
            'Shopify recommends avoiding accented characters in tags, but does not document an import failure for them. Review whether the recommendation fits this catalog; the app preserves the original tags and does not propose a translation or removal.',
            PRODUCT_CSV_SOURCE,
          ));
        }
        const containsSymbol = tagsValue.split(',').some((tag) => containsDiscouragedTagSymbol(tag));
        if (containsSymbol) {
          issues.push(makeIssue(
            'product-tags-contain-symbols',
            'info',
            'Shopify recommends using letters, numbers, and hyphens in product tags.',
            visibleRow,
            csv.headers[tagsIndex],
            'Shopify recommends using letters, numbers, and hyphens in tags and avoiding symbols. This tag contains punctuation or a symbol other than a hyphen; Shopify does not document that it will fail to import. Review the tag manually. The app preserves the original value and does not propose a change.',
            PRODUCT_CSV_SOURCE,
          ));
        }
      }
      for (const { header, ruleId, limit } of SEO_TEXT_LIMITS) {
        const columnIndex = csv.headers.indexOf(header);
        if (columnIndex < 0) continue;
        const value = row[columnIndex] ?? '';
        if (unicodeCodePointLength(value) <= limit) continue;

        issues.push(makeIssue(
          ruleId,
          'warning',
          `${header} exceeds Shopify’s ${limit}-character limit.`,
          visibleRow,
          header,
          `Shopify documents a maximum of ${limit} characters for ${header}. This check counts Unicode code points; shorten the value manually if appropriate.`,
          PRODUCT_CSV_SOURCE,
        ));
      }
    }

    for (const columnIndex of weightGramsIndices) {
      const weight = (row[columnIndex] ?? '').trim();
      if (weight && !/^\d+$/.test(weight)) {
        issues.push(makeIssue(
          'invalid-weight-grams-format',
          'warning',
          'Weight value (grams) should be a whole number in grams, without a unit.',
          visibleRow,
          csv.headers[columnIndex],
          'Shopify documents this value as a number of grams with no unit or decimal places. Convert the measurement to whole grams and preserve the original value until you choose to edit it.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }
    for (const columnIndex of weightUnitIndices) {
      const weightUnit = (row[columnIndex] ?? '').trim();
      if (weightUnit && !['g', 'kg', 'lb', 'oz'].includes(weightUnit)) {
        issues.push(makeIssue(
          'unrecognized-weight-unit',
          'warning',
          'Weight unit for display should be g, kg, lb, or oz.',
          visibleRow,
          'Weight unit for display',
          'Shopify documents g, kg, lb, and oz as the accepted display units. Confirm the intended unit manually; the app does not convert weight values or alter unit casing.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    }

    csv.headers.forEach((header, columnIndex) => {
      const isProductBoolean = PRODUCT_BOOLEAN_HEADERS.has(header);
      const isVariantBoolean = VARIANT_BOOLEAN_HEADERS.has(header);
      if (!isProductBoolean && !isVariantBoolean) return;
      if (isProductBoolean && !startsProduct) return;
      if (isVariantBoolean && !(startsProduct || hasOptionValue || hasVariantData)) return;

      const value = (row[columnIndex] ?? '').trim();
      if (value && value !== 'true' && value !== 'false') {
        issues.push(makeIssue(
          'invalid-product-boolean-value',
          'warning',
          `${header} should use the documented value true or false.`,
          visibleRow,
          header,
          'Shopify documents lowercase true and false for this product CSV field. Correct the value manually; the app does not change its capitalization or infer the intended boolean.',
          PRODUCT_CSV_SOURCE,
        ));
      }
    });

    if (priceIndex !== undefined && !price && (startsProduct || hasOptionValue || hasVariantData)) {
      issues.push(makeIssue(
        'blank-price-may-fail-import',
        'warning',
        'This product or variant row has a blank Price; Shopify documentation gives conflicting guidance.',
        visibleRow,
        'Price',
        'Shopify’s troubleshooting guide lists a blank price as an import error, while its product CSV column table documents a default of 0.00 when no value is entered. Enter the intended price to avoid relying on this ambiguity; the analyzer does not assume that 0.00 is intended.',
        'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      ));
    }

    if (handle && hasOptionValue) {
      const optionCombination = optionValueIndices.map((optionIndex) => row[optionIndex] ?? '');
      const combinationKey = JSON.stringify([handle, optionCombination]);
      const firstRow = firstVariantRowByCombination.get(combinationKey);
      if (firstRow !== undefined) {
        issues.push(makeIssue(
          'duplicate-variant-option-combination',
          'error',
          `This product repeats an option value combination from row ${firstRow}.`,
          visibleRow,
          optionValueIndices.map((optionIndex) => csv.headers[optionIndex]).join(' / '),
          `Shopify reports an import error when a product has duplicate option combinations. Each variant for handle "${handle}" needs a unique combination of option values. If these combinations are intentionally different, check whether the product rows use the correct handles.`,
          'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
        ));
      } else {
        firstVariantRowByCombination.set(combinationKey, visibleRow);
      }
    }

    if (startsProduct && statusIndex !== undefined) {
      const status = (row[statusIndex] ?? '').trim();
      if (!status) {
        issues.push(makeIssue(
          'required-status-value',
          'error',
          'A product row needs a value in the Status column when that column is present.',
          visibleRow,
          'Status',
          'Enter active, draft, or archived in this product row. Shopify requires a value whenever the Status column is included.',
        ));
      } else if (!['active', 'draft', 'archived'].includes(status)) {
        issues.push(makeIssue(
          'invalid-product-status',
          'error',
          'Status must be active, draft, or archived.',
          visibleRow,
          'Status',
          'Shopify documents these three accepted values for the product Status column.',
        ));
      }
    }

    if (titleIndex !== undefined && startsProduct && !title) {
      issues.push(makeIssue(
        'required-title-value', 'error', 'A product row is missing its Title value.', visibleRow, 'Title',
        'Shopify requires a Title value for each product record in both create and update files. Enter the title on the product row; variant and image continuation rows can leave it blank when they repeat the product handle.',
      ));
    }
    if (options.mode === 'update' && handleIndex !== undefined && !handle && (startsProduct || hasDataOtherThanTitle)) {
      issues.push(makeIssue(
        'required-handle-value', 'error', 'An update row with product data is missing its URL handle value.', visibleRow, 'URL handle',
        'Shopify uses the URL handle to match products during updates and to associate continuation-row data, including variants and images, with its product. Add the existing product handle; this check does not infer or generate one.',
      ));
    }
    if (options.mode === 'create' && hasOptionValue && !handle) {
      issues.push(makeIssue(
        'variant-handle-required',
        'error',
        'Rows with product variants need a URL handle.',
        visibleRow,
        'URL handle',
        'Add a handle to each variant row so Shopify can associate the variant with the product being created.',
      ));
    }
    if (options.mode === 'update' && hasOptionValue) {
      issues.push(makeIssue(
        'variant-option-change-may-replace-ids',
        'warning',
        'Changing a variant option value can replace its variant ID.',
        visibleRow,
        'Option1 value / Option2 value / Option3 value',
        'Shopify states that changing an option value deletes the existing variant ID and creates a new one. If these values differ from the current product, integrations that rely on variant IDs can break.',
      ));
    }

    if (inventoryQuantity && !Number.isFinite(Number(inventoryQuantity))) {
      issues.push(makeIssue(
        'invalid-inventory-quantity',
        'error',
        'Inventory quantity must be a number.',
        visibleRow,
        'Inventory quantity',
        'Shopify reports an import error when inventory quantity is not numeric. Enter a numeric quantity; negative values can be meaningful when Continue selling when out of stock is set to continue.',
        'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      ));
    }
    if (inventoryPolicy && !['deny', 'continue'].includes(inventoryPolicy)) {
      issues.push(makeIssue(
        'invalid-inventory-policy',
        'error',
        'Continue selling when out of stock must be deny or continue.',
        visibleRow,
        'Continue selling when out of stock',
        'Shopify accepts only deny or continue for this field. Correct the value without changing the inventory quantity.',
        'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      ));
    }
    if (
      inventoryTracker === 'shopify'
      && (inventoryPolicy || fulfillmentService)
      && (!inventoryPolicy || !fulfillmentService)
    ) {
      issues.push(makeIssue(
        'incomplete-inventory-dependency-values',
        'error',
        'Shopify inventory tracking requires both the inventory policy and fulfillment service when either has a value.',
        visibleRow,
        'Inventory tracker / Continue selling when out of stock / Fulfillment service',
        'Shopify documents these as related values when Inventory tracker is shopify. If you provide either Continue selling when out of stock or Fulfillment service, provide the other as well; partial related values can make the import fail. When neither is supplied, Shopify applies the documented defaults. The app preserves the row.',
      ));
    }
    if (inventoryTracker && !inventoryQuantity) {
      issues.push(makeIssue(
        'inventory-quantity-missing-with-tracker',
        'warning',
        'Inventory is tracked but Inventory quantity is blank.',
        visibleRow,
        'Inventory quantity',
        'Shopify’s troubleshooting guide lists blank inventory quantity as an import error when inventory is tracked, while its product column table says an omitted quantity defaults to 0. Add the intended quantity to remove this ambiguity, or leave Inventory tracker blank when you do not track inventory.',
        'https://help.shopify.com/en/manual/products/import-export/common-import-issues',
      ));
    }
    if (inventoryTrackerIndex !== undefined && inventoryTrackerColumnCount === 1 && !inventoryTracker && inventoryQuantity) {
      issues.push(makeIssue(
        'inventory-quantity-without-tracker',
        'warning',
        'Inventory quantity is provided while Inventory tracker is blank.',
        visibleRow,
        csv.headers[inventoryTrackerIndex],
        'Shopify documents a blank Inventory tracker for inventory that is not tracked. If this quantity is intended to be tracked, choose the appropriate tracker. In update mode, a blank included cell can clear an existing value if overwrite is selected. This may be intentional; the app cannot inspect the store and preserves both cells.',
      ));
    }
    if (inventoryTracker && !['shopify', 'shipwire', 'amazon_marketplace_web'].includes(inventoryTracker)) {
      issues.push(makeIssue(
        'unlisted-inventory-tracker',
        'info',
        'This Inventory tracker value is not listed in Shopify’s current product CSV guide.',
        visibleRow,
        'Inventory tracker',
        'Shopify lists shopify, shipwire, and amazon_marketplace_web as Inventory tracker values, but describes the list as inclusive examples. This may be a legacy or third-party value; confirm its support with the integration before importing. The value is preserved and is not treated as invalid.',
        'https://help.shopify.com/en/manual/products/import-export/using-csv',
      ));
    }
    if (
      fulfillmentService
      && !builtInFulfillmentServices.has(fulfillmentService.toLowerCase())
      && !sku
    ) {
      issues.push(makeIssue(
        'sku-required-for-custom-fulfillment',
        'error',
        'SKU is required when using a custom fulfillment service.',
        visibleRow,
        'SKU / Fulfillment service',
        'Shopify requires a SKU when a custom fulfillment service is used. Add the variant SKU and confirm the service is configured in the store.',
      ));
    }
    if (
      fulfillmentService
      && !builtInFulfillmentServices.has(fulfillmentService.toLowerCase())
      && /[^\p{Ll}\p{N}-]/u.test(fulfillmentService)
    ) {
      issues.push(makeIssue(
        'custom-fulfillment-service-handle-format',
        'warning',
        'This custom fulfillment service name may not match Shopify’s handle format guidance.',
        visibleRow,
        'Fulfillment service',
        'Shopify recommends lowercase letters for custom fulfillment service names, replacing spaces with hyphens and removing periods or other special characters. Confirm the exact handle configured in your store; the app cannot verify it or safely rewrite it.',
        'https://help.shopify.com/en/manual/products/import-export/using-csv',
      ));
    }

    if (hasVariantData && requiresShipping !== 'false' && populatedPackedDimensionCount > 0 && populatedPackedDimensionCount < 4) {
      issues.push(makeIssue(
        'packed-dimension-values-incomplete',
        'error',
        'Enter all four packed product dimension values or leave all four blank.',
        visibleRow,
        packedDimensionHeaders.filter((_, dimensionIndex) => !packedDimensionValues[dimensionIndex]).join(' / '),
        'Shopify rejects rows with values in only some packed product dimension fields. This rule does not apply when Requires shipping is false.',
      ));
    } else if (hasVariantData && requiresShipping !== 'false' && populatedPackedDimensionCount === 4) {
      const dimensionValues = packedDimensionValues.slice(0, 3);
      const invalidDimension = dimensionValues.findIndex((value) => !Number.isFinite(Number(value)) || Number(value) <= 0);
      if (invalidDimension >= 0) {
        issues.push(makeIssue(
          'invalid-packed-dimension-value',
          'error',
          'Packed product length, width, and height must be positive numbers without units.',
          visibleRow,
          packedDimensionHeaders[invalidDimension],
          'Enter a number greater than zero for this dimension; the unit belongs in the separate Packed product dimension unit column.',
        ));
      }
      if (!['cm', 'in'].includes(packedDimensionValues[3]!.toLowerCase())) {
        issues.push(makeIssue(
          'invalid-packed-dimension-unit',
          'error',
          'Packed product dimension unit must be cm or in.',
          visibleRow,
          'Packed product dimension unit',
          'Use cm or in, matching Shopify’s documented packed-dimension units.',
        ));
      }
    } else if (
      options.mode === 'update'
      && hasVariantData
      && requiresShipping !== 'false'
      && packedDimensionIndices.length === 4
      && populatedPackedDimensionCount === 0
    ) {
      issues.push(makeIssue(
        'packed-dimensions-cleared-on-update',
        'warning',
        'Blank packed dimension cells can clear saved dimensions for this variant.',
        visibleRow,
        packedDimensionHeaders.join(' / '),
        'On update rows with variant data, four empty packed-dimension cells clear the saved size. Omit all four columns to leave a saved size unchanged.',
      ));
    } else if (options.mode === 'update' && hasVariantData && requiresShipping === 'false') {
      issues.push(makeIssue(
        'non-shippable-variant-clears-packed-dimensions',
        'warning',
        'Setting Requires shipping to false clears saved packed dimensions for this variant.',
        visibleRow,
        'Requires shipping',
        'Shopify applies this behavior even if the packed dimension columns are omitted; any packed dimension values on this row are ignored.',
      ));
    }
    if (hasImageUrl && !handle && !title) {
      issues.push(makeIssue(
        'image-row-handle-required',
        'error',
        'An additional product image row needs its product URL handle.',
        visibleRow,
        'URL handle',
        'Shopify product CSV instructions require the URL handle on rows that add additional images so the image is associated with the correct product.',
      ));
    }
  });

  return issues;
}
