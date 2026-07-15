import type { TestSummary } from "../demos/test/tests.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export type HostedTestRunRequest = Readonly<{
  suite: HostedTestSuiteId;
}>;

export type HostedTestRunResult = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  ok: boolean;
  summary: TestSummary;
  timing: Readonly<{
    runnerMs: number;
    hostMs: number;
  }>;
}>;

export type HostedTestPanelRunResult = Omit<HostedTestRunResult, "timing"> & Readonly<{
  timing: HostedTestRunResult["timing"] & Readonly<{ roundTripMs: number }>;
}>;

export type HostedTestInspectRequest = Readonly<{
  runId: HostedTestRunId;
  caseKey: string;
}>;

export type HostedTestDiagnosticText = Readonly<{
  label: string;
  value: string | null;
}>;

export type HostedTestCaseDiagnostic = Readonly<{
  type: "ordinary" | "transform";
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  caseKey: string;
  caseSuite: string;
  name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  error: string | null;
  assertions: readonly Readonly<{ ok: boolean; label: string; actual: string | null; expected: string | null }>[];
  values: readonly HostedTestDiagnosticText[];
  artifacts: readonly Readonly<{ format: "hson" | "json" | "html"; text: string; node: string | null }>[];
  trace: readonly Readonly<{ ok: boolean; step: string; error: string | null }>[];
}>;

export type HostedTestActions = Readonly<{
  "tests.run": HostedTestRunRequest;
  "tests.inspect": HostedTestInspectRequest;
}>;
