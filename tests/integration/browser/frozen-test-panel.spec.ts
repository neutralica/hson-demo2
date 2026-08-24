import { expect, test } from "./livehost-browser-test";
import type { Page } from "@playwright/test";
import { complete_frozen_test_evidence_inventory_fixture, FROZEN_TEST_EVIDENCE_ROOT } from "../../fixtures/app/frozen-test-evidence-index";
import { monitor_application_errors } from "./app-test-support";

function artifact_path(owner: "cases" | "suites", id: string): string {
  return `${owner}/${Buffer.from(id, "utf8").toString("base64url")}.json`;
}

function retained(kind: "stdout" | "stderr" | "artifact", name: string, content: string) {
  return { id: `${kind}:${name}`, sequence: 1, timestamp: 2, executorId: "frozen-browser-fixture", kind, name, content, truncated: false, knownBytes: Buffer.byteLength(content), reference: null, mediaType: "text/plain" };
}

function diagnostic(type: "ordinary" | "transform", suiteId: string, item: any) {
  return {
    type, runId: "run:frozen", suite: "canonical/selected", caseKey: item.id, caseSuite: suiteId, caseId: item.caseId,
    name: item.title, status: item.status, ms: item.timing.ms, error: null,
    assertions: [{ ok: true, label: `${type} retained assertion`, expected: "frozen", actual: "frozen" }],
    values: [{ label: "metadata", value: "retained original-run value" }],
    artifacts: type === "transform" ? [{ lap: 1, label: "authored input", format: "hson", text: "retained transform circuit", node: "{ retained: true }" }] : [],
    trace: type === "transform" ? [{ ok: true, step: "retained transformation route", error: null }] : [],
  };
}

function add_case_artifact(index: any, artifacts: Map<string, string>, suite: any, item: any, body: any): string {
  const path = artifact_path("cases", item.id);
  const text = JSON.stringify({ category: suite.category, suiteId: suite.id, caseId: item.id, case: { ...item, errors: [], evidenceRefs: body.evidence.map((entry: any) => entry.id), diagnostic: body.diagnostic }, evidence: body.evidence });
  item.evidence = { available: true, path, rawBytes: Buffer.byteLength(text), sha256: "b".repeat(64) };
  artifacts.set(path, text);
  return path;
}

function add_suite_artifact(artifacts: Map<string, string>, suite: any, evidence: any[]): string {
  const path = artifact_path("suites", suite.id);
  const text = JSON.stringify({ category: suite.category, suiteId: suite.id, suite: { id: suite.id, title: suite.title, status: suite.status, errors: [] }, evidenceRefs: evidence.map((entry) => entry.id), evidence });
  suite.evidence = { available: true, path, rawBytes: Buffer.byteLength(text), sha256: "b".repeat(64) };
  artifacts.set(path, text);
  return path;
}

function interactive_inventory() {
  const index = complete_frozen_test_evidence_inventory_fixture();
  const artifacts = new Map<string, string>();
  for (const suite of index.suites) {
    suite.evidence = { available: false };
    for (const item of suite.cases) item.evidence = { available: false };
  }
  const semantic = index.suites.filter((suite: any) => suite.category === "semantic");
  const browser = index.suites.filter((suite: any) => suite.category === "browser");
  const certification = index.suites.filter((suite: any) => suite.category === "certification");
  const ordinary = semantic[0].cases[0];
  const transformer = semantic[1].cases[0];
  const browserCase = browser[0].cases[0];
  add_case_artifact(index, artifacts, semantic[0], ordinary, { diagnostic: diagnostic("ordinary", semantic[0].id, ordinary), evidence: [] });
  add_case_artifact(index, artifacts, semantic[1], transformer, { diagnostic: diagnostic("transform", semantic[1].id, transformer), evidence: [] });
  add_case_artifact(index, artifacts, browser[0], browserCase, { diagnostic: null, evidence: [retained("stdout", "browser stdout", "retained browser journey output")] });
  semantic[2].executionShape = "opaque-aggregate";
  add_suite_artifact(artifacts, semantic[2], [retained("stderr", "opaque process", "retained opaque process evidence")]);
  add_suite_artifact(artifacts, certification[0], [retained("artifact", "certification", "retained certification evidence")]);
  return { index, artifacts, ordinary, transformer, browserCase, opaque: semantic[2], certification: certification[0], noEvidence: semantic[3].cases[1] };
}

async function route_inventory(page: Page, index: any, artifacts: Map<string, string>, requests: string[]): Promise<void> {
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname === `${FROZEN_TEST_EVIDENCE_ROOT}/index.json`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(index) });
      return;
    }
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1);
    const body = artifacts.get(relative);
    await route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, contentType: "application/json", body });
  });
}

