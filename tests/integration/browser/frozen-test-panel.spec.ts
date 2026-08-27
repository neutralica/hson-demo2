import { expect, test } from "./livehost-browser-test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OKLCH_VIBRANT } from "../../../src/app/core/consts/oklch.consts";
import { FROZEN_TEST_EVIDENCE_ROOT, frozen_test_evidence_package_fixture } from "../../fixtures/app/frozen-test-evidence-index";
import { monitor_application_errors } from "./app-test-support";

const EXPLORER_CATEGORIES = ["transform", "livetree", "livemap", "locus", "livehost", "reflect", "unit", "browser", "certification"];

async function route_package(page: Page, requests: string[], mutate?: (relative: string, body: string) => string): Promise<ReturnType<typeof frozen_test_evidence_package_fixture>> {
  const fixture = frozen_test_evidence_package_fixture();
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname === `${FROZEN_TEST_EVIDENCE_ROOT}/index.json`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1);
    const body = fixture.artifacts.get(relative);
    return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, contentType: "application/json", body: mutate?.(relative, body) ?? body });
  });
  return fixture;
}

test("Tests open fetches root and materializes category rows only", async ({ page }) => {
  const assertNoErrors = monitor_application_errors(page); const requests: string[] = []; const fixture = await route_package(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const panel = page.getByTestId("frozen-test-panel");
  await expect(panel).toHaveAttribute("data-frozen-panel-state", "ready");
  await expect.poll(() => page.locator("[data-frozen-category]").count()).toBe(9);
  await expect.poll(() => page.locator("[data-frozen-category]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-frozen-category")))).toEqual(EXPLORER_CATEGORIES);
  await expect(page.getByTestId("frozen-suite-row")).toHaveCount(0);
  await expect(page.getByTestId("frozen-case-row")).toHaveCount(0);
  await expect(panel).toHaveAttribute("data-frozen-suite-count", "0");
  await expect(panel).toHaveAttribute("data-frozen-rendered-case-count", "0");
  await expect(page.getByTestId("frozen-test-summary")).toContainText(`${fixture.index.overall.suites} suites · ${fixture.index.overall.cases} cases`);
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  assertNoErrors();
});

