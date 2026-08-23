import { brotliCompressSync, gzipSync } from "node:zlib";
import type { HostedTestReport } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import type { RunCaseContext, TestCase, TestEvent, TestSuite } from "../../harness/core/test-contracts";
import { run_test_suites } from "../../harness/core/test-runner";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import { all_deterministic_transform_test_suites } from "../../harness/hosted/deterministic-transform-test-suites";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { run_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { make_in_memory_hosted_test_runtime } from "../../suites/livehost/in-memory-hosted-test-panel-runtime";

type Diagnostic = NonNullable<Extract<TestEvent, { t: "case_end" }>["diagnostic"]>;
type Measured = Readonly<{ suite: TestSuite; testCase: TestCase; diagnostic: Diagnostic; bytes: number }>;

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 1 largest Transform capacity proof: ${message}`);
}

function byte_size(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function report_case(report: HostedTestReport): { diagnostic: Diagnostic | null | undefined } {
  const testCase = report.suiteRuns[0]?.cases[0];
  if (testCase === undefined) throw new Error("Phase 1 largest Transform capacity proof: terminal report has no case.");
  return testCase as { diagnostic: Diagnostic | null | undefined };
}

async function measure_largest_transform_diagnostic(): Promise<Measured> {
  const suites = all_deterministic_transform_test_suites();
  const events: TestEvent[] = [];
  const result = await run_test_suites(suites, (event) => events.push(event), {
    richDiagnostics: true,
    includePassedDiagnostics: true,
    richDiagnosticContext: { runId: "phase1-largest-measurement", suite: "canonical/selected" },
  });
  expect(result.ok, "remaining deterministic Transform corpus must pass its hosted synthetic-DOM measurement run");
  const diagnostics = events.flatMap((event) => event.t === "case_end" && event.diagnostic !== undefined
    ? [Object.freeze({ event, diagnostic: event.diagnostic, bytes: byte_size(event.diagnostic) })]
    : []);
  expect(diagnostics.length === 361, `measurement must retain one diagnostic per Transform case, received ${diagnostics.length}`);
  const largest = diagnostics.reduce((current, candidate) => candidate.bytes > current.bytes ? candidate : current);
  const suite = suites.find((candidate) => candidate.suite === largest.event.suite);
  const testCase = suite?.cases.find((candidate) => candidate.caseId === largest.event.caseId);
  if (suite === undefined || testCase === undefined) throw new Error("Phase 1 largest Transform capacity proof: measured case is not registered.");
  return Object.freeze({ suite, testCase, diagnostic: largest.diagnostic, bytes: largest.bytes });
}

const EXECUTOR = Object.freeze({
  id: "phase1-largest-transform-capacity-proof",
  kind: "node" as const,
  label: "Phase 1 largest Transform capacity proof",
  location: "hosted" as const,
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node", "synthetic-dom"] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
});

const largest = await with_hosted_dom_runtime(() => measure_largest_transform_diagnostic());

const proof = await (async () => {
  let executions = 0;
  const selected: TestSuite = Object.freeze({
    ...largest.suite,
    descriptor: Object.freeze({
      subject: "transform" as const,
      requirements: Object.freeze(["javascript", "node", "synthetic-dom"] as const),
      collections: Object.freeze([] as const),
    }),
    cases: Object.freeze([Object.freeze({
      ...largest.testCase,
      run: (context: RunCaseContext | undefined) => {
        executions += 1;
        return largest.testCase.run(context);
      },
    })]),
  });
  const registry = make_test_executor_registry(EXECUTOR, [selected]);
  const runtime = make_in_memory_hosted_test_runtime(registry, {
    retainRichDiagnostics: true,
    runSelected: run_node_selected_test_ids,
  });
  let firstReport: HostedTestReport | undefined;
  let recoveredReport: HostedTestReport | undefined;
  let infrastructureErrors: string[] = [];
  try {
    await runtime.discover();
    const first = make_hosted_test_panel_adapter(runtime, {
      reset() {},
      ingest(update) { firstReport = update.report; },
      showInfrastructureError(message) { infrastructureErrors.push(message); },
    });
    const result = await first.start_selected([registry.catalog.tests[0]!.id]);
    const terminal = first.capture();
    expect(terminal !== undefined, "adapter.capture() must retain a terminal report");
    expect(executions === 1, `exactly one case/circuit execution is required, received ${executions}`);
    expect(result.reportRev !== undefined && (firstReport ?? terminal).run.status === "passed", "action acknowledgement and terminal report must agree");
    expect(firstReport !== undefined && firstReport.run.status === "passed", "terminal report must settle normally");
    expect(firstReport.suiteRuns.length === 1 && firstReport.suiteRuns[0]?.cases.length === 1, "terminal report must contain exactly the selected case");
    expect(report_case(firstReport).diagnostic !== null && report_case(firstReport).diagnostic !== undefined, "terminal report must retain the complete diagnostic");
    expect(byte_size(report_case(firstReport).diagnostic) === byte_size(report_case(terminal).diagnostic), "adapter.capture() must not truncate the diagnostic");
    const acknowledgedRev = result.reportRev;
    const firstAppliedRev = runtime.client.recovery.lastAppliedRev;
    expect(firstAppliedRev !== undefined && firstAppliedRev >= acknowledgedRev, "client must apply at least the acknowledged report revision");
    first.dispose();

    const recovered = make_hosted_test_panel_adapter(runtime, {
      reset() {},
      ingest(update) { recoveredReport = update.report; },
      showInfrastructureError(message) { infrastructureErrors.push(message); },
    });
    const recoveredResult = await recovered.recover(result.runId, result.attemptId);
    const capturedRecovered = recovered.capture();
    expect(capturedRecovered !== undefined && recoveredReport !== undefined, "newly attached client must recover the terminal report");
    expect(recoveredResult.reportRev !== undefined && recoveredResult.reportRev >= acknowledgedRev, "recovered action must reconcile report revision");
    expect(JSON.stringify(report_case(firstReport).diagnostic) === JSON.stringify(report_case(recoveredReport).diagnostic), "recovered diagnostic fidelity must be exact");
    expect(infrastructureErrors.length === 0, "capacity proof must not produce infrastructure errors");
    const terminalDiagnostic = report_case(firstReport).diagnostic;
    const raw = byte_size(terminalDiagnostic);
    const rawText = JSON.stringify(terminalDiagnostic);
    recovered.dispose();
    return Object.freeze({
      caseId: `${largest.suite.suite}::${largest.testCase.caseId}`,
      measuredRawDiagnosticBytes: largest.bytes,
      rawDiagnosticBytes: raw,
      gzipBytes: gzipSync(rawText).byteLength,
      brotliBytes: brotliCompressSync(rawText).byteLength,
      artifactCount: terminalDiagnostic?.artifacts.length ?? 0,
      traceCount: terminalDiagnostic?.trace.length ?? 0,
      terminalReportBytes: byte_size(firstReport),
      caseExecutionCount: executions,
      terminalReportRev: acknowledgedRev,
      recoveredReportRev: recoveredResult.reportRev,
      newClientRecovery: true,
      diagnosticFidelity: true,
      cleanup: "success",
    });
  } finally {
    runtime.dispose();
  }
})();

console.log(JSON.stringify(proof));
