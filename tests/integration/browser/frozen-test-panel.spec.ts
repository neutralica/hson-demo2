import { expect, test } from "./livehost-browser-test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OKLCH_VIBRANT } from "../../../src/app/core/consts/oklch.consts";
import { decode_frozen_test_evidence_index, frozen_test_explorer_category, frozen_test_explorer_category_candidates, project_frozen_test_explorer } from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
import { large_frozen_test_evidence_inventory_fixture, FROZEN_TEST_EVIDENCE_ROOT } from "../../fixtures/app/frozen-test-evidence-index";
import { monitor_application_errors } from "./app-test-support";

const EXPLORER_CATEGORIES = ["transform", "livetree", "livemap", "locus", "livehost", "reflect", "unit", "browser", "certification", "dev"];

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
  const index = large_frozen_test_evidence_inventory_fixture();
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
  const projection = project_frozen_test_explorer(decode_frozen_test_evidence_index(index, index.deployment.hsonDeployCommit));
  return { index, projection, artifacts, ordinary, transformer, browserCase, opaque: semantic[2], certification: certification[0], noEvidence: semantic[3].cases[1] };
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
  const suiteId = caseId.slice(0, caseId.lastIndexOf("::"));
  const suite = page.locator(`[data-frozen-suite="${suiteId}"]`);
  const category = suite.locator("xpath=ancestor::details[@data-frozen-category]");
  if (await category.getAttribute("open") === null) await category.locator(":scope > summary").click();
  if (await suite.getAttribute("open") === null) await suite.locator(":scope > summary").click();
  await expect(row).toBeVisible();
}

