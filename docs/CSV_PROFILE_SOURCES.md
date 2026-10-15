# Shopify product CSV profile sources

Profile version: `shopify-product-csv-2026-10-15.1`

## Official sources checked 2026-10-15

- [Using CSV files to import and export products](https://help.shopify.com/en/manual/products/import-export/using-csv) — product CSV columns, required fields, variant continuation rows, UTF-8/LF formatting, and related-column behavior.
- [Scaffold an app](https://shopify.dev/docs/apps/build/scaffold-app) — official CLI setup and React Router recommendation.
- [Shopify CLI `app init`](https://shopify.dev/docs/api/shopify-cli/app/app-init) — app initialization flags and authenticated setup.

## Profile notes

- Shopify says the first row contains column headers and columns are comma-separated.
- For creating products, `Title` is the only always-required column; adding variants also requires `URL handle`.
- For updates, `URL handle` and `Title` are required. Variant data can depend on `Option1 name` and `Option1 value`.
- Product rows with variants use a first row containing product-level data and continuation rows keyed by the same handle.
- Shopify accepts UTF-8 and recommends LF line endings.
- This initial profile will only implement rules supported by the source. Unknown columns are preserved; duplicate SKU values are warnings at most.

Recheck the official source before changing profile rules because Shopify's CSV format can change.
