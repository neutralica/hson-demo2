import type { HostedTestReport } from "./hosted-test-report.types";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export type HostedTestReportInitialEnvelope = Readonly<{
  type: "hosted-test-report-initial";
  runId: HostedTestRunId;
  suite: "livemap/replay";
  rev: number;
  value: HostedTestReport;
}>;
