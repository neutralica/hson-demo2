import type { HostedTestReportMap } from "../../../../src/shared/hosted-tests/hosted-test-report.types";
import type { HostedTestReportCommitEnvelope, HostedTestRunId } from "../../../../src/shared/hosted-tests/hosted-test-report-wire.types";
import type { HostedTestRunTarget } from "../../../../src/shared/hosted-tests/hosted-test-suite-contract";

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
  suite: HostedTestRunTarget;
  readonly rev: number;
  readonly status: HostedTestReportMirrorStatus;
  readonly failure: HostedTestReportMirrorFailure | undefined;
  capture(): ReturnType<HostedTestReportMap["capture"]>;
  subscribe(listener: (capture: ReturnType<HostedTestReportMap["capture"]>) => void): () => void;
  apply(envelope: HostedTestReportCommitEnvelope): void;
  dispose(): void;
}>;
