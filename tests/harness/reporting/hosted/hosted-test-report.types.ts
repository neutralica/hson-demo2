import type { LiveMap, LiveMapCommit } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { HostedTestRunTarget } from "../../hosted/hosted-test-suite";
import type { TestCollection, TestExecutionShape, TestProvenance, TestSubject } from "../../core/test-contracts";

export type HostedTestReportStatus = "idle" | "running" | "passed" | "failed" | "error";

export type HostedTestCaseReport = Readonly<{
  key: string;
  suite: string;
  caseId: string; name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  err: string | null;
}>;

export type HostedTestInfrastructureError = Readonly<{
  message: string;
}>;

export type HostedTestPlannedCaseReport = Readonly<{
  id: string;
  caseId: string;
  title: string;
  order: number;
  status: "queued" | "running" | "pass" | "fail" | "skip";
  ms: number | null;
  err: string | null;
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
  status: "queued" | "running" | "pass" | "fail";
  ms: number | null;
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
    status: "queued" | "running" | "pass" | "fail";
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
