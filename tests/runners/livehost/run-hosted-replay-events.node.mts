import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostSocketLike } from "hson-live/types";
import {
  create_hosted_test_livehost,
  run_hosted_replay_action,
  type HostedTestActions,
} from "./hosted-replay-action";
import type { HostedTestReportController } from "./hosted-test-report";
import {
  decode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import type { HostedTestReportInitialEnvelope } from "./hosted-test-report-initial.types";
import { make_hosted_test_report_mirror } from "./hosted-test-report-mirror";
import {
  decode_hosted_test_report_commit,
  decode_hosted_test_report_commit_envelope,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
  validate_hosted_test_report_commit_sequence,
} from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "./hosted-test-report-wire.types";

type Listener = (message: string) => void;

function expect_events(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted replay events: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_events(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
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

const [clientASocket, hostASocket] = make_socket_pair();
const [clientBSocket, hostBSocket] = make_socket_pair();
let authoritative: HostedTestReportController | undefined;
const host = create_hosted_test_livehost(undefined, (report) => {
  authoritative = report;
}, () => "hosted-live-run-a");
const clientA = create_livehost_client<undefined, HostedTestActions>({
  socket: clientASocket,
  actionId: () => "tests-run-a",
});
const clientB = create_livehost_client<undefined, HostedTestActions>({ socket: clientBSocket });
const envelopesA: HostedTestReportCommitEnvelope[] = [];
const envelopesB: HostedTestReportCommitEnvelope[] = [];
const initialsA: HostedTestReportInitialEnvelope[] = [];
const initialsB: HostedTestReportInitialEnvelope[] = [];
const timeline: string[] = [];
clientA.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    const initial = decode_hosted_test_report_initial(message.payload);
    initialsA.push(initial);
    timeline.push(`initial:${initial.rev}`);
    return;
  }
  expect_events(message.event === HOSTED_TEST_REPORT_COMMIT_EVENT, "client A receives only hosted report event names");
  const envelope = decode_hosted_test_report_commit_envelope(message.payload);
  envelopesA.push(envelope);
  timeline.push(`event:${envelope.rev}`);
});
clientB.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    initialsB.push(decode_hosted_test_report_initial(message.payload));
    return;
  }
  if (message.event === HOSTED_TEST_REPORT_COMMIT_EVENT) {
    envelopesB.push(decode_hosted_test_report_commit_envelope(message.payload));
  }
});
host.connect(hostASocket);
host.connect(hostBSocket);
clientA.connect();
clientB.connect();
await settle();
const result = await run_hosted_replay_action(clientA).then((value) => {
  timeline.push("result");
  return value;
});
await settle();

expect_events(authoritative !== undefined, "host exposes final authoritative report");
expect_events(initialsA.length === 1 && initialsB.length === 0, "originating client alone receives exactly one initial state");
const initialA = initialsA[0];
expect_events(initialA !== undefined, "originating client initial state is available");
expect_events(envelopesA.length === 4, "originating client receives four batched report commits");
expect_events(envelopesB.length === 0, "non-originating client receives no report commits");
expect_events(envelopesA.every((envelope) => envelope.runId === "hosted-live-run-a"), "one stable run ID identifies the stream");
validate_hosted_test_report_commit_sequence(envelopesA, {
  runId: "hosted-live-run-a",
  suite: "livemap/replay",
  prevRev: initialA.rev,
});
expect_events(timeline[0] === "initial:0" && timeline[1] === "event:1", "initial state precedes the first commit");
expect_events(envelopesA[0]?.prevRev === 0 && envelopesA[0].rev === 1, "event stream begins at revision 0 to 1");
expect_events(envelopesA.at(-1)?.prevRev === 3 && envelopesA.at(-1)?.rev === 4, "event stream ends at revision 3 to 4");
expect_events(timeline.at(-2) === "event:4" && timeline.at(-1) === "result", "terminal event arrives before action result");

const replay = make_hosted_test_report_mirror(initialA);
for (const envelope of envelopesA) {
  replay.apply(envelope);
}
equal(replay.capture().value, authoritative.map.capture().value, "received events reconstruct authoritative final report through mirror");
expect_events(replay.rev === 4, "received events replay through final revision 4");
expect_events(replay.status === "active" && replay.failure === undefined, "successful report mirror remains lifecycle-active");
expect_events(replay.capture().value.run.status === "passed", "reconstructed report is passed");
expect_events(replay.capture().value.summary.cases === 45, "reconstructed report contains 45 cases");
expect_events(replay.capture().value.summary.fail === 0, "reconstructed report contains zero failures");
expect_events(result.suite === "livemap/replay" && result.ok && result.summary.cases === 45, "existing action result remains correct");
expect_events(result.runId === "hosted-live-run-a", "action result correlates to every emitted envelope");
expect_events(initialA.runId === result.runId, "action result correlates to the received initial state");
expect_events(Object.keys(result).sort().join(",") === "ok,runId,suite,summary,timing", "action result includes authoritative host timing");
expect_events(authoritative.commits().length === envelopesA.length, "local capture and emitted history have equal length");