test("localhost application mount loads one immutable frozen index without browser execution", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page);
  const requests: string[] = [];
  let webSockets = 0;
  const fixture = large_frozen_test_evidence_inventory_fixture();
  const decoded = decode_frozen_test_evidence_index(fixture, fixture.deployment.hsonDeployCommit);
  const projection = project_frozen_test_explorer(decoded);
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
      return;
    }
    await route.fulfill({ status: 500, body: "lazy evidence must not be fetched initially" });
  });

  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await expect(page.locator("#frozen-test-panel-fixture")).toHaveAttribute("data-fixture-state", "ready");
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");
  await expect(panel).toHaveAttribute("data-frozen-category-count", String(decoded.categories.length));
  await expect(panel).toHaveAttribute("data-frozen-suite-count", String(projection.overall.suites));
  await expect(panel).toHaveAttribute("data-frozen-case-count", String(projection.overall.cases));
  await expect(panel).toHaveAttribute("data-frozen-index-requests", "1");
  await expect(panel).toHaveAttribute("data-frozen-initial-evidence-requests", "0");
  await expect(page.getByTestId("frozen-test-summary")).toContainText(`${projection.overall.suites} suites · ${projection.overall.cases} cases · ${projection.overall.pass} pass · ${projection.overall.fail} fail · aaaaaaaaaa`);
  await expect(page.getByTestId("frozen-test-summary")).not.toContainText("frozen");
  await expect.poll(() => page.locator("[data-frozen-category]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-frozen-category")))).toEqual(EXPLORER_CATEGORIES);
  await expect(page.getByTestId("frozen-category-semantic")).toHaveCount(0);
  for (const categoryId of EXPLORER_CATEGORIES) {
    const totals = projection.categories[categoryId as keyof typeof projection.categories];
    await expect(page.getByTestId(`frozen-category-${categoryId}`)).toContainText(`${totals.suites} suites · ${totals.cases} cases · ${totals.pass} pass · ${totals.fail} fail`);
  }
  await expect(page.getByTestId("frozen-suite-row")).toHaveCount(projection.overall.suites);
  await expect(page.getByTestId("frozen-case-row")).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-frozen-rendered-case-count", "0");
  await expect(page.locator('[data-frozen-suite="transform/suite-000"]')).toContainText("transform representative suite 0");
  for (const categoryId of EXPLORER_CATEGORIES) {
    await expect(page.getByTestId(`frozen-category-${categoryId}`)).not.toHaveAttribute("open", "");
  }
  const firstSuite = page.locator('[data-frozen-suite="transform/suite-000"]');
  const firstCase = page.locator('[data-frozen-case="transform/suite-000::case-001"]');
  const firstDisclosure = firstSuite.getByTestId("frozen-suite-disclosure");
  await expect(firstSuite).toHaveAttribute("data-frozen-expandable", "true");
  await expect(firstSuite.locator(":scope > summary")).toHaveCount(1);
  await expect(firstDisclosure).toHaveCount(1);
  await expect(firstSuite).not.toHaveAttribute("open", "");
  await expect(firstCase).toHaveCount(0);
  await page.getByTestId("frozen-category-transform").locator(":scope > summary").click();
  await expect(firstSuite.getByTestId("frozen-suite-row")).toBeVisible();
  await expect(firstCase).toHaveCount(0);
  const closedTransform = await firstDisclosure.evaluate((node) => getComputedStyle(node).transform);
  await firstSuite.getByTestId("frozen-suite-row").focus();
  await firstSuite.getByTestId("frozen-suite-row").press("Enter");
  await expect(firstSuite).toHaveAttribute("open", "");
  await expect(firstCase).toBeVisible();
  await expect(firstCase).toContainText("PASS");
  const firstSuiteCaseCount = decoded.suites.find((suite) => suite.id === "transform/suite-000")!.cases.length;
  await expect(panel).toHaveAttribute("data-frozen-rendered-case-count", String(firstSuiteCaseCount));
  await expect.poll(() => firstDisclosure.evaluate((node) => getComputedStyle(node).transform)).not.toBe(closedTransform);
  await firstSuite.getByTestId("frozen-suite-row").press("Enter");
  await expect(firstSuite).not.toHaveAttribute("open", "");
  await expect(firstCase).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-frozen-rendered-case-count", "0");
  await expect(page.getByTestId("frozen-case-row")).toHaveCount(0);
  const nonExpandableSuite = page.locator('[data-frozen-suite="certification/suite-000"]');
  await expand_category(page, "certification");
  await expect(nonExpandableSuite).toHaveAttribute("data-frozen-expandable", "false");
  await expect(nonExpandableSuite.locator(":scope > summary")).toHaveCount(0);
  await expect(nonExpandableSuite.getByTestId("frozen-suite-disclosure")).toHaveCount(0);
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

