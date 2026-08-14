import { performance } from "node:perf_hooks";
import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostSocketLike } from "hson-live/types";
import { create_hosted_test_livehost, run_hosted_test_action, type HostedTestActions } from "../../harness/hosted/hosted-test-action";
import type { HostedTestReportController } from "../../harness/reporting/hosted/hosted-test-report";
import { decode_hosted_test_report_initial, HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../harness/reporting/hosted/hosted-test-report-initial";
import type { HostedTestReportInitialEnvelope } from "../../harness/reporting/hosted/hosted-test-report-initial.types";
import { make_hosted_test_report_mirror } from "../../harness/reporting/hosted/hosted-test-report-mirror";
import { make_hosted_test_report_router } from "../../harness/reporting/hosted/hosted-test-report-router";
import { decode_hosted_test_report_commit_envelope, HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../harness/reporting/hosted/hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "../../../src/shared/hosted-tests/hosted-test-report-wire.types";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";

type Listener = (message: string) => void;

function expect_node_all(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted node/all: ${message}`);
}

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<Listener>();
  const secondMessages = new Set<Listener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  function socket(ownMessages: Set<Listener>, peerMessages: Set<Listener>, ownCloses: Set<() => void>, peerCloses: Set<() => void>): LiveHostSocketLike {
    return {
      send(message) { queueMicrotask(() => { for (const listener of peerMessages) listener(message); }); },
      close() { queueMicrotask(() => { for (const listener of peerCloses) listener(); }); },
      onMessage(listener) { ownMessages.add(listener); return () => ownMessages.delete(listener); },
      onClose(listener) { ownCloses.add(listener); return () => ownCloses.delete(listener); },
    };
  }
  return [
    socket(firstMessages, secondMessages, firstCloses, secondCloses),
    socket(secondMessages, firstMessages, secondCloses, firstCloses),
  ];
}

const registry = make_registered_hosted_test_suite_registry();
const directStarted = performance.now();
const direct = await registry.get("node/all").run(undefined, { yieldEveryCases: 0, yieldBetweenSuites: false });
const hostRunnerMs = performance.now() - directStarted;
expect_node_all(direct.ok && direct.summary.suites === 43 && direct.summary.cases === 1069 && direct.summary.pass === 1069, "direct aggregate runner passes 1069 cases exactly once");

let authoritative: HostedTestReportController | undefined;
const [clientSocket, hostSocket] = make_socket_pair();
const host = create_hosted_test_livehost(registry, (report) => { authoritative = report; }, () => "node-all-run");
const client = create_livehost_client<undefined, HostedTestActions>({ socket: clientSocket, actionId: () => "node-all-action" });
let initialEvents = 0;
let commitEvents = 0;
let receivedInitial: HostedTestReportInitialEnvelope | undefined;
const receivedCommits: HostedTestReportCommitEnvelope[] = [];
let applicationDecodeMs = 0;
const stopCount = client.on_event((message) => {
  const decodeStarted = performance.now();
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
    initialEvents += 1;
    receivedInitial = decode_hosted_test_report_initial(message.payload);
  }
  if (message.event === HOSTED_TEST_REPORT_COMMIT_EVENT) {
    commitEvents += 1;
    receivedCommits.push(decode_hosted_test_report_commit_envelope(message.payload));
  }
  applicationDecodeMs += performance.now() - decodeStarted;
});
const router = make_hosted_test_report_router(client);
const disconnectHost = host.connect(hostSocket);
client.connect();
await Promise.resolve();

const actionStarted = performance.now();
const result = await run_hosted_test_action(client, "node/all");
const actionRoundTripMs = performance.now() - actionStarted;
const mirror = await router.wait_for_terminal();
router.accept_result(result);

expect_node_all(initialEvents === 1, "one authoritative initial event arrives first");
expect_node_all(commitEvents === 63, "suite-coherent batching reduces the aggregate stream to 63 commits");
expect_node_all(mirror.rev === 63, "mirror reaches batched revision 63");
expect_node_all(result.runId === "node-all-run" && router.runId === result.runId, "result and routed stream share one run ID");
expect_node_all(result.suite === "node/all" && result.summary.cases === 1069 && result.summary.fail === 0, "action returns aggregate identity and totals");
expect_node_all(mirror.capture().value.summary.cases === 1069 && mirror.capture().value.run.status === "passed", "router mirror reconstructs the complete terminal report");
expect_node_all(authoritative !== undefined && JSON.stringify(mirror.capture()) === JSON.stringify(authoritative.map.capture()), "client mirror equals authoritative host capture");
expect_node_all(authoritative.commits().length === 63, "local semantic history matches the delivered commit count");
expect_node_all(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined", "aggregate hosted path remains Node-safe");

expect_node_all(receivedInitial !== undefined, "transport replay has its received authoritative base state");
const replayMirror = make_hosted_test_report_mirror(receivedInitial);
const mirrorReplayStarted = performance.now();
for (const commit of receivedCommits) replayMirror.apply(commit);
const mirrorReplayMs = performance.now() - mirrorReplayStarted;
expect_node_all(JSON.stringify(replayMirror.capture()) === JSON.stringify(mirror.capture()), "independent transport replay reconstructs the routed mirror");
replayMirror.dispose();

console.log(JSON.stringify({ hostRunnerMs, actionRoundTripMs, applicationDecodeMs, mirrorReplayMs, commitEvents, genericEventMessages: initialEvents + commitEvents, finalRev: mirror.rev }));
stopCount();
router.dispose();
client.disconnect();
disconnectHost();
