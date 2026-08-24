import { expect, test } from "./livehost-browser-test";
import { complete_frozen_test_evidence_inventory_fixture, FROZEN_TEST_EVIDENCE_ROOT } from "../../fixtures/app/frozen-test-evidence-index";
import { monitor_application_errors } from "./app-test-support";

test("frozen panel loads one immutable index and presents all authoritative groups without live acquisition", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  const requests: string[] = [];
  let webSockets = 0;
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    Object.defineProperty(window, "WebSocket", { value: class CountingWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        if (new URL(String(url), window.location.href).pathname === "/hosted-tests") {
          (window as unknown as { __frozenSockets?: number }).__frozenSockets = ((window as unknown as { __frozenSockets?: number }).__frozenSockets ?? 0) + 1;
        }
        if (protocols === undefined) super(url); else super(url, protocols);
      }
    } });
  });
  page.on("websocket", (socket) => { if (new URL(socket.url()).pathname === "/hosted-tests") webSockets += 1; });
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async (route) => {
    requests.push(new URL(route.request().url()).pathname);
    if (new URL(route.request().url()).pathname === `${FROZEN_TEST_EVIDENCE_ROOT}/index.json`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(complete_frozen_test_evidence_inventory_fixture()) });
      return;
    }
    await route.fulfill({ status: 500, body: "lazy evidence must not be fetched initially" });
  });

  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");
  await expect(panel).toHaveAttribute("data-frozen-category-count", "3");
  await expect(panel).toHaveAttribute("data-frozen-suite-count", "359");
  await expect(panel).toHaveAttribute("data-frozen-case-count", "2586");
  await expect(page.getByTestId("frozen-category-semantic")).toContainText("285 suites · 2505 cases");
  await expect(page.getByTestId("frozen-category-browser")).toContainText("17 suites · 81 cases");
  await expect(page.getByTestId("frozen-category-certification")).toContainText("57 suites · 0 cases");
  await expect(page.getByTestId("frozen-suite-row")).toHaveCount(359);
  await expect(page.getByTestId("frozen-case-row")).toHaveCount(2586);
  await expect(page.locator('[data-frozen-suite="semantic/suite-000"]')).toContainText("semantic representative suite 0");
  await expect(page.locator('[data-frozen-case="semantic/suite-000::case-000"]')).toContainText("PASS");
  await expect(page.locator('[data-frozen-case="browser/suite-000::case-000"]')).toContainText("0.50 ms");
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  expect(webSockets).toBe(0);
  expect(await page.evaluate(() => window.__frozenPanelFixture?.liveLoads)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __frozenSockets?: number }).__frozenSockets ?? 0)).toBe(0);
  assertNoErrors();
});

test("frozen panel shows blocking root and HTTP failures without falling back to live acquisition", async ({ page }) => {
  let evidenceRequests = 0;
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html?missing-root=1");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  await expect(page.getByTestId("frozen-test-error")).toContainText("FROZEN_EVIDENCE_ROOT_MISSING");
  expect(await page.evaluate(() => window.__frozenPanelFixture?.liveLoads)).toBe(0);

  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/index.json`, async (route) => {
    evidenceRequests += 1;
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  await expect(page.getByTestId("frozen-test-error")).toContainText("HTTP 503");
  expect(evidenceRequests).toBe(1);
  expect(await page.evaluate(() => window.__frozenPanelFixture?.liveLoads)).toBe(0);
});
