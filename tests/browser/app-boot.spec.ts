import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

test("application boot reaches one clean usable demo without auto-running hosted tests", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);

  await expect(page.getByTestId("hosted-test-panel")).toHaveAttribute("data-hosted-execution-count", "0");
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toBeVisible();
  await open_demo(page, "about");
  await open_demo(page, "parse");
  await expect(page.getByTestId("parse-root")).toHaveCount(1);

  await page.reload();
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await stage.click({ position: { x: 4, y: 4 } });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 15_000 });
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();
  await expect(page.getByTestId("hosted-test-panel")).toHaveAttribute("data-hosted-execution-count", "0");
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#deck-cover")).not.toBeVisible();
  assertNoErrors();
});

test("hosted panel discovers curated categories and runs one canonical category", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  await reach_demo(page);

  const panel = page.getByTestId("hosted-test-panel");
  await expect(panel).toHaveAttribute("data-hosted-executor", "local-node-livehost", { timeout: 10_000 });
  await expect(page.getByTestId("hosted-test-executor")).toContainText("Local Node LiveHost");
  await expect(page.getByTestId("hosted-test-executor")).toContainText("2103 tests");

  const selector = page.locator("#test-select");
  await expect(selector.locator("option").first()).toContainText("All discovered tests (2103)");
  await expect(selector.locator('option[value^="suite:"]')).toHaveCount(0);
  await expect(selector.locator('option[value^="test:"]')).toHaveCount(0);
  await expect(selector.locator('option[value="subject:transform"]')).toContainText("Transform (362)");
  await expect(selector.locator('option[value="collection:dev"]')).toContainText("Dev (32)");
  await expect(page.locator("#test-targeted-suite").locator('option[value^="suite:"]')).not.toHaveCount(0);
  const targetedSuite = page.locator("#test-targeted-suite");
  const targetedCase = page.locator("#test-targeted-case");
  await targetedSuite.selectOption("suite:livetree/canvas-clear");
  await expect(targetedCase).toBeEnabled();
  await expect(targetedCase.locator("option").first()).toHaveText("Entire suite");
  await expect(targetedCase.locator('option[value^="test:livetree/canvas-clear::"]')).toHaveCount(3);
  await targetedCase.selectOption({ index: 1 });
  await expect(panel).toHaveAttribute("data-hosted-selection-count", "1");
  await targetedSuite.selectOption("suite:livemap/replay");
  await expect(targetedCase).toHaveValue("");
  await selector.selectOption("collection:dev");
  await expect(panel).toHaveAttribute("data-hosted-selection-count", "32");
  await page.locator("#test-run").click();

  await expect(panel).toHaveAttribute("data-hosted-execution-count", "1");
  await expect(page.locator("#test-logger")).toContainText("elapsed", { timeout: 15_000 });
  await expect(page.locator("#test-case-pane [data-hosted-suite]")).toHaveCount(1);
  assertNoErrors();
});
