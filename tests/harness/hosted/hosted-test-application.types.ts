import type { JsonValue, LiveHostActionRequestId, LiveHostId } from "hson-live/types";
import type { LiveMap } from "hson-live/livemap";
import type { HostedTestRunTarget } from "./hosted-test-suite";
import type { HostedTestRunId } from "../reporting/hosted/hosted-test-report-wire.types";
import type { TestRunPlan } from "../core/test-run-plan";

export const HOSTED_TEST_COORDINATOR_HOST_ID = "hosted-tests";

export type HostedTestAttemptId = string;

export type HostedTestAttemptControlStatus = "accepted" | "running" | "cancelling" | "settled";

export type HostedTestCancellationIdentity = Readonly<{
  clientId: LiveHostId;
  requestId: LiveHostActionRequestId;
}>;

export type HostedTestRunRequestAssociation = Readonly<{
  clientId: LiveHostId;
  requestId: LiveHostActionRequestId;
  runId: HostedTestRunId;
  attemptId: HostedTestAttemptId;
}>;

export type HostedTestCoordinatedAttempt = Readonly<{
  id: HostedTestAttemptId;
  ordinal: number;
  reportHostId: string;
  controlStatus: HostedTestAttemptControlStatus;
  cancellation: HostedTestCancellationIdentity | null;
}>;

export type HostedTestCoordinatedRun = Readonly<{
  id: HostedTestRunId;
  clientId: LiveHostId;
  requestId: LiveHostActionRequestId;
  suite: HostedTestRunTarget;
  activeAttemptId: HostedTestAttemptId;
  acceptedPlan: TestRunPlan | null;
  attempts: Readonly<Record<HostedTestAttemptId, HostedTestCoordinatedAttempt>>;
}>;

export type HostedTestCoordinatorState = Readonly<{
  requests: Readonly<Record<LiveHostId, Readonly<Record<LiveHostActionRequestId, HostedTestRunRequestAssociation>>>>;
  runs: Readonly<Record<HostedTestRunId, HostedTestCoordinatedRun>>;
}> & JsonValue;

export type HostedTestCoordinatorMap = LiveMap<HostedTestCoordinatorState>;

/** Runtime join of the request index with its authoritative run and attempt records. */
export type HostedTestRunAssociation = HostedTestRunRequestAssociation & Readonly<{
  reportHostId: string;
  suite: HostedTestRunTarget;
  controlStatus: HostedTestAttemptControlStatus;
  cancellation: HostedTestCancellationIdentity | null;
  acceptedPlan: TestRunPlan | null;
}>;

export function hosted_test_run_association(
  state: HostedTestCoordinatorState,
  request: HostedTestRunRequestAssociation,
): HostedTestRunAssociation | undefined {
  const run = state.runs[request.runId];
  const attempt = run?.attempts[request.attemptId];
  if (run === undefined || attempt === undefined) return undefined;
  if (
    run.id !== request.runId
    || run.clientId !== request.clientId
    || run.requestId !== request.requestId
    || run.activeAttemptId !== request.attemptId
    || attempt.id !== request.attemptId
    || (run.acceptedPlan !== null && run.acceptedPlan.runId !== run.id)
  ) return undefined;
  return Object.freeze({
    ...request,
    reportHostId: attempt.reportHostId,
    suite: run.suite,
    controlStatus: attempt.controlStatus,
    cancellation: attempt.cancellation,
    acceptedPlan: run.acceptedPlan,
  });
}

export function hosted_test_recovery_association(
  state: HostedTestCoordinatorState,
  runId: HostedTestRunId,
  attemptId?: HostedTestAttemptId,
): HostedTestRunAssociation | undefined {
  const run = state.runs[runId];
  if (run === undefined) return undefined;
  const resolvedAttemptId = attemptId ?? run.activeAttemptId;
  const request = state.requests[run.clientId]?.[run.requestId];
  if (request?.attemptId !== resolvedAttemptId) return undefined;
  return request === undefined ? undefined : hosted_test_run_association(state, request);
}
