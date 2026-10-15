# Test plan

Initial core coverage:

- UTF-8 BOM, quoted delimiters, escaped quotes, embedded newlines, and Unicode.
- Duplicate headers and rows with too few or too many cells.
- Empty/malformed input and ambiguous delimiter selection.
- Create/update profile requirements and product variant continuation rows.
- Verify unknown columns and repeated SKUs are preserved and are not fatal errors.
- CSV parse/serialize round-trip and formula-like values remain unmodified absent an explicit export policy.
- Browser bundle has no Node-only imports; analysis makes no network requests.