async function expand_category(page: Page, categoryId: string): Promise<void> {
  const category = page.locator(`[data-frozen-category="${categoryId}"]`);
  if (await category.getAttribute("open") === null) await category.locator(":scope > summary").click();
}

async function reveal_case(page: Page, caseId: string): Promise<void> {
  const row = page.locator(`[data-frozen-case="${caseId}"]`);
  const suite = row.locator("xpath=ancestor::details[@data-frozen-suite]");
  const category = row.locator("xpath=ancestor::details[@data-frozen-category]");
  if (await category.getAttribute("open") === null) await category.locator(":scope > summary").click();
  if (await suite.getAttribute("open") === null) await suite.locator(":scope > summary").click();
  await expect(row).toBeVisible();
}

test("localhost application mount loads one immutable frozen index without browser execution", async ({ page }) => {
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
  await expect(panel).toHaveAttribute("data-frozen-index-requests", "1");
  await expect(panel).toHaveAttribute("data-frozen-initial-evidence-requests", "0");
  await expect(page.getByTestId("frozen-test-summary")).toContainText("359 suites · 2586 cases · 2586 pass · 0 fail · aaaaaaaaaa");
  await expect(page.getByTestId("frozen-test-summary")).not.toContainText("frozen");
  await expect(page.getByTestId("frozen-category-semantic")).toContainText("285 suites · 2505 cases");
  await expect(page.getByTestId("frozen-category-browser")).toContainText("17 suites · 81 cases");
  await expect(page.getByTestId("frozen-category-certification")).toContainText("57 suites · 0 cases");
  await expect(page.getByTestId("frozen-suite-row")).toHaveCount(359);
  await expect(page.getByTestId("frozen-case-row")).toHaveCount(2586);
  await expect(page.locator('[data-frozen-suite="semantic/suite-000"]')).toContainText("semantic representative suite 0");
  await expect(page.locator('[data-frozen-case="semantic/suite-000::case-000"]')).toContainText("PASS");
  await expect(page.locator('[data-frozen-case="browser/suite-000::case-000"]')).toContainText("0.50 ms");
  for (const categoryId of ["semantic", "browser", "certification"]) {
    await expect(page.getByTestId(`frozen-category-${categoryId}`)).not.toHaveAttribute("open", "");
  }
  const firstSuite = page.locator('[data-frozen-suite="semantic/suite-000"]');
  const firstCase = page.locator('[data-frozen-case="semantic/suite-000::case-001"]');
  await expect(firstSuite).not.toHaveAttribute("open", "");
  await expect(firstCase).toBeHidden();
  await page.getByTestId("frozen-category-semantic").locator(":scope > summary").click();
  await expect(firstSuite.getByTestId("frozen-suite-row")).toBeVisible();
  await expect(firstCase).toBeHidden();
  await firstSuite.getByTestId("frozen-suite-row").click();
  await expect(firstCase).toBeVisible();
  await expect(panel.getByRole("button", { name: /^(Run|Stop|Clear)$/ })).toHaveCount(0);
  await expect(page.getByTestId("hosted-test-panel")).toHaveCount(0);
  await expect(page.getByTestId("hosted-test-executor")).toHaveCount(0);
  await expect(panel.getByText(/running|reconnect|live logs/i)).toHaveCount(0);
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  expect(webSockets).toBe(0);
  expect(await page.evaluate(() => window.__frozenPanelFixture?.acquisition)).toBe("frozen");
  expect(await page.evaluate(() => (window as unknown as { __frozenSockets?: number }).__frozenSockets ?? 0)).toBe(0);
  assertNoErrors();
});

test("frozen case inspector URL supports Back, Forward, refresh, and direct reopening", async ({ page }) => {
  const fixture = interactive_inventory();
  const requests: string[] = [];
  await route_inventory(page, fixture.index, fixture.artifacts, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await reveal_case(page, fixture.ordinary.id);
  const explorerUrl = page.url();
  const ordinaryRow = page.locator(`[data-frozen-case="${fixture.ordinary.id}"]`);

  await ordinaryRow.getByRole("button", { name: /View evidence/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toBeVisible();
  await expect(page.getByTestId("frozen-inspector-navigation")).toContainText("Browser Back returns to the tests explorer");
  const inspectorUrl = new URL(page.url());
  expect(inspectorUrl.searchParams.get("frozen-evidence")).toBe(fixture.index.deployment.hsonDeployCommit);
  expect(inspectorUrl.searchParams.get("frozen-case")).toBe(fixture.ordinary.id);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);

  await page.goBack();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);
  expect(page.url()).toBe(explorerUrl);
  await expect(ordinaryRow).toBeVisible();

  await page.goForward();
  await expect(page.getByTestId("hosted-case-report")).toBeVisible();
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);

  await page.reload();
  await expect(page.getByTestId("hosted-case-report")).toBeVisible();
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.ordinary.id);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(2);

  await page.goto(`/${inspectorUrl.search}`);
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "test");
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.ordinary.id);
});

