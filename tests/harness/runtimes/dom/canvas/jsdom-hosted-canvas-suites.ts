import { run_test_suites } from "../../../core/test-runner";
import type { RunOptions, RunResult, TestEvent, TestSuite } from "../../../core/test-contracts";
import { all_livetree_suites } from "../../../../suites/livetree/suite-registry";
import { with_hosted_dom_runtime } from "../hosted-dom-mutex";

export const JSDOM_HOSTED_CANVAS_SUITE_IDS = Object.freeze([
  "livetree/canvas",
  "livetree/canvas-stress",
  "livetree/canvas-display",
  "livetree/canvas-clear",
  "livetree/canvas-plot",
  "livetree/canvas-pointer",
] as const);

export const JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS = Object.freeze([
  "livetree/canvas-clear::canvas.clear-clears-full-backing-bitmap",
  "livetree/canvas-clear::canvas.clear-rectangle-clears-only-requested-region",
  "livetree/canvas-plot::canvas.plot-runs-callback-with-native-2d-context-when-mounted",
  "livetree/canvas-plot::canvas.must.plot-runs-callback-with-native-2d-context-when-mounted",
] as const);

export const JSDOM_HOSTED_CANVAS_DUPLICATE_CASE_KEYS = Object.freeze([
  "livetree/canvas-display::canvas.display.match.watch-manual-off-is-idempotent",
  "livetree/canvas-display::canvas.display.match.watch-auto-cleans-on-parent-removechildren",
  "livetree/canvas-pointer::canvas.display.match.watch-updates-backing-size-after-display-resize",
] as const);

export function all_jsdom_hosted_canvas_suites(): readonly TestSuite[] {
  const byId = new Map(all_livetree_suites().map((suite) => [suite.suite, suite]));
  const deferred = new Set<string>(JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS);
  const duplicateCaseKeys: string[] = [];
  const deferredCaseKeys: string[] = [];
  const selected = JSDOM_HOSTED_CANVAS_SUITE_IDS.map((id) => {
    const suite = byId.get(id);
    if (suite === undefined) throw new Error(`Missing hosted canvas suite: ${id}`);
    const seen = new Set<string>();
    const cases = suite.cases.filter((testCase) => {
      const key = `${testCase.suite}::${testCase.caseId}`;
      if (seen.has(key)) {
        duplicateCaseKeys.push(key);
        return false;
      }
      seen.add(key);
      if (deferred.has(key)) {
        deferredCaseKeys.push(key);
        return false;
      }
      return true;
    });
    return Object.freeze({ ...suite, cases: Object.freeze(cases) });
  });
  if (duplicateCaseKeys.join("\n") !== JSDOM_HOSTED_CANVAS_DUPLICATE_CASE_KEYS.join("\n")) {
    throw new Error("Unexpected duplicate declaration in hosted canvas collection.");
  }
  if (deferredCaseKeys.join("\n") !== JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS.join("\n")) {
    throw new Error("Unexpected deferred case selection in hosted canvas collection.");
  }
  const caseKeys = selected.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.caseId}`));
  if (new Set(caseKeys).size !== caseKeys.length) throw new Error("Duplicate case identity in hosted canvas collection.");
  return Object.freeze(selected);
}

export async function run_jsdom_hosted_canvas_suites(
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
): Promise<RunResult> {
  return with_hosted_dom_runtime((runtime) => run_test_suites(
    all_jsdom_hosted_canvas_suites(),
    (event) => {
      if (event.t === "suite_begin") runtime.reset_document();
      if (event.t === "case_begin") {
        runtime.geometry.clear_all_element_rects();
        runtime.canvas.clear_all_canvases();
      }
      onEvent(event);
    },
    options,
  ));
}
