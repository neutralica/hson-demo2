import { expect, test } from "./livehost-browser-test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OKLCH_VIBRANT } from "../../../src/app/core/consts/oklch.consts";
import { FROZEN_TEST_EVIDENCE_ROOT, FROZEN_TEST_EVIDENCE_RUN_ID, frozen_test_evidence_package_fixture } from "../../fixtures/app/frozen-test-evidence-index";
import { monitor_application_errors } from "./app-test-support";

async function routePackage(page: Page, requests: string[], mutate?: (relative: string, body: string) => string) {
  const fixture = frozen_test_evidence_package_fixture();
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname === `${FROZEN_TEST_EVIDENCE_ROOT}/index.json`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1), body = fixture.artifacts.get(relative);
    return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, contentType: relative.endsWith(".json") ? "application/json" : "text/plain", body: mutate?.(relative, body) ?? body });
  });
  return fixture;
}

test("Tests opens an immutable direct report index only and remains static-only", async ({ page }) => {
  const noErrors = monitor_application_errors(page), requests: string[] = [];
  const fixture = await routePackage(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");
  await expect(page.locator("[data-frozen-category]")).toHaveCount(5);
  expect(await page.locator("[data-frozen-category]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-frozen-category")))).toEqual(["transform", "unit", "livehost", "browser", "infrastructure"]);
  await expect(page.getByTestId("frozen-suite-row")).toHaveCount(0);
  await expect(page.getByTestId("frozen-test-summary")).toContainText(`${fixture.index.totals.suites} suites · ${fixture.index.totals.cases} cases`);
  await expect(page.getByTestId("frozen-test-summary")).toContainText("ERROR");
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  await expect(panel).toHaveAttribute("data-hosted-execution-count", "0");
  await expect(page.getByRole("button", { name: /run|execute|certif/i })).toHaveCount(0);
  noErrors();
});

test("category suite case disclosures fetch and release exactly their level", async ({ page }) => {
  const requests: string[] = []; await routePackage(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform");
  await category.locator(":scope > summary").click();
  await expect(category.getByTestId("frozen-suite-row")).toHaveCount(1);
  expect(requests.filter(path => path.includes("/categories/"))).toHaveLength(1);
  expect(requests.filter(path => path.includes("/suites/"))).toHaveLength(0);
  const suite = page.locator('[data-frozen-suite="transform/direct-report"]');
  await suite.locator(":scope > summary").click();
  const row = page.locator('[data-frozen-case="transform/direct-report::assertion-failure"]');
  await expect(row).toBeVisible();
  expect(requests.filter(path => path.includes("/suites/"))).toHaveLength(1);
  expect(requests.filter(path => path.includes("/cases/"))).toHaveLength(0);
  await row.getByRole("button", { name: /Open evidence/ }).click();
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("expected direct report");
  expect(requests.filter(path => path.includes("/cases/"))).toHaveLength(1);
  await page.getByRole("button", { name: "Close case report" }).click();
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "0");
  await suite.locator(":scope > summary").click(); await expect(row).toHaveCount(0);
  await category.locator(":scope > summary").click(); await expect(category.getByTestId("frozen-suite-row")).toHaveCount(0);
});

