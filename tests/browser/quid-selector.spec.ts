import { expect, test } from "@playwright/test";
import { monitor_application_errors } from "./app-test-support";

test("canonical QUID selectors apply, update, isolate, and clean up in HTML and SVG", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await page.goto("/tests/browser/quid-selector-fixture.html");

  const fixture = page.locator("#fixture-root");
  await expect(fixture).toHaveAttribute("data-fixture-state", "uninitialized");
  await page.evaluate(async (modulePath) => {
    const module = await import(modulePath) as Readonly<{
      install_quid_selector_fixture(): void;
    }>;
    module.install_quid_selector_fixture();
  }, "/tests/browser/quid-selector-fixture.ts");

  const htmlTarget = page.locator("#quid-html-target");
  const htmlSibling = page.locator("#quid-html-sibling");
  const svgTarget = page.locator("#quid-svg-target");
  const svgSibling = page.locator("#quid-svg-sibling");
  await expect(fixture).toHaveAttribute("data-fixture-state", "initial");

  const htmlQuid = await htmlTarget.getAttribute("hson:quid");
  const svgQuid = await svgTarget.getAttribute("hson:quid");
  expect(htmlQuid).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/);
  expect(svgQuid).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/);
  await expect(htmlTarget).toHaveCSS("opacity", "0.25");
  await expect(htmlSibling).toHaveCSS("opacity", "1");
  await expect(svgTarget).toHaveCSS("opacity", "0.4");
  await expect(svgSibling).toHaveCSS("opacity", "1");

  await page.locator("#quid-update").click();
  await expect(fixture).toHaveAttribute("data-fixture-state", "updated");
  await expect(htmlTarget).toHaveCSS("opacity", "0.75");
  await expect(htmlSibling).toHaveCSS("opacity", "1");
  await expect(svgTarget).toHaveCSS("opacity", "0.65");
  await expect(svgSibling).toHaveCSS("opacity", "1");

  await page.locator("#quid-clear").click();
  await expect(fixture).toHaveAttribute("data-fixture-state", "cleared");
  await expect(htmlTarget).toHaveCSS("opacity", "1");
  await expect(svgTarget).toHaveCSS("opacity", "1");
  expect(await htmlTarget.getAttribute("hson:quid")).toBe(htmlQuid);
  expect(await svgTarget.getAttribute("hson:quid")).toBe(svgQuid);
  assertNoErrors();
});
