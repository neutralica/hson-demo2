import { HOSTED_TEST_COORDINATOR_HOST_ID } from "../../harness/hosted/hosted-test-application.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import {
  bounded,
  eventually,
  make_real_websocket_probe,
  make_real_websocket_runtime,
} from "../../suites/livehost/real-websocket-test-runtime";

function expect_lifecycle(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted WebSocket lifecycle: ${message}`);
}

const server = await start_hosted_test_server({ port: 0 });
const runtimeA = make_real_websocket_runtime(server.url);
const runtimeB = make_real_websocket_runtime(server.url);
const probeA = make_real_websocket_probe(runtimeA);
const probeB = make_real_websocket_probe(runtimeB);
try {
  await Promise.all([probeA.ready(), probeB.ready()]);
  const [resultA, resultB] = await Promise.all([
    probeA.start("livemap/replay"),
    probeB.start("livehost/all"),
  ]);
  expect_lifecycle(resultA.runId !== resultB.runId, "two clients receive distinct run IDs");
  expect_lifecycle(resultA.summary.cases === 45 && probeA.adapter.capture()?.run.id === resultA.runId, "client A follows only its dedicated replay report host");
  expect_lifecycle(resultB.summary.cases === 174 && probeB.adapter.capture()?.run.id === resultB.runId, "client B follows only its dedicated LiveHost report host");
  expect_lifecycle(probeA.errors.length === 0 && probeB.errors.length === 0, "report streams never cross clients");
} finally {
  probeA.dispose();
  probeB.dispose();
  await bounded(server.stop(), "multi-client server shutdown");
}

const base = make_registered_hosted_test_suite_registry();
let executions = 0;
let release: () => void = () => undefined;
let markStarted: () => void = () => undefined;
const gate = new Promise<void>((resolve) => { release = resolve; });
const started = new Promise<void>((resolve) => { markStarted = resolve; });
const reconnectRegistry = make_hosted_test_suite_registry(base.list().map((descriptor) => descriptor.id !== "livemap/replay" ? descriptor : {
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    executions += 1;
    markStarted();
    await gate;
    return descriptor.run(...args);
  },
}));
const reconnectServer = await start_hosted_test_server({ port: 0, registry: reconnectRegistry });
const reconnectRuntime = make_real_websocket_runtime(reconnectServer.url);
const reconnectProbe = make_real_websocket_probe(reconnectRuntime);
try {
  await reconnectProbe.ready();
  const pending = reconnectProbe.start("livemap/replay");
  await bounded(started, "gated run start");
  reconnectServer.disconnectConnections(HOSTED_TEST_COORDINATOR_HOST_ID);
  release();
  const recovered = await pending;
  expect_lifecycle(recovered.ok && executions === 1, "an uncertain coordinator disconnect retries the same action identity without duplicate execution");
  expect_lifecycle(reconnectProbe.adapter.capture()?.run.id === recovered.runId, "the dedicated report is recovered with strict run identity");
} finally {
  release();
  reconnectProbe.dispose();
  await bounded(reconnectServer.stop(), "reconnect server shutdown");
}

let releaseShutdown: () => void = () => undefined;
let markShutdownStarted: () => void = () => undefined;
const shutdownGate = new Promise<void>((resolve) => { releaseShutdown = resolve; });
const shutdownStarted = new Promise<void>((resolve) => { markShutdownStarted = resolve; });
const shutdownRegistry = make_hosted_test_suite_registry(base.list().map((descriptor) => descriptor.id !== "livemap/replay" ? descriptor : {
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    markShutdownStarted();
    await shutdownGate;
    return descriptor.run(...args);
  },
}));
const shutdownServer = await start_hosted_test_server({ port: 0, registry: shutdownRegistry });
const shutdownRuntime = make_real_websocket_runtime(shutdownServer.url);
const shutdownProbe = make_real_websocket_probe(shutdownRuntime);
await shutdownProbe.ready();
const shutdownPending = shutdownProbe.start("livemap/replay");
await bounded(shutdownStarted, "shutdown run start");
const stopping = shutdownServer.stop();
let shutdownFailure: unknown;
try {
  await shutdownPending;
} catch (error) {
  shutdownFailure = error;
}
expect_lifecycle(shutdownFailure instanceof Error, "server shutdown rejects a connected pending action instead of hanging");
releaseShutdown();
await bounded(stopping, "connected server shutdown");
await eventually(() => shutdownServer.connectionCount() === 0, "shutdown connection cleanup");
shutdownProbe.dispose();

const freshServer = await start_hosted_test_server({ port: 0 });
const freshRuntime = make_real_websocket_runtime(freshServer.url);
const freshProbe = make_real_websocket_probe(freshRuntime);
try {
  await freshProbe.ready();
  const fresh = await freshProbe.start("livemap/replay");
  expect_lifecycle(fresh.ok && fresh.summary.cases === 45, "a fresh client and server complete a new execution after shutdown");
  expect_lifecycle(freshProbe.adapter.capture()?.run.id === fresh.runId, "fresh completion retains strict report/run identity");
} finally {
  freshProbe.dispose();
  await bounded(freshServer.stop(), "fresh server shutdown");
}

console.log("hosted WebSocket lifecycle: ok");
