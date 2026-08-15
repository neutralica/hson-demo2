import type { TestSummary } from "../testing/test-contracts";
import type { HostedTestRunTarget } from "./hosted-test-suite-contract";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";
import type { TestExecutorDiscoveryRequest } from "../testing/test-discovery-contract";
import type { RunSelectedTestsRequest } from "../testing/test-run-contract";
import type { HostedTestAttemptId } from "./hosted-test-application.types";

export type HostedTestCancelRequest = Readonly<{
  runId: HostedTestRunId;
  attemptId: HostedTestAttemptId;
}>;

export type HostedTestCancelResult = Readonly<{
  runId: HostedTestRunId;
  attemptId: HostedTestAttemptId;
  reportHostId: string;
  accepted: boolean;
  controlStatus: "accepted" | "running" | "cancelling" | "settled";
  outcome: "pending" | "passed" | "failed" | "cancelled" | "error";
  cancellation: Readonly<{ clientId: string; requestId: string }> | null;
}>;

export type HostedTestSelectedRunResult = Readonly<{
  runId: HostedTestRunId;
  attemptId: HostedTestAttemptId;
  reportHostId?: string;
  reportRev?: number;
  suite: "canonical/selected";
  selectionIds: readonly string[];
  ok: boolean;
  cancelled?: boolean;
  summary: TestSummary;
  timing: Readonly<{
    runnerMs: number;
    hostMs: number;
  }>;
}>;

export type HostedTestAnyRunResult = HostedTestSelectedRunResult;

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
  "tests.runSelected": RunSelectedTestsRequest;
  "tests.cancel": HostedTestCancelRequest;
}>;
