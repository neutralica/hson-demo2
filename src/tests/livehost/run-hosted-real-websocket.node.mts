import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import { run_hosted_test_action } from "../../app/hosted-test/hosted-test-action";
import { HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../app/hosted-test/hosted-test-report-initial";
import { make_hosted_test_report_router } from "../../app/hosted-test/hosted-test-report-router";
import { HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../app/hosted-test/hosted-test-report-wire";
import type { TestEvent, TestSummary } from "../../app/demos/test/tests.types";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";

function expect_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted real WebSocket: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
let serverActionMs = 0;
const baseRegistry = make_registered_hosted_test_suite_registry();
const measuredRegistry = make_hosted_test_suite_registry(baseRegistry.list().map((descriptor) => ({
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    const actionStarted = performance.now();
    try { return await descriptor.run(...args); }
    finally { if (descriptor.id === "node/all") serverActionMs = performance.now() - actionStarted; }
  },
})));
const server = await start_hosted_test_server({ port: 0, registry: measuredRegistry });
const runtime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
let initialEvents = 0;
let commitEvents = 0;
const eventRunIds = new Set<string>();
const stopEvents = runtime.client.on_event((message) => {
  if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) initialEvents += 1;
  if (message.event === HOSTED_TEST_REPORT_COMMIT_EVENT) commitEvents += 1;
  if (typeof message.payload === "object" && message.payload !== null && "runId" in message.payload) {
    const runId = (message.payload as { runId?: unknown }).runId;
    if (typeof runId === "string") eventRunIds.add(runId);
  }
});
await runtime.ready();
expect_ws(runtime.status === "ready" && server.connectionCount() === 1, "remote runtime connects one real WebSocket");
const router = make_hosted_test_report_router(runtime.client);
const started = performance.now();
const result = await run_hosted_test_action(runtime.client, "node/all");
const roundTripMs = performance.now() - started;
const mirror = await router.wait_for_terminal();
router.accept_result(result);
expect_ws(initialEvents === 1 && commitEvents === 61, "real socket carries one initial and 61 commit events");
expect_ws(mirror.rev === 62 && mirror.capture().value.summary.cases === 1060, "real socket mirror reaches revision 62 with 1060 cases");
expect_ws(mirror.capture().value.summary.pass === 1060 && mirror.capture().value.summary.fail === 0, "real socket report passes every case");
expect_ws(result.suite === "node/all" && result.runId === router.runId && eventRunIds.size === 1 && eventRunIds.has(result.runId), "result, router, and event stream correlate");
expect_ws(typeof window === "undefined" && typeof document === "undefined", "server integration process has no browser globals");
const transportMetrics = server.metrics();
expect_ws(transportMetrics.sentMessages === 64 && transportMetrics.sentBytes > 0, "server records hello, report events, and action acknowledgement bytes");

router.dispose();
stopEvents();
runtime.dispose();
for (let attempt = 0; attempt < 100 && server.connectionCount() !== 0; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5));
}
expect_ws(server.connectionCount() === 0, "client disposal closes and removes the server connection");
await server.stop();

const panelServer = await start_hosted_test_server({ port: 0 });
const panelRuntime = make_remote_hosted_test_runtime({ url: panelServer.url, WebSocketConstructor });
await panelRuntime.ready();
const panelEvents: TestEvent[] = [];
const panelSummaries: TestSummary[] = [];
let panelRenders = 0;
const sink: HostedTestPanelSink = {
  reset() { panelEvents.length = 0; panelSummaries.length = 0; },
  onEvent(event) { panelEvents.push(event); },
  renderSummary(summary) { panelSummaries.push(summary); },
  renderReport() { panelRenders += 1; },
  showInfrastructureError(message) { throw new Error(message); },
};
const adapter = make_hosted_test_panel_adapter(panelRuntime.client, sink);
const panelResult = await adapter.start("node/all");
expect_ws(panelEvents.filter((event) => event.t === "case_end").length === 1060, "remote panel adapter receives every progressive case exactly once");
expect_ws(panelSummaries.at(-1)?.pass === 1060 && panelRenders === 62, "remote panel reaches the complete batched final state");
expect_ws(panelResult.runId === adapter.router?.runId, "remote panel action correlates through its existing router");
adapter.dispose();
panelRuntime.dispose();
await panelServer.stop();

console.log(JSON.stringify({ serverActionMs, roundTripMs, sentMessages: transportMetrics.sentMessages, sentBytes: transportMetrics.sentBytes, initialEvents, commitEvents, genericEvents: initialEvents + commitEvents, finalRev: mirror.rev }));
