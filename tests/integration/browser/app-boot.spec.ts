import { expect, test } from "@playwright/test";
import { monitor_application_errors, open_demo, reach_demo } from "./app-test-support";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import {
  hosted_test_panel_display_label,
  hosted_test_panel_primary_choices,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";

type TowlLazyMetrics = Readonly<{
  webSockets: number;
  historyReplaces: number;
  credentialReads: number;
}>;

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

  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-active-widgets", "bling");
  await expect(page.locator('[data-shell-main-surface]')).toHaveCount(0);
  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#motes-root")).toHaveCount(1);
  await expect(page.locator("#mouse-host, #oklch")).toHaveCount(0);
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
  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await expect(page.getByTestId("parse-root")).toHaveCount(0);
  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  await expect(page.locator("#sky, #logo-box")).toHaveCount(0);
  await expect(page.locator("#deck-cover")).not.toBeVisible();
  assertNoErrors();
});

test("TOWL performs no room, storage, runtime, or socket work before activation", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { webSockets: 0, historyReplaces: 0, credentialReads: 0 };
    Object.defineProperty(window, "__towlLazyMetrics", { value: metrics });

    const NativeWebSocket = window.WebSocket;
    class CountingWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const livehost = new URL(String(url), window.location.href).searchParams.get("livehost");
        if (livehost?.startsWith("towl:") === true) metrics.webSockets += 1;
        if (protocols === undefined) super(url);
        else super(url, protocols);
      }
    }
    Object.defineProperty(window, "WebSocket", { value: CountingWebSocket });

    const replaceState = history.replaceState;
    history.replaceState = function replacement(data: unknown, unused: string, url?: string | URL | null): void {
      metrics.historyReplaces += 1;
      replaceState.call(history, data, unused, url);
    };

    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function countedGetItem(key: string): string | null {
      if (key.startsWith("hson-livedemo.towl.")) metrics.credentialReads += 1;
      return getItem.call(this, key);
    };
  });

  await reach_demo(page);
  const readMetrics = (): Promise<TowlLazyMetrics> => page.evaluate(() => (
    window as unknown as { __towlLazyMetrics: TowlLazyMetrics }
  ).__towlLazyMetrics);

  await expect(page.getByTestId("towl-root")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("room")).toBeNull();
  expect(await readMetrics()).toEqual({ webSockets: 0, historyReplaces: 0, credentialReads: 0 });

  await open_demo(page, "towl");
  await expect(page.getByTestId("towl-root")).toBeVisible();
  await expect(page.getByTestId("towl-status")).toHaveText("connection: connected · session attached");
  expect(new URL(page.url()).searchParams.get("room")).toMatch(/^[a-z0-9][a-z0-9-]{5,23}$/);
  expect(await readMetrics()).toEqual({ webSockets: 1, historyReplaces: 1, credentialReads: 1 });
});

test("widget membership lazily mounts and recreates disposable widget instances", async ({ page }) => {
  await reach_demo(page);
  await expect(page.locator("#motes-root")).toHaveCount(1);
  await expect(page.locator("#mouse-host, #oklch")).toHaveCount(0);

  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toBeVisible();
  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).not.toBeVisible();
  await expect(page.locator("#mouse-host")).toHaveCount(0);
  await open_demo(page, "point");
  await expect(page.locator("#mouse-host")).toBeVisible();
  await expect(page.locator("#mouse-host")).toHaveCount(1);

  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).toBeVisible();
  await open_demo(page, "oklch");
  await expect(page.locator("#oklch")).not.toBeVisible();
  await expect(page.locator("#oklch")).toHaveCount(0);

  await open_demo(page, "bling");
  await expect(page.locator("#motes-root")).toHaveCount(0);
  await open_demo(page, "bling");
  await expect(page.locator("#motes-root")).toHaveCount(1);
});

test("keyboard Color Sudoku activation stays inside the canonical shell lifecycle", async ({ page }) => {
  await reach_demo(page);
  await expect(page.locator("#color-sudoku-root")).toHaveCount(0);

  await page.keyboard.press("0");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "color-sudoku");
  await expect(page.locator("#color-sudoku-root")).toBeVisible();
  await expect(page.locator("#demo-layer")).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Demo navigation" })).toBeVisible();

  await open_demo(page, "about");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "about");
  await expect(page.locator("#color-sudoku-root")).toHaveCount(0);
  await expect(page.locator("#about-panel")).toBeVisible();
  await expect(page.locator("#demo-layer")).toHaveCount(1);
});

test("hosted panel discovers curated categories and runs one canonical category", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  const expectedRegistry = make_local_node_livehost_executor_registry();
  const expectedAvailability = await resolve_external_library_launchers();
  const expectedPrimary = hosted_test_panel_primary_choices(
    expectedRegistry.catalog.tests,
    expectedAvailability.targets,
  );
  const expectedPrimaryLabels = expectedPrimary.map((choice) =>
    hosted_test_panel_display_label(choice.label));
  const expectedChoiceLabel = (key: string): string => {
    const choice = expectedPrimary.find((candidate) => candidate.key === key);
    if (choice === undefined) throw new Error(`Missing authoritative panel choice ${key}`);
    return hosted_test_panel_display_label(choice.label);
  };
  await reach_demo(page);

  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await open_demo(page, "test");
  const panel = page.getByTestId("hosted-test-panel");
  await expect(panel).toHaveAttribute("data-hosted-executor", "local-node-livehost", { timeout: 10_000 });
  await expect(page.getByTestId("hosted-test-executor")).toContainText("Local Node LiveHost");
  await expect(page.getByTestId("hosted-test-executor")).toContainText(
    `${expectedRegistry.catalog.tests.length} canonical cases`,
  );
  await panel.evaluate((element) => element.setAttribute("data-retention-probe", "same-instance"));
  await open_demo(page, "about");
  await expect(panel).not.toBeVisible();
  await expect(panel).toHaveCount(1);
  await open_demo(page, "test");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-retention-probe", "same-instance");
  const selector = page.locator("#test-select");
  const targetedSuite = page.locator("#test-targeted-suite");
  const targetedCase = page.locator("#test-targeted-case");
  await expect(selector.locator("option")).toHaveText(expectedPrimaryLabels);
  await expect(selector.locator('option[value^="suite:"]')).toHaveCount(0);
  await expect(selector.locator('option[value^="test:"]')).toHaveCount(0);
  await expect(selector.locator('option[value="subject:transform"]')).toHaveText(
    expectedChoiceLabel("subject:transform"),
  );
  await expect(selector.locator('option[value="subject:reflect"]')).toHaveText(
    expectedChoiceLabel("subject:reflect"),
  );
  await expect(selector.locator('option[value="collection:dev"]')).toHaveText(
    expectedChoiceLabel("collection:dev"),
  );
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
  await expect(targetedCase.locator("option")).toHaveText(["all cases (21)"]);

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
    "pass library::livehost.authority — 21 cases",
    { timeout: 15_000 },
  );
  await expect(page.locator("#test-logger")).not.toContainText("ok 1 -");
  const externalRow = page.locator('[data-hosted-suite="library::livehost.authority"]');
  await externalRow.click();
  await expect(page.locator(".hosted-external-output")).toContainText("ok 1 -");
  await expect(page.locator("#test-chips .test-chip-value")).toHaveText(["21", "21", "0", /\d/]);
  assertNoErrors();
});
