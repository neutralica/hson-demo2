import type { LiveMap, LiveMapCommit } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCollection, TestExecutionShape, TestProvenance, TestSubject } from "../testing/test-contracts";
import type { TestErrorKind, TestLifecycleCounts, TestLifecycleStatus } from "../testing/test-lifecycle-contract";

export type HostedTestReportStatus = "idle" | "running" | "passed" | "failed" | "cancelled" | "error";

export type HostedTestInfrastructureError = Readonly<{
  kind: TestErrorKind;
  executorId: string;
  message: string;
  stack: string | null;
  expected: string | null;
  actual: string | null;
}>;

export type HostedTestEvidence = Readonly<{
  id: string;
  sequence: number;
  timestamp: number;
  executorId: string;
  kind: "stdout" | "stderr" | "runtime_warning" | "raw_process_output" | "protocol_control" | "artifact";
  name: string;
  content: string;
  truncated: boolean;
  knownBytes: number | null;
  reference: string | null;
  mediaType: string | null;
}>;

export type HostedTestPlannedCaseReport = Readonly<{
  id: string;
  caseId: string;
  title: string;
  order: number;
  status: TestLifecycleStatus;
  queuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  ms: number | null;
  err: string | null;
  errors: readonly HostedTestInfrastructureError[];
  evidenceRefs: readonly string[];
  executorId: string | null;
  lastSequence: number;
  lastEventSignature: string;
}>;

export type HostedTestSuiteRunReport = Readonly<{
  id: string;
  title: string;
  subject: TestSubject;
  collections: readonly TestCollection[];
  provenance: TestProvenance;
  order: number;
  executionShape: TestExecutionShape;
  plannedExecutorId: string;
  sourceRef: string | null;
  declaredChecks: number | null;
  status: TestLifecycleStatus;
  queuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  ms: number | null;
  counts: TestLifecycleCounts;
  errors: readonly HostedTestInfrastructureError[];
  evidence: readonly HostedTestEvidence[];
  evidenceRefs: readonly string[];
  caseOrder: readonly string[];
  runtime: string | null;
  executorIds: readonly string[];
  lastSequence: number;
  lastEventSignature: string;
  cases: readonly HostedTestPlannedCaseReport[];
}>;

export type HostedTestReport = Readonly<{
  run: Readonly<{
    id: string;
    suite: "canonical/selected";
    status: HostedTestReportStatus;
    startedAt: number | null;
    completedAt: number | null;
    timing: Readonly<{ runnerMs: number; hostMs: number }> | null;
    lastSequence: number;
    lastEventSignature: string;
  }>;
  summary: Readonly<{
    cases: number;
    pass: number;
    fail: number;
    skip: number;
  }>;
  plan: Readonly<{
    protocolVersion: number;
    catalogVersion: string;
    executorId: string;
    selectionIds: readonly string[];
  }>;
  suiteRuns: readonly HostedTestSuiteRunReport[];
  error: HostedTestInfrastructureError | null;
}>;

/** LiveHost's low-level wire constraint uses mutable JSON array types. */
export type HostedTestReportState = HostedTestReport & JsonValue;

export type HostedTestReportMap = LiveMap<HostedTestReport>;

export type HostedTestReportCommit = LiveMapCommit;

export function hosted_test_report_cases(report: HostedTestReport): readonly HostedTestPlannedCaseReport[] {
  return Object.freeze(report.suiteRuns.flatMap((suite) => suite.cases));
}