test("category, suite, and case disclosures fetch and release exactly their owned level", async ({ page }) => {
  const requests: string[] = []; const fixture = await route_package(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform");
  await category.locator(":scope > summary").click();
  await expect(category.getByTestId("frozen-suite-row")).toHaveCount(1);
  expect(requests.filter((path) => path.includes("/categories/"))).toHaveLength(1);
  expect(requests.filter((path) => path.includes("/suites/"))).toHaveLength(0);
  const suite = page.locator('[data-frozen-suite="transform/frozen-client"]');
  await suite.locator(":scope > summary").click();
  const caseId = "transform/frozen-client::loads-index";
  const row = page.locator(`[data-frozen-case="${caseId}"]`);
  await expect(row).toBeVisible();
  expect(requests.filter((path) => path.includes("/suites/"))).toHaveLength(1);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(0);
  await row.getByRole("button", { name: /Open evidence/ }).click();
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", caseId);
  expect(requests.filter((path) => path.includes("/cases/"))).toHaveLength(1);
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-retained-row-artifacts", "0");
  await suite.locator(":scope > summary").click();
  await expect(suite).not.toHaveAttribute("open", "");
  await expect(row).toHaveCount(0);
  await expect(page.getByTestId("frozen-test-panel")).toHaveAttribute("data-frozen-rendered-case-count", "0");
  await category.locator(":scope > summary").click();
  await expect(category.getByTestId("frozen-suite-row")).toHaveCount(0);
  await category.locator(":scope > summary").click();
  await expect(category).toHaveAttribute("open", "");
  await expect.poll(() => requests.filter((path) => path.includes("/categories/")).length).toBe(2);
  await expect(category.getByTestId("frozen-suite-row")).toHaveCount(1);
  expect(requests.filter((path) => path.includes("/categories/"))).toHaveLength(2);
  expect(fixture.index.categories.find((entry: any) => entry.id === "transform").counts.suites).toBe(1);
});

test("every frozen final report exclusively owns the inspector viewport", async ({ page }) => {
  const requests: string[] = []; await route_package(page, requests);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const panel = page.getByTestId("frozen-test-panel");
  const browsing = page.getByTestId("frozen-test-browsing");
  const category = page.getByTestId("frozen-category-transform");
  await category.locator(":scope > summary").click();
  const suite = page.locator('[data-frozen-suite="transform/frozen-client"]');
  await suite.locator(":scope > summary").click();
  const caseA = "transform/frozen-client::loads-index";
  const caseB = "transform/frozen-client::releases-detail";
  const rowA = page.locator(`[data-frozen-case="${caseA}"]`);
  const rowB = page.locator(`[data-frozen-case="${caseB}"]`);
  await expect(rowB).toBeVisible();
  await browsing.evaluate((element) => {
    element.style.height = "320px";
    const spacer = document.createElement("div");
    spacer.style.height = "1600px";
    element.append(spacer);
    element.scrollTop = 500;
  });
  await expect.poll(() => browsing.evaluate((element) => element.scrollTop)).toBe(500);

  await page.evaluate((id) => document.querySelector<HTMLButtonElement>(`[data-frozen-case="${id}"] [data-frozen-action="view"]`)?.click(), caseA);
  const report = page.getByTestId("hosted-case-report");
  await expect(report).toHaveAttribute("data-case-key", caseA);
  await expect(panel).toHaveAttribute("data-frozen-inspector-state", "open");
  await expect(panel).toHaveCSS("overflow", "hidden");
  const reportScroll = report.locator('[data-frozen-report-scroll="true"]');
  await expect.poll(() => reportScroll.evaluate((element) => element.scrollTop)).toBe(0);
  await reportScroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await page.evaluate(() => {
    const reportNode = document.querySelector('[data-testid="hosted-case-report"]');
    const bounds = reportNode?.getBoundingClientRect();
    const point = bounds === undefined ? null : document.elementFromPoint(bounds.left + (bounds.width / 2), bounds.bottom - 8);
    return reportNode?.contains(point) ?? false;
  })).toBe(true);
  expect(await browsing.evaluate((element) => element.scrollTop)).toBe(500);

  await page.evaluate((id) => document.querySelector<HTMLButtonElement>(`[data-frozen-case="${id}"] [data-frozen-action="view"]`)?.click(), caseB);
  await expect(report).toHaveAttribute("data-case-key", caseB);
  await expect(page.getByTestId("hosted-case-report")).toHaveCount(1);
  await expect(panel).toHaveAttribute("data-frozen-retained-row-artifacts", "1");
  expect(requests.filter((path) => path.includes("/categories/")).length).toBe(1);
  expect(requests.filter((path) => path.includes("/suites/")).length).toBe(1);
  expect(requests.filter((path) => path.includes("/cases/")).length).toBe(2);

  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(report).toHaveAttribute("data-case-key", caseA);
  await expect(panel).toHaveAttribute("data-frozen-retained-row-artifacts", "1");
  await page.getByRole("button", { name: "Close case evidence" }).click();
  await expect(report).toHaveCount(0);
  await expect(rowA).toBeVisible();
  expect(await browsing.evaluate((element) => element.scrollTop)).toBe(500);
  await expect(panel).toHaveAttribute("data-frozen-retained-row-artifacts", "0");

  await page.getByTestId("frozen-category-certification").locator(":scope > summary").click();
  await page.getByRole("button", { name: "Open evidence for Frozen acquisition certified" }).click();
  await expect(page.getByTestId("frozen-row-evidence")).toBeVisible();
  await expect(page.getByTestId("frozen-row-evidence-text")).toHaveAttribute("data-frozen-report-scroll", "true");
  await expect(panel).toHaveCSS("overflow", "hidden");
});

