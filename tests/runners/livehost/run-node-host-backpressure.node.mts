import WebSocket from "ws";
import type { NodeHostOperationalEvent } from "hson-live/livehost/node";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import type { TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import { run_selected_test_ids } from "../../harness/core/run-selected-test-suites";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

function expect_backpressure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`node-host backpressure: ${message}`);
}

function bounded<T>(promise: Promise<T>, label: string, timeoutMs = 30_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`node-host backpressure: ${label} exceeded ${timeoutMs}ms`)), timeoutMs);
    void promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function eventually(check: () => boolean, label: string, timeoutMs = 2_000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!check()) {
    if (performance.now() >= deadline) throw new Error(`node-host backpressure: ${label} did not settle within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const largeCases = Object.freeze(Array.from({ length: 2_700 }, (_, index) => Object.freeze({
  suite: "transform/backpressure-clean-run",
  caseId: `large-case-${index.toString().padStart(4, "0")}`,
  name: `large clean run case ${index.toString().padStart(4, "0")} ${"evidence".repeat(8)}`,
  run: () => undefined,
})));
const largeSuite: TestSuite = Object.freeze({
  suite: "transform/backpressure-clean-run",
  descriptor: Object.freeze({ subject: "transform", requirements: Object.freeze(["javascript"] as const) }),
  cases: largeCases,
});
const largeExecutor = Object.freeze({
  id: "node-host-backpressure-certificate",
  kind: "node" as const,
  label: "Node-host backpressure certificate",
  location: "hosted" as const,
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
});
const largeRegistry = make_test_executor_registry(largeExecutor, [largeSuite]);
const operationalEvents: NodeHostOperationalEvent[] = [];
let cleanExecutions = 0;
const cleanServer = await start_hosted_test_server({
  port: 0,
  executorRegistry: largeRegistry,
  async runSelected(_registry, _selectionIds, onEvent = () => undefined) {
    cleanExecutions += 1;
    onEvent({ t: "suite_begin", suite: largeSuite.suite, totalPlanned: 0 });
    onEvent({ t: "suite_end", suite: largeSuite.suite, ms: 0 });
    return Object.freeze({
      ok: true,
      summary: Object.freeze({ suites: 1, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: Object.freeze([]) }),
    });
  },
  log(event) { operationalEvents.push(event); },
});
const cleanRuntime = make_remote_hosted_test_runtime({
  url: cleanServer.url,
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});
const cleanErrors: string[] = [];
const cleanAdapter = make_hosted_test_panel_adapter(cleanRuntime, {
  reset() {},
  ingest() {},
  showInfrastructureError(message) { cleanErrors.push(message); },
});
let cleanLargestMessageBytes = 0;
try {
  await bounded(cleanRuntime.ready(), "clean coordinator readiness");
  await bounded(cleanRuntime.discover(), "clean discovery");
  const beforeRun = cleanServer.connectionSnapshot();
  expect_backpressure(
    beforeRun.total === 1
      && beforeRun.hostedTests.total === 1
      && beforeRun.hostedTests.coordinator === 1
      && beforeRun.hostedTests.reports === 0
      && beforeRun.towl === 0
      && beforeRun.circuitVerification === 0,
    "fresh discovery reuses the coordinator and owns no separate discovery, report, or TOWL connection",
  );

  const result = await bounded(
    cleanAdapter.start_selected(largeRegistry.catalog.tests.map((test) => test.id)),
    "clean first selected run terminal",
  );
  const afterRun = cleanServer.connectionSnapshot();
  cleanLargestMessageBytes = afterRun.hostedTests.largestSentBytes;
  const hostedDispatches = operationalEvents.filter((event) => event.type === "websocket-dispatch" && event.application === "hosted-tests");
  const backpressureEvents = operationalEvents.filter((event) => event.type === "backpressure" && event.application === "hosted-tests");
  expect_backpressure(
    result.ok
      && cleanExecutions === 1
      && cleanErrors.length === 0
      && backpressureEvents.length === 0
      && hostedDispatches.length === 2,
    "one clean Run executes once with only the coordinator and report dispatches and no NODE_HOST_BACKPRESSURE",
  );
  expect_backpressure(
    afterRun.total === 2
      && afterRun.hostedTests.coordinator === 1
      && afterRun.hostedTests.reports === 1
      && afterRun.hostedTests.authorityIds.filter((id) => id === "hosted-tests").length === 1
      && afterRun.hostedTests.authorityIds.filter((id) => id.startsWith("hosted-report:")).length === 1
      && afterRun.hostedTests.largestSentBytes > 1_048_576
      && afterRun.hostedTests.backpressureRejections === 0,
    "the >1 MiB report completes on its exact report socket without duplicate ownership or NODE_HOST_BACKPRESSURE",
  );
} finally {
  cleanAdapter.dispose();
  cleanRuntime.dispose();
  await eventually(() => cleanServer.connectionSnapshot().total === 0, "clean client connection release");
  await cleanServer.stop();
}

class FailReportReconnectWebSocket extends WebSocket {
  static reportAttempts = 0;

  constructor(address: string) {
    const authorityId = new URL(address).searchParams.get("locus") ?? "";
    const reportAttempt = authorityId.startsWith("hosted-report:")
      ? ++FailReportReconnectWebSocket.reportAttempts
      : 0;
    super(reportAttempt > 1 ? "ws://127.0.0.1:1" : address);
  }
}

let releaseRun: () => void = () => undefined;
let markRunStarted: () => void = () => undefined;
let markRunCompleted: () => void = () => undefined;
const runGate = new Promise<void>((resolve) => { releaseRun = resolve; });
const runStarted = new Promise<void>((resolve) => { markRunStarted = resolve; });
const runCompleted = new Promise<void>((resolve) => { markRunCompleted = resolve; });
const terminalSuite: TestSuite = Object.freeze({
  suite: "livehost/backpressure-terminal",
  descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const) }),
  cases: Object.freeze([{ suite: "livehost/backpressure-terminal", caseId: "held", name: "held", run() {} }]),
});
const terminalRegistry = make_test_executor_registry(Object.freeze({
  id: "backpressure-terminal-node",
  kind: "node",
  label: "Backpressure terminal fixture",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
}), [terminalSuite]);
const terminalServer = await start_hosted_test_server({
  port: 0,
  executorRegistry: terminalRegistry,
  async runSelected(registry, selectionIds, onEvent = () => undefined, options = {}) {
    markRunStarted();
    await runGate;
    try { return await run_selected_test_ids(registry, selectionIds, onEvent, options); }
    finally { markRunCompleted(); }
  },
});
const terminalRuntime = make_remote_hosted_test_runtime({
  url: terminalServer.url,
  WebSocketConstructor: FailReportReconnectWebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});
const terminalErrors: string[] = [];
const terminalAdapter = make_hosted_test_panel_adapter(terminalRuntime, {
  reset() {},
  ingest() {},
  showInfrastructureError(message) { terminalErrors.push(message); },
});
try {
  await bounded(terminalRuntime.ready(), "terminal coordinator readiness");
  await bounded(terminalRuntime.discover(), "terminal discovery");
  const pendingRun = terminalAdapter.start_selected([terminalRegistry.catalog.tests[0]!.id]);
  await bounded(runStarted, "gated execution start");
  await eventually(() => terminalServer.connectionSnapshot().hostedTests.reports === 1, "initial report attachment");
  const reportHostId = terminalServer.connectionSnapshot().hostedTests.authorityIds.find((id) => id.startsWith("hosted-report:"));
  expect_backpressure(reportHostId !== undefined, "the terminal-path run owns one identifiable report authority");
  terminalServer.disconnectConnections(reportHostId);
  const terminalFailure = await bounded(
    pendingRun.then(() => undefined, (error: unknown) => error),
    "exhausted report reconnect rejection",
    2_000,
  );
  expect_backpressure(
    terminalFailure instanceof Error
      && terminalErrors.length === 1
      && terminalErrors[0]!.length > 0
      && terminalRuntime.status === "failed"
      && terminalRuntime.failure instanceof Error,
    "exhausted report recovery rejects the run and presents one normalized infrastructure failure instead of hanging",
  );
  releaseRun();
  await bounded(runCompleted, "server action completion after terminal client failure");
  expect_backpressure(terminalRuntime.status === "failed", "late coordinator completion cannot overwrite terminal report failure");
} finally {
  releaseRun();
  terminalAdapter.dispose();
  terminalRuntime.dispose();
  await eventually(() => terminalServer.connectionSnapshot().total === 0, "terminal client connection release");
  await terminalServer.stop();
}

console.log(JSON.stringify({
  cleanExecutions,
  cleanLargestMessageBytes,
  terminalErrors: terminalErrors.length,
}));
