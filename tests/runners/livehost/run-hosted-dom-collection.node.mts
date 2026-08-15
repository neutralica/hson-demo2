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
  GENERATED_DOM_SURFACES,
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
const suiteCases = suites.reduce((total, suite) => total + suite.cases.length, 0);
expect_collection(new Set(suites.map((suite) => suite.suite)).size === suites.length, "canonical jsdom suite identities are unique");
expect_collection(new Set(suites.flatMap((suite) => suite.cases.map((testCase) => `${suite.suite}::${testCase.caseId}`))).size === suiteCases, "canonical jsdom case identities are unique");
expect_collection(new Set(JSDOM_HOSTED_DUPLICATE_CASE_KEYS).size === JSDOM_HOSTED_DUPLICATE_CASE_KEYS.length, "recorded repeated source declarations are unique identities");
if (!result.ok) originalLog(JSON.stringify(result.summary.failures, null, 2));
expect_collection(result.ok && result.summary.suites === suites.length && result.summary.cases === suiteCases && result.summary.pass === suiteCases && result.summary.fail === 0, "direct jsdom run passes every current canonical case");
expect_collection(HOSTED_JSDOM_SUITES.length === suites.length && count(HOSTED_JSDOM_SUITES) === suiteCases, "inventory matches the executable collection");
expect_collection(HOSTED_JSDOM_SUITES.every((entry) => suites.some((suite) => suite.suite === entry.suite && suite.cases.length === entry.cases)), "inventory suite IDs and case counts exactly match executable suites");
expect_collection(LAYOUT_REQUIRED_SUITES.length === 0 && count(LAYOUT_REQUIRED_SUITES) === 0, "no rendered CSS application remains synthetic-owned");
expect_collection(count(CANVAS_REQUIRED_SUITES) > 0, "pixel-readback canvas cases remain explicitly classified outside synthetic execution");
expect_collection(BROWSER_ONLY_SUITES.length === 0 && count(BROWSER_ONLY_SUITES) === 0, "runtime-bound behavioral cases are fully migrated");
const layoutCount = (status: (typeof HOSTED_DOM_LAYOUT_CASES)[number]["status"]) => HOSTED_DOM_LAYOUT_CASES.filter((entry) => entry.status === status).length;
expect_collection(new Set(HOSTED_DOM_LAYOUT_CASES.map((entry) => `${entry.suite}::${entry.caseId}`)).size === HOSTED_DOM_LAYOUT_CASES.length, "layout inventory identities are unique");
expect_collection(HOSTED_DOM_LAYOUT_CASES.every((entry) => suites.some((suite) => suite.suite === entry.suite && suite.cases.some((testCase) => testCase.caseId === entry.caseId))), "layout inventory points only at current executable cases");
expect_collection(layoutCount("DEFERRED_REAL_LAYOUT") === 0, "no rendered pseudo-element case remains synthetic-owned");
expect_collection(UNKNOWN_DOM_SUITES.length === 0 && count(UNKNOWN_DOM_SUITES) === 0, "no unexplained deterministic DOM discrepancy remains");
expect_collection(GENERATED_DOM_SURFACES.every((entry) => entry.seedEnvironment.length > 0 && entry.countEnvironment.length > 0 && entry.defaultCases > 0), "generated/fuzz surfaces retain explicit dynamic count controls outside canonical totals");
expect_collection(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined" && typeof CSS === "undefined", "direct run leaves no DOM globals");
originalLog(JSON.stringify({ suites: suites.length, cases: suiteCases, pass: result.summary.pass, initMs, geometryInstallMs, directMs, geometryCleanupMs, cleanupMs }));
