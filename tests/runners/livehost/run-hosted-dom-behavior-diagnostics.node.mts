import { _circuit_test } from "hson-live/diagnostics";
import { all_deterministic_transform_test_suites } from "../../harness/hosted/deterministic-transform-test-suites";
import { run_test_suites } from "../../harness/core/test-runner";
import type { TestSuite } from "../../harness/core/test-contracts";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { all_livetree_suites } from "../../suites/livetree/suite-registry";

const BEHAVIOR_SUITE_IDS = Object.freeze([
  "livetree/append-and-create",
  "livetree/regressions/css",
  "livetree/scheduling-and-events",
  "livetree/svg/intermediate",
  "livetree/document-ownership",
  "livetree/construction-parity",
  "transform/legacy/html",
  "transform/html/new",
] as const);

const candidates: readonly TestSuite[] = [
  ...all_livetree_suites(),
  ...all_deterministic_transform_test_suites(),
];
const byId = new Map(candidates.map((suite) => [suite.suite, suite]));

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const diagnostics = [];
try {
  for (const suiteId of BEHAVIOR_SUITE_IDS) {
    const suite = byId.get(suiteId);
    if (suite === undefined) throw new Error(`Missing behavioral diagnostic suite: ${suiteId}`);
    const run = async () => with_hosted_dom_runtime(async (runtime) => {
      const windowMatches = globalThis.window === runtime.window;
      const documentMatches = globalThis.document === runtime.document;
      const result = await run_test_suites([suite], () => undefined, {
        yieldEveryCases: 0,
        yieldBetweenSuites: false,
      });
      return {
        cases: result.summary.cases,
        pass: result.summary.pass,
        fail: result.summary.fail,
        windowMatches,
        documentMatches,
        failures: result.summary.failures.map((failure) => ({
          name: failure.name,
          error: failure.err.split("\nError:")[0],
        })),
      };
    });
    const first = await run();
    const fresh = await run();
    diagnostics.push({ suite: suiteId, first, fresh });
  }
} finally {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

originalLog(JSON.stringify({ diagnostics }, null, 2));
