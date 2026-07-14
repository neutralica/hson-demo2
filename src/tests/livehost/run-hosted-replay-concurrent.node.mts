import { create_livehost_client } from "hson-live";
import type { LiveHostSocketLike } from "hson-live/types";
import {
  create_hosted_test_livehost,
  run_hosted_replay_action,
  type HostedTestActions,
  type HostedTestRunResult,
} from "./hosted-replay-action";
import type { HostedTestReportController } from "./hosted-test-report";
import {
  decode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import type { HostedTestReportInitialEnvelope } from "./hosted-test-report-initial.types";
import { make_hosted_test_report_mirror, HostedTestReportMirrorError } from "./hosted-test-report-mirror";
import {
  decode_hosted_test_report_commit_envelope,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
  validate_hosted_test_report_commit_sequence,
} from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope, HostedTestRunId } from "./hosted-test-report-wire.types";
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
const streams = new Map<"a" | "b", HostedTestReportCommitEnvelope[]>([["a", []], ["b", []]]);
const initials = new Map<"a" | "b", HostedTestReportInitialEnvelope[]>([["a", []], ["b", []]]);
const timelineA: string[] = [];
const timelineB: string[] = [];
const stopA = clientA.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    initials.get("a")?.push(decode_hosted_test_report_initial(message.payload));
    timelineA.push("initial:1");
    return;
  }
  expect_concurrent(message.event === HOSTED_TEST_REPORT_COMMIT_EVENT, "client A event name must match hosted report events");
  const envelope = decode_hosted_test_report_commit_envelope(message.payload);
  streams.get("a")?.push(envelope);
  timelineA.push(`event:${envelope.rev}`);
});
const stopB = clientB.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    initials.get("b")?.push(decode_hosted_test_report_initial(message.payload));
    timelineB.push("initial:1");
    return;
  }
  expect_concurrent(message.event === HOSTED_TEST_REPORT_COMMIT_EVENT, "client B event name must match hosted report events");
  const envelope = decode_hosted_test_report_commit_envelope(message.payload);
  streams.get("b")?.push(envelope);
  timelineB.push(`event:${envelope.rev}`);
});
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
await bothStarted;
expect_concurrent(started === 2 && !settledA && !settledB, "both actions are simultaneously in flight behind the gate");
releaseRuns?.();
const [resultA, resultB]: readonly [HostedTestRunResult, HostedTestRunResult] = await Promise.all([resultAPromise, resultBPromise]);
await settle();

expect_concurrent(resultA.runId === "run-a" && resultB.runId === "run-b", "results contain their deterministic run IDs");
const streamA = streams.get("a") ?? [];
const streamB = streams.get("b") ?? [];
const initialA = initials.get("a") ?? [];
const initialB = initials.get("b") ?? [];
expect_concurrent(initialA.length === 1 && initialB.length === 1, "each client receives exactly one initial state");
const baseA = initialA[0];
const baseB = initialB[0];
expect_concurrent(baseA !== undefined && baseB !== undefined, "both initial states are available");
expect_concurrent(baseA.runId === resultA.runId && baseB.runId === resultB.runId, "each initial state carries its result run ID");
expect_concurrent(streamA.length === 47 && streamB.length === 47, "each client receives exactly 47 commits");
expect_concurrent(streamA.every((envelope) => envelope.runId === resultA.runId), "client A receives only run A envelopes");
expect_concurrent(streamB.every((envelope) => envelope.runId === resultB.runId), "client B receives only run B envelopes");
expect_concurrent(!streamA.some((envelope) => envelope.runId === resultB.runId), "client A receives no run B envelope");
expect_concurrent(!streamB.some((envelope) => envelope.runId === resultA.runId), "client B receives no run A envelope");

for (const [result, initial, stream, timeline] of [[resultA, baseA, streamA, timelineA], [resultB, baseB, streamB, timelineB]] as const) {
  validate_hosted_test_report_commit_sequence(stream, {
    runId: result.runId,
    suite: "livemap/replay",
    prevRev: initial.rev,
  });
  expect_concurrent(timeline[0] === "initial:1" && timeline[1] === "event:2", `${result.runId} initial state precedes commits`);
  expect_concurrent(stream[0]?.prevRev === 1 && stream[0].rev === 2, `${result.runId} starts at revision 1 to 2`);
  expect_concurrent(stream.at(-1)?.prevRev === 47 && stream.at(-1)?.rev === 48, `${result.runId} ends at revision 47 to 48`);
  expect_concurrent(timeline.at(-2) === "event:48" && timeline.at(-1) === "result", `${result.runId} terminal event precedes result`);
  const authoritative = reports.get(result.runId);
  expect_concurrent(authoritative !== undefined, `${result.runId} retains independent host inspection state`);
  const replay = make_hosted_test_report_mirror(initial);
  for (const envelope of stream) {
    replay.apply(envelope);
  }
  equal(replay.capture().value, authoritative.map.capture().value, `${result.runId} independently reconstructs its authoritative report`);
  expect_concurrent(replay.rev === 48, `${result.runId} reconstruction reaches revision 48`);
  expect_concurrent(replay.status === "active" && replay.failure === undefined, `${result.runId} mirror remains active`);
  expect_concurrent(replay.capture().value.run.status === "passed", `${result.runId} reconstructs passed status`);
  expect_concurrent(replay.capture().value.summary.cases === 45, `${result.runId} reconstructs 45 cases`);
  expect_concurrent(replay.capture().value.summary.fail === 0, `${result.runId} reconstructs zero failures`);
  replay.dispose();
}

const crossRun = make_hosted_test_report_mirror(baseA);
const crossRunBefore = crossRun.capture();
const runBFirst = streamB[0];
expect_concurrent(runBFirst !== undefined, "run B first commit is available for cross-run rejection");
try {
  crossRun.apply(runBFirst);
} catch (error) {
  expect_concurrent(error instanceof HostedTestReportMirrorError && error.failure.code === "RUN_MISMATCH", "run B commit fails against run A mirror before replay");
}
expect_concurrent(crossRun.status === "failed" && crossRun.rev === crossRunBefore.rev, "cross-run rejection fails mirror without revision change");
equal(crossRun.capture().value, crossRunBefore.value, "cross-run rejection preserves mirror report value");
crossRun.dispose();

stopA();
stopB();
clientA.disconnect();
clientB.disconnect();
disconnectHostA();
disconnectHostB();
expect_concurrent(typeof window === "undefined" && typeof document === "undefined", "concurrent hosted replay remains Node-safe");
console.log("hosted concurrent replay: ok");
