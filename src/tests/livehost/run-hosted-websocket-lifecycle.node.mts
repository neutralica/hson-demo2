import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import { run_hosted_test_action } from "../../app/hosted-test/hosted-test-action";
import { make_hosted_test_report_router } from "../../app/hosted-test/hosted-test-report-router";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_lifecycle(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted WebSocket lifecycle: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;

const server = await start_hosted_test_server({ port: 0 });
const runtimeA = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
const runtimeB = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
await Promise.all([runtimeA.ready(), runtimeB.ready()]);
const routerA = make_hosted_test_report_router(runtimeA.client);
const routerB = make_hosted_test_report_router(runtimeB.client);
const [resultA, resultB, mirrorA, mirrorB] = await Promise.all([
  run_hosted_test_action(runtimeA.client, "livemap/replay"),
  run_hosted_test_action(runtimeB.client, "livehost/all"),
  routerA.wait_for_terminal(),
  routerB.wait_for_terminal(),
]);
routerA.accept_result(resultA);
routerB.accept_result(resultB);
expect_lifecycle(resultA.runId !== resultB.runId, "two real clients receive distinct run IDs");
expect_lifecycle(mirrorA.suite === "livemap/replay" && mirrorA.capture().value.summary.cases === 45 && mirrorA.rev === 5, "client A receives only focused replay state");
expect_lifecycle(mirrorB.suite === "livehost/all" && mirrorB.capture().value.summary.cases === 157 && mirrorB.rev === 13, "client B receives only LiveHost collection state");
expect_lifecycle(routerA.failure === undefined && routerB.failure === undefined, "connection-scoped event delivery prevents stream crossover");
routerA.dispose();
routerB.dispose();
runtimeA.dispose();
runtimeB.dispose();
await server.stop();

const base = make_registered_hosted_test_suite_registry();
let release: () => void = () => undefined;
let markStarted: () => void = () => undefined;
const gate = new Promise<void>((resolve) => { release = resolve; });
const started = new Promise<void>((resolve) => { markStarted = resolve; });
let gated = true;
const gatedRegistry = make_hosted_test_suite_registry(base.list().map((descriptor) => ({
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    if (descriptor.id === "livemap/replay" && gated) {
      gated = false;
      markStarted();
      await gate;
    }
    return descriptor.run(...args);
  },
})));
const disconnectServer = await start_hosted_test_server({ port: 0, registry: gatedRegistry });
const disconnectRuntime = make_remote_hosted_test_runtime({ url: disconnectServer.url, WebSocketConstructor });
await disconnectRuntime.ready();
const pending = run_hosted_test_action(disconnectRuntime.client, "livemap/replay");
await started;
disconnectRuntime.dispose();
let disconnectedRejected = false;
try { await pending; } catch { disconnectedRejected = true; }
expect_lifecycle(disconnectedRejected, "disconnect rejects the pending action through existing client lifecycle");
release();
await new Promise((resolve) => setTimeout(resolve, 0));

const laterRuntime = make_remote_hosted_test_runtime({ url: disconnectServer.url, WebSocketConstructor });
await laterRuntime.ready();
const laterResult = await run_hosted_test_action(laterRuntime.client, "livemap/replay");
expect_lifecycle(laterResult.ok && laterResult.summary.cases === 45, "server remains healthy for a later fresh client");
laterRuntime.dispose();
await disconnectServer.stop();

const shutdownBase = make_registered_hosted_test_suite_registry();
let releaseShutdown: () => void = () => undefined;
let markShutdownStarted: () => void = () => undefined;
const shutdownGate = new Promise<void>((resolve) => { releaseShutdown = resolve; });
const shutdownStarted = new Promise<void>((resolve) => { markShutdownStarted = resolve; });
const shutdownRegistry = make_hosted_test_suite_registry(shutdownBase.list().map((descriptor) => ({
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    if (descriptor.id === "livemap/replay") {
      markShutdownStarted();
      await shutdownGate;
    }
    return descriptor.run(...args);
  },
})));
const shutdownServer = await start_hosted_test_server({ port: 0, registry: shutdownRegistry });
const shutdownRuntime = make_remote_hosted_test_runtime({ url: shutdownServer.url, WebSocketConstructor });
await shutdownRuntime.ready();
const shutdownPending = run_hosted_test_action(shutdownRuntime.client, "livemap/replay");
await shutdownStarted;
await shutdownServer.stop();
let shutdownRejected = false;
try { await shutdownPending; } catch { shutdownRejected = true; }
expect_lifecycle(shutdownRejected, "server shutdown rejects a connected pending action");
expect_lifecycle(shutdownRuntime.status === "failed" && shutdownServer.connectionCount() === 0, "server shutdown closes the runtime and all server connections");
let laterDisconnectedRejected = false;
try { await run_hosted_test_action(shutdownRuntime.client, "livemap/replay"); } catch { laterDisconnectedRejected = true; }
expect_lifecycle(laterDisconnectedRejected, "later disconnected action rejects immediately");
releaseShutdown();
shutdownRuntime.dispose();

const freshServer = await start_hosted_test_server({ port: 0 });
const freshRuntime = make_remote_hosted_test_runtime({ url: freshServer.url, WebSocketConstructor });
await freshRuntime.ready();
const freshResult = await run_hosted_test_action(freshRuntime.client, "livemap/replay");
expect_lifecycle(freshResult.ok && freshResult.summary.cases === 45, "a newly constructed client reconnects for a fresh run");
freshRuntime.dispose();
await freshServer.stop();

console.log("hosted WebSocket lifecycle: ok");
