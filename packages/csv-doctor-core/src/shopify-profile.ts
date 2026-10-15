import type { CsvIssue, ParsedCsv, ValidationOptions } from './types.js';

export const SHOPIFY_PRODUCT_CSV_PROFILE = 'shopify-product-csv-2026-10-15.1';

const VARIANT_COLUMNS = [
  'Option1 name', 'Option1 value', 'Option2 name', 'Option2 value',
  'Option3 name', 'Option3 value', 'SKU', 'Price', 'Weight value (grams)',
];

function makeIssue(
  ruleId: string,
  severity: CsvIssue['severity'],
  message: string,
  row?: number,
  column?: string,
  explanation?: string,
): CsvIssue {
  const item: CsvIssue = {
    id: `${ruleId}-${row ?? 'file'}-${column ?? ''}`,
    ruleId,
    severity,
    message,
    fixSafety: 'manual',
  };
  if (row !== undefined) item.row = row;
  if (column !== undefined) item.column = column;
  if (explanation !== undefined) item.explanation = explanation;
  return item;
}

export function validateShopifyProductCsv(csv: ParsedCsv, options: ValidationOptions): CsvIssue[] {
  const issues: CsvIssue[] = [];
  const indices = new Map(csv.headers.map((header, index) => [header, index]));
  const titleIndex = indices.get('Title');
  const handleIndex = indices.get('URL handle');
  const optionValueIndices = ['Option1 value', 'Option2 value', 'Option3 value']
    .map((header) => indices.get(header))
    .filter((index): index is number => index !== undefined);

  if (titleIndex === undefined) {
    issues.push(makeIssue('required-header-title', 'error', 'The product CSV needs a Title column.', 1, 'Title'));
  }
  if (options.mode === 'update' && handleIndex === undefined) {
    issues.push(makeIssue('required-header-handle', 'error', 'Product updates require a URL handle column.', 1, 'URL handle'));
  }

  const hasVariantColumns = VARIANT_COLUMNS.some((header) => indices.has(header));
  const hasOptionIdentity = indices.has('Option1 name') && indices.has('Option1 value');
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

  let previousHandle = '';
  csv.rows.forEach((row, index) => {
    const visibleRow = index + 2;
    const handle = handleIndex === undefined ? '' : (row[handleIndex] ?? '').trim();
    const title = titleIndex === undefined ? '' : (row[titleIndex] ?? '').trim();
    const hasOptionValue = optionValueIndices.some((index) => Boolean((row[index] ?? '').trim()));
    const startsProduct = handle
      ? handle !== previousHandle
      : index === 0 || Boolean(title);

    if (options.mode === 'create' && startsProduct && !title) {
      issues.push(makeIssue('required-title-value', 'error', 'A product row is missing its Title value.', visibleRow, 'Title'));
    }
    if (options.mode === 'create' && hasOptionValue && !handle) {
      issues.push(makeIssue(
        'variant-handle-required',
        'error',
        'Rows with product variants need a URL handle.',
        visibleRow,
        'URL handle',
      ));
    }
    if (handle) previousHandle = handle;
  });

  return issues;
}
