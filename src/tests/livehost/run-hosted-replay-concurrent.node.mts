import { create_livehost_client } from "hson-live";
import type { LiveHostSocketLike } from "hson-live/types";
import {
  create_hosted_test_livehost,
  run_hosted_replay_action,
  type HostedTestActions,
  type HostedTestRunResult,
} from "./hosted-replay-action";
import type { HostedTestReportController } from "./hosted-test-report";
import { make_hosted_test_report_router } from "./hosted-test-report-router";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";
import { run_livemap_replay_suite } from "../livemap/run-replay-suite";

type Listener = (message: string) => void;

function expect_concurrent(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted concurrent replay: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_concurrent(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
}

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<Listener>();
  const secondMessages = new Set<Listener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  function socket(
    ownMessages: Set<Listener>,
    peerMessages: Set<Listener>,
    ownCloses: Set<() => void>,
    peerCloses: Set<() => void>,
  ): LiveHostSocketLike {
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

function deterministic_run_ids(ids: readonly HostedTestRunId[]): () => HostedTestRunId {
  const remaining = [...ids];
  const issued = new Set<HostedTestRunId>();
  return () => {
    const id = remaining.shift();
    if (id === undefined) throw new Error("Hosted test run ID factory exhausted.");
    if (!id || issued.has(id)) throw new Error(`Hosted test run ID factory produced duplicate or empty ID: ${id}`);
    issued.add(id);
    return id;
  };
}

let started = 0;
let markBothStarted: (() => void) | undefined;
const bothStarted = new Promise<void>((resolve) => {
  markBothStarted = resolve;
});
let releaseRuns: (() => void) | undefined;
const runGate = new Promise<void>((resolve) => {
  releaseRuns = resolve;
});
const gatedRunner: typeof run_livemap_replay_suite = async (onEvent, options) => {
  started += 1;
  if (started === 2) markBothStarted?.();
  await runGate;
  return run_livemap_replay_suite(onEvent, options);
};

const reports = new Map<HostedTestRunId, HostedTestReportController>();
const host = create_hosted_test_livehost(
  gatedRunner,
  (report, runId) => {
    reports.set(runId, report);
  },
  deterministic_run_ids(["run-a", "run-b"]),
);
const [clientASocket, hostASocket] = make_socket_pair();
const [clientBSocket, hostBSocket] = make_socket_pair();
const clientA = create_livehost_client<undefined, HostedTestActions>({ socket: clientASocket, actionId: () => "action-a" });
const clientB = create_livehost_client<undefined, HostedTestActions>({ socket: clientBSocket, actionId: () => "action-b" });
const timelineA: string[] = [];
const timelineB: string[] = [];
const routerA = make_hosted_test_report_router(clientA);
const routerB = make_hosted_test_report_router(clientB);
const disconnectHostA = host.connect(hostASocket);
const disconnectHostB = host.connect(hostBSocket);
clientA.connect();
clientB.connect();
await settle();

let settledA = false;
let settledB = false;
const resultAPromise = run_hosted_replay_action(clientA).then((result) => {
  settledA = true;
  timelineA.push("result");
  return result;
});
const resultBPromise = run_hosted_replay_action(clientB).then((result) => {
  settledB = true;
  timelineB.push("result");
  return result;
});
const terminalAPromise = routerA.wait_for_terminal().then((mirror) => {
  timelineA.push("terminal");
  return mirror;
});
const terminalBPromise = routerB.wait_for_terminal().then((mirror) => {
  timelineB.push("terminal");
  return mirror;
});
await bothStarted;
expect_concurrent(started === 2 && !settledA && !settledB, "both actions are simultaneously in flight behind the gate");
releaseRuns?.();
const [resultA, resultB, mirrorA, mirrorB]: readonly [HostedTestRunResult, HostedTestRunResult, Awaited<typeof terminalAPromise>, Awaited<typeof terminalBPromise>] = await Promise.all([
  resultAPromise,
  resultBPromise,
  terminalAPromise,
  terminalBPromise,
]);
await settle();

expect_concurrent(resultA.runId === "run-a" && resultB.runId === "run-b", "results contain their deterministic run IDs");
routerA.accept_result(resultA);
routerB.accept_result(resultB);

for (const [result, router, mirror, timeline] of [[resultA, routerA, mirrorA, timelineA], [resultB, routerB, mirrorB, timelineB]] as const) {
  expect_concurrent(timeline[0] === "terminal" && timeline[1] === "result", `${result.runId} terminal report precedes result settlement`);
  expect_concurrent(router.runId === result.runId && mirror.runId === result.runId, `${result.runId} binds only its originating router`);
  const authoritative = reports.get(result.runId);
  expect_concurrent(authoritative !== undefined, `${result.runId} retains independent host inspection state`);
  equal(mirror.capture().value, authoritative.map.capture().value, `${result.runId} router mirror reconstructs its authoritative report`);
  expect_concurrent(router.status === "complete" && router.failure === undefined, `${result.runId} router completes without failure`);
  expect_concurrent(mirror.rev === 5 && mirror.status === "active", `${result.runId} mirror remains active at batched revision 5`);
  expect_concurrent(mirror.capture().value.run.status === "passed", `${result.runId} reconstructs passed status`);
  expect_concurrent(mirror.capture().value.summary.cases === 45, `${result.runId} reconstructs 45 cases`);
  expect_concurrent(mirror.capture().value.summary.fail === 0, `${result.runId} reconstructs zero failures`);
}

routerA.dispose();
expect_concurrent(routerA.status === "disposed" && mirrorA.status === "disposed", "router A disposes its mirror");
expect_concurrent(routerB.status === "complete" && mirrorB.status === "active", "disposing router A does not affect router B");
routerB.dispose();
clientA.disconnect();
clientB.disconnect();
disconnectHostA();
disconnectHostB();
expect_concurrent(typeof window === "undefined" && typeof document === "undefined", "concurrent hosted replay remains Node-safe");
console.log("hosted concurrent replay: ok");
