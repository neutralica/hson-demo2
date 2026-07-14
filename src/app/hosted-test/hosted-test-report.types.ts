import type { LiveMap, LiveMapCommit } from "hson-live";
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
    suite: HostedTestSuiteId;
    status: HostedTestReportStatus;
    startedAt: number | null;
    completedAt: number | null;
  }>;
  summary: Readonly<{
    cases: number;
    pass: number;
    fail: number;
    skip: number;
  }>;
  cases: readonly HostedTestCaseReport[];
  error: HostedTestInfrastructureError | null;
}>;

export type HostedTestReportMap = LiveMap<HostedTestReport>;

export type HostedTestReportCommit = LiveMapCommit;
