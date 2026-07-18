import { create_livehost_client } from "hson-live";
import type { LiveHostSocketLike } from "hson-live/types";
import {
  create_hosted_test_livehost,
  run_hosted_test_action,
  type HostedTestActions,
} from "../../app/hosted-test/hosted-test-action";
import type { HostedTestReportController } from "../../app/hosted-test/hosted-test-report";
import { make_hosted_test_report_router } from "../../app/hosted-test/hosted-test-report-router";
import { make_hosted_test_suite_registry, type HostedTestSuiteId } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";

type Listener = (message: string) => void;

function expect_multi(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted multi-suite concurrent: ${message}`);
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

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const base = make_registered_hosted_test_suite_registry();
let started = 0;
let releaseGate: (() => void) | undefined;
const gate = new Promise<void>((resolve) => { releaseGate = resolve; });
let markBothStarted: (() => void) | undefined;
const bothStarted = new Promise<void>((resolve) => { markBothStarted = resolve; });
const descriptors = base.list().map((descriptor) => ({
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    started += 1;
    if (started === 2) markBothStarted?.();
    await gate;
    return descriptor.run(...args);
  },
}));
const registry = make_hosted_test_suite_registry(descriptors);
const ids = ["multi-replay", "multi-node-all"];
let nextId = 0;
const reports = new Map<HostedTestSuiteId, HostedTestReportController>();
const host = create_hosted_test_livehost(
  registry,
  (report) => reports.set(report.map.capture().value.run.suite, report),
  () => ids[nextId++] ?? (() => { throw new Error("run ID factory exhausted"); })(),
);

const [clientASocket, hostASocket] = make_socket_pair();
const [clientBSocket, hostBSocket] = make_socket_pair();
const clientA = create_livehost_client<undefined, HostedTestActions>({ socket: clientASocket, actionId: () => "multi-a" });
const clientB = create_livehost_client<undefined, HostedTestActions>({ socket: clientBSocket, actionId: () => "multi-b" });
const routerA = make_hosted_test_report_router(clientA);
const routerB = make_hosted_test_report_router(clientB);
const disconnectA = host.connect(hostASocket);
const disconnectB = host.connect(hostBSocket);
clientA.connect();
clientB.connect();
await settle();

let settledA = false;
let settledB = false;
const resultAPromise = run_hosted_test_action(clientA, "livemap/replay").then((result) => { settledA = true; return result; });
const resultBPromise = run_hosted_test_action(clientB, "node/all").then((result) => { settledB = true; return result; });
await bothStarted;
expect_multi(started === 2 && !settledA && !settledB, "different suite actions genuinely overlap behind one gate");
releaseGate?.();
const [resultA, resultB, mirrorA, mirrorB] = await Promise.all([
  resultAPromise,
  resultBPromise,
  routerA.wait_for_terminal(),
  routerB.wait_for_terminal(),
]);
routerA.accept_result(resultA);
routerB.accept_result(resultB);

expect_multi(resultA.runId === "multi-replay" && resultB.runId === "multi-node-all", "different actions receive distinct deterministic run IDs");
expect_multi(resultA.suite === "livemap/replay" && resultB.suite === "node/all", "results retain requested suite identities");
expect_multi(routerA.runId === resultA.runId && routerB.runId === resultB.runId, "each router binds only its connection run");
expect_multi(mirrorA.suite === "livemap/replay" && mirrorB.suite === "node/all", "each mirror binds the correct suite");
expect_multi(mirrorA.rev === 5 && mirrorB.rev === 62, "focused and aggregate streams reach batched revisions 5 and 62");
expect_multi(mirrorA.capture().value.summary.cases === 45 && mirrorB.capture().value.summary.cases === 1081, "suite-specific mirrors contain 45 and 1081 cases");
expect_multi(JSON.stringify(mirrorA.capture().value) === JSON.stringify(reports.get("livemap/replay")?.map.capture().value), "replay mirror equals its authoritative host report");
expect_multi(JSON.stringify(mirrorB.capture().value) === JSON.stringify(reports.get("node/all")?.map.capture().value), "aggregate mirror equals its authoritative host report");

routerA.dispose();
routerB.dispose();
clientA.disconnect();
clientB.disconnect();
disconnectA();
disconnectB();
expect_multi(typeof window === "undefined" && typeof document === "undefined", "multi-suite concurrency remains Node-safe");
console.log("hosted multi-suite concurrent: ok");
