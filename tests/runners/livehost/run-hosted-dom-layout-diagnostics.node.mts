import "hson-live";
import { run_test_suites } from "../../harness/core/test-runner";
import type { TestEvent } from "../../harness/core/test-contracts";
import {
  HOSTED_DOM_LAYOUT_CASES,
  type HostedDomLayoutCaseStatus,
} from "../../harness/runtimes/dom/hosted-dom-migration-inventory";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { all_jsdom_hosted_test_suites } from "../../harness/runtimes/dom/jsdom-hosted-test-suites";

function expect_layout(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted layout diagnostics: ${message}`);
}

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const counts = new Map<HostedDomLayoutCaseStatus, number>();
const deferred: Array<Readonly<{ key: string; error: string }>> = [];
const inventorySuiteIds = new Set(HOSTED_DOM_LAYOUT_CASES.map((entry) => entry.suite));
const suites = all_jsdom_hosted_test_suites().filter((suite) => inventorySuiteIds.has(suite.suite));
const outcomes = new Map<string, Extract<TestEvent, { t: "case_end" }>>();
try {
  await with_hosted_dom_runtime(() => run_test_suites(suites, (event) => {
    if (event.t === "case_end") outcomes.set(`${event.suite}::${event.caseId}`, event);
  }, { yieldEveryCases: 0, yieldBetweenSuites: false }));
  for (const entry of HOSTED_DOM_LAYOUT_CASES) {
    const key = `${entry.suite}::${entry.caseId}`;
    const outcome = outcomes.get(key);
    expect_layout(outcome !== undefined, `missing classified layout case execution: ${key}`);
    const shouldPass = entry.status !== "DEFERRED_REAL_LAYOUT";
    expect_layout((outcome.status === "pass") === shouldPass, `${key} disagrees with ${entry.status}: ${outcome.err ?? "no failure evidence"}`);
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    if (!shouldPass) deferred.push(Object.freeze({
      key,
      error: outcome.err?.split("\nError:")[0] ?? "missing failure",
    }));
  }
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

expect_layout([...counts.values()].reduce((total, count) => total + count, 0) === HOSTED_DOM_LAYOUT_CASES.length, "every inventory entry is executed exactly once");
expect_layout(new Set(HOSTED_DOM_LAYOUT_CASES.map((entry) => `${entry.suite}::${entry.caseId}`)).size === HOSTED_DOM_LAYOUT_CASES.length, "inventory identities are unique");
expect_layout((counts.get("DEFERRED_REAL_LAYOUT") ?? 0) === 0, "real-layout count");

originalLog(JSON.stringify({ cases: HOSTED_DOM_LAYOUT_CASES.length, counts: Object.fromEntries(counts), deferred }, null, 2));
