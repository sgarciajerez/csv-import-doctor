# Decisions

## 2026-10-15 — Start with an independent browser-compatible core

The workspace contains only the project specification. Build the CSV engine independently so its behavior can be tested without Shopify or the app UI. Keep CSV contents in browser memory and do not add server upload or persistence paths.

## 2026-10-15 — Shopify scaffold requires authenticated setup

Shopify's current scaffold flow uses `shopify app init` and may create a Dev Dashboard app and link local code. The CLI is installed locally; defer the account-authenticated step until the user can complete Shopify login and select an organization/store.
