# CSV Import Doctor

Shopify product CSV diagnostics and controlled repair. The initial deliverable is a browser-compatible CSV core; CSV contents stay on the merchant's device.

## Current status

The official Shopify React Router scaffold is in `csv-import-doctor/` and is linked to a development store. The embedded app analyzes CSVs in a cancellable Web Worker, supports issue and repair filters, and provides controlled repairs, preview, CSV export, and JSON reports. CSV contents stay in the browser. See `docs/PROGRESS.md` for the remaining verification work.

## Requirements

- Node.js LTS
- npm
- Git

## Commands

```powershell
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

See `docs/PROGRESS.md` for verified status and limitations. The local validator is advisory and does not guarantee that Shopify will accept an import.

To run the Shopify app locally, open `csv-import-doctor/` and run `npm run dev -- --store <your-dev-store>.myshopify.com`.

## End-to-end workflow

With `shopify app dev` running, obtain the preview URL from its output and authenticate a Playwright browser context once:

```powershell
Set-Location csv-import-doctor
$env:PLAYWRIGHT_APP_URL = "<Shopify admin preview URL>"
npx playwright codegen --channel chrome --user-data-dir=playwright/.auth/chrome-profile --save-storage=playwright/.auth/shopify.json $env:PLAYWRIGHT_APP_URL
$env:PLAYWRIGHT_STORAGE_STATE = "playwright/.auth/shopify.json"
npm run test:e2e
```

Complete the normal Shopify sign-in in the codegen window, wait until the embedded app is visible, then close it to save the session. The storage file and Chrome profile are ignored by Git. The E2E test uploads a synthetic fixture through the browser file picker, checks filtering, repair and downloads, and confirms that no request body contains the fixture's private marker. If Shopify redirects to its sign-in page, the test reports that authentication is still required.
