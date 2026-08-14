import type { LiveMap, LiveMapCommit } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { HostedTestRunTarget } from "../../hosted/hosted-test-suite";
import type { TestCollection, TestExecutionShape, TestProvenance, TestSubject } from "../../core/test-contracts";
import type { TestErrorKind, TestLifecycleCounts, TestLifecycleStatus } from "../../core/test-lifecycle";

export type HostedTestReportStatus = "idle" | "running" | "passed" | "failed" | "cancelled" | "error";

export type HostedTestCaseReport = Readonly<{
  key: string;
  suite: string;
  caseId: string; name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  err: string | null;
}>;

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
    id?: string;
    suite: HostedTestRunTarget;
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
  }> | null;
  suiteRuns: readonly HostedTestSuiteRunReport[];
  caseBatches: Readonly<Record<string, readonly HostedTestCaseReport[]>>;
  suites: readonly Readonly<{ suite: string; ms: number }>[];
  externalResults: Readonly<Record<string, Readonly<{
    id: string;
    suite: string;
    name: string;
    subject: string;
    runtime: string;
    executableChecks: number;
    collections: readonly string[];
    status: "queued" | "running" | "pass" | "fail" | "cancelled";
    ms: number;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    spawnError: string | null;
  }>>>;
  error: HostedTestInfrastructureError | null;
}>;

/** LiveHost's low-level wire constraint uses mutable JSON array types. */
export type HostedTestReportState = HostedTestReport & JsonValue;

export type HostedTestReportMap = LiveMap<HostedTestReport>;

export type HostedTestReportCommit = LiveMapCommit;

export function hosted_test_report_cases(report: HostedTestReport): readonly HostedTestCaseReport[] {
  return Object.freeze(Object.keys(report.caseBatches).sort().flatMap((key) => report.caseBatches[key] ?? []));
}
