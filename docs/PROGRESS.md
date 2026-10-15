# Progress

## Phase 0 — Bootstrap

- [x] Inspected local tools and project directory.
- [x] Confirmed Node.js v24.21.0, npm 12.2.0, and Git 2.55.0 are available. `nvm reshim` restored npm after NVM blocked the previous shim.
- [x] Verified current Shopify guidance: React Router is the recommended template for most new apps; `shopify app init` can create/link an app in the Dev Dashboard.
- [x] Installed Shopify CLI 4.9.4. Its command shim is outside the current PATH, so invoke it by its global install path until the shell environment is refreshed.
- [x] Added root workspace, `.gitignore`, `.env.example`, README, and project docs.
- [x] Initialized local Git repository, connected the supplied empty GitHub remote, and created the `develop` branch. Work remains on `develop`; nothing has been pushed.
- [ ] Complete official Shopify app scaffold. Shopify CLI is installed, but account authentication and app creation require the user's Shopify developer account.

## Phase 1 — Local CSV core

- [x] Added a browser-compatible Papa Parse wrapper with BOM handling, delimiter selection, row/character limits, duplicate-header and uneven-row diagnostics.
- [x] Added an initial versioned product CSV profile for create/update requirements and variant identity warnings.
- [x] Added valid, invalid, and edge-case CSV fixtures plus nine unit tests.
- [x] Lint, typecheck, tests, and build pass after the initial implementation.

## Decisions and constraints

- CSV parsing and validation must not upload, persist, or log CSV contents.
- The core package must not import Node-only APIs.
- Shopify validation rules are advisory; actual import behavior must be verified in a development store.
- Do not implement billing, product writes, or publication in the MVP.
- Current parser accepts an already-decoded JavaScript string and removes a UTF-8 BOM; browser File decoding and non-UTF-8 detection remain for the UI phase.

## Verified commands

- `npm run lint` — pass.
- `npm run typecheck` — pass.
- `npm test` — pass (9 tests).
- `npm run build` — pass.
