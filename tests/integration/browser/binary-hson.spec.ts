import { expect, test } from "./livehost-browser-test";
import type * as BrowserBinaryHsonOracle from "../../helpers/transform/browser-binary-hson-oracle";

async function run_in_browser<K extends keyof typeof BrowserBinaryHsonOracle>(
  page: import("@playwright/test").Page,
  operation: K,
): Promise<void> {
  await page.goto("/");
  await page.evaluate(async (selected) => {
    const modulePath = "/tests/helpers/transform/browser-binary-hson-oracle.ts";
    const oracle = await import(/* @vite-ignore */ modulePath) as typeof BrowserBinaryHsonOracle;
    await oracle[selected]();
  }, operation);
}

test("browser Binary Hson exact bytes and canonical decode/encode closure", async ({ page }) => {
  await run_in_browser(page, "verify_browser_binary_exact_bytes_and_closure");
  await expect(page).toHaveURL(/\/$/);
});

test("browser Binary Hson typed units preserve absent, undefined, empty, and px states", async ({ page }) => {
  await run_in_browser(page, "verify_browser_binary_typed_units");
  await expect(page).toHaveURL(/\/$/);
});

test("browser Binary Hson preserves UTF-16 lone surrogates and negative zero", async ({ page }) => {
  await run_in_browser(page, "verify_browser_binary_utf16_and_negative_zero");
  await expect(page).toHaveURL(/\/$/);
});

test("browser Binary Hson SHA-256 equals browser WebCrypto over exact binary bytes", async ({ page }) => {
  await run_in_browser(page, "verify_browser_binary_sha256");
  await expect(page).toHaveURL(/\/$/);
});

test("browser Hson JSON and HTML SHA-256 equal browser WebCrypto over exact UTF-8 bytes", async ({ page }) => {
  await run_in_browser(page, "verify_browser_textual_sha256");
  await expect(page).toHaveURL(/\/$/);
});