test("valid frozen fixture mounts with derived category and overall totals", async ({ page }) => {
  const fixture = large_frozen_test_evidence_inventory_fixture();
  const decoded = decode_frozen_test_evidence_index(fixture, fixture.deployment.hsonDeployCommit);
  const candidates = decoded.suites.map((suite) => frozen_test_explorer_category_candidates(suite));
  const suiteCount = decoded.suites.length;
  expect(suiteCount).toBeGreaterThan(0);
  expect(candidates.filter((candidate) => candidate.length === 1)).toHaveLength(suiteCount);
  expect(candidates.filter((candidate) => candidate.length === 0)).toHaveLength(0);
  expect(candidates.filter((candidate) => candidate.length > 1)).toHaveLength(0);
  const projection = project_frozen_test_explorer(decoded);
  const independentlySummed = Object.fromEntries(EXPLORER_CATEGORIES.map((categoryId) => {
    const suites = decoded.suites.filter((suite) => frozen_test_explorer_category(suite) === categoryId);
    return [categoryId, {
      suites: suites.length,
      cases: suites.reduce((total, suite) => total + suite.counts.total, 0),
      pass: suites.reduce((total, suite) => total + suite.counts.passed, 0),
      fail: suites.reduce((total, suite) => total + suite.counts.failed, 0),
      skip: suites.reduce((total, suite) => total + suite.counts.skipped, 0),
      unsupported: suites.reduce((total, suite) => total + suite.counts.unsupported, 0),
      cancelled: suites.reduce((total, suite) => total + suite.counts.cancelled, 0),
    }];
  }));
  expect(projection.categories).toEqual(independentlySummed);
  expect(projection.overall).toEqual(Object.values(projection.categories).reduce((total, category) => ({
    suites: total.suites + category.suites,
    cases: total.cases + category.cases,
    pass: total.pass + category.pass,
    fail: total.fail + category.fail,
    skip: total.skip + category.skip,
    unsupported: total.unsupported + category.unsupported,
    cancelled: total.cancelled + category.cancelled,
  }), { suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 0 }));
  let indexRequests = 0;
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/index.json`, async (route) => {
    indexRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
  });
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence-root=${encodeURIComponent(FROZEN_TEST_EVIDENCE_ROOT)}`);
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");
  await expect(panel).toHaveAttribute("data-frozen-suite-count", String(suiteCount));
  await expect(panel).toHaveAttribute("data-frozen-case-count", String(projection.overall.cases));
  await expect.poll(() => page.locator("[data-frozen-category]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-frozen-category")))).toEqual(EXPLORER_CATEGORIES);
  await expect(page.getByTestId("frozen-test-summary")).toContainText(`${projection.overall.suites} suites · ${projection.overall.cases} cases · ${projection.overall.pass} pass · ${projection.overall.fail} fail`);
  for (const categoryId of EXPLORER_CATEGORIES) {
    const totals = projection.categories[categoryId as keyof typeof projection.categories];
    await expect(page.getByTestId(`frozen-category-${categoryId}`)).toContainText(`${totals.suites} suites · ${totals.cases} cases · ${totals.pass} pass · ${totals.fail} fail`);
  }
  await expect(page.getByTestId("frozen-category-certification")).toContainText(
    projection.categories.certification.suites === 0 ? "UNEXECUTED" : "PASS",
  );
  expect(indexRequests).toBe(1);
});

test("frozen explorer accents come from the shared vibrant palette", async () => {
  const sources = [
    readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/mount-tp-frozen.ts"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/frozen-test-presentation.ts"), "utf8"),
  ].join("\n");
  expect(sources).toContain("OKLCH_VIBRANT.cyanGlass");
  expect(sources).toContain("OKLCH_VIBRANT.fernStatic");
  expect(sources).toContain("OKLCH_VIBRANT.redSignal");
  expect(sources).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|oklch\(/i);
  expect(Object.values(OKLCH_VIBRANT)).toContain(OKLCH_VIBRANT.cyanGlass);
});