test("direct suite and case URLs traverse only their owning hierarchy", async ({ page }) => {
  const requests: string[] = []; const fixture = await route_package(page, requests);
  const commit = fixture.index.deployment.hsonDeployCommit;
  const panel = page.getByTestId("frozen-test-panel");
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence=${commit}&suite=${encodeURIComponent("verification/frozen-acquisition")}`);
  await expect(page.getByTestId("frozen-row-evidence")).toContainText("retained certification evidence");
  await expect(panel).toHaveCSS("overflow", "hidden");
  expect(requests.map((path) => path.split("/").at(-2))).toEqual([commit, "categories", "suites"]);
  requests.length = 0;
  await page.goto(`/tests/fixtures/browser/frozen-test-panel-fixture.html?evidence=${commit}&case=${encodeURIComponent("transform/frozen-client::loads-index")}`);
  await expect(page.getByTestId("hosted-case-report")).toHaveAttribute("data-case-key", "transform/frozen-client::loads-index");
  await expect(panel).toHaveCSS("overflow", "hidden");
  expect(requests.map((path) => path.split("/").at(-2))).toEqual([commit, "categories", "suites", "cases"]);
});

test("Copy Reports stays root-only and category failures remain localized", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const requests: string[] = []; await route_package(page, requests, (relative, body) => relative.startsWith("categories/") ? "{}" : body);
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  await page.getByTestId("frozen-copy-reports").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("TRANSFORM");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toContain("transform/frozen-client");
  expect(requests).toEqual([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]);
  await page.getByTestId("frozen-category-transform").locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-category-error")).toContainText("could not be loaded");
  await expect(page.getByTestId("frozen-category-browser")).toBeVisible();
});

test("a late category response cannot resurrect a closed disclosure", async ({ page }) => {
  const fixture = frozen_test_evidence_package_fixture();
  const transform = fixture.index.categories.find((entry: any) => entry.id === "transform");
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/index.json")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1);
    if (relative === transform.listing.path) { await held; return route.fulfill({ status: 200, contentType: "application/json", body: fixture.artifacts.get(relative)! }); }
    return route.fulfill({ status: 404, body: "missing" });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform");
  await category.locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-category-loading")).toBeVisible();
  await category.locator(":scope > summary").click();
  release?.();
  await expect(category).toHaveAttribute("data-frozen-category-state", "closed");
  await expect(category.getByTestId("frozen-suite-row")).toHaveCount(0);
});

test("a late suite response cannot resurrect disposed case rows", async ({ page }) => {
  const fixture = frozen_test_evidence_package_fixture();
  const transform = fixture.index.categories.find((entry: any) => entry.id === "transform");
  const transformSuite = fixture.suites.find((entry: any) => entry.categoryId === "transform")!;
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${FROZEN_TEST_EVIDENCE_ROOT}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/index.json")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.index) });
    const relative = pathname.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1);
    if (relative === transformSuite.listing.path) { await held; return route.fulfill({ status: 200, contentType: "application/json", body: fixture.artifacts.get(relative)! }); }
    const body = fixture.artifacts.get(relative);
    return route.fulfill(body === undefined ? { status: 404, body: "missing" } : { status: 200, contentType: "application/json", body });
  });
  await page.goto("/tests/fixtures/browser/frozen-test-panel-fixture.html");
  const category = page.getByTestId("frozen-category-transform");
  await category.locator(":scope > summary").click();
  const suite = page.locator('[data-frozen-suite="transform/frozen-client"]');
  await suite.locator(":scope > summary").click();
  await expect(page.getByTestId("frozen-suite-loading")).toBeVisible();
  await suite.locator(":scope > summary").click();
  release?.();
  await expect(suite).toHaveAttribute("data-frozen-suite-state", "closed");
  await expect(suite.getByTestId("frozen-case-row")).toHaveCount(0);
  expect(transform.listing.path).toContain("categories/");
});

test("frozen explorer accents remain shared palette values", async () => {
  const sources = [readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/mount-tp-frozen.ts"), "utf8"), readFileSync(resolve(process.cwd(), "src/app/demos/tests/panel/frozen-test-presentation.ts"), "utf8")].join("\n");
  expect(sources).toContain("OKLCH_VIBRANT.cyanGlass"); expect(sources).toContain("OKLCH_VIBRANT.fernStatic"); expect(sources).toContain("OKLCH_VIBRANT.redSignal");
  expect(sources).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|oklch\(/i); expect(Object.values(OKLCH_VIBRANT)).toContain(OKLCH_VIBRANT.cyanGlass);
});
