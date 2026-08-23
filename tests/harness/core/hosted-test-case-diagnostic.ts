import type { LoopReport } from "hson-live/diagnostics";
import type { HostedTestCaseDiagnostic } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import type { HostedTestRunId } from "../../../src/shared/hosted-tests/hosted-test-report-wire.types";
import type { HostedTestRunTarget } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";
import type { TestAssertRow, TestStatus } from "./test-contracts";

function display_value(value: unknown): string | null {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2) ?? String(value); } catch { return String(value); }
}

export type HostedTestCaseDiagnosticInput = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  caseSuite: string;
  caseId: string;
  name: string;
  status: TestStatus;
  ms: number;
  error?: string;
  assertRows?: readonly TestAssertRow[];
  metadata?: Readonly<Record<string, unknown>>;
  loopReport?: LoopReport;
}>;

/** Reconstruct the ordinary terminal assertion semantic for an inspection capture. */
export function transform_terminal_assertions(report: LoopReport, expected: "ok" | "fail" | undefined): readonly TestAssertRow[] | undefined {
  const shouldPass = expected !== "fail";
  if (report.ok === shouldPass) return undefined;
  const failure = report.failures[0];
  const label = shouldPass
    ? (failure?.error ? `${failure.step}: ${failure.error}` : "loop failed (ok=false)")
    : "expected failure, but loop passed";
  return Object.freeze([Object.freeze({ ok: false, label, actual: report.ok, expected: shouldPass })]);
}

/** The one structured diagnostic interpretation shared by rich execution and inspection. */
export function normalize_hosted_test_case_diagnostic(input: HostedTestCaseDiagnosticInput): HostedTestCaseDiagnostic {
  const loop = input.loopReport;
  return Object.freeze({
    type: loop === undefined ? "ordinary" : "transform",
    runId: input.runId,
    suite: input.suite,
    caseKey: `${input.caseSuite}::${input.caseId}`,
    caseSuite: input.caseSuite,
    caseId: input.caseId,
    name: input.name,
    status: loop === undefined ? input.status : loop.ok ? "pass" : "fail",
    ms: input.ms,
    error: loop === undefined ? input.error ?? null : loop.failures[0]?.error ?? null,
    assertions: Object.freeze((input.assertRows ?? []).map((row) => Object.freeze({
      ok: row.ok, label: row.label, actual: display_value(row.actual), expected: display_value(row.expected),
    }))),
    values: Object.freeze(Object.entries(input.metadata ?? {}).map(([label, value]) => Object.freeze({ label, value: display_value(value) }))),
    artifacts: Object.freeze((loop?.artifacts ?? []).map((artifact) => Object.freeze({
      lap: artifact.lap, label: artifact.label ?? `lap ${artifact.lap} ${artifact.fmt}`,
      format: artifact.fmt, text: artifact.text, node: artifact.node,
    }))),
    trace: Object.freeze((loop?.trace ?? []).map((step) => Object.freeze({
      ok: step.ok, step: step.step, error: step.error ?? null,
    }))),
  });
}
