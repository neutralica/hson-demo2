import type { LiveHostClient } from "hson-live/livehost";
import type { HostedTestRunResult } from "./hosted-test-action.types";
import type { HostedTestReportMirror } from "./hosted-test-report-mirror.types";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";

export type HostedTestReportRouterStatus = "waiting" | "active" | "complete" | "failed" | "disposed";

export type HostedTestReportRouterFailureCode =
  | "INITIAL_DECODE_FAILED"
  | "COMMIT_BEFORE_INITIAL"
  | "DUPLICATE_INITIAL"
  | "COMMIT_DECODE_FAILED"
  | "MIRROR_APPLY_FAILED"
  | "EVENT_AFTER_TERMINAL"
  | "RESULT_BEFORE_INITIAL"
  | "RESULT_RUN_MISMATCH"
  | "RESULT_SUITE_MISMATCH"
  | "RESULT_BEFORE_TERMINAL"
  | "RESULT_STATE_MISMATCH"
  | "ACTION_ERROR_BEFORE_INITIAL"
  | "ACTION_ERROR_BEFORE_TERMINAL"
  | "ACTION_ERROR_STATE_MISMATCH";

export type HostedTestReportRouterFailure = Readonly<{
  code: HostedTestReportRouterFailureCode;
  message: string;
}>;

export type HostedTestReportRouterClient = Pick<LiveHostClient, "on_event">;

export type HostedTestReportRouterOptions = Readonly<{
  onMirror?: (mirror: HostedTestReportMirror) => void;
}>;

export type HostedTestReportRouter = Readonly<{
  readonly status: HostedTestReportRouterStatus;
  readonly runId: HostedTestRunId | undefined;
  readonly mirror: HostedTestReportMirror | undefined;
  readonly failure: HostedTestReportRouterFailure | undefined;
  wait_for_mirror(): Promise<HostedTestReportMirror>;
  wait_for_terminal(): Promise<HostedTestReportMirror>;
  accept_result(result: HostedTestRunResult): void;
  accept_action_error(error: unknown): void;
  dispose(): void;
}>;
