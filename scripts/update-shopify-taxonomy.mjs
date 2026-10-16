import { gunzipSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version || !/^\d{4}-\d{2}$/.test(version)) {
  throw new Error('Usage: node scripts/update-shopify-taxonomy.mjs YYYY-MM');
}

const releaseUrl = `https://github.com/Shopify/product-taxonomy/releases/download/v${version}/categories.en.json.gz`;
const response = await fetch(releaseUrl);
if (!response.ok) throw new Error(`Shopify taxonomy download failed: HTTP ${response.status}`);

const compressed = Buffer.from(await response.arrayBuffer());
const taxonomy = JSON.parse(gunzipSync(compressed).toString('utf8'));
if (taxonomy.version !== version || !Array.isArray(taxonomy.verticals)) {
  throw new Error(`Unexpected Shopify taxonomy payload for release ${version}`);
}

const categoryIds = taxonomy.verticals
  .flatMap((vertical) => vertical.categories ?? [])
  .map((category) => category.id)
  .filter((id) => typeof id === 'string' && id.startsWith('gid://shopify/TaxonomyCategory/'))
  .map((id) => id.slice('gid://shopify/TaxonomyCategory/'.length));
const uniqueCategoryIds = [...new Set(categoryIds)].sort();
if (uniqueCategoryIds.length === 0 || uniqueCategoryIds.length !== categoryIds.length) {
  throw new Error('Shopify taxonomy category IDs are empty or duplicated');
}

const moduleText = [
  `// Generated from ${releaseUrl}. MIT license: licenses/SHOPIFY_PRODUCT_TAXONOMY_MIT.txt.`,
  `export const SHOPIFY_TAXONOMY_VERSION = '${version}';`,
  'export const SHOPIFY_PRODUCT_CATEGORY_IDS = new Set([',
  ...uniqueCategoryIds.map((id) => `  '${id}',`),
  ']);',
  '',
].join('\n');

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../packages/csv-doctor-core/src/shopify-taxonomy.ts');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, moduleText, 'utf8');
process.stdout.write(`Generated ${uniqueCategoryIds.length} category IDs from Shopify taxonomy ${version}.\n`);
