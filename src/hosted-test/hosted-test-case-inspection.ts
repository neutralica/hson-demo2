import type { LoopReport } from "hson-live/diagnostics";
import type { HostedTestCaseDiagnostic } from "../app/hosted-test/hosted-test-action.types";
import type { HostedTestRunId } from "../app/hosted-test/hosted-test-report-wire.types";
import type { HostedTestSuiteId } from "../app/hosted-test/hosted-test-suite";
import type { CaseKey, TestAssertRow, TestEvent, TestSuite } from "../app/demos/test/tests.types";
import { all_hosted_executable_suites, type HostedTestRuntimeKind } from "./hosted-all-test-suites";
import { all_deterministic_transform_test_suites } from "./deterministic-transform-test-suites";
import { with_hosted_dom_runtime, with_hosted_node_globals } from "./dom/hosted-dom-mutex";
import { run_test_suites } from "./test-runner";

function display_value(value: unknown): string | null {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function assertions(rows: readonly TestAssertRow[] | undefined) {
  return Object.freeze((rows ?? []).map((row) => Object.freeze({
    ok: row.ok,
    label: row.label,
    actual: display_value(row.actual),
    expected: display_value(row.expected),
  })));
}

async function run_one(runtime: HostedTestRuntimeKind, suite: TestSuite): Promise<Extract<TestEvent, { t: "case_end" }>> {
  let finished: Extract<TestEvent, { t: "case_end" }> | undefined;
  const run = (onEvent: (event: TestEvent) => void) => run_test_suites([suite], onEvent, {
    yieldEveryCases: 0,
    yieldBetweenSuites: false,
    includePassedDiagnostics: true,
  });
  const onEvent = (event: TestEvent): void => {
    if (event.t === "case_end") finished = event;
  };
  if (runtime === "node") await with_hosted_node_globals(() => run(onEvent));
  else await with_hosted_dom_runtime((hostedRuntime) => {
    hostedRuntime.reset_document();
    hostedRuntime.geometry.clear_all_element_rects();
    if (runtime === "canvas") hostedRuntime.canvas.clear_all_canvases();
    return run(onEvent);
  });
  if (finished === undefined) throw new Error("HOSTED_TEST_INSPECTION_FAILED: Selected case produced no terminal event.");
  return finished;
}

function normalize_loop_report(
  runId: HostedTestRunId,
  suiteId: HostedTestSuiteId,
  caseKey: string,
  caseSuite: string,
  name: string,
  ms: number,
  report: LoopReport,
  input: string | null,
): HostedTestCaseDiagnostic {
  return Object.freeze({
    type: "transform",
    runId,
    suite: suiteId,
    caseKey,
    caseSuite,
    name,
    status: report.ok ? "pass" : "fail",
    ms,
    error: report.failures[0]?.error ?? null,
    assertions: Object.freeze([]),
    values: Object.freeze([{ label: "input", value: input }]),
    artifacts: Object.freeze((report.artifacts ?? []).map((artifact) => Object.freeze({
      format: artifact.fmt,
      text: artifact.text,
      node: artifact.node,
    }))),
    trace: Object.freeze((report.trace ?? []).map((step) => Object.freeze({
      ok: step.ok,
      step: step.step,
      error: step.error ?? null,
    }))),
  });
}

export async function inspect_hosted_test_case(request: Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  caseKey: string;
}>): Promise<HostedTestCaseDiagnostic> {
  const matches = all_hosted_executable_suites().flatMap((entry) => entry.suite.cases
    .filter((testCase) => `${testCase.suite}::${testCase.name}` === request.caseKey)
    .map((testCase) => ({ entry, testCase })));
  if (matches.length === 0) throw new Error(`HOSTED_TEST_UNKNOWN_CASE: Unknown hosted test case "${request.caseKey}".`);
  if (matches.length !== 1) throw new Error(`HOSTED_TEST_AMBIGUOUS_CASE: Ambiguous hosted test case "${request.caseKey}".`);
  const match = matches[0]!;
  if (match.testCase.suite.startsWith("transform/")) {
    return with_hosted_dom_runtime(async () => {
      const captures = new Map<CaseKey, () => Promise<LoopReport>>();
      all_deterministic_transform_test_suites(captures);
      const capture = captures.get(request.caseKey as CaseKey);
      if (capture === undefined) throw new Error(`HOSTED_TEST_INSPECTION_FAILED: Transform capture is unavailable for "${request.caseKey}".`);
      const startedAt = performance.now();
      const report = await capture();
      return normalize_loop_report(
        request.runId,
        request.suite,
        request.caseKey,
        match.testCase.suite,
        match.testCase.name,
        performance.now() - startedAt,
        report,
        match.testCase.meta?.input ?? null,
      );
    });
  }

  const selectedSuite = Object.freeze({ suite: match.entry.suite.suite, cases: Object.freeze([match.testCase]) });
  const event = await run_one(match.entry.runtime, selectedSuite);

  return Object.freeze({
    type: "ordinary",
    runId: request.runId,
    suite: request.suite,
    caseKey: request.caseKey,
    caseSuite: event.suite,
    name: event.name,
    status: event.status,
    ms: event.ms,
    error: event.err ?? null,
    assertions: assertions(event.assertRows),
    values: Object.freeze(Object.entries({ ...match.testCase.meta, ...event.metaPatch }).map(([label, value]) => Object.freeze({ label, value }))),
    artifacts: Object.freeze([]),
    trace: Object.freeze([]),
  });
}
