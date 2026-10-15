import { describe, expect, it } from 'vitest';
import { parseCsv, validateShopifyProductCsv } from '../src/index.js';

describe('parseCsv', () => {
  it('strips a UTF-8 BOM and preserves quoted commas, quotes, newlines, and Unicode', () => {
    const csv = '\uFEFFTitle,Description\r\nMug,"A, \"\"great\"\" mug\nfor café"';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['Title', 'Description']);
    expect(result.rows).toEqual([['Mug', 'A, "great" mug\nfor café']]);
    expect(result.issues).toEqual([]);
  });

  it('reports duplicate headers and records with the wrong number of cells', () => {
    const result = parseCsv('Title,SKU,sku\nMug,123,456\nCup,789');
    expect(result.issues.map((item) => item.ruleId)).toContain('duplicate-header');
    expect(result.issues).toContainEqual(expect.objectContaining({ ruleId: 'column-count-mismatch', row: 3 }));
  });

  it('supports explicitly selected delimiters', () => {
    const result = parseCsv('Title;URL handle\nMug;mug', { delimiter: ';' });
    expect(result.delimiter).toBe(';');
    expect(result.headers).toEqual(['Title', 'URL handle']);
  });

  it('enforces configurable input limits', () => {
    expect(parseCsv('Title\nMug', { maxCharacters: 4 }).issues[0]?.ruleId).toBe('file-too-large');
    expect(parseCsv('Title\nMug\nCup', { maxRows: 1 }).issues[0]?.ruleId).toBe('row-limit-exceeded');
  });

  it('reports malformed quoted fields', () => {
    const result = parseCsv('Title,Description\nMug,"unfinished description');
    expect(result.issues.some((item) => item.ruleId.startsWith('parser-'))).toBe(true);
  });
});

describe('validateShopifyProductCsv', () => {
  it('requires Title for creation and handle for variant rows', () => {
    const parsed = parseCsv('Title,Option1 name,Option1 value\n,Size,Small');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map((item) => item.ruleId)).toEqual(['required-title-value', 'variant-handle-required']);
  });

  it('requires a handle for variants declared through any option value column', () => {
    const parsed = parseCsv('Title,Option2 value\nMug,Large');
    const issues = validateShopifyProductCsv(parsed, { mode: 'create' });
    expect(issues.map((item) => item.ruleId)).toContain('variant-handle-required');
  });

  it('warns when an update contains variant data without both option identity columns', () => {
    const parsed = parseCsv('Title,URL handle,SKU\nMug,mug,123');
    const issues = validateShopifyProductCsv(parsed, { mode: 'update' });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'variant-identity-columns-missing', severity: 'warning' }));
  });

  it('does not treat duplicate SKUs or unknown headers as blocking errors', () => {
    const parsed = parseCsv('Title,URL handle,SKU,Custom column\nMug,mug,123,x\nCup,cup,123,y');
    expect(validateShopifyProductCsv(parsed, { mode: 'create' })).toEqual([]);
    expect(parsed.headers).toContain('Custom column');
  });
});
