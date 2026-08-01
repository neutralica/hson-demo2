import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";
import type { RunResult } from "../../harness/core/test-contracts";
import { install_hosted_dom_geometry } from "../../harness/runtimes/dom/hosted-dom-geometry";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import {
  all_jsdom_hosted_test_suites,
  JSDOM_HOSTED_DUPLICATE_CASE_KEYS,
  run_jsdom_hosted_test_suites,
} from "../../harness/runtimes/dom/jsdom-hosted-test-suites";
import {
  CANVAS_REQUIRED_SUITES,
  BROWSER_ONLY_SUITES,
  GENERATED_DOM_ENTRIES,
  HOSTED_DOM_LAYOUT_CASES,
  HOSTED_JSDOM_SUITES,
  LAYOUT_REQUIRED_SUITES,
  UNKNOWN_DOM_SUITES,
} from "../../harness/runtimes/dom/hosted-dom-migration-inventory";

function expect_collection(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted DOM collection: ${message}`);
}

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
const initStarted = performance.now();
const measuredRuntime = install_hosted_dom_runtime();
const initMs = performance.now() - initStarted;
const cleanupStarted = performance.now();
measuredRuntime.dispose();
const cleanupMs = performance.now() - cleanupStarted;
const geometryDom = new JSDOM("<!doctype html><html><body></body></html>");
const geometryStarted = performance.now();
const measuredGeometry = install_hosted_dom_geometry(geometryDom.window);
const geometryInstallMs = performance.now() - geometryStarted;
const geometryCleanupStarted = performance.now();
measuredGeometry.dispose();
const geometryCleanupMs = performance.now() - geometryCleanupStarted;
geometryDom.window.close();
const started = performance.now();
let result: RunResult;
try {
  result = await run_jsdom_hosted_test_suites(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}
const directMs = performance.now() - started;
const suites = all_jsdom_hosted_test_suites();
const count = (entries: readonly Readonly<{ cases: number }>[]) => entries.reduce((total, entry) => total + entry.cases, 0);
expect_collection(suites.length === 78 && suites.reduce((total, suite) => total + suite.cases.length, 0) === 957, "canonical list is 78 suites / 957 unique cases");
expect_collection(JSDOM_HOSTED_DUPLICATE_CASE_KEYS.length === 2, "two repeated source declarations are recorded and executed once");
if (!result.ok) originalLog(JSON.stringify(result.summary.failures, null, 2));
expect_collection(result.ok && result.summary.suites === 78 && result.summary.cases === 957 && result.summary.pass === 957 && result.summary.fail === 0, "direct jsdom run passes every canonical case");
expect_collection(HOSTED_JSDOM_SUITES.length === 78 && count(HOSTED_JSDOM_SUITES) === 957, "inventory matches the executable collection");
expect_collection(LAYOUT_REQUIRED_SUITES.length === 0 && count(LAYOUT_REQUIRED_SUITES) === 0, "no rendered CSS application remains synthetic-owned");
expect_collection(CANVAS_REQUIRED_SUITES.length === 2 && count(CANVAS_REQUIRED_SUITES) === 4, "only four pixel-readback canvas cases remain deferred");
expect_collection(BROWSER_ONLY_SUITES.length === 0 && count(BROWSER_ONLY_SUITES) === 0, "runtime-bound behavioral cases are fully migrated");
const layoutCount = (status: (typeof HOSTED_DOM_LAYOUT_CASES)[number]["status"]) => HOSTED_DOM_LAYOUT_CASES.filter((entry) => entry.status === status).length;
expect_collection(HOSTED_DOM_LAYOUT_CASES.length === 57, "layout classification covers every deterministic case");
expect_collection(layoutCount("MIGRATED_NATIVE") === 51, "51 layout-inventory cases are native jsdom DOM/CSS state tests");
expect_collection(layoutCount("MIGRATED_RECT_INJECTION") === 4, "four cases use explicit rectangle geometry");
expect_collection(layoutCount("MIGRATED_OBSERVER_SHIM") === 0, "no layout case requires a ResizeObserver shim");
expect_collection(layoutCount("MIGRATED_SVG_INJECTION") === 2, "two SVG cases use explicit bbox geometry");
expect_collection(layoutCount("DEFERRED_REAL_LAYOUT") === 0, "no rendered pseudo-element case remains synthetic-owned");
expect_collection(UNKNOWN_DOM_SUITES.length === 0 && count(UNKNOWN_DOM_SUITES) === 0, "no unexplained deterministic DOM discrepancy remains");
expect_collection(count(GENERATED_DOM_ENTRIES) === 250, "generated/fuzz entries remain outside canonical totals");
expect_collection(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined" && typeof CSS === "undefined", "direct run leaves no DOM globals");
originalLog(JSON.stringify({ suites: 78, cases: 957, pass: result.summary.pass, initMs, geometryInstallMs, directMs, geometryCleanupMs, cleanupMs }));
