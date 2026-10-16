import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(appRoot, "playwright", ".auth", "shopify-normal-chrome");
const statePath = path.join(appRoot, "playwright", ".auth", "shopify.json");
const appUrl = "https://admin.shopify.com/store/csv-import-doctor-dev-okolejxc/apps/csv-import-doctor-3/app";

await mkdir(path.dirname(statePath), { recursive: true });
const context = await chromium.launchPersistentContext(profilePath, {
  channel: "chrome",
  headless: false,
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const onLoginPage = /accounts\.shopify\.com|\/login/i.test(page.url()) ||
    await page.getByRole("heading", { name: "Log in", exact: true }).isVisible().catch(() => false);
  if (onLoginPage) {
    throw new Error("No hay una sesión iniciada en el perfil. Ejecuta scripts/open-shopify-login.ps1, inicia sesión en Chrome normal y cierra esa ventana antes de repetir este comando.");
  }

  await context.storageState({ path: statePath });
  console.log(`Sesión de Shopify guardada en ${path.relative(appRoot, statePath)}.`);
} finally {
  await context.close();
}
