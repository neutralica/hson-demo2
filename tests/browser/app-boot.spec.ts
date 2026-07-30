import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";

test("splash completes naturally without retaining work or disposed nodes", async ({ page }) => {
  test.setTimeout(55_000);
  const assertNoErrors = monitor_application_errors(page);
  await page.goto("/");
  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-app-phase", "splash", { timeout: 15_000 });
  await expect(stage).toHaveAttribute("data-app-phase", "demo-ready", { timeout: 45_000 });
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#wasm-fireworks")).toHaveCount(1);
  assertNoErrors();
});

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
  await expect(page.getByTestId("hosted-test-executor")).toContainText("2100 canonical cases");
  await open_demo(page, "test");

  const selector = page.locator("#test-select");
  const targetedSuite = page.locator("#test-targeted-suite");
  const targetedCase = page.locator("#test-targeted-case");
  await expect(selector.locator("option").first()).toHaveText("all (2810)");
  await expect(selector.locator("option")).toHaveText(
    await selector.locator("option").allTextContents().then((labels) => labels.map((label) => label.toLowerCase())),
  );
  await expect(selector.locator('option[value^="suite:"]')).toHaveCount(0);
  await expect(selector.locator('option[value^="test:"]')).toHaveCount(0);
  await expect(selector.locator('option[value="subject:transform"]')).toHaveText("transform (571)");
  await expect(selector.locator('option[value="collection:dev"]')).toHaveText("dev (38)");
  await expect(selector.locator('option[value="collection:library"]')).toHaveCount(0);
  await expect(targetedSuite).toBeDisabled();
  await expect(targetedSuite).toHaveValue("");
  await expect(targetedSuite.locator("option")).toHaveText(["all suites"]);
  await expect(targetedCase).toBeDisabled();
  await expect(targetedCase).toHaveValue("");
  await expect(targetedCase.locator("option")).toHaveText(["all cases"]);

  await selector.selectOption("subject:livetree");
  await expect(targetedSuite).toBeEnabled();
  await expect(targetedSuite.locator("option").first()).toHaveText(/^all livetree suites \(\d+\)$/);
  await expect(targetedSuite.locator('option[value^="suite:livemap/"]')).toHaveCount(0);
  await expect(targetedCase).toBeDisabled();
  await targetedSuite.selectOption("suite:livetree/canvas-clear");
  await expect(targetedCase).toBeEnabled();
  await expect(targetedCase.locator("option").first()).toHaveText("all cases (3)");
  await expect(targetedCase.locator('option[value^="test:livetree/canvas-clear::"]')).toHaveCount(3);
  await targetedCase.selectOption({ index: 1 });
  await expect(panel).toHaveAttribute("data-hosted-selection-count", "1");
  await targetedSuite.selectOption("suite:livetree/canvas");
  await expect(targetedCase).toHaveValue("");
  await targetedSuite.selectOption("");
  await expect(targetedCase).toBeDisabled();
  await expect(targetedCase).toHaveValue("");

  await selector.selectOption("subject:livehost");
  await expect(targetedSuite).toBeEnabled();
  await targetedSuite.selectOption("suite:library::livehost.authority");
  await expect(targetedCase).toBeDisabled();
  await expect(targetedCase.locator("option")).toHaveText(["all cases (19)"]);

  await selector.selectOption("all");
  await expect(targetedSuite).toBeDisabled();
  await expect(targetedSuite).toHaveValue("");
  await expect(targetedCase).toBeDisabled();
  await expect(targetedCase).toHaveValue("");

  await selector.selectOption("subject:livetree");
  await expect(targetedSuite).toBeEnabled();
  await expect(targetedCase).toBeDisabled();
  await targetedSuite.selectOption("suite:livetree/canvas-clear");
  await expect(targetedCase).toBeEnabled();
  await expect(targetedCase).toHaveValue("");
  await expect(panel).toHaveAttribute("data-hosted-selection-count", "3");
  await page.locator("#test-run").click();

  await expect(panel).toHaveAttribute("data-hosted-execution-count", "1");
  await expect(page.locator("#test-logger")).toContainText("elapsed", { timeout: 15_000 });
  await expect(page.locator("#test-logger")).toContainText("pass livetree/canvas-clear — 3 cases");
  await expect(page.locator("#test-case-pane [data-hosted-suite]")).toHaveCount(1);

  await selector.selectOption("subject:livehost");
  await targetedSuite.selectOption("suite:library::livehost.authority");
  await page.locator("#test-run").click();
  await expect(panel).toHaveAttribute("data-hosted-execution-count", "2");
  await expect(page.locator("#test-logger")).toContainText(
    "pass library::livehost.authority — 19 cases",
    { timeout: 15_000 },
  );
  await expect(page.locator("#test-logger")).not.toContainText("ok 1 -");
  const externalRow = page.locator('[data-hosted-suite="library::livehost.authority"]');
  await externalRow.click();
  await expect(page.locator(".hosted-external-output")).toContainText("ok 1 -");
  await expect(page.locator("#test-chips .test-chip-value")).toHaveText(["19", "19", "0", /\d/]);
  assertNoErrors();
});
