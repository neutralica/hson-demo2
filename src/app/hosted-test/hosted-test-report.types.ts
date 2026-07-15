import type { LiveMap, LiveMapCommit } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export type HostedTestReportStatus = "idle" | "running" | "passed" | "failed" | "error";

export type HostedTestCaseReport = Readonly<{
  key: string;
  suite: string;
  name: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  err: string | null;
}>;

export type HostedTestInfrastructureError = Readonly<{
  message: string;
}>;

export type HostedTestReport = Readonly<{
  run: Readonly<{
    id?: string;
    suite: HostedTestSuiteId;
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
  caseBatches: Readonly<Record<string, readonly HostedTestCaseReport[]>>;
  suites: readonly Readonly<{ suite: string; ms: number }>[];
  error: HostedTestInfrastructureError | null;
}>;

export type HostedTestReportMap = LiveMap<HostedTestReport>;

/** LiveHost's low-level wire constraint uses mutable JSON array types. */
export type HostedTestReportState = HostedTestReport & JsonValue;

export type HostedTestReportCommit = LiveMapCommit;

export function hosted_test_report_cases(report: HostedTestReport): readonly HostedTestCaseReport[] {
  return Object.freeze(Object.keys(report.caseBatches).sort().flatMap((key) => report.caseBatches[key] ?? []));
}
