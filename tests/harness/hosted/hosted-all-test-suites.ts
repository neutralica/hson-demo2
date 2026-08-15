import type { RunOptions, RunResult, TestEvent, TestSuite } from "../core/test-contracts";
import type { TestFailure, TestSummary } from "../../../src/shared/testing/test-contracts";
import { run_test_suites } from "../core/test-runner";
import { all_jsdom_hosted_canvas_suites } from "../runtimes/dom/canvas/jsdom-hosted-canvas-suites";
import { with_hosted_dom_runtime, with_hosted_node_globals } from "../runtimes/dom/hosted-dom-mutex";
import { all_jsdom_hosted_test_suites } from "../runtimes/dom/jsdom-hosted-test-suites";
import { all_node_safe_hosted_test_suites } from "./node-safe-hosted-test-suites";

export type HostedTestRuntimeKind = "node" | "dom" | "canvas";
export type HostedExecutableSuite = Readonly<{
  runtime: HostedTestRuntimeKind;
  suite: TestSuite;
}>;

export type HostedTestRuntimeGroup = Readonly<{
  runtime: HostedTestRuntimeKind;
  suites(): readonly TestSuite[];
}>;

/** Canonical execution order for the complete remotely executable fixed suite set. */
export const HOSTED_ALL_RUNTIME_GROUPS: readonly HostedTestRuntimeGroup[] = Object.freeze([
  Object.freeze({ runtime: "node", suites: all_node_safe_hosted_test_suites }),
  Object.freeze({ runtime: "dom", suites: all_jsdom_hosted_test_suites }),
  Object.freeze({ runtime: "canvas", suites: all_jsdom_hosted_canvas_suites }),
]);

function assert_unique(suites: readonly TestSuite[]): void {
  const suiteIds = suites.map((suite) => suite.suite);
  if (new Set(suiteIds).size !== suiteIds.length) {
    throw new Error("Duplicate suite identity in hosted/all.");
  }
  const caseKeys = suites.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.caseId}`));
  if (new Set(caseKeys).size !== caseKeys.length) {
    throw new Error("Duplicate case identity in hosted/all.");
  }
}

export function all_hosted_test_suites(): readonly TestSuite[] {
  const suites = Object.freeze(HOSTED_ALL_RUNTIME_GROUPS.flatMap((group) => group.suites()));
  assert_unique(suites);
  return suites;
}

export function all_hosted_executable_suites(): readonly HostedExecutableSuite[] {
  return Object.freeze(HOSTED_ALL_RUNTIME_GROUPS.flatMap((group) => group.suites().map((suite) => Object.freeze({
    runtime: group.runtime,
    suite,
  }))));
}

function combine_results(results: readonly RunResult[], startedAt: number): RunResult {
  const failures: TestFailure[] = results.flatMap((result) => result.summary.failures);
  const summary: TestSummary = Object.freeze({
    suites: results.reduce((total, result) => total + result.summary.suites, 0),
    cases: results.reduce((total, result) => total + result.summary.cases, 0),
    pass: results.reduce((total, result) => total + result.summary.pass, 0),
    fail: results.reduce((total, result) => total + result.summary.fail, 0),
    skip: results.reduce((total, result) => total + result.summary.skip, 0),
    msTotal: performance.now() - startedAt,
    failures: Object.freeze(failures),
  });
  return Object.freeze({ ok: summary.fail === 0, summary });
}

/**
 * Executes each canonical group exactly once under its required host runtime.
 * The action/report layer observes one continuous TestEvent stream.
 */
export async function run_hosted_all_test_suites(
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
): Promise<RunResult> {
  const startedAt = performance.now();
  const groups = HOSTED_ALL_RUNTIME_GROUPS.map((group) => Object.freeze({
    runtime: group.runtime,
    suites: group.suites(),
  }));
  assert_unique(groups.flatMap((group) => group.suites));
  const suitesFor = (runtime: HostedTestRuntimeKind): readonly TestSuite[] => {
    const group = groups.find((candidate) => candidate.runtime === runtime);
    if (group === undefined) throw new Error(`Missing hosted/all runtime group: ${runtime}`);
    return group.suites;
  };
  const node = await with_hosted_node_globals(() => {
    if (typeof window !== "undefined" || typeof document !== "undefined") {
      throw new Error("hosted/all Node group must execute without browser globals.");
    }
    return run_test_suites(suitesFor("node"), onEvent, options);
  });
  const dom = await with_hosted_dom_runtime((runtime) => run_test_suites(
    suitesFor("dom"),
    (event) => {
      if (event.t === "suite_begin") runtime.reset_document();
      if (event.t === "case_begin") runtime.geometry.clear_all_element_rects();
      onEvent(event);
    },
    options,
  ));
  const canvas = await with_hosted_dom_runtime((runtime) => run_test_suites(
    suitesFor("canvas"),
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
  return combine_results([node, dom, canvas], startedAt);
}
