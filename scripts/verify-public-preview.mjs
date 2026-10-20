import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:4180";
if (!/^http:\/\/127\.0\.0\.1:4180$|^https:\/\/(?:[a-f0-9]+\.)?caravana77-commercial-preview\.pages\.dev$/.test(base)) throw new Error("Only isolated public preview targets allowed.");
const browser = await chromium.launch({ headless: true }); const results = [];
try {
  for (const width of [1440, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage(); const errors = []; const backend = [];
    page.on("pageerror", (error) => errors.push(error.message)); page.on("request", (request) => { if (/googleapis|firebaseio|cloudfunctions/.test(new URL(request.url()).hostname)) backend.push(request.url().split("?")[0]); });
    await page.goto(`${base}/saas`); await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); await expect(page.getByText(/Prévia comercial\. O painel/)).toBeVisible(); await expect(page.getByRole("heading", { name: "Essencial", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `docs/evidence/2026-10-20/public-preview-${base.startsWith("https") ? "hosted" : "local"}-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Prévia comercial", exact: true })).toBeVisible(); await expect(page.locator("input")).toHaveCount(0);
    expect(errors).toEqual([]); expect(backend).toEqual([]); results.push({ width, status: "PASS", jsErrors: 0, firebaseRequests: 0 }); await context.close();
  }
} finally { await browser.close(); }
await writeFile(`docs/evidence/2026-10-20/public-preview-${base.startsWith("https") ? "hosted" : "local"}.json`, JSON.stringify({ base, scope: "Static landing only, no backend staging", results }, null, 2) + "\n"); console.log(JSON.stringify(results));
