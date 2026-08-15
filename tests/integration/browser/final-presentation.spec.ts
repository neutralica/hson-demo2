import { expect, test } from "./livehost-browser-test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

const TRANSFORM_SUITE = "transform/legacy/html";
const TRANSFORM_CASE = "test:transform/legacy/html::html__level3.inlinewhitespace";
const TRANSFORM_FIRST_ARTIFACT = "<span>a\n<b>b</b>\nc</span>";

test("long clean run keeps one advancing Logger readout beside the local stopwatch", async ({ page }) => {
  test.setTimeout(90_000);
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  await open_demo(page, "test");
  await page.locator("#test-clear").click();
  await page.locator("#test-select").selectOption("subject:transform");
  await page.locator("#test-run").click();

  const live = page.locator("[data-hosted-live-running]");
  await expect(live).toHaveCount(1, { timeout: 15_000 });
  await expect(live).toContainText(/^running · \d+\/\d+ · transform\//);
  const firstReadout = await live.textContent();
  const elapsed = page.locator("#test-chips .test-chip").filter({ hasText: "elapsed" }).locator(".test-chip-value");
  const firstElapsed = await elapsed.textContent();
  await page.waitForTimeout(700);
  expect(await elapsed.textContent()).not.toBe(firstElapsed);
  await expect.poll(() => live.textContent(), { timeout: 30_000 }).not.toBe(firstReadout);
  await expect(page.locator("[data-hosted-live-running]")).toHaveCount(1);

  await expect(page.locator("#test-logger")).toContainText("passed ·", { timeout: 60_000 });
  await expect(page.locator("#test-chips .test-chip-label")).toHaveText(["suites", "tests", "passed", "failed", "elapsed"]);
  const values = await page.locator("#test-chips .test-chip-value").allTextContents();
  expect(values[2]).toBe(values[1]);
  expect(values[3]).toBe("0");
  const loggerText = await page.locator("#test-logger").innerText();
  expect((loggerText.match(/^queued$/gm) ?? []).length).toBe(1);
  expect((loggerText.match(/^running ·/gm) ?? []).length).toBe(1);
  expect((loggerText.match(/^passed ·/gm) ?? []).length).toBe(1);
  expect(loggerText).not.toMatch(/checks ·|cases ·|stdout transform\//);
  assertNoErrors();
});

test("Transform View renders the reproduced circuit in-app without changing the authoritative run", async ({ page, context }) => {
  const assertNoErrors = monitor_application_errors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await reach_demo(page);
  await open_demo(page, "test");

  await page.locator("#test-select").selectOption("subject:transform");
  await page.locator("#test-targeted-suite").selectOption(`suite:${TRANSFORM_SUITE}`);
  await page.locator("#test-targeted-case").selectOption(TRANSFORM_CASE);
  await page.locator("#test-run").click();
  await expect(page.locator("#test-logger")).toContainText("passed ·", { timeout: 15_000 });

  await page.locator(`.hosted-suite-row[data-hosted-suite="${TRANSFORM_SUITE}"]`).click();
  const valuesBefore = await page.locator("#test-chips .test-chip-value").allTextContents();
  const elapsedBefore = valuesBefore.at(-1);
  const pagesBefore = context.pages().length;

  await page.getByRole("button", { name: /View report for html__level3\.inlineWhitespace/ }).click();
  const report = page.getByTestId("hosted-case-report");
  await expect(report).toBeVisible();
  await expect(report).toHaveAttribute("data-case-key", "transform/legacy/html::html__level3.inlinewhitespace");
  await expect(report.locator("[data-hosted-report-artifact]")).toHaveCount(36);
  await expect(report.locator("[data-hosted-report-trace]")).toHaveAttribute("data-hosted-report-trace", "86");
  await expect(report.locator("[data-hosted-report-node]")).toHaveCount(36);
  const firstArtifact = report.locator("[data-hosted-report-text]").first();
  await expect(firstArtifact).toHaveText(TRANSFORM_FIRST_ARTIFACT);
  await expect(firstArtifact).toHaveCSS("white-space", "pre-wrap");

  const firstNode = report.locator("[data-hosted-report-node]").first();
  await firstNode.locator("summary").click();
  await expect(firstNode).toHaveAttribute("open", "");
  await expect(firstNode.locator("pre")).toContainText("$_");
  expect(context.pages().length).toBe(pagesBefore);
  expect(await page.locator("#test-chips .test-chip-value").allTextContents()).toEqual(valuesBefore);
  expect((await page.locator("#test-chips .test-chip-value").allTextContents()).at(-1)).toBe(elapsedBefore);

  await page.getByRole("button", { name: "Close Transform report" }).click();
  await expect(report).toHaveCount(0);
  await page.getByRole("button", { name: /View report for html__level3\.inlineWhitespace/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await page.getByRole("button", { name: "Close Transform report" }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);

  await page.getByRole("button", { name: /Copy report for html__level3\.inlineWhitespace/ }).click();
  await expect.poll(
    () => page.evaluate(() => navigator.clipboard.readText()),
    { timeout: 10_000 },
  ).toContain("transform/legacy/html::html__level3.inlinewhitespace");
  const copiedReport = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedReport).toContain(TRANSFORM_FIRST_ARTIFACT);
  expect(copiedReport).toContain("node:");
  expect(await page.locator("#test-chips .test-chip-value").allTextContents()).toEqual(valuesBefore);
  assertNoErrors();
});

test("bling switches one navigation model between amoebic and historical plain presentations", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);
  const screen = page.locator("#screen");
  const amoebic = page.locator("#amoebi-menu-demo");
  const plain = page.locator("#plain-menu-demo");
  const menuOrder = ["about", "test", "parse", "build", "bar-bar", "towl", "cells", "fleurs", "point", "oklch", "bling"];

  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(screen).toHaveAttribute("data-shell-active-widgets", "");
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "plain");
  await expect(amoebic).toBeHidden();
  await expect(plain).toBeVisible();
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await expect(page.locator("#motes")).toBeHidden();
  await expect(page.locator("#graffiti-layer")).toBeHidden();
  expect(await amoebic.locator("[data-amoebi-hit-target]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-amoebi-hit-target")))).toEqual(menuOrder);
  expect(await plain.locator("[data-menu-key]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-menu-key")))).toEqual(menuOrder);

  const parseButton = plain.getByRole("button", { name: "parse", exact: true });
  const aboutButton = plain.getByRole("button", { name: "about", exact: true });
  const pointButton = plain.getByRole("button", { name: "point", exact: true });
  const parseLabel = parseButton.locator(".plain-menu-label");
  const aboutLabel = aboutButton.locator(".plain-menu-label");
  const parseMarker = parseButton.locator(".plain-menu-marker");
  const aboutMarker = aboutButton.locator(".plain-menu-marker");
  await expect(parseButton).toHaveCSS("color", "oklch(0.75 0.06 300)");
  await expect(pointButton).toHaveCSS("color", "oklch(0.7 0.001 101)");
  const aboutIdleX = await aboutLabel.evaluate((element) => element.getBoundingClientRect().x);
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe("none");
  await aboutButton.hover();
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">>"');
  expect(await aboutLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(aboutIdleX);
  await aboutButton.focus();
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">>"');
  expect(await aboutLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(aboutIdleX);

  const parseIdleX = await parseLabel.evaluate((element) => element.getBoundingClientRect().x);
  await parseButton.click();
  await expect(screen).toHaveAttribute("data-shell-current-main", "parse");
  await expect(parseButton).toHaveCSS("font-weight", "900");
  await parseButton.hover();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);
  await parseButton.focus();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);
  await page.mouse.move(1300, 800);
  await aboutButton.focus();
  expect(await parseMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('">"');
  expect(await parseLabel.evaluate((element) => element.getBoundingClientRect().x)).toBe(parseIdleX);

  const parseRoot = page.getByTestId("parse-root");
  await parseRoot.evaluate((element) => element.setAttribute("data-bling-retention", "same-instance"));
  const urlBefore = page.url();

  await plain.getByRole("button", { name: "bling", exact: true }).click();
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "amoebic");
  await expect(screen).toHaveAttribute("data-shell-current-main", "parse");
  await expect(page.getByTestId("parse-root")).toHaveAttribute(
    "data-bling-retention",
    "same-instance",
  );
  expect(page.url()).toBe(urlBefore);
  await expect(amoebic).toBeVisible();
  await expect(plain).toBeHidden();
  await expect(page.locator("#motes-root")).toHaveCount(1);
  await expect(page.locator("#graffiti-layer")).toBeVisible();
  await expect(page.locator("#motes")).toHaveCSS("background-image", /linear-gradient/);

  await amoebic.getByRole("button", { name: "parse", exact: true }).click();
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await amoebic.getByRole("button", { name: "bling", exact: true }).click();
  await expect(screen).toHaveAttribute("data-shell-navigation-skin", "plain");
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await aboutButton.press("Enter");
  await expect(screen).toHaveAttribute("data-shell-current-main", "about");
  await expect(aboutButton).toHaveCSS("font-weight", "900");
  expect(await aboutMarker.evaluate((element) => getComputedStyle(element, "::before").content)).toBe('"X"');
  await aboutButton.press("Enter");
  await expect(screen).toHaveAttribute("data-shell-current-main", "");
  await expect(page.locator("#amoebi-menu-demo")).toHaveCount(1);
  await expect(page.locator("#plain-menu-demo")).toHaveCount(1);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(plain).toBeVisible();
  await expect(plain.locator("[data-menu-key]")).toHaveCount(menuOrder.length);
  for (const key of menuOrder) await expect(plain.getByRole("button", { name: key, exact: true })).toBeVisible();
  assertNoErrors();
});
