import type { TestSummary } from "../demos/test/tests.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export type HostedTestRunRequest = Readonly<{
  suite: HostedTestSuiteId;
}>;

export type HostedTestRunResult = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  ok: boolean;
  summary: TestSummary;
}>;

export type HostedTestActions = Readonly<{
  "tests.run": HostedTestRunRequest;
}>;