test("failed cancelled unsupported and infrastructure-error reports remain browsable", async ({ page }) => {
  const requests: string[] = []; await routePackage(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  for (const [category, status] of [["transform", "FAIL"], ["unit", "SKIP"], ["livehost", "UNSUPPORTED"], ["browser", "CANCELLED"], ["infrastructure", "ERROR"]] as const) {
    const group = page.getByTestId(`frozen-category-${category}`);
    await expect(group.locator(":scope > summary")).toContainText(status);
    await group.locator(":scope > summary").click(); await expect(group.getByTestId("frozen-suite-row")).toHaveCount(1); await group.locator(":scope > summary").click();
  }
  await page.getByTestId("frozen-category-infrastructure").locator(":scope > summary").click();
  const suite = page.locator('[data-frozen-suite="infrastructure/worker"]'); await suite.locator(":scope > summary").click();
  const row = page.locator('[data-frozen-case="infrastructure/worker::startup"]'); await row.getByRole("button", { name: /Open evidence/ }).click();
  await expect(page.getByTestId("frozen-row-evidence-text")).toContainText("private attachment omitted");
  await expect(page.getByTestId("frozen-row-evidence-text")).toContainText("truncated");
  await expect(page.getByTestId("frozen-public-attachments")).toContainText("public log");
});

test("direct category suite and case URLs use logical IDs and report relationships", async ({ page }) => {
  const requests: string[] = []; await routePackage(page, requests);
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence=${FROZEN_TEST_EVIDENCE_RUN_ID}&category=transform`);
  await expect(page.getByTestId("frozen-category-transform")).toHaveAttribute("open", "");
  expect(requests.map(path => path.split("/").at(-2))).toEqual([FROZEN_TEST_EVIDENCE_RUN_ID, "categories"]);
  requests.length = 0;
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence=${FROZEN_TEST_EVIDENCE_RUN_ID}&category=transform&suite=${encodeURIComponent("transform/direct-report")}`);
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("transform/direct-report");
  expect(requests.map(path => path.split("/").at(-2))).toEqual([FROZEN_TEST_EVIDENCE_RUN_ID, "categories", "suites"]);
  requests.length = 0;
  const caseId = "transform/direct-report::assertion-failure";
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence=${FROZEN_TEST_EVIDENCE_RUN_ID}&category=transform&case=${encodeURIComponent(caseId)}`);
  await expect(page.getByTestId("frozen-row-evidence")).toContainText(caseId);
  expect(requests.map(path => path.split("/").at(-2))).toEqual([FROZEN_TEST_EVIDENCE_RUN_ID, "categories", "suites", "cases"]);
});

test("late category response cannot resurrect released UI", async ({ page }) => {
  const fixture = frozen_test_evidence_package_fixture(), requests: string[] = []; let releaseCategory: () => void = () => {};
  const held = new Promise<void>(resolve => { releaseCategory = resolve; });
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname; requests.push(pathname);
    if (pathname.endsWith("index.json")) return route.fulfill({ status: 200, body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1); if (relative === fixture.index.categories[0].file) await held;
    const body = fixture.artifacts.get(relative); return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, body });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform"); await category.locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-category-loading")).toBeVisible(); await category.locator(":scope > summary").click(); releaseCategory();
  await expect(category).toHaveAttribute("data-frozen-category-state", "closed"); await expect(category.getByTestId("frozen-suite-row")).toHaveCount(0);
});

test("late suite response cannot resurrect disposed case rows", async ({ page }) => {
  const fixture = frozen_test_evidence_package_fixture(); let releaseSuite: () => void = () => {};
  const held = new Promise<void>(resolve => { releaseSuite = resolve; });
  const suiteRef = fixture.suites.find(suite => suite.id === "transform/direct-report")!;
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("index.json")) return route.fulfill({ status: 200, body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1); if (relative === suiteRef.file) await held;
    const body = fixture.artifacts.get(relative); return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, body });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform"); await category.locator(":scope > summary").click();
  const suite = page.locator('[data-frozen-suite="transform/direct-report"]'); await suite.locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-suite-loading")).toBeVisible(); await suite.locator(":scope > summary").click(); releaseSuite();
  await expect(suite).toHaveAttribute("data-frozen-suite-state", "closed"); await expect(suite.getByTestId("frozen-case-row")).toHaveCount(0);
});

test("late case response is ignored after inspector navigation and only one detail is retained", async ({ page }) => {
  const fixture = frozen_test_evidence_package_fixture(); let releaseFirst: () => void = () => {};
  const held = new Promise<void>(resolve => { releaseFirst = resolve; });
  const firstPath = "cases/transform-direct-report-loads-index.json";
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("index.json")) return route.fulfill({ status: 200, body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1); if (relative === firstPath) await held;
    const body = fixture.artifacts.get(relative); return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, body });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await page.getByTestId("frozen-category-transform").locator(":scope > summary").click();
  await page.locator('[data-frozen-suite="transform/direct-report"] > summary').click();
  await page.locator('[data-frozen-case="transform/direct-report::loads-index"] [data-frozen-action="view"]').click();
  await page.locator('[data-frozen-case="transform/direct-report::assertion-failure"] [data-frozen-action="view"]').click();
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("assertion-failure"); releaseFirst();
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("assertion-failure");
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "1");
});

test("malformed category remains localized", async ({ page }) => {
  const requests: string[] = []; await routePackage(page, requests, (relative, body) => relative.startsWith("categories/transform") ? "{}" : body);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html"); await page.getByTestId("frozen-category-transform").locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-category-error")).toContainText("could not be loaded"); await expect(page.getByTestId("frozen-category-livehost")).toBeVisible();
});

test("frozen explorer accents remain shared palette values", async () => {
  const sources = [readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/mount-tp-frozen.ts"), "utf8"), readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/frozen-test-presentation.ts"), "utf8")].join("\n");
  expect(sources).toContain("OKLCH_VIBRANT.cyanGlass"); expect(sources).toContain("OKLCH_VIBRANT.fernStatic"); expect(sources).toContain("OKLCH_VIBRANT.redSignal");
  expect(sources).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|oklch\(/i); expect(Object.values(OKLCH_VIBRANT)).toContain(OKLCH_VIBRANT.cyanGlass);
});
