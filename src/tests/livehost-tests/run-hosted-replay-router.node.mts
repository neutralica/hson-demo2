import { create_livehost_client } from "hson-live";
import type { LiveHostSocketLike } from "hson-live/types";
import {
  create_hosted_test_livehost,
  run_hosted_replay_action,
  type HostedTestActions,
} from "./hosted-replay-action";
import type { HostedTestReportController } from "./hosted-test-report";
import { make_hosted_test_report_router } from "./hosted-test-report-router";

type Listener = (message: string) => void;

function expect_integration(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report router integration: ${message}`);
}

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<Listener>();
  const secondMessages = new Set<Listener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  function socket(ownMessages: Set<Listener>, peerMessages: Set<Listener>, ownCloses: Set<() => void>, peerCloses: Set<() => void>): LiveHostSocketLike {
    return {
      send(message) {
        queueMicrotask(() => {
          for (const listener of peerMessages) listener(message);
        });
      },
      close() {
        queueMicrotask(() => {
          for (const listener of peerCloses) listener();
        });
      },
      onMessage(listener) {
        ownMessages.add(listener);
        return () => ownMessages.delete(listener);
      },
      onClose(listener) {
        ownCloses.add(listener);
        return () => ownCloses.delete(listener);
      },
    };
  }
  return [
    socket(firstMessages, secondMessages, firstCloses, secondCloses),
    socket(secondMessages, firstMessages, secondCloses, firstCloses),
  ];
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const [successClientSocket, successHostSocket] = make_socket_pair();
let authoritative: HostedTestReportController | undefined;
const successHost = create_hosted_test_livehost(undefined, (report) => {
  authoritative = report;
}, () => "router-real-run");
const successClient = create_livehost_client<undefined, HostedTestActions>({ socket: successClientSocket, actionId: () => "router-success" });
const successRouter = make_hosted_test_report_router(successClient);
const successConnection = successHost.connect(successHostSocket);
successClient.connect();
await settle();
const successTimeline: string[] = [];
const terminalPromise = successRouter.wait_for_terminal().then((mirror) => {
  successTimeline.push("terminal");
  return mirror;
});
const resultPromise = run_hosted_replay_action(successClient).then((result) => {
  successTimeline.push("result");
  return result;
});
const [successMirror, successResult] = await Promise.all([terminalPromise, resultPromise]);
successRouter.accept_result(successResult);
expect_integration(successTimeline.join(",") === "terminal,result", "terminal report precedes action result");
expect_integration(successRouter.status === "complete" && successRouter.failure === undefined, "successful router completes cleanly");
expect_integration(successRouter.runId === successResult.runId && successMirror.runId === successResult.runId, "result correlates to router and mirror");
expect_integration(successMirror.rev === 4 && successMirror.capture().value.run.status === "passed", "real mirror reaches passed batched revision 4");
expect_integration(successMirror.capture().value.summary.cases === 45 && successMirror.capture().value.summary.fail === 0, "real mirror contains 45 cases and zero failures");
expect_integration(authoritative !== undefined && JSON.stringify(successMirror.capture().value) === JSON.stringify(authoritative.map.capture().value), "router mirror equals authoritative host report");
successRouter.dispose();
successClient.disconnect();
successConnection();

const [failedClientSocket, failedHostSocket] = make_socket_pair();
const failedHost = create_hosted_test_livehost(async (onEvent) => {
  onEvent?.({ t: "suite_begin", suite: "livemap/replay" });
  onEvent?.({ t: "case_end", suite: "livemap/replay", name: "failed assertion", status: "fail", ms: 1, err: "expected" });
  return {
    ok: false,
    summary: {
      suites: 1,
      cases: 1,
      pass: 0,
      fail: 1,
      skip: 0,
      msTotal: 1,
      failures: [{ suite: "livemap/replay", name: "failed assertion", err: "expected", ms: 1 }],
    },
  };
}, undefined, () => "router-failed-run");
const failedClient = create_livehost_client<undefined, HostedTestActions>({ socket: failedClientSocket, actionId: () => "router-failed" });
const failedRouter = make_hosted_test_report_router(failedClient);
const failedConnection = failedHost.connect(failedHostSocket);
failedClient.connect();
await settle();
const failedResult = await run_hosted_replay_action(failedClient);
const failedMirror = await failedRouter.wait_for_terminal();
failedRouter.accept_result(failedResult);
expect_integration(!failedResult.ok && failedMirror.capture().value.run.status === "failed", "normal failed result correlates with failed report state");
expect_integration(failedRouter.status === "complete" && failedRouter.failure === undefined && failedMirror.failure === undefined, "normal test failure is neither router nor mirror failure");
failedRouter.dispose();
failedClient.disconnect();
failedConnection();

const [errorClientSocket, errorHostSocket] = make_socket_pair();
const errorHost = create_hosted_test_livehost(async (onEvent) => {
  onEvent?.({ t: "suite_begin", suite: "livemap/replay" });
  throw new Error("synthetic infrastructure failure");
}, undefined, () => "router-error-run");
const errorClient = create_livehost_client<undefined, HostedTestActions>({ socket: errorClientSocket, actionId: () => "router-error" });
const errorRouter = make_hosted_test_report_router(errorClient);
const errorConnection = errorHost.connect(errorHostSocket);
errorClient.connect();
await settle();
const errorAction = await errorClient.action("tests.run", { suite: "livemap/replay" });
const errorMirror = await errorRouter.wait_for_terminal();
expect_integration(errorAction.type === "error", "infrastructure action preserves error settlement");
errorRouter.accept_action_error(errorAction);
expect_integration(errorMirror.capture().value.run.status === "error" && errorMirror.capture().value.error?.message === "synthetic infrastructure failure", "infrastructure stream reconstructs normalized terminal error");
expect_integration(errorRouter.status === "complete" && errorRouter.failure === undefined && errorMirror.failure === undefined, "valid infrastructure error is neither router nor mirror failure");
errorRouter.dispose();
errorClient.disconnect();
errorConnection();

expect_integration(typeof window === "undefined" && typeof document === "undefined", "router integration remains Node-safe");
console.log("hosted report router integration: ok");