test("frozen row View, Copy, and Copy Reports use validated lazy artifacts and truthful controls", async ({ page, context }) => {
  const assertNoErrors = monitor_application_errors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const fixture = interactive_inventory();
  const requests: string[] = [];
  await route_inventory(page, fixture.index, fixture.artifacts, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");

  const ordinaryRow = page.locator(`[data-frozen-case="${fixture.ordinary.id}"]`);
  await reveal_case(page, fixture.ordinary.id);
  await expect(ordinaryRow.getByTestId("frozen-evidence-size")).toContainText(/B|kB/);
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  await ordinaryRow.getByRole("button", { name: /View evidence/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toContainText("ordinary retained assertion");
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);
  await ordinaryRow.getByRole("button", { name: /Copy evidence/ }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("ordinary retained assertion");
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);

  const transformerRow = page.locator(`[data-frozen-case="${fixture.transformer.id}"]`);
  await reveal_case(page, fixture.transformer.id);
  await transformerRow.getByRole("button", { name: /View evidence/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toContainText("retained transformation route");
  await expect(page.getByTestId("hosted-case-report")).toContainText("retained transform circuit");
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);

  const browserRow = page.locator(`[data-frozen-case="${fixture.browserCase.id}"]`);
  await reveal_case(page, fixture.browserCase.id);
  await browserRow.getByRole("button", { name: /View evidence/ }).click();
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("retained browser journey output");
  await page.getByRole("button", { name: "Close frozen evidence" }).click();

  for (const suite of [fixture.opaque, fixture.certification]) {
    await expand_category(page, suite.category);
    const row = page.locator(`[data-frozen-suite="${suite.id}"]`).getByTestId("frozen-suite-row");
    await row.getByRole("button", { name: /View evidence/ }).click();
    await expect(page.getByTestId("frozen-row-evidence")).toContainText(suite === fixture.opaque ? "retained opaque process evidence" : "retained certification evidence");
    await page.getByRole("button", { name: "Close frozen evidence" }).click();
  }

  const absent = page.locator(`[data-frozen-case="${fixture.noEvidence.id}"]`);
  await expect(absent.getByRole("button", { name: /View evidence|Copy evidence/ })).toHaveCount(0);
  const beforeReports = [...requests];
  await page.getByTestId("frozen-copy-reports").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Frozen test inventory");
  const summary = await page.evaluate(() => navigator.clipboard.readText());
  expect(summary).toContain(fixture.ordinary.id);
  expect(summary).toContain("CERTIFICATION");
  expect(requests).toEqual(beforeReports);
  expect(requests.some((path) => path.includes("/reports/"))).toBe(false);
  await expect(panel).toHaveAttribute("data-hosted-execution-count", "0");
  assertNoErrors();
});

test("frozen row evidence failures stay local and never fall back to live acquisition", async ({ page }) => {
  const fixture = interactive_inventory();
  fixture.artifacts.delete(fixture.ordinary.evidence.path);
  const requests: string[] = [];
  await route_inventory(page, fixture.index, fixture.artifacts, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const row = page.locator(`[data-frozen-case="${fixture.ordinary.id}"]`);
  await reveal_case(page, fixture.ordinary.id);
  await row.getByRole("button", { name: /View evidence/ }).click();
  await expect(row.getByTestId("frozen-row-evidence-error")).toContainText("HTTP 404");
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-panel-state", "ready");
  expect(await page.evaluate(() => window.__frozenPanelFixture?.acquisition)).toBe("frozen");
  expect(requests.some((path) => path.includes("/reports/"))).toBe(false);
});

test("frozen panel shows blocking root and HTTP failures without falling back to live acquisition", async ({ page }) => {
  let evidenceRequests = 0;
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html?missing-root=1");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  await expect(page.getByTestId("frozen-test-error")).toContainText("FROZEN_EVIDENCE_ROOT_MISSING");
  expect(await page.evaluate(() => window.__frozenPanelFixture?.acquisition)).toBe("frozen");

  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/index.json`, async (route) => {
    evidenceRequests += 1;
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  await expect(page.getByTestId("frozen-test-error")).toContainText("HTTP 503");
  expect(evidenceRequests).toBe(1);
  expect(await page.evaluate(() => window.__frozenPanelFixture?.acquisition)).toBe("frozen");
});
