# CSV Import Doctor

Shopify product CSV diagnostics and controlled repair. The initial deliverable is a browser-compatible CSV core; CSV contents stay on the merchant's device.

## Current status

The project is in Phase 0/1. The independent core is being built first. Shopify app scaffolding is pending an authenticated Shopify developer account because the official `shopify app init` flow can create and link an app in the Dev Dashboard.

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
