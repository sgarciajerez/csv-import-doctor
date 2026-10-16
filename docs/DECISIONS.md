# Decisions

## 2026-10-15 — Start with an independent browser-compatible core

The workspace contains only the project specification. Build the CSV engine independently so its behavior can be tested without Shopify or the app UI. Keep CSV contents in browser memory and do not add server upload or persistence paths.

## 2026-10-15 — Shopify scaffold requires authenticated setup

Shopify's current scaffold flow uses `shopify app init` and creates a Dev Dashboard app while linking local code. The user completed authentication and selected the `Digital Apps` organization. The app and a development store now exist; keep the generated app in `csv-import-doctor/` until the planned integration phase.

## 2026-10-15 — Repairs require user selection and are revalidated

Whitespace changes are suggestions with `review` safety. The core applies only selected proposals to a copy and requires callers to supply revalidation. CSV export preserves cell values by default for Shopify compatibility. Spreadsheet formula protection is opt-in because prefixing an apostrophe changes the exported value, and the serializer reports every affected cell.
