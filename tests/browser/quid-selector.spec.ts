import { expect, test } from "@playwright/test";
import { monitor_application_errors } from "./app-test-support";

test("canonical QUID selectors schedule, apply, update, isolate, and clean up in HTML and SVG", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await page.goto("/tests/browser/quid-selector-fixture.html");

  const fixture = page.locator("#fixture-root");
  const isolatedFixture = page.locator("#fixture-isolated-root");
  await expect(fixture).toHaveAttribute("data-fixture-state", "uninitialized");
  const preflush = await page.evaluate(async (modulePath) => {
    const module = await import(modulePath) as Readonly<{
      install_quid_selector_fixture(): Readonly<{
        htmlOpacity: string;
        svgOpacity: string;
        htmlRulePresent: boolean;
        svgRulePresent: boolean;
      }>;
    }>;
    return module.install_quid_selector_fixture();
  }, "/tests/browser/quid-selector-fixture.ts");

  const htmlTarget = page.locator("#quid-html-target");
  const htmlSibling = page.locator("#quid-html-sibling");
  const svgTarget = page.locator("#quid-svg-target");
  const svgSibling = page.locator("#quid-svg-sibling");
  const isolatedTarget = page.locator("#quid-isolated-target");
  const isolatedSibling = page.locator("#quid-isolated-sibling");
  expect(preflush).toEqual({
    htmlOpacity: "0.9",
    svgOpacity: "0.8",
    htmlRulePresent: false,
    svgRulePresent: false,
  });
  await expect(fixture).toHaveAttribute("data-fixture-state", "pending");

  await page.evaluate(async (modulePath) => {
    const module = await import(modulePath) as Readonly<{
      flush_quid_selector_fixture(): void;
    }>;
    module.flush_quid_selector_fixture();
  }, "/tests/browser/quid-selector-fixture.ts");
  await expect(fixture).toHaveAttribute("data-fixture-state", "initial");
  await expect(isolatedFixture).toHaveAttribute("data-fixture-state", "initial");

  const htmlQuid = await htmlTarget.getAttribute("hson:quid");
  const svgQuid = await svgTarget.getAttribute("hson:quid");
  expect(htmlQuid).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/);
  expect(svgQuid).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/);
  await expect(htmlTarget).toHaveCSS("opacity", "0.25");
  await expect(htmlSibling).toHaveCSS("opacity", "0.9");
  await expect(svgTarget).toHaveCSS("opacity", "0.4");
  await expect(svgSibling).toHaveCSS("opacity", "0.8");
  await expect(isolatedTarget).toHaveCSS("opacity", "0.6");
  await expect(isolatedSibling).toHaveCSS("opacity", "0.9");

  const pseudoContent = await page.evaluate(() => ({
    plain: getComputedStyle(document.querySelector("#quid-pseudo-plain")!, "::before").content,
    empty: getComputedStyle(document.querySelector("#quid-pseudo-empty")!, "::before").content,
    manual: getComputedStyle(document.querySelector("#quid-pseudo-manual")!, "::before").content,
    auto: getComputedStyle(document.querySelector("#quid-pseudo-auto")!, "::before").content,
    attr: getComputedStyle(document.querySelector("#quid-pseudo-attr")!, "::before").content,
  }));
  expect(pseudoContent).toEqual({
    plain: `"X"`,
    empty: `""`,
    manual: `"M"`,
    auto: `"A"`,
    attr: `"HELLO"`,
  });

  await page.locator("#quid-update").click();
  await expect(fixture).toHaveAttribute("data-fixture-state", "updated");
  await expect(htmlTarget).toHaveCSS("opacity", "0.75");
  await expect(htmlSibling).toHaveCSS("opacity", "0.9");
  await expect(svgTarget).toHaveCSS("opacity", "0.65");
  await expect(svgSibling).toHaveCSS("opacity", "0.8");
  await expect(isolatedTarget).toHaveCSS("opacity", "0.6");

  await page.locator("#quid-clear").click();
  await expect(fixture).toHaveAttribute("data-fixture-state", "cleared");
  await expect(htmlTarget).toHaveCSS("opacity", "0.9");
  await expect(svgTarget).toHaveCSS("opacity", "0.8");
  await expect(isolatedTarget).toHaveCSS("opacity", "0.6");
  expect(await htmlTarget.getAttribute("hson:quid")).toBe(htmlQuid);
  expect(await svgTarget.getAttribute("hson:quid")).toBe(svgQuid);
  assertNoErrors();
});
