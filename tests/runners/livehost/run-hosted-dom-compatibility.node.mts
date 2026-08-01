import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { _circuit_test } from "hson-live/diagnostics";
import { all_deterministic_transform_test_suites } from "../../harness/hosted/deterministic-transform-test-suites";
import { run_test_suites } from "../../harness/core/test-runner";
import type { TestSuite } from "../../harness/core/test-contracts";
import { all_livemap_suites } from "../../suites/livemap/suite-registry";
import { all_livetree_suites } from "../../suites/livetree/suite-registry";

const DOM_LIVEMAP_IDS = new Set([
  "livemap/node-internals", "livemap/bridge-livetree", "livemap/bridge-livetree-controls",
  "livemap/schema-controls", "livemap/schema-validation-controls", "livemap/bind",
  "livemap/document-foundation",
]);

const suites: readonly TestSuite[] = [
  ...all_livemap_suites().filter((suite) => DOM_LIVEMAP_IDS.has(suite.suite)),
  ...all_livetree_suites(),
  ...all_deterministic_transform_test_suites(),
];

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const results: Array<Readonly<{ suite: string; cases: number; pass: number; fail: number; failure?: string }>> = [];
try {
  for (const suite of suites) {
    const result = await with_hosted_dom_runtime(async () => run_test_suites([suite], () => undefined, {
      yieldEveryCases: 0,
      yieldBetweenSuites: false,
    }));
    results.push({
      suite: suite.suite,
      cases: result.summary.cases,
      pass: result.summary.pass,
      fail: result.summary.fail,
      ...(result.summary.failures[0] === undefined
        ? {}
        : { failure: `${result.summary.failures[0].name}: ${result.summary.failures[0].err}`.slice(0, 300) }),
    });
  }
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

const failed = results.filter((result) => result.fail > 0);
originalLog(JSON.stringify({
  suites: results.length,
  cases: results.reduce((total, result) => total + result.cases, 0),
  passedSuites: results.length - failed.length,
  failedSuites: failed.length,
  passedCases: results.reduce((total, result) => total + result.pass, 0),
  failedCases: results.reduce((total, result) => total + result.fail, 0),
  failed: failed.map(({ suite, cases, pass, fail, failure }) => ({ suite, cases, pass, fail, failure })),
  passed: results.filter((result) => result.fail === 0).map(({ suite, cases }) => ({ suite, cases })),
}, null, 2));
