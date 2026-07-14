import type { HostedTestRunResult } from "./hosted-test-action.types";
import {
  decode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import { make_hosted_test_report_mirror } from "./hosted-test-report-mirror";
import type { HostedTestReportMirror } from "./hosted-test-report-mirror.types";
import type {
  HostedTestReportRouter,
  HostedTestReportRouterClient,
  HostedTestReportRouterFailure,
  HostedTestReportRouterFailureCode,
  HostedTestReportRouterStatus,
  HostedTestReportRouterOptions,
} from "./hosted-test-report-router.types";
import {
  decode_hosted_test_report_commit_envelope,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
} from "./hosted-test-report-wire";

export class HostedTestReportRouterError extends Error {
  readonly code = "HOSTED_TEST_REPORT_ROUTER_FAILED";

  constructor(readonly failure: HostedTestReportRouterFailure) {
    super(failure.message);
    this.name = "HostedTestReportRouterError";
  }
}

export class HostedTestReportRouterDisposedError extends Error {
  readonly code = "HOSTED_TEST_REPORT_ROUTER_DISPOSED";

  constructor() {
    super("Hosted test report router was disposed before completion.");
    this.name = "HostedTestReportRouterDisposedError";
  }
}

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}>;

function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  void promise.catch(() => undefined);
  return Object.freeze({ promise, resolve: resolvePromise, reject: rejectPromise });
}

function router_failure(code: HostedTestReportRouterFailureCode, message: string): HostedTestReportRouterFailure {
  return Object.freeze({ code, message });
}

function terminal_status(status: string): status is "passed" | "failed" | "error" {
  return status === "passed" || status === "failed" || status === "error";
}

export function make_hosted_test_report_router(
  client: HostedTestReportRouterClient,
  options: HostedTestReportRouterOptions = {},
): HostedTestReportRouter {
  let status: HostedTestReportRouterStatus = "waiting";
  let mirror: HostedTestReportMirror | undefined;
  let retainedFailure: HostedTestReportRouterFailure | undefined;
  let listenerActive = true;
  const mirrorReady = deferred<HostedTestReportMirror>();
  const terminalReady = deferred<HostedTestReportMirror>();

  let stopListener: () => void = () => undefined;
  function stop_listening(): void {
    if (!listenerActive) return;
    listenerActive = false;
    stopListener();
  }

  function transition_failure(next: HostedTestReportRouterFailure): HostedTestReportRouterError {
    if (retainedFailure !== undefined) return new HostedTestReportRouterError(retainedFailure);
    retainedFailure = Object.freeze({ ...next });
    status = "failed";
    stop_listening();
    const error = new HostedTestReportRouterError(retainedFailure);
    if (mirror === undefined) mirrorReady.reject(error);
    terminalReady.reject(error);
    return error;
  }

  function fail_event(code: HostedTestReportRouterFailureCode, message: string): void {
    transition_failure(router_failure(code, message));
  }

  stopListener = client.on_event((message) => {
    const isInitial = message.event === HOSTED_TEST_REPORT_INITIAL_EVENT;
    const isCommit = message.event === HOSTED_TEST_REPORT_COMMIT_EVENT;
    if (!isInitial && !isCommit) return;
    if (status === "failed" || status === "disposed") return;
    if (status === "complete") {
      fail_event("EVENT_AFTER_TERMINAL", `Received ${message.event} after terminal report state.`);
      return;
    }

    if (isInitial) {
      if (status !== "waiting" || mirror !== undefined) {
        fail_event("DUPLICATE_INITIAL", "Received a second hosted-test initial event.");
        return;
      }
      try {
        const initial = decode_hosted_test_report_initial(message.payload);
        mirror = make_hosted_test_report_mirror(initial);
        options.onMirror?.(mirror);
        status = "active";
        mirrorReady.resolve(mirror);
      } catch (error) {
        fail_event("INITIAL_DECODE_FAILED", `Initial-state decoding failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    if (mirror === undefined || status === "waiting") {
      fail_event("COMMIT_BEFORE_INITIAL", "Received a hosted-test commit before initial state.");
      return;
    }
    let envelope;
    try {
      envelope = decode_hosted_test_report_commit_envelope(message.payload);
    } catch (error) {
      fail_event("COMMIT_DECODE_FAILED", `Commit decoding failed: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    try {
      mirror.apply(envelope);
    } catch (error) {
      fail_event("MIRROR_APPLY_FAILED", `Mirror application failed: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const reportStatus = mirror.capture().value.run.status;
    if (terminal_status(reportStatus)) {
      status = "complete";
      terminalReady.resolve(mirror);
    }
  });

  function fail_call(code: HostedTestReportRouterFailureCode, message: string): never {
    throw transition_failure(router_failure(code, message));
  }

  return Object.freeze({
    get status() {
      return status;
    },
    get runId() {
      return mirror?.runId;
    },
    get mirror() {
      return mirror;
    },
    get failure() {
      return retainedFailure;
    },
    wait_for_mirror() {
      return mirrorReady.promise;
    },
    wait_for_terminal() {
      return terminalReady.promise;
    },
    accept_result(result: HostedTestRunResult) {
      if (status === "disposed") throw new HostedTestReportRouterDisposedError();
      if (status === "failed") throw new HostedTestReportRouterError(retainedFailure!);
      if (mirror === undefined) fail_call("RESULT_BEFORE_INITIAL", "Action result arrived before initial report state.");
      if (result.runId !== mirror.runId) fail_call("RESULT_RUN_MISMATCH", `Expected result run ${mirror.runId}, received ${result.runId}.`);
      if (result.suite !== mirror.suite) fail_call("RESULT_SUITE_MISMATCH", `Expected result suite ${mirror.suite}, received ${result.suite}.`);
      if (status !== "complete") fail_call("RESULT_BEFORE_TERMINAL", "Action result arrived before terminal report state.");
      const report = mirror.capture().value;
      const expectedOk = report.run.status === "passed";
      const summariesAgree = result.summary.cases === report.summary.cases
        && result.summary.pass === report.summary.pass
        && result.summary.fail === report.summary.fail
        && result.summary.skip === report.summary.skip;
      if (report.run.status === "error" || result.ok !== expectedOk || !summariesAgree) {
        fail_call("RESULT_STATE_MISMATCH", "Action result does not agree with the terminal mirrored report.");
      }
    },
    accept_action_error(_error: unknown) {
      if (status === "disposed") throw new HostedTestReportRouterDisposedError();
      if (status === "failed") throw new HostedTestReportRouterError(retainedFailure!);
      if (mirror === undefined) {
        fail_call("ACTION_ERROR_BEFORE_INITIAL", "Action error arrived before initial report state.");
      }
      if (status !== "complete") {
        fail_call("ACTION_ERROR_BEFORE_TERMINAL", "Action error arrived before terminal report state.");
      }
      if (mirror.capture().value.run.status !== "error") {
        fail_call("ACTION_ERROR_STATE_MISMATCH", "Action error does not agree with the terminal mirrored report.");
      }
    },
    dispose() {
      if (status === "disposed") return;
      const wasMirrorPending = mirror === undefined;
      const wasTerminalPending = status !== "complete" && status !== "failed";
      status = "disposed";
      stop_listening();
      mirror?.dispose();
      const error = new HostedTestReportRouterDisposedError();
      if (wasMirrorPending) mirrorReady.reject(error);
      if (wasTerminalPending) terminalReady.reject(error);
    },
  });
}
