import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_hosted_test_panel_adapter, type HostedTestPanelReportUpdate } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { HOSTED_TEST_COORDINATOR_HOST_ID } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import { inspect_hosted_test_case } from "../../harness/hosted/hosted-test-case-inspection";

function expect_generic(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted generic LiveHost: ${message}`);
}

let releaseInspect: () => void = () => undefined;
let markInspectStarted: () => void = () => undefined;
const inspectGate = new Promise<void>((resolve) => { releaseInspect = resolve; });
const inspectStarted = new Promise<void>((resolve) => { markInspectStarted = resolve; });
let inspectionExecutions = 0;
const server = await start_hosted_test_server({
  port: 0,
  async inspectCase(request) {
    inspectionExecutions += 1;
    markInspectStarted();
    await inspectGate;
    return inspect_hosted_test_case(request);
  },
});
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
});
const updates: HostedTestPanelReportUpdate[] = [];
let errors = 0;
const adapter = make_hosted_test_panel_adapter(runtime, {
  reset() { updates.length = 0; },
  ingest(update) { updates.push(update); },
  showInfrastructureError() { errors += 1; },
});

await runtime.ready();
const result = await adapter.start("livemap/replay");
const report = adapter.capture();
expect_generic(result.ok && result.summary.cases === 45, "retry-safe tests.run returns the canonical replay result");
expect_generic(report?.run.id === result.runId && report.run.status === "passed", "generic report recovery reaches terminal state");
expect_generic(result.reportHostId?.startsWith("hosted-report:") && typeof result.reportRev === "number", "result identifies its dedicated report host and terminal report revision");
expect_generic(updates.flatMap((update) => update.newCases).length === 45, "incremental projection consumes every case exactly once");
expect_generic(runtime.client.recovery.strategy === "snapshot", "coordinator attaches through generic snapshot recovery");
expect_generic(errors === 0 && server.connectionCount() === 2, "coordinator and report use separately routed LiveHost connections");
const caseKey = updates.flatMap((update) => update.newCases)[0]?.key;
expect_generic(caseKey !== undefined && result.reportHostId !== undefined, "terminal report exposes an inspectable case and report host");
const pendingInspection = adapter.inspect(caseKey);
await inspectStarted;
server.disconnectConnections(result.reportHostId);
releaseInspect();
const inspected = await pendingInspection;
expect_generic(inspected.caseKey === caseKey && inspectionExecutions === 1 && runtime.status === "ready", "report reconnect recovers state and safely retries pending lazy inspection once");

adapter.dispose();
runtime.dispose();
await server.stop();
console.log(JSON.stringify({
  cases: result.summary.cases,
  reportRev: result.reportRev,
  updates: updates.length,
  sentMessages: server.metrics().sentMessages,
  sentBytes: server.metrics().sentBytes,
}));

const base = make_registered_hosted_test_suite_registry();
let executions = 0;
let release: () => void = () => undefined;
let markStarted: () => void = () => undefined;
const gate = new Promise<void>((resolve) => { release = resolve; });
const started = new Promise<void>((resolve) => { markStarted = resolve; });
const gatedRegistry = make_hosted_test_suite_registry(base.list().map((descriptor) => descriptor.id !== "livemap/replay" ? descriptor : {
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    executions += 1;
    markStarted();
    await gate;
    return descriptor.run(...args);
  },
}));
const reconnectServer = await start_hosted_test_server({ port: 0, registry: gatedRegistry });
const reconnectRuntime = make_remote_hosted_test_runtime({
  url: reconnectServer.url,
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});
await reconnectRuntime.ready();
const reconnectAdapter = make_hosted_test_panel_adapter(reconnectRuntime, {
  reset() {}, ingest() {}, showInfrastructureError(message) { throw new Error(message); },
});
const uncertain = reconnectAdapter.start("livemap/replay");
await started;
reconnectServer.disconnectConnections(HOSTED_TEST_COORDINATOR_HOST_ID);
release();
const recovered = await uncertain;
expect_generic(recovered.ok && executions === 1, "uncertain tests.run retries the same request identity without duplicate execution");
expect_generic(
  reconnectRuntime.status === "completed" && reconnectRuntime.failure === undefined,
  `bounded reconnect reattaches or creates a session and completes recovered coordinator work (status=${reconnectRuntime.status}, failure=${reconnectRuntime.failure?.message ?? "none"})`,
);
expect_generic(reconnectAdapter.capture()?.run.id === recovered.runId, "report recovery remains correlated after coordinator transport loss");
reconnectAdapter.dispose();
reconnectRuntime.dispose();
await reconnectServer.stop();