test("test report explorer uses report-loading terminology", async ({ page }) => {
  const fixture = large_frozen_test_evidence_inventory_fixture();
  let releaseIndex: (() => void) | undefined;
  const indexHeld = new Promise<void>((resolve) => { releaseIndex = resolve; });
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/index.json`, async (route) => {
    await indexHeld;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await expect(page.getByTestId("frozen-test-panel")).toContainText("Loading test reports…");
  releaseIndex?.();
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-panel-state", "ready");
});

test("frozen case inspector URL supports Back, Forward, refresh, and direct reopening", async ({ page }) => {
  const fixture = interactive_inventory();
  const requests: string[] = [];
  await route_inventory(page, fixture.index, fixture.artifacts, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await reveal_case(page, fixture.ordinary.id);
  await reveal_case(page, fixture.transformer.id);
  const explorerUrl = page.url();
  const ordinaryRow = page.locator(`[data-frozen-case="${fixture.ordinary.id}"]`);
  const transformerRow = page.locator(`[data-frozen-case="${fixture.transformer.id}"]`);

  await ordinaryRow.getByRole("button", { name: /Open evidence/ }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByTestId("hosted-case-report")).toBeVisible();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("frozen-inspector-navigation")).toContainText("Browser Back returns to the tests explorer");
  const ordinaryInspectorUrl = new URL(page.url());
  expect(ordinaryInspectorUrl.searchParams.get("evidence")).toBe(fixture.index.deployment.hsonDeployCommit);
  expect(ordinaryInspectorUrl.searchParams.get("case")).toBe(fixture.ordinary.id);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "1");

  await transformerRow.getByRole("button", { name: /Open evidence/ }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.transformer.id);
  await expect(page.getByTestId("hosted-case-report")).not.toContainText("ordinary retained assertion");
  const transformerInspectorUrl = new URL(page.url());
  expect(transformerInspectorUrl.searchParams.get("case")).toBe(fixture.transformer.id);
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "1");

  await page.goBack();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.ordinary.id);
  await page.goBack();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "0");
  expect(page.url()).toBe(explorerUrl);
  await expect(ordinaryRow).toBeVisible();

  await page.goForward();
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.ordinary.id);
  await page.goForward();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.transformer.id);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(5);

  await page.reload();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.transformer.id);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(6);

  await page.goto(`/${transformerInspectorUrl.search}`);
  await expect(page.locator("#stage")).toHaveAttribute("data-app-phase", "demo-ready");
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "test");
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", fixture.transformer.id);
  await page.locator("#parse-button").click();
  await expect(page.locator("#screen")).toHaveAttribute("data-shell-current-main", "parse");
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "0");
  expect(new URL(page.url()).searchParams.has("case")).toBe(false);
});

test("frozen row clickable names, Copy, and Copy Reports use validated lazy artifacts and truthful controls", async ({ page, context }) => {
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
  const expectedOrdinarySize = fixture.ordinary.evidence.rawBytes < 1_000
    ? `${fixture.ordinary.evidence.rawBytes} B`
    : `${(fixture.ordinary.evidence.rawBytes / 1_000).toFixed(1)} kB`;
  await expect(ordinaryRow.getByTestId("frozen-evidence-size")).toHaveText(expectedOrdinarySize);
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  await expect(ordinaryRow.getByRole("button", { name: /Open evidence/ })).toContainText(fixture.ordinary.title);
  await expect(ordinaryRow.getByText("View", { exact: true })).toHaveCount(0);
  await ordinaryRow.getByRole("button", { name: /Open evidence/ }).focus();
  await ordinaryRow.getByRole("button", { name: /Open evidence/ }).press("Enter");
  await expect(page.getByTestId("hosted-case-report")).toContainText("ordinary retained assertion");
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-frozen-retained-row-artifacts", "0");
  await ordinaryRow.getByRole("button", { name: /Copy evidence/ }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("ordinary retained assertion");
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(2);
  await expect(panel).toHaveAttribute("data-frozen-retained-row-artifacts", "0");

  const transformerRow = page.locator(`[data-frozen-case="${fixture.transformer.id}"]`);
  await reveal_case(page, fixture.transformer.id);
  await transformerRow.getByRole("button", { name: /Open evidence/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toContainText("retained transformation route");
  await expect(page.getByTestId("hosted-case-report")).toContainText("retained transform circuit");
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(0);

  const browserRow = page.locator(`[data-frozen-case="${fixture.browserCase.id}"]`);
  await reveal_case(page, fixture.browserCase.id);
  await browserRow.getByRole("button", { name: /Open evidence/ }).click();
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("retained browser journey output");
  await page.getByRole("button", { name: "Close evidence" }).click();

  for (const suite of [fixture.opaque, fixture.certification]) {
    const row = page.locator(`[data-frozen-suite="${suite.id}"]`).getByTestId("frozen-suite-row");
    const category = row.locator("xpath=ancestor::details[@data-frozen-category]");
    if (await category.getAttribute("open") === null) await category.locator(":scope > summary").click();
    await expect(row.getByRole("button", { name: /Open evidence/ })).toContainText(suite.id);
    await row.getByRole("button", { name: /Open evidence/ }).click();
    await expect(page.getByTestId("frozen-row-evidence")).toContainText(suite === fixture.opaque ? "retained opaque process evidence" : "retained certification evidence");
    await page.getByRole("button", { name: "Close evidence" }).click();
  }

  const absent = page.locator(`[data-frozen-case="${fixture.noEvidence.id}"]`);
  await reveal_case(page, fixture.noEvidence.id);
  await expect(absent.getByRole("button", { name: /Open evidence|Copy evidence/ })).toHaveCount(0);
  await expect(absent.getByTestId("frozen-row-actions")).toHaveCount(0);
  const ordinaryActionX = await ordinaryRow.getByTestId("frozen-row-actions").evaluate((node) => node.getBoundingClientRect().x);
  const transformerActionX = await transformerRow.getByTestId("frozen-row-actions").evaluate((node) => node.getBoundingClientRect().x);
  expect(transformerActionX).toBe(ordinaryActionX);
  await expect(ordinaryRow.getByTestId("frozen-row-actions").locator(":scope > *").first()).toHaveText("Copy");
  const suiteRow = page.locator(`[data-frozen-suite="${fixture.opaque.id}"]`).getByTestId("frozen-suite-row");
  await expect(suiteRow.getByTestId("frozen-row-actions").locator(":scope > *").first()).toHaveText("Copy");
  const suiteActionX = await suiteRow.getByTestId("frozen-row-actions").evaluate((node) => node.getBoundingClientRect().x);
  expect(suiteActionX).toBe(ordinaryActionX);
  await expect(suiteRow.getByText("PASS", { exact: true })).toHaveCount(0);
  const suiteMetrics = suiteRow.locator(".frozen-test-row-summary > span");
  await expect(suiteMetrics).toHaveCount(4);
  await expect(suiteMetrics.nth(0)).toHaveText(`${fixture.opaque.counts.passed} pass`);
  await expect(suiteMetrics.nth(1)).toHaveText(`${fixture.opaque.counts.failed} fail`);
  await expect(suiteMetrics.nth(2)).toHaveText(`${fixture.opaque.counts.skipped} skip`);
  expect(await suiteMetrics.nth(0).evaluate((node) => getComputedStyle(node).textAlign)).toBe("right");
  expect(await suiteMetrics.nth(1).evaluate((node) => getComputedStyle(node).textAlign)).toBe("right");
  expect(await suiteMetrics.nth(2).evaluate((node) => getComputedStyle(node).textAlign)).toBe("right");
  await expect(ordinaryRow.getByText("PASS", { exact: true })).toHaveCount(1);
  expect(await suiteRow.locator(".frozen-test-row-summary").evaluate((node) => getComputedStyle(node).gridTemplateColumns))
    .toBe(await ordinaryRow.locator(".frozen-test-case-summary").evaluate((node) => getComputedStyle(node).gridTemplateColumns));
  const suiteNameX = await suiteRow.locator(".frozen-test-suite-identity").evaluate((node) => node.getBoundingClientRect().x);
  const caseNameX = await ordinaryRow.locator(".frozen-test-case-identity").evaluate((node) => node.getBoundingClientRect().x);
  expect(suiteNameX).toBe(caseNameX);
  const expandableWithoutEvidence = page.locator(`[data-frozen-suite="${fixture.ordinary.id.split("::")[0]}"]`).getByTestId("frozen-suite-row");
  await expect(expandableWithoutEvidence.getByTestId("frozen-row-actions")).toHaveCount(0);
  const expandableNameX = await expandableWithoutEvidence.locator(".frozen-test-suite-identity").evaluate((node) => node.getBoundingClientRect().x);
  expect(expandableNameX).toBeLessThan(caseNameX);
  const beforeReports = [...requests];
  await page.getByTestId("frozen-copy-reports").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Test reports");
  const summary = await page.evaluate(() => navigator.clipboard.readText());
  expect(summary).toContain(fixture.ordinary.id);
  const certification = fixture.projection.categories.certification;
  expect(summary).toContain(`CERTIFICATION · PASS · ${certification.suites} suites · ${certification.cases} cases · ${certification.pass} pass · ${certification.fail} fail`);
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
  await row.getByRole("button", { name: /Open evidence/ }).click();
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
