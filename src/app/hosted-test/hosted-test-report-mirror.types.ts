import type { HostedTestReportMap } from "./hosted-test-report.types";
import type { HostedTestReportCommitEnvelope, HostedTestRunId } from "./hosted-test-report-wire.types";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export type HostedTestReportMirrorStatus = "active" | "failed" | "disposed";

export type HostedTestReportMirrorFailureCode =
  | "RUN_MISMATCH"
  | "SUITE_MISMATCH"
  | "REVISION_MISMATCH"
  | "REPLAY_FAILED"
  | "POST_REPLAY_REVISION_MISMATCH";

export type HostedTestReportMirrorFailure = Readonly<{
  code: HostedTestReportMirrorFailureCode;
  message: string;
  expectedRev?: number;
  receivedPrevRev?: number;
  expectedRunId?: HostedTestRunId;
  receivedRunId?: HostedTestRunId;
}>;

export type HostedTestReportMirror = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestSuiteId;
  readonly rev: number;
  readonly status: HostedTestReportMirrorStatus;
  readonly failure: HostedTestReportMirrorFailure | undefined;
  capture(): ReturnType<HostedTestReportMap["capture"]>;
  subscribe(listener: (capture: ReturnType<HostedTestReportMap["capture"]>) => void): () => void;
  apply(envelope: HostedTestReportCommitEnvelope): void;
  dispose(): void;
}>;
