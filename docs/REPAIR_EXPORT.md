# Repair and export behavior

## Repairs

- The initial UI proposes trimming leading and trailing whitespace in data cells.
- Every proposal is marked `review`; none are applied automatically.
- The merchant selects individual proposals. The core applies selected changes to a copy, skips stale targets, returns a before/after diff, and requires a revalidation callback.
- The UI keeps analysis in browser memory and blocks repair/export when the parser reports an empty file, a row or character limit, or malformed CSV syntax.

## Shopify CSV export

- CSV export preserves cell values and unknown columns. It uses the detected delimiter, quotes fields when CSV syntax requires it, preserves Unicode and embedded line breaks, and defaults to CRLF line endings.
- Spreadsheet formula mitigation is off for Shopify exports. Prefixing a cell changes its value and can change what Shopify imports.
- The core exposes `prefixFormulaCellsWithApostrophe` for a caller that explicitly wants a basic spreadsheet-oriented export. It reports every changed cell. This is not a universal or Excel-proof mitigation: OWASP notes that spreadsheet applications can remove escaping when saving and reopening a CSV.
- OWASP describes a tab prefix as an Excel-resistant mitigation, with the tradeoff that the tab remains in the cell data and can affect downstream imports. We do not apply that transformation to Shopify CSVs.
- Do not describe either export mode as safe for every spreadsheet. There is no universal transformation that preserves the same value for both spreadsheet execution and downstream CSV imports.

## Reports and privacy

- JSON reports include the analysis timestamp, issue counts, applied repairs, and unresolved issues. They do not include the complete CSV.
- Reports are generated and downloaded in the browser. CSV contents are not sent to the app server or an analytics service.

## Sources

- [OWASP: CSV Injection](https://community.owasp.org/attacks/CSV_Injection)
- [Shopify: Using CSV files to import and export products](https://help.shopify.com/en/manual/products/import-export/using-csv)
