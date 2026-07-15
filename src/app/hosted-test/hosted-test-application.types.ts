import type { HostedTestSuiteId } from "./hosted-test-suite";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export const HOSTED_TEST_COORDINATOR_HOST_ID = "hosted-tests";

export type HostedTestRunAssociation = Readonly<{
  requestId: string;
  runId: HostedTestRunId;
  reportHostId: string;
  suite: HostedTestSuiteId;
  status: "running" | "passed" | "failed" | "error";
  reportRev: number;
}>;

export type HostedTestCoordinatorState = Readonly<{
  requests: Readonly<Record<string, HostedTestRunAssociation>>;
}>;
