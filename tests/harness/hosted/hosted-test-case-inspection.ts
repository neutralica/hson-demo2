import type { LoopReport } from "hson-live/diagnostics";
import type { HostedTestCaseDiagnostic } from "./hosted-test-action.types";
import type { HostedTestRunId } from "../reporting/hosted/hosted-test-report-wire.types";
import type { HostedTestRunTarget } from "./hosted-test-suite";
import type { CaseKey, TestAssertRow, TestEvent, TestSuite } from "../core/test-contracts";
import type { ExecutableTestRegistration, TestExecutorRegistry } from "../core/test-executor";
import { all_hosted_executable_suites, type HostedTestRuntimeKind } from "./hosted-all-test-suites";
import { all_deterministic_transform_test_suites } from "./deterministic-transform-test-suites";
import { with_hosted_dom_runtime, with_hosted_node_globals } from "../runtimes/dom/hosted-dom-mutex";
import { run_test_suites } from "../core/test-runner";

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

type HostedTestCaseInspectionRequest = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  caseKey: string;
}>;

type HostedTestCaseInspectionMatch = Readonly<{
  runtime: HostedTestRuntimeKind;
  suite: TestSuite;
  testCase: TestSuite["cases"][number];
}>;

function runtime_for_registration(registration: ExecutableTestRegistration): HostedTestRuntimeKind {
  const established = all_hosted_executable_suites().find((entry) => entry.suite.cases.some(
    (testCase) => `${testCase.suite}::${testCase.caseId}` === registration.descriptor.id,
  ));
  if (established !== undefined) return established.runtime;
  return registration.descriptor.requirements.includes("synthetic-dom") ? "dom" : "node";
}

function match_registration(registration: ExecutableTestRegistration): HostedTestCaseInspectionMatch {
  const suite: TestSuite = Object.freeze({
    suite: registration.descriptor.suiteId,
    cases: Object.freeze([registration.testCase]),
    ...(registration.suiteSetup === undefined ? {} : { setup: registration.suiteSetup }),
    ...(registration.suiteTimeoutMs === undefined ? {} : { timeoutMs: registration.suiteTimeoutMs }),
  });
  return Object.freeze({
    runtime: runtime_for_registration(registration),
    suite,
    testCase: registration.testCase,
  });
}

function normalize_loop_report(
  runId: HostedTestRunId,
  suiteId: HostedTestRunTarget,
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
    caseId: caseKey.slice(caseKey.indexOf("::") + 2),
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

async function inspect_match(
  request: HostedTestCaseInspectionRequest,
  match: HostedTestCaseInspectionMatch,
): Promise<HostedTestCaseDiagnostic> {
  if (match.testCase.suite.startsWith("transform/")) {
    const captures = new Map<CaseKey, () => Promise<LoopReport>>();
    all_deterministic_transform_test_suites(captures);
    const capture = captures.get(request.caseKey as CaseKey);
    if (capture !== undefined) {
      return with_hosted_dom_runtime(async () => {
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
  }

  const event = await run_one(match.runtime, match.suite);

  return Object.freeze({
    type: "ordinary",
    runId: request.runId,
    suite: request.suite,
    caseKey: request.caseKey,
    caseSuite: event.suite,
    caseId: event.caseId, name: event.name,
    status: event.status,
    ms: event.ms,
    error: event.err ?? null,
    assertions: assertions(event.assertRows),
    values: Object.freeze(Object.entries({ ...match.testCase.meta, ...event.metaPatch }).map(([label, value]) => Object.freeze({ label, value }))),
    artifacts: Object.freeze([]),
    trace: Object.freeze([]),
  });
}

/** Bind inspection to the same canonical registrations advertised by one executor. */
export function make_hosted_test_case_inspector(
  registry: TestExecutorRegistry,
): (request: HostedTestCaseInspectionRequest) => Promise<HostedTestCaseDiagnostic> {
  return async (request) => {
    const registration = registry.get(request.caseKey);
    if (registration === undefined) {
      throw new Error(`HOSTED_TEST_UNKNOWN_CASE: Unknown hosted test case "${request.caseKey}".`);
    }
    return inspect_match(request, match_registration(registration));
  };
}

/** Compatibility inspector for the established hosted/all suite inventory. */
export async function inspect_hosted_test_case(
  request: HostedTestCaseInspectionRequest,
): Promise<HostedTestCaseDiagnostic> {
  const matches = all_hosted_executable_suites().flatMap((entry) => entry.suite.cases
    .filter((testCase) => `${testCase.suite}::${testCase.caseId}` === request.caseKey)
    .map((testCase) => Object.freeze({ runtime: entry.runtime, suite: entry.suite, testCase })));
  if (matches.length === 0) throw new Error(`HOSTED_TEST_UNKNOWN_CASE: Unknown hosted test case "${request.caseKey}".`);
  if (matches.length !== 1) throw new Error(`HOSTED_TEST_AMBIGUOUS_CASE: Ambiguous hosted test case "${request.caseKey}".`);
  return inspect_match(request, matches[0]!);
}
