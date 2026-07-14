import type { JsonValue, LiveHostEventListener } from "hson-live/types";
import type { HostedTestRunResult } from "./hosted-replay-action";
import { make_hosted_test_report } from "./hosted-test-report";
import {
  encode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import {
  make_hosted_test_report_router,
  HostedTestReportRouterError,
} from "./hosted-test-report-router";
import type { HostedTestReportRouter, HostedTestReportRouterFailureCode } from "./hosted-test-report-router.types";
import {
  encode_hosted_test_report_commit,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
} from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "./hosted-test-report-wire.types";

function expect_router(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report router: ${message}`);
}

function event_client() {
  const listeners = new Set<LiveHostEventListener>();
  return {
    client: {
      on_event(listener: LiveHostEventListener) {
        listeners.add(listener);
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          listeners.delete(listener);
        };
      },
    },
    emit(event: string, payload: JsonValue) {
      for (const listener of [...listeners]) listener({ type: "event", event, payload });
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function fixture(runId: string, passed = true) {
  const report = make_hosted_test_report(() => 10);
  const initial = encode_hosted_test_report_initial(runId, "livemap/replay", report.map.capture());
  report.reduce({ t: "suite_begin", suite: "livemap/replay" });
  report.reduce({
    t: "case_end",
    suite: "livemap/replay",
    name: "synthetic",
    status: passed ? "pass" : "fail",
    ms: 1,
    ...(passed ? {} : { err: "expected" }),
  });
  const summary = {
    suites: 1,
    cases: 1,
    pass: passed ? 1 : 0,
    fail: passed ? 0 : 1,
    skip: 0,
    msTotal: 1,
    failures: passed ? [] : [{ suite: "livemap/replay", name: "synthetic", err: "expected", ms: 1 }],
  };
  report.complete({ ok: passed, summary });
  const commits = report.commits().map((commit) => encode_hosted_test_report_commit(runId, "livemap/replay", commit));
  const result: HostedTestRunResult = { runId, suite: "livemap/replay", ok: passed, summary };
  report.dispose();
  return { initial, commits, result } as const;
}

function emit_initial(io: ReturnType<typeof event_client>, value: ReturnType<typeof fixture>["initial"]): void {
  io.emit(HOSTED_TEST_REPORT_INITIAL_EVENT, value as unknown as JsonValue);
}

function emit_commit(io: ReturnType<typeof event_client>, value: HostedTestReportCommitEnvelope): void {
  io.emit(HOSTED_TEST_REPORT_COMMIT_EVENT, value as unknown as JsonValue);
}

function expect_failure(router: HostedTestReportRouter, code: HostedTestReportRouterFailureCode): void {
  expect_router(router.status === "failed" && router.failure?.code === code, `${code} becomes the stable router failure`);
}

async function rejects(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error(`hosted report router: expected rejected promise: ${message}`);
}

const valid = fixture("router-run");

const unrelatedIo = event_client();
const unrelated = make_hosted_test_report_router(unrelatedIo.client);
expect_router(unrelatedIo.listenerCount === 1, "router owns exactly one listener");
unrelatedIo.emit("other-application-event", { ignored: true });
expect_router(unrelated.status === "waiting" && unrelated.runId === undefined, "unrelated generic event is ignored");
unrelated.dispose();
expect_router(Number(unrelatedIo.listenerCount) === 0, "disposal removes the listener");

const beforeIo = event_client();
const before = make_hosted_test_report_router(beforeIo.client);
const beforeMirror = before.wait_for_mirror();
const beforeTerminal = before.wait_for_terminal();
emit_commit(beforeIo, valid.commits[0]!);
expect_failure(before, "COMMIT_BEFORE_INITIAL");
expect_router(beforeIo.listenerCount === 0, "routing failure removes listener");
await rejects(beforeMirror, "commit-before-initial readiness");
await rejects(beforeTerminal, "commit-before-initial terminal");
const firstFailure = before.failure;
emit_initial(beforeIo, valid.initial);
expect_router(before.failure === firstFailure, "later events cannot replace first failure");

const malformedInitialIo = event_client();
const malformedInitial = make_hosted_test_report_router(malformedInitialIo.client);
malformedInitialIo.emit(HOSTED_TEST_REPORT_INITIAL_EVENT, { malformed: true });
expect_failure(malformedInitial, "INITIAL_DECODE_FAILED");

const duplicateIo = event_client();
const duplicate = make_hosted_test_report_router(duplicateIo.client);
emit_initial(duplicateIo, valid.initial);
await duplicate.wait_for_mirror();
emit_initial(duplicateIo, valid.initial);
expect_failure(duplicate, "DUPLICATE_INITIAL");
expect_router(duplicate.mirror?.status === "active", "duplicate initial preserves the existing mirror");

const malformedCommitIo = event_client();
const malformedCommit = make_hosted_test_report_router(malformedCommitIo.client);
emit_initial(malformedCommitIo, valid.initial);
malformedCommitIo.emit(HOSTED_TEST_REPORT_COMMIT_EVENT, { malformed: true });
expect_failure(malformedCommit, "COMMIT_DECODE_FAILED");

const wrongRunIo = event_client();
const wrongRun = make_hosted_test_report_router(wrongRunIo.client);
emit_initial(wrongRunIo, valid.initial);
emit_commit(wrongRunIo, { ...valid.commits[0]!, runId: "other-run" });
expect_failure(wrongRun, "MIRROR_APPLY_FAILED");
expect_router(wrongRun.mirror?.failure?.code === "RUN_MISMATCH", "router preserves mirror correlation failure");

const terminalIo = event_client();
const terminal = make_hosted_test_report_router(terminalIo.client);
emit_initial(terminalIo, valid.initial);
for (const commit of valid.commits) emit_commit(terminalIo, commit);
const terminalMirror = await terminal.wait_for_terminal();
expect_router(terminal.status === "complete" && terminalMirror.capture().value.run.status === "passed", "terminal report resolves completion without router failure");
expect_router(terminalIo.listenerCount === 1, "valid completion retains listener until disposal");
emit_commit(terminalIo, valid.commits.at(-1)!);
expect_failure(terminal, "EVENT_AFTER_TERMINAL");

const resultBeforeInitialIo = event_client();
const resultBeforeInitial = make_hosted_test_report_router(resultBeforeInitialIo.client);
try {
  resultBeforeInitial.accept_result(valid.result);
} catch (error) {
  expect_router(error instanceof HostedTestReportRouterError, "result-before-initial throws router error");
}
expect_failure(resultBeforeInitial, "RESULT_BEFORE_INITIAL");

const resultMismatchIo = event_client();
const resultMismatch = make_hosted_test_report_router(resultMismatchIo.client);
emit_initial(resultMismatchIo, valid.initial);
for (const commit of valid.commits) emit_commit(resultMismatchIo, commit);
try {
  resultMismatch.accept_result({ ...valid.result, runId: "other-run" });
} catch {}
expect_failure(resultMismatch, "RESULT_RUN_MISMATCH");

const resultSuiteIo = event_client();
const resultSuite = make_hosted_test_report_router(resultSuiteIo.client);
emit_initial(resultSuiteIo, valid.initial);
for (const commit of valid.commits) emit_commit(resultSuiteIo, commit);
try {
  resultSuite.accept_result({ ...valid.result, suite: "other" } as unknown as HostedTestRunResult);
} catch {}
expect_failure(resultSuite, "RESULT_SUITE_MISMATCH");

const earlyResultIo = event_client();
const earlyResult = make_hosted_test_report_router(earlyResultIo.client);
emit_initial(earlyResultIo, valid.initial);
emit_commit(earlyResultIo, valid.commits[0]!);
try {
  earlyResult.accept_result(valid.result);
} catch {}
expect_failure(earlyResult, "RESULT_BEFORE_TERMINAL");

const passedMismatchIo = event_client();
const passedMismatch = make_hosted_test_report_router(passedMismatchIo.client);
emit_initial(passedMismatchIo, valid.initial);
for (const commit of valid.commits) emit_commit(passedMismatchIo, commit);
try {
  passedMismatch.accept_result({ ...valid.result, ok: false });
} catch {}
expect_failure(passedMismatch, "RESULT_STATE_MISMATCH");

const failedFixture = fixture("failed-router", false);
const failedMismatchIo = event_client();
const failedMismatch = make_hosted_test_report_router(failedMismatchIo.client);
emit_initial(failedMismatchIo, failedFixture.initial);
for (const commit of failedFixture.commits) emit_commit(failedMismatchIo, commit);
try {
  failedMismatch.accept_result({ ...failedFixture.result, ok: true });
} catch {}
expect_failure(failedMismatch, "RESULT_STATE_MISMATCH");

const earlyErrorIo = event_client();
const earlyError = make_hosted_test_report_router(earlyErrorIo.client);
emit_initial(earlyErrorIo, valid.initial);
try {
  earlyError.accept_action_error(new Error("early"));
} catch {}
expect_failure(earlyError, "ACTION_ERROR_BEFORE_TERMINAL");

const preInitialErrorIo = event_client();
const preInitialError = make_hosted_test_report_router(preInitialErrorIo.client);
const preInitialMirror = preInitialError.wait_for_mirror();
const preInitialTerminal = preInitialError.wait_for_terminal();
try {
  preInitialError.accept_action_error(new Error("suite unavailable"));
} catch {}
expect_failure(preInitialError, "ACTION_ERROR_BEFORE_INITIAL");
expect_router(preInitialErrorIo.listenerCount === 0, "pre-initial action rejection removes listener");
await rejects(preInitialMirror, "pre-initial action error readiness");
await rejects(preInitialTerminal, "pre-initial action error terminal");

const disposeWaitingIo = event_client();
const disposeWaiting = make_hosted_test_report_router(disposeWaitingIo.client);
const waitingMirror = disposeWaiting.wait_for_mirror();
const waitingTerminal = disposeWaiting.wait_for_terminal();
disposeWaiting.dispose();
disposeWaiting.dispose();
await rejects(waitingMirror, "dispose before mirror");
await rejects(waitingTerminal, "dispose before terminal");
expect_router(disposeWaiting.status === "disposed" && disposeWaitingIo.listenerCount === 0, "waiting disposal is idempotent and settles promises");

const disposeActiveIo = event_client();
const disposeActive = make_hosted_test_report_router(disposeActiveIo.client);
const activeTerminal = disposeActive.wait_for_terminal();
emit_initial(disposeActiveIo, valid.initial);
const ownedMirror = await disposeActive.wait_for_mirror();
disposeActive.dispose();
await rejects(activeTerminal, "dispose active terminal");
expect_router(ownedMirror.status === "disposed", "router disposal disposes its owned mirror");

expect_router(typeof window === "undefined" && typeof document === "undefined", "router remains Node-safe");
console.log("hosted test report router: ok");