const [failedClientSocket, failedHostSocket] = make_socket_pair();
const failedHost = create_hosted_test_livehost(async (onEvent) => {
  onEvent?.({ t: "suite_begin", suite: "livemap/replay" });
  onEvent?.({ t: "case_end", suite: "livemap/replay", name: "synthetic failure", status: "fail", ms: 1, err: "expected" });
  onEvent?.({ t: "suite_end", suite: "livemap/replay", ms: 1 });
  return {
    ok: false,
    summary: {
      suites: 1,
      cases: 1,
      pass: 0,
      fail: 1,
      skip: 0,
      msTotal: 1,
      failures: [{ suite: "livemap/replay", name: "synthetic failure", err: "expected", ms: 1 }],
    },
  };
}, undefined, () => "hosted-failed-run");
const failedClient = create_livehost_client<undefined, HostedTestActions>({
  socket: failedClientSocket,
  actionId: () => "tests-run-failed",
});
const failedEnvelopes: HostedTestReportCommitEnvelope[] = [];
const failedInitials: HostedTestReportInitialEnvelope[] = [];
failedClient.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) failedInitials.push(decode_hosted_test_report_initial(message.payload));
  else failedEnvelopes.push(decode_hosted_test_report_commit_envelope(message.payload));
});
failedHost.connect(failedHostSocket);
failedClient.connect();
await settle();
const failedResult = await run_hosted_replay_action(failedClient);
const failedInitial = failedInitials[0];
expect_events(failedInitial !== undefined, "normal failed run receives an initial state");
expect_events(!failedResult.ok && failedResult.runId === "hosted-failed-run", "normal failed run returns its stable run ID with ok false");
expect_events(
  failedInitials.length === 1 && failedInitial.runId === failedResult.runId
    && failedEnvelopes.length === 3 && failedEnvelopes.every((envelope) => envelope.runId === failedResult.runId),
  "normal failed run result correlates with every emitted envelope",
);
const failedReplay = make_hosted_test_report_mirror(failedInitial);
for (const envelope of failedEnvelopes) {
  failedReplay.apply(envelope);
}
expect_events(failedReplay.capture().value.run.status === "failed", "received failed-run state reconstructs terminal failed status");
expect_events(failedReplay.status === "active" && failedReplay.failure === undefined, "report assertion failure is not mirror failure");

const [errorClientSocket, errorHostSocket] = make_socket_pair();
let errorReport: HostedTestReportController | undefined;
const errorHost = create_hosted_test_livehost(async (onEvent) => {
  onEvent?.({ t: "suite_begin", suite: "livemap/replay" });
  throw new Error("synthetic infrastructure failure");
}, (report) => {
  errorReport = report;
}, () => "hosted-error-run");
const errorClient = create_livehost_client<undefined, HostedTestActions>({
  socket: errorClientSocket,
  actionId: () => "tests-run-error",
});
const errorEnvelopes: HostedTestReportCommitEnvelope[] = [];
const errorInitials: HostedTestReportInitialEnvelope[] = [];
const errorTimeline: string[] = [];
errorClient.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    const initial = decode_hosted_test_report_initial(message.payload);
    errorInitials.push(initial);
    errorTimeline.push(`initial:${initial.rev}`);
    return;
  }
  const envelope = decode_hosted_test_report_commit_envelope(message.payload);
  errorEnvelopes.push(envelope);
  errorTimeline.push(`event:${envelope.rev}`);
});
errorHost.connect(errorHostSocket);
errorClient.connect();
await settle();
const errorResult = await errorClient.action("tests.run", { suite: "livemap/replay" }).then((value) => {
  errorTimeline.push("result");
  return value;
});
await settle();
expect_events(errorResult.type === "error", "infrastructure failure preserves action error result");
expect_events(errorInitials.length === 1 && errorTimeline[0] === "initial:0" && errorTimeline[1] === "event:1", "error run receives initial state before start commit");
const errorInitial = errorInitials[0];
expect_events(errorInitial !== undefined, "infrastructure error run initial state is available");
expect_events(errorEnvelopes.length === 2 && errorReport?.commits().length === 2, "start and terminal error commits are both emitted and captured");
expect_events(errorTimeline.at(-2) === "event:2" && errorTimeline.at(-1) === "result", "terminal error event arrives before action error settlement");
expect_events(errorEnvelopes.every((envelope) => envelope.runId === "hosted-error-run"), "error stream keeps one run ID");
const errorTerminal = decode_hosted_test_report_commit(errorEnvelopes[1]);
expect_events(
  errorTerminal.ops.some((op) => op.path.join("/") === "run/status" && op.next === "error"),
  "terminal infrastructure event records error status",
);
expect_events(typeof window === "undefined" && typeof document === "undefined", "live event delivery remains Node-safe");
const errorReplay = make_hosted_test_report_mirror(errorInitial);
for (const envelope of errorEnvelopes) {
  errorReplay.apply(envelope);
}
expect_events(errorReplay.capture().value.run.status === "error" && errorReplay.capture().value.error !== null, "received error stream reconstructs terminal error report");
expect_events(errorReplay.status === "active" && errorReplay.failure === undefined, "report infrastructure error is not mirror failure");
const finalReplayCapture = replay.capture();
replay.dispose();
failedReplay.dispose();
errorReplay.dispose();
expect_events(String(replay.status) === "disposed", "successful mirror disposes explicitly");
equal(replay.capture(), finalReplayCapture, "disposed successful mirror remains inspectable");

console.log("hosted replay events: ok");
