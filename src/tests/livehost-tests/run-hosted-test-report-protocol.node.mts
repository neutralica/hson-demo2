import { create_livehost, create_livehost_client, hson } from "hson-live";
import type { JsonValue, LiveHostSocketLike } from "hson-live/types";
import { HOSTED_TEST_REPORT_SCHEMA, make_hosted_test_report } from "./hosted-test-report";
import {
  decode_hosted_test_report_commit,
  decode_hosted_test_report_commit_envelope,
  encode_hosted_test_report_commit,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
  HostedTestReportCommitDecodeError,
} from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "./hosted-test-report-wire.types";

type Listener = (message: string) => void;

function expect_bridge(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report protocol bridge: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_bridge(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
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

const report = make_hosted_test_report(() => 100);
const initial = report.map.capture();
report.reduce({ t: "suite_begin", suite: "livemap/replay" });
const localCommit = report.commits()[0];
expect_bridge(localCommit !== undefined, "start mutation must produce one local commit");
const expectedEnvelope = encode_hosted_test_report_commit("protocol-run-1", "livemap/replay", localCommit);

const [clientSocket, hostSocket] = make_socket_pair();
const host = create_livehost({ state: { ready: true } });
const client = create_livehost_client<{ ready: boolean }>({ socket: clientSocket });
const connection = host.connect(hostSocket);
let receivedEnvelope: HostedTestReportCommitEnvelope | undefined;
let receivedCommit = undefined as ReturnType<typeof decode_hosted_test_report_commit> | undefined;
let applicationError: unknown;
client.on_event((message) => {
  if (message.event !== HOSTED_TEST_REPORT_COMMIT_EVENT) return;
  try {
    receivedEnvelope = decode_hosted_test_report_commit_envelope(message.payload);
    receivedCommit = decode_hosted_test_report_commit(message.payload);
  } catch (error) {
    applicationError = error;
  }
});
client.connect();
await settle();

connection.emit_event(
  HOSTED_TEST_REPORT_COMMIT_EVENT,
  expectedEnvelope as unknown as JsonValue,
);
await settle();
expect_bridge(applicationError === undefined, "valid application payload must decode after protocol delivery");
expect_bridge(receivedEnvelope !== undefined && receivedCommit !== undefined, "client must receive and decode one hosted-report event");
equal(receivedEnvelope, expectedEnvelope, "generic protocol preserves the complete hosted-report envelope");
expect_bridge(receivedEnvelope.runId === "protocol-run-1", "run ID survives protocol delivery");
expect_bridge(receivedEnvelope.suite === "livemap/replay", "suite survives protocol delivery");
expect_bridge(receivedCommit.prevRev === 0 && receivedCommit.rev === 1, "revisions survive protocol delivery");
equal(receivedCommit.ops, localCommit.ops, "operations survive protocol delivery");

const initialJson = structuredClone(initial.value) as unknown as JsonValue;
const replay = hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA);
replay.replay({ prevRev: receivedCommit.prevRev, ops: receivedCommit.ops });
equal(replay.capture().value, report.map.capture().value, "protocol-delivered commit replays to expected report state");

applicationError = undefined;
connection.emit_event(HOSTED_TEST_REPORT_COMMIT_EVENT, { malformed: true });
await settle();
expect_bridge(
  applicationError instanceof HostedTestReportCommitDecodeError
    && applicationError.code === "HOSTED_TEST_REPORT_COMMIT_DECODE_FAILED",
  "valid generic event with malformed application payload fails in hosted-report decoder",
);
expect_bridge(typeof window === "undefined" && typeof document === "undefined", "protocol bridge remains Node-safe");

client.disconnect();
connection();
console.log("hosted test report protocol bridge: ok");
