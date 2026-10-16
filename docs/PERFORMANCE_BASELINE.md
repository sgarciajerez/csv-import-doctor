# Browser performance baseline

**Captured:** 2026-10-16. This is a reproducible reference measurement, not a guarantee for every merchant device and not closure evidence for R10-06.

## Environment

- Embedded app in the Shopify development store, using the authenticated Playwright E2E flow.
- Google Chrome 155.0.8059.40.
- Windows workstation with an AMD Ryzen 5 5600 (6 cores) and 32 GiB RAM.
- E2E runs with the regular Chrome channel, headed mode, and production-like remote Shopify Admin shell. The analysis itself runs in the app's Web Worker.

## Measurements

The E2E timer starts immediately before `setInputFiles` and stops after the analysis result and preview are rendered. It includes Playwright file injection, UTF-8 decoding, Worker parsing/validation, and the UI update. It excludes construction of the synthetic Node.js buffers.

| Case | Synthetic input | Observed time | Data integrity / behavior |
|---|---|---:|---|
| Near local analysis limit | 19,999,975-byte CSV, one product row, 19,999,950-character description | 2,156 ms | Analysis completes and reports Shopify's 15 MB import limit; preview renders only 501 characters including ellipsis; downloaded CSV reparses with the full description length. |
| Row limit | 100,001 product rows with one short field each | 489 ms | The limit diagnostic appears; CSV and JSON downloads are disabled. |

Four later authenticated E2E runs on the same workstation, while validating UI changes, observed 2,782–3,222 ms for the near-limit case and 989–1,032 ms for the row-limit case. The range reflects run-to-run variation under test load; it is not a device-independent performance budget.

The long-cell case is above Shopify's product import limit but below CSV Import Doctor's 20 MB local analysis cap. It protects the UI from inserting a near-20 MB string into a table cell; the app reports the import-size problem, and the exported source data is not truncated.

## Reproduction

From `csv-import-doctor/`, set the authenticated dev preview and ignored local storage state, then run:

```powershell
$env:PLAYWRIGHT_APP_URL = 'https://admin.shopify.com/store/csv-import-doctor-dev-okolejxc/apps/csv-import-doctor-3/app'
$env:PLAYWRIGHT_STORAGE_STATE = (Resolve-Path 'playwright/.auth/shopify.json').Path
npm run test:e2e
```

The E2E generates both inputs in memory and prints `[perf]` timings. No merchant CSV is used or transmitted.

## Remaining R10-06 evidence

- Repeat the measurements on the least powerful browser/device we intend to support and set a documented response-time budget for that baseline.
- Measure peak memory while a representative 20 MB, many-row product file is decoded, analyzed, reviewed, and exported. The current run did not measure memory and the 20 MB single-cell case does not model that workload.
- Confirm cancellation and interface responsiveness under a sustained analysis workload, then test memory pressure and Worker failures.
