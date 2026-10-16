# Test plan

Initial core coverage:

- UTF-8 BOM, explicit rejection of invalid UTF-8, quoted delimiters, escaped quotes, embedded newlines, and Unicode.
- Duplicate headers and rows with too few or too many cells.
- Empty/malformed input and ambiguous delimiter selection, including blocked repairs/downloads until explicit user confirmation and reparse.
- Browser workflow rejects invalid UTF-8 and blocks both downloads when the 100,000-row analysis limit is exceeded.
- Measure near-20 MB local long-cell and 100,001-row workflows in E2E; assert that the 15 MB Shopify limit is diagnosed, the 20 MB local cap is enforced, and preview truncation does not alter exported CSV content.
- Create/update profile requirements and product variant continuation rows.
- Sourced field limits at exact boundary and over-limit: URL-handle whitespace, 255-character Collection values, 250 comma-separated product tags, and 20 semicolon-separated barcodes including escaped separators; unit tests confirm the analyzer preserves the original cell, and E2E confirms limit messages are visible.
- Product image maximum at 250/251 rows for one handle, including continuation rows; confirm only one warning is emitted and values are preserved. Verify variant image references are documented as outside this count.
- Image URLs: test absolute HTTPS, HTTP, relative/malformed, and embedded credentials for product and variant image columns; verify the app never requests the supplied image URL and never claims public reachability is verified.
- Product image filename suffixes: test `_thumb`, `_small`, `_medium` with and without extensions, ignore query-string matches, preserve URLs, and keep variant image references outside this product-field-specific check.
- Product money formatting: test `Price`, `Compare-at price`, `Cost per item`, and verified legacy price aliases; accept integer, zero, signed, and dot-decimal numeric examples, warn on currency symbols/codes and nonnumeric text, preserve all values, and verify the advisory is visible in E2E. Authenticated E2E passed for all three current headers.
- Gift cards: verify `Gift card=true` produces a sourced blocking diagnostic in create mode, does not produce that diagnostic in update mode, and preserves the cell; confirm the restriction remains distinct from boolean spelling checks.
- Verify unknown columns and repeated SKUs are preserved and are not fatal errors.
- CSV parse/serialize round-trip and formula-like values remain unmodified absent an explicit export policy.
- Browser bundle has no Node-only imports; analysis makes no network requests.
- Privacy transparency: verify the embedded UI links to the public privacy page, which discloses browser-only CSV processing, the Shopify session fields actually stored, current empty API scopes, retention behavior, and release-only facts still pending.
- Compliance webhooks: verify TOML subscriptions for all three mandatory topics, `401` for unsigned/invalid HMAC POSTs, authenticated handling, idempotent session deletion for `SHOP_REDACT`, and 200 responses for customer requests when no customer data is stored. Node unit tests cover handler behavior; exercise valid signed requests or Shopify's webhook tooling before App Store distribution.
- Shopify API version: at each quarterly review, verify that `shopify.app.toml` webhook `api_version` and the server `ApiVersion` enum use the selected supported stable version; never use a release candidate for production.

Accessibility review before closing R10-07:

- Navigate the complete upload, analysis, filter, repair, undo, and download flow with keyboard only; verify focus remains visible and operable.
- With a screen reader, confirm analysis start/completion/cancellation, errors, repair updates, and table headers are announced in a useful order.
- Check color contrast for body text, errors, controls, and focus indicators, then inspect narrow viewport layouts with many CSV columns.
