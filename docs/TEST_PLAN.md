# Test plan

Initial core coverage:

- CI on pushes and pull requests to `develop` and `master` installs each workspace from its lockfile and runs lint, typecheck, unit tests, and production build for both the CSV core and Shopify app; authenticated E2E remains a separately configured gate.
- Diagnostic contract over every CSV fixture in both create and update modes: require stable IDs, complete issue metadata, valid row/column references, source and profile version on Shopify findings, and a catalog entry for every emitted rule; map Papa Parse parser codes to the documented parser rule template.
- UTF-8 BOM, explicit rejection of invalid UTF-8, quoted delimiters, escaped quotes, embedded newlines, and Unicode.
- Duplicate headers and rows with too few or too many cells.
- Empty/malformed input and ambiguous delimiter selection, including blocked repairs/downloads until explicit user confirmation and reparse.
- Browser workflow rejects invalid UTF-8 and blocks both downloads when the 100,000-row analysis limit is exceeded.
- Measure near-20 MB local long-cell and 100,001-row workflows in E2E; assert that the 15 MB Shopify limit is diagnosed, the 20 MB local cap is enforced, and preview truncation does not alter exported CSV content.
- Create/update profile requirements and product variant continuation rows.
- Required values: create rows need a Title; update product rows need Title and an existing URL handle; continuation rows containing data need a handle for association. Ensure blank Title on a continuation row that repeats its handle remains valid, and preserve all supplied values.
- Sourced field limits at exact boundary and over-limit: URL-handle whitespace, 255-character Collection values, 250 comma-separated product tags, and 20 semicolon-separated barcodes including escaped separators; unit tests confirm the analyzer preserves the original cell, and E2E confirms limit messages are visible.
- Tags: detect accented Latin characters in composed and decomposed Unicode spellings; report as information in create and update without claiming import failure, changing, translating, or removing values; leave plain unaccented tags clear.
- Product category IDs: recognize valid root and nested IDs from the pinned Shopify taxonomy, inform on an unknown ID without claiming Shopify rejects it, preserve all values, and do not diagnose full breadcrumbs that may be localized.
- Taxonomy-linked options: warn on nonblank `Option1/2/3 LinkedTo` values that omit the documented `product.metafields.shopify.` prefix or taxonomy attribute key; accept a documented key and blank optional link fields, preserve all values, and do not validate linked values against store-specific metaobject definitions.
- Inventory-related values: when `Inventory tracker=shopify`, report an error if exactly one of `Continue selling when out of stock` and `Fulfillment service` is supplied; accept both supplied or neither (documented defaults), and do not apply this dependency to another tracker value. Preserve values and identify the row.
- Product image maximum at 250/251 rows for one handle, including continuation rows; confirm only one warning is emitted and values are preserved. Verify variant image references are documented as outside this count.
- Image URLs: test absolute HTTPS, HTTP, relative/malformed, and embedded credentials for product and variant image columns; verify the app never requests the supplied image URL and never claims public reachability is verified.
- Product image filename suffixes: test `_thumb`, `_small`, `_medium` with and without extensions, ignore query-string matches, preserve URLs, and keep variant image references outside this product-field-specific check.
- Product money formatting: test `Price`, `Compare-at price`, `Cost per item`, and verified legacy price aliases; accept integer, zero, signed, and dot-decimal numeric examples, warn on currency symbols/codes and nonnumeric text, preserve all values, and verify the advisory is visible in E2E. Authenticated E2E passed for all three current headers.
- Gift cards: verify `Gift card=true` produces a sourced blocking diagnostic in create mode, does not produce that diagnostic in update mode, and preserves the cell; confirm the restriction remains distinct from boolean spelling checks.
- Inventory tracking: warn when a nonblank quantity is paired with an explicitly blank current or verified legacy tracker header; preserve the cells, do not flag omitted tracker columns or conflicting current/legacy aliases, and keep valid tracked rows clear.
- Single-location inventory field: emit one file-level informational note when at least one product `Inventory quantity` value is nonblank; do not emit it when all values are blank or when a separate inventory CSV is detected.
- Verify unknown columns and repeated SKUs are preserved and are not fatal errors.
- CSV parse/serialize round-trip and formula-like values remain unmodified absent an explicit export policy.
- Repairs: apply only selected proposals to a copy, verify the source value and column header still match, reject stale proposals, revalidate, and undo without overwriting a changed or differently headed target.
- Browser bundle has no Node-only imports; analysis makes no network requests.
- File lifecycle: clear the file input so the same file can be selected again; keep a `File` reference only while an ambiguous delimiter needs reparsing, and release it after ordinary success, confirmed reanalysis, cancellation, parse/runtime failure, or setup failure. A unit test checks the reference-retention policy, and the authenticated E2E exercises confirmed reanalysis. Verify the worker terminates on cancel, unmount, and failure paths.
- Privacy transparency: verify the embedded UI links to the public privacy page, which discloses browser-only CSV processing, the Shopify session fields actually stored, current empty API scopes, retention behavior, and release-only facts still pending.
- Compliance webhooks: verify TOML subscriptions for all three mandatory topics, `401` for unsigned/invalid HMAC POSTs, authenticated handling, idempotent session deletion for `SHOP_REDACT`, and 200 responses for customer requests when no customer data is stored. Node unit tests generate a fixture-only HMAC, pass it through Shopify's React Router `authenticate.webhook` and the same compliance handler used by the HTTP route, and verify a changed signed raw body is rejected. Before distribution, also validate delivery against the actual local app configuration or Shopify's webhook tooling.
- Shopify API version: at each quarterly review, verify that `shopify.app.toml` webhook `api_version` and the server `ApiVersion` enum use the selected supported stable version; never use a release candidate for production.

Accessibility review before closing R10-07:

- Navigate the complete upload, analysis, filter, repair, undo, and download flow with keyboard only; verify focus remains visible and operable.
- With a screen reader, confirm analysis start/completion/cancellation, errors, repair updates, and table headers are announced in a useful order.
- Check color contrast for body text, errors, controls, and focus indicators, then inspect narrow viewport layouts with many CSV columns.
