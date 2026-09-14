import { run_test_suites } from "../../core/test-runner";
import type { RunOptions, RunResult, TestEvent, TestSuite } from "../../core/test-contracts";
import { all_livemap_suites } from "../../../suites/livemap/suite-registry";
import { all_livetree_suites } from "../../../suites/livetree/suite-registry";
import { with_hosted_dom_runtime } from "./hosted-dom-mutex";

export const JSDOM_HOSTED_TEST_SUITE_IDS = Object.freeze([
  "livemap/bind",
  "livetree/svg/basic", "livetree/svg/gnarly", "livetree/svg/intermediate",
  "livetree/listener-cleanup", "livetree/form", "livetree/new-svg",
  "livetree/document-ownership", "livetree/css-var-facade-surfaces", "livetree/get-many-surface",
  "livetree/text-content-surface", "livetree/listener-builder-corners", "livetree/dom-helper-surface",
  "livetree/graph-dom-markup-surface", "livetree/regression-2", "livetree/allocation",
] as const);

export const JSDOM_HOSTED_DUPLICATE_CASE_KEYS = Object.freeze([] as const);

export const JSDOM_HOSTED_DEFERRED_CASE_KEYS = Object.freeze([] as const);

const JSDOM_HOSTED_TEST_SUITE_ID_SET = new Set<string>(JSDOM_HOSTED_TEST_SUITE_IDS);

export function all_jsdom_hosted_test_suites(): readonly TestSuite[] {
  const candidates = [
    ...all_livemap_suites(),
    ...all_livetree_suites(),
  ];
  const byId = new Map(candidates.map((suite) => [suite.suite, suite]));
  const duplicateCaseKeys: string[] = [];
  const deferredCaseKeys: string[] = [];
  const deferred = new Set<string>(JSDOM_HOSTED_DEFERRED_CASE_KEYS);
  const selected = JSDOM_HOSTED_TEST_SUITE_IDS.map((id) => {
    const suite = byId.get(id);
    if (suite === undefined) throw new Error(`Missing jsdom-hosted suite: ${id}`);
    const seen = new Set<string>();
    const cases = suite.cases.filter((testCase) => {
      const key = `${testCase.suite}::${testCase.caseId}`;
      if (deferred.has(key)) {
        deferredCaseKeys.push(key);
        return false;
      }
      if (seen.has(key)) {
        duplicateCaseKeys.push(key);
        return false;
      }
      seen.add(key);
      return true;
    });
    return cases.length === suite.cases.length
      ? suite
      : Object.freeze({ ...suite, cases: Object.freeze(cases) });
  });
  if (new Set(selected.map((suite) => suite.suite)).size !== selected.length) {
    throw new Error("Duplicate suite identity in jsdom-hosted collection.");
  }
  if (candidates.filter((suite) => JSDOM_HOSTED_TEST_SUITE_ID_SET.has(suite.suite)).length !== selected.length) {
    throw new Error("Ambiguous suite identity in jsdom-hosted collection.");
  }
  const caseKeys = selected.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.caseId}`));
  if (new Set(caseKeys).size !== caseKeys.length) throw new Error("Duplicate case identity in jsdom-hosted collection.");
  if (duplicateCaseKeys.join("\n") !== JSDOM_HOSTED_DUPLICATE_CASE_KEYS.join("\n")) {
    throw new Error("Unexpected duplicate declaration in jsdom-hosted collection.");
  }
  if (deferredCaseKeys.join("\n") !== JSDOM_HOSTED_DEFERRED_CASE_KEYS.join("\n")) {
    throw new Error("Unexpected deferred case selection in jsdom-hosted collection.");
  }
  return Object.freeze(selected);
}

export async function run_jsdom_hosted_test_suites(
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
): Promise<RunResult> {
  return with_hosted_dom_runtime((runtime) => run_test_suites(
    all_jsdom_hosted_test_suites(),
    (event) => {
      if (event.t === "suite_begin") runtime.reset_document();
      if (event.t === "case_begin") runtime.geometry.clear_all_element_rects();
      onEvent(event);
    },
    options,
  ));
}
