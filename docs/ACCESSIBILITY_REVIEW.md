# Accessibility review

Status: partial review; manual screen-reader and full-flow checks remain open.
Reviewed: 2026-10-16.

## Contrast calculation

The ratios below use the WCAG relative-luminance formula for each color in `csv-import-doctor/app/routes/app._index.tsx` against white (`#ffffff`). This records the authored colors; it does not prove contrast in every Shopify Admin theme or against the runtime background of Polaris web components.

| Use | Foreground | Background | Ratio | Result against WCAG 2.2 AA criterion |
| --- | --- | --- | ---: | --- |
| Secondary explanatory and row-location text | `#616161` | `#ffffff` | 6.19:1 | Passes 4.5:1 normal-text threshold |
| Error text | `#b42318` | `#ffffff` | 6.57:1 | Passes 4.5:1 normal-text threshold |
| Button, input, and select text | `#202223` | `#ffffff` | 15.98:1 | Passes 4.5:1 normal-text threshold |
| Button/input/select border | `#8c9196` | `#ffffff` | 3.18:1 | Passes 3:1 non-text threshold |
| Table/card separator | `#e1e3e5` | `#ffffff` | 1.29:1 | Used as a separator, not as the sole indication of a control or state |

WCAG 2.2 references: [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast).

## Automated interaction coverage

- Authenticated E2E checks keyboard focus from the import-mode selector to the file input, and changes the create/update selector with arrow keys and Enter.
- At 390 px viewport width, the current-header fixture produces no document-level horizontal overflow; the preview limits visible columns to 20.

## Remaining review

- Confirm focus visibility in supported browsers and Shopify Admin themes.
- Complete keyboard-only review of filtering, repairs, undo, delimiter confirmation, and downloads.
- Review announcements and table navigation with a screen reader.
- Verify contrast against actual Polaris surfaces and badges, including supported Admin color themes.
- Inspect text resizing, spacing, and the main workflow on real narrow devices.
