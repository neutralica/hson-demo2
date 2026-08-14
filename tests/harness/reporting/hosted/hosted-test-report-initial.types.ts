import type { HostedTestReport } from "../../../../src/shared/hosted-tests/hosted-test-report.types";
import type { HostedTestRunId } from "../../../../src/shared/hosted-tests/hosted-test-report-wire.types";
import type { HostedTestRunTarget } from "../../../../src/shared/hosted-tests/hosted-test-suite-contract";

export type HostedTestReportInitialEnvelope = Readonly<{
  type: "hosted-test-report-initial";
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  rev: number;
  value: HostedTestReport;
}>;
