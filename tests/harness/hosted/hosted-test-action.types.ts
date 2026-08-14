import type { TestSummary } from "../core/test-contracts";
import type { HostedTestSuiteId } from "./hosted-test-suite";
import type { HostedTestRunId } from "../reporting/hosted/hosted-test-report-wire.types";
import type { TestExecutorDiscoveryRequest } from "../core/test-discovery";
import type { RunSelectedTestsRequest } from "../core/test-selected-run";
import type { HostedTestRunTarget } from "./hosted-test-suite";

export type HostedTestRunRequest = Readonly<{
  suite: HostedTestSuiteId;
}>;

export type HostedTestRunResult = Readonly<{
  runId: HostedTestRunId;
  reportHostId?: string;
  reportRev?: number;
  suite: HostedTestSuiteId;
  ok: boolean;
  summary: TestSummary;
  timing: Readonly<{
    runnerMs: number;
    hostMs: number;
  }>;
}>;

export type HostedTestSelectedRunResult = Readonly<{
  runId: HostedTestRunId;
  reportHostId?: string;
  reportRev?: number;
  suite: "canonical/selected";
  testIds: readonly string[];
  ok: boolean;
  summary: TestSummary;
  timing: Readonly<{
    runnerMs: number;
    hostMs: number;
  }>;
}>;

export type HostedTestAnyRunResult = HostedTestRunResult | HostedTestSelectedRunResult;

type HostedTestPanelResultFor<T extends HostedTestAnyRunResult> =
  T extends HostedTestAnyRunResult
    ? Omit<T, "timing"> & Readonly<{
      timing: T["timing"] & Readonly<{ roundTripMs: number }>;
    }>
    : never;

export type HostedTestPanelRunResult = HostedTestPanelResultFor<HostedTestAnyRunResult>;

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
  suite: HostedTestRunTarget;
  caseKey: string;
  caseSuite: string;
  caseId: string; name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  error: string | null;
  assertions: readonly Readonly<{ ok: boolean; label: string; actual: string | null; expected: string | null }>[];
  values: readonly HostedTestDiagnosticText[];
  artifacts: readonly Readonly<{ format: "hson" | "json" | "html"; text: string; node: string | null }>[];
  trace: readonly Readonly<{ ok: boolean; step: string; error: string | null }>[];
}>;

export type HostedTestActions = Readonly<{
  "tests.discover": TestExecutorDiscoveryRequest;
  "tests.run": HostedTestRunRequest;
  "tests.runSelected": RunSelectedTestsRequest;
  "tests.inspect": HostedTestInspectRequest;
}>;
