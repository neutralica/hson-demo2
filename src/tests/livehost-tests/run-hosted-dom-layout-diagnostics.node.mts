import { run_test_suites } from "../../hosted-test/test-runner";
import type { TestSuite } from "../../app/demos/test/tests.types";
import {
  HOSTED_DOM_LAYOUT_CASES,
  type HostedDomLayoutCaseStatus,
} from "../../hosted-test/dom/hosted-dom-migration-inventory";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { all_livetree_suites } from "../livetree-tests/all-livetree-suites";

function expect_layout(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted layout diagnostics: ${message}`);
}

const byId = new Map(all_livetree_suites().map((suite) => [suite.suite, suite]));
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const counts = new Map<HostedDomLayoutCaseStatus, number>();
const deferred: Array<Readonly<{ key: string; error: string }>> = [];
try {
  for (const entry of HOSTED_DOM_LAYOUT_CASES) {
    const sourceSuite = byId.get(entry.suite);
    const testCase = sourceSuite?.cases.find((candidate) => candidate.name === entry.name);
    if (sourceSuite === undefined || testCase === undefined) {
      throw new Error(`Missing classified layout case: ${entry.suite}::${entry.name}`);
    }
    const isolated: TestSuite = Object.freeze({ suite: sourceSuite.suite, cases: Object.freeze([testCase]) });
    const result = await with_hosted_dom_runtime(() => run_test_suites([isolated], () => undefined, {
      yieldEveryCases: 0,
      yieldBetweenSuites: false,
    }));
    const shouldPass = entry.status !== "DEFERRED_REAL_LAYOUT";
    expect_layout(result.ok === shouldPass, `${entry.suite}::${entry.name} disagrees with ${entry.status}`);
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    if (!shouldPass) deferred.push(Object.freeze({
      key: `${entry.suite}::${entry.name}`,
      error: result.summary.failures[0]?.err.split("\nError:")[0] ?? "missing failure",
    }));
  }
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

expect_layout(HOSTED_DOM_LAYOUT_CASES.length === 57, "inventory must classify all 57 cases");
expect_layout(counts.get("MIGRATED_NATIVE") === 47, "native count");
expect_layout(counts.get("MIGRATED_RECT_INJECTION") === 4, "rectangle count");
expect_layout((counts.get("MIGRATED_OBSERVER_SHIM") ?? 0) === 0, "observer count");
expect_layout(counts.get("MIGRATED_SVG_INJECTION") === 2, "SVG count");
expect_layout(counts.get("DEFERRED_REAL_LAYOUT") === 4, "real-layout count");

originalLog(JSON.stringify({ cases: 57, counts: Object.fromEntries(counts), deferred }, null, 2));
