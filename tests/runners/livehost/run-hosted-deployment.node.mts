import WebSocket from "ws";
import { spawnSync } from "node:child_process";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import {
  HOSTED_TEST_WS_CONFIGURATION_ERROR,
  hosted_test_host_url,
  make_remote_hosted_test_runtime,
  resolve_hosted_test_websocket_url,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { HOSTED_TEST_COORDINATOR_HOST_ID } from "../../harness/hosted/hosted-test-application.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { run_test_suites } from "../../harness/core/test-runner";
import { start_hosted_test_server, type HostedTestServer } from "../../harness/runtimes/node/server/hosted-test-server";
import {
  hosted_test_server_bind_options,
  run_hosted_test_server_process,
} from "../../harness/runtimes/node/server/hosted-test-server-process";

function expect_deployment(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted deployment: ${message}`);
}

async function captured_error(promise: Promise<unknown>): Promise<Error | undefined> {
  try { await promise; }
  catch (error) { return error instanceof Error ? error : new Error(String(error)); }
  return undefined;
}

const development = Object.freeze({ DEV: true, PROD: false });
const production = Object.freeze({ DEV: false, PROD: true });
expect_deployment(
  resolve_hosted_test_websocket_url(development) === "ws://127.0.0.1:8787",
  "development without configuration uses the local server",
);
expect_deployment(
  resolve_hosted_test_websocket_url(
    { ...production, VITE_HOSTED_TEST_WS_URL: "wss://example.test/socket" },
  ) === "wss://example.test/socket",
  "production accepts an explicit secure public endpoint",
);
expect_deployment(
  resolve_hosted_test_websocket_url(
    { ...production, VITE_HOSTED_TEST_WS_URL: "wss://environment.invalid/socket" },
    "wss://override.test/socket",
  ) === "wss://override.test/socket",
  "an explicit runtime URL overrides build configuration",
);

const routed = hosted_test_host_url("wss://example.test/socket?token=public&livehost=old", "host:new");
const routedUrl = new URL(routed);
expect_deployment(
  routedUrl.pathname === "/socket"
    && routedUrl.searchParams.get("token") === "public"
    && routedUrl.searchParams.getAll("livehost").join(",") === "host:new",
  "existing query parameters survive and livehost is replaced exactly once",
);

let constructedWithoutConfiguration = 0;
class NeverConstructWebSocket {
  constructor(_url: string) { constructedWithoutConfiguration += 1; }
}
const missingRuntime = make_remote_hosted_test_runtime({
  environment: production,
  WebSocketConstructor: NeverConstructWebSocket as unknown as BrowserWebSocketConstructor,
});
const missingError = await captured_error(missingRuntime.ready());
expect_deployment(
  missingError?.message === HOSTED_TEST_WS_CONFIGURATION_ERROR
    && missingRuntime.status === "failed"
    && missingRuntime.failure === missingError
    && constructedWithoutConfiguration === 0,
  "production fails through runtime status before constructing a WebSocket when configuration is absent",
);
missingRuntime.dispose();

const unsupportedRuntime = make_remote_hosted_test_runtime({
  url: "https://example.test/socket",
  environment: development,
  WebSocketConstructor: NeverConstructWebSocket as unknown as BrowserWebSocketConstructor,
});
const unsupportedError = await captured_error(unsupportedRuntime.ready());
expect_deployment(
  unsupportedError?.message.includes("must use ws:// or wss://") && constructedWithoutConfiguration === 0,
  "unsupported protocols fail before constructing a WebSocket",
);
unsupportedRuntime.dispose();

const registry = make_hosted_test_suite_registry([{
  id: "livemap/replay",
  label: "deployment routing fixture",
  run(onEvent = () => undefined, options = {}) {
    return run_test_suites([{
      suite: "hosted/deployment",
      cases: [{ suite: "hosted/deployment", caseId: "routing-fixture", name: "routing fixture", run() {} }],
    }], onEvent, options);
  },
}]);
const server = await start_hosted_test_server({ port: 0, registry });
const publicBase = "wss://example.test/socket?token=public";
const openedUrls: string[] = [];
class RoutedWebSocket extends WebSocket {
  constructor(address: string) {
    openedUrls.push(address);
    const publicUrl = new URL(address);
    const localUrl = new URL(server.url);
    localUrl.pathname = publicUrl.pathname;
    localUrl.search = publicUrl.search;
    super(localUrl);
  }
}

const runtime = make_remote_hosted_test_runtime({
  url: publicBase,
  environment: production,
  WebSocketConstructor: RoutedWebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});
try {
  await runtime.ready();
  const run = await runtime.start_run("livemap/replay");
  await run.actionResult;
  const initialUrls = openedUrls.map((value) => new URL(value));
  expect_deployment(
    initialUrls.length === 2
      && initialUrls.every((url) => url.origin === "wss://example.test" && url.pathname === "/socket" && url.searchParams.get("token") === "public")
      && initialUrls[0]?.searchParams.get("livehost") === HOSTED_TEST_COORDINATOR_HOST_ID
      && initialUrls[1]?.searchParams.get("livehost") === run.association.reportHostId,
    "coordinator and report connections share the configured base endpoint",
  );

  server.disconnectConnections(HOSTED_TEST_COORDINATOR_HOST_ID);
  const deadline = Date.now() + 1_000;
  while (openedUrls.length < 3 && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  const reconnectUrl = openedUrls[2] === undefined ? undefined : new URL(openedUrls[2]);
  expect_deployment(
    reconnectUrl?.origin === "wss://example.test"
      && reconnectUrl.pathname === "/socket"
      && reconnectUrl.searchParams.get("token") === "public"
      && reconnectUrl.searchParams.get("livehost") === HOSTED_TEST_COORDINATOR_HOST_ID,
    "coordinator reconnect reuses the configured base endpoint",
  );
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}

expect_deployment(
  JSON.stringify(hosted_test_server_bind_options({}))
    === JSON.stringify({ host: "127.0.0.1", port: 8787, shutdownTimeoutMs: 5000 })
    && JSON.stringify(hosted_test_server_bind_options({
      HOST: "0.0.0.0",
      PORT: "4321",
      SHUTDOWN_TIMEOUT_MS: "9000",
    })) === JSON.stringify({ host: "0.0.0.0", port: 4321, shutdownTimeoutMs: 9000 }),
  "server process reads HOST, PORT, and bounded shutdown timeout with local defaults",
);
for (const port of ["", "0", "1.5", "abc", "65536", " 8787"] as const) {
  let error: unknown;
  try { hosted_test_server_bind_options({ PORT: port }); }
  catch (cause) { error = cause; }
  expect_deployment(error instanceof Error && error.message.includes("PORT"), `invalid PORT ${JSON.stringify(port)} fails startup validation`);
}
for (const timeout of ["", "0", "1.5", "abc", "-1"] as const) {
  let error: unknown;
  try { hosted_test_server_bind_options({ SHUTDOWN_TIMEOUT_MS: timeout }); }
  catch (cause) { error = cause; }
  expect_deployment(
    error instanceof Error && error.message.includes("SHUTDOWN_TIMEOUT_MS"),
    `invalid shutdown timeout ${JSON.stringify(timeout)} fails startup validation`,
  );
}
const invalidEntry = spawnSync(
  process.execPath,
  ["--import", "tsx", "tests/harness/runtimes/node/server/hosted-test-server-entry.node.ts"],
  { cwd: process.cwd(), env: { ...process.env, PORT: "invalid" }, encoding: "utf8" },
);
expect_deployment(
  invalidEntry.status === 1 && invalidEntry.stderr.includes("Hosted-test server failed to start") && invalidEntry.stderr.includes("PORT"),
  "the production entrypoint surfaces invalid startup configuration and exits nonzero",
);

const signalListeners = new Map<string, () => void>();
const exits: number[] = [];
let stopCalls = 0;
let receivedBind: Readonly<{ host: string; port: number; shutdownTimeoutMs: number }> | undefined;
const fakeServer: HostedTestServer = {
  host: "0.0.0.0",
  port: 4321,
  url: "ws://0.0.0.0:4321",
  connectionCount: () => 0,
  connectionSnapshot: () => Object.freeze({
    total: 0,
    hostedTests: Object.freeze({
      total: 0,
      coordinator: 0,
      reports: 0,
      authorityIds: Object.freeze([]),
      sending: 0,
      inFlightMessages: 0,
      queuedMessages: 0,
      queuedBytes: 0,
      largestSentBytes: 0,
      peakInFlightMessages: 0,
      peakQueuedMessages: 0,
      peakQueuedBytes: 0,
      backpressureRejections: 0,
    }),
    towl: 0,
    circuitVerification: 0,
  }),
  disconnectConnections() {},
  metrics: () => Object.freeze({
    sentMessages: 0,
    sentBytes: 0,
    largestSentBytes: 0,
    reportSnapshots: 0,
    reportSnapshotBytes: 0,
    reportCommits: 0,
    reportCommitBytes: 0,
    reportRecoveryCommits: 0,
    reportRecoveryCommitBytes: 0,
  }),
  async stop() { stopCalls += 1; },
};
await run_hosted_test_server_process({
  environment: { HOST: "0.0.0.0", PORT: "4321" },
  process: {
    once(signal, listener) { signalListeners.set(signal, listener); },
    exit(code) { exits.push(code); },
  },
  async startServer(bind) { receivedBind = bind; return fakeServer; },
  log() {},
  logError() {},
});
signalListeners.get("SIGINT")?.();
signalListeners.get("SIGTERM")?.();
await new Promise<void>((resolve) => setTimeout(resolve, 0));
expect_deployment(
  receivedBind?.host === "0.0.0.0"
    && receivedBind.port === 4321
    && receivedBind.shutdownTimeoutMs === 5000
    && stopCalls === 1
    && exits.every((code) => code === 0),
  "signals share the existing server stop path exactly once",
);

console.log(JSON.stringify({ openedUrls, stopCalls, configurationFailure: missingError.message }));
