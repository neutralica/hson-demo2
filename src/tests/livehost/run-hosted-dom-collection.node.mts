import { performance } from "node:perf_hooks";
import type { RunResult } from "../../app/demos/test/tests.types";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";
import {
  all_jsdom_hosted_test_suites,
  JSDOM_HOSTED_DUPLICATE_CASE_KEYS,
  run_jsdom_hosted_test_suites,
} from "../../hosted-test/dom/jsdom-hosted-test-suites";
import {
  CANVAS_REQUIRED_SUITES,
  GENERATED_DOM_ENTRIES,
  HOSTED_JSDOM_SUITES,
  LAYOUT_REQUIRED_SUITES,
  UNKNOWN_DOM_SUITES,
} from "../../hosted-test/dom/hosted-dom-migration-inventory";

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
expect_collection(suites.length === 58 && suites.reduce((total, suite) => total + suite.cases.length, 0) === 583, "canonical list is 58 suites / 583 unique cases");
expect_collection(JSDOM_HOSTED_DUPLICATE_CASE_KEYS.length === 2, "two repeated source declarations are recorded and executed once");
expect_collection(result.ok && result.summary.suites === 58 && result.summary.cases === 583 && result.summary.pass === 583 && result.summary.fail === 0, "direct jsdom run passes every canonical case");
expect_collection(HOSTED_JSDOM_SUITES.length === 58 && count(HOSTED_JSDOM_SUITES) === 583, "inventory matches the executable collection");
expect_collection(LAYOUT_REQUIRED_SUITES.length === 7 && count(LAYOUT_REQUIRED_SUITES) === 57, "layout tranche remains deferred");
expect_collection(CANVAS_REQUIRED_SUITES.length === 6 && count(CANVAS_REQUIRED_SUITES) === 69, "canvas tranche remains deferred");
expect_collection(UNKNOWN_DOM_SUITES.length === 8 && count(UNKNOWN_DOM_SUITES) === 287, "behavioral discrepancies remain explicitly unknown");
expect_collection(count(GENERATED_DOM_ENTRIES) === 250, "generated/fuzz entries remain outside canonical totals");
expect_collection(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined", "direct run leaves no DOM globals");
originalLog(JSON.stringify({ suites: 58, cases: 583, pass: result.summary.pass, initMs, directMs, cleanupMs }));
