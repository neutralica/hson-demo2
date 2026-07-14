import type { HostedTestReport } from "./hosted-test-report.types";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export type HostedTestReportInitialEnvelope = Readonly<{
  type: "hosted-test-report-initial";
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  rev: number;
  value: HostedTestReport;
}>;
