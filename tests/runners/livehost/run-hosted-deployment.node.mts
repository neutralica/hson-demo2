import WebSocket from "ws";
import { spawnSync } from "node:child_process";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import {
  HOSTED_TEST_WS_CONFIGURATION_ERROR,
  hosted_test_host_url,
  make_remote_hosted_test_runtime,
  resolve_hosted_test_websocket_url,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { resolve_parsing_verification_websocket_url } from "../../../src/app/demos/parse/circuit-verification-browser-transport";
import { resolve_towl_websocket_url } from "../../../src/app/demos/towl/mount-towl";
import {
  LiveHostWebSocketConfigurationError,
  resolve_livehost_websocket_base_url,
  type LiveHostBuildEnvironment,
} from "../../../src/app/livehost/browser-livehost-websocket";
import { HOSTED_TEST_COORDINATOR_HOST_ID } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import { run_selected_test_ids } from "../../harness/core/run-selected-test-suites";
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
    { ...production, VITE_LIVEHOST_WS_URL: "wss://example.test" },
  ) === "wss://example.test/",
  "production accepts an explicit secure public endpoint",
);
expect_deployment(
  resolve_hosted_test_websocket_url(
    { ...production, VITE_LIVEHOST_WS_URL: "wss://environment.invalid" },
    "wss://override.test/socket",
  ) === "wss://override.test/socket",
  "an explicit runtime URL overrides build configuration",
);

for (const endpoint of [
  "ws://localhost:4191",
  "ws://127.0.0.1:4191",
  "ws://[::1]:4191",
] as const) {
  expect_deployment(
    resolve_livehost_websocket_base_url({ ...production, VITE_LIVEHOST_WS_URL: endpoint }) === `${endpoint}/`,
    `local production simulation accepts ${endpoint}`,
  );
}

function captured_configuration_error(run: () => unknown): LiveHostWebSocketConfigurationError | undefined {
  try { run(); }
  catch (error) { return error instanceof LiveHostWebSocketConfigurationError ? error : undefined; }
  return undefined;
}

expect_deployment(
  captured_configuration_error(() => resolve_livehost_websocket_base_url(production))?.code === "LIVEHOST_WS_NOT_CONFIGURED",
  "production requires the generic LiveHost origin",
);
expect_deployment(
  captured_configuration_error(() => resolve_livehost_websocket_base_url({ ...production, VITE_LIVEHOST_WS_URL: "not a URL" }))?.code === "LIVEHOST_WS_URL_INVALID",
  "production rejects a malformed LiveHost origin",
);
expect_deployment(
  captured_configuration_error(() => resolve_livehost_websocket_base_url({ ...production, VITE_LIVEHOST_WS_URL: "wss://runtime.example/towl" }))?.code === "LIVEHOST_WS_URL_INVALID",
  "the generic LiveHost configuration rejects application-specific paths",
);
expect_deployment(
  captured_configuration_error(() => resolve_livehost_websocket_base_url({ ...production, VITE_LIVEHOST_WS_URL: "ws://public.example" }))?.code === "LIVEHOST_WS_URL_INSECURE",
  "production rejects insecure public LiveHost origins",
);
expect_deployment(
  resolve_livehost_websocket_base_url({ ...production, VITE_LIVEHOST_WS_URL: "wss://public.example" }) === "wss://public.example/",
  "production accepts a secure public LiveHost origin",
);
expect_deployment(
  captured_configuration_error(() => resolve_livehost_websocket_base_url({
    ...production,
    VITE_HOSTED_TEST_WS_URL: "wss://legacy.invalid",
  } as LiveHostBuildEnvironment))?.code === "LIVEHOST_WS_NOT_CONFIGURED",
  "the old hosted-test variable is not a generic fallback",
);

const sharedEnvironment = Object.freeze({
  ...production,
  VITE_LIVEHOST_WS_URL: "wss://runtime.example?preserved=yes&locus=old",
});
expect_deployment(
  new URL(resolve_towl_websocket_url("development-room", development)).origin === "ws://127.0.0.1:8787",
  "TOWL retains its development loopback fallback",
);
expect_deployment(
  captured_configuration_error(() => resolve_towl_websocket_url("missing-production-room", production))?.code === "LIVEHOST_WS_NOT_CONFIGURED",
  "TOWL cannot silently select loopback in production",
);
const towlUrl = new URL(resolve_towl_websocket_url("shared-room", sharedEnvironment));
expect_deployment(
  towlUrl.origin === "wss://runtime.example"
    && towlUrl.pathname === "/towl"
    && towlUrl.searchParams.get("preserved") === "yes"
    && towlUrl.searchParams.getAll("locus").join(",") === "towl:shared-room",
  "TOWL derives its path from the generic origin while preserving query and replacing locus",
);
const circuitUrl = new URL(resolve_parsing_verification_websocket_url(sharedEnvironment));
expect_deployment(
  circuitUrl.origin === "wss://runtime.example"
    && circuitUrl.pathname === "/circuit-verification"
    && circuitUrl.searchParams.get("preserved") === "yes"
    && circuitUrl.searchParams.getAll("locus").join(",") === "circuit-verifier",
  "circuit verification derives its path from the generic origin while preserving query and replacing locus",
);
const circuitOverride = new URL(resolve_parsing_verification_websocket_url(
  sharedEnvironment,
  "wss://split.example/custom?split=yes&locus=old",
));
expect_deployment(
  circuitOverride.origin === "wss://split.example"
    && circuitOverride.pathname === "/circuit-verification"
    && circuitOverride.searchParams.get("split") === "yes"
    && circuitOverride.searchParams.getAll("locus").join(",") === "circuit-verifier",
  "the explicit circuit runtime override remains supported without an application-specific environment variable",
);

const routed = hosted_test_host_url("wss://example.test/socket?token=public&locus=old", "host:new");
const routedUrl = new URL(routed);
expect_deployment(
  routedUrl.pathname === "/hosted-tests"
    && routedUrl.searchParams.get("token") === "public"
    && routedUrl.searchParams.getAll("locus").join(",") === "host:new",
  "existing query parameters survive and locus is replaced exactly once",
);

let constructedWithoutConfiguration = 0;
class NeverConstructWebSocket {
  constructor(_url: string) { constructedWithoutConfiguration += 1; }
}
const originalConsoleError = console.error;
const startupDiagnostics: unknown[][] = [];
console.error = (...args: unknown[]) => { startupDiagnostics.push(args); };
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
console.error = originalConsoleError;
expect_deployment(
  unsupportedError?.message.includes("must use ws:// or wss://") && constructedWithoutConfiguration === 0,
  "unsupported protocols fail before constructing a WebSocket",
);
unsupportedRuntime.dispose();
expect_deployment(
  startupDiagnostics.length === 2
    && startupDiagnostics.every((entry) => entry[0] === "[hosted-tests] coordinator.startup failed")
    && startupDiagnostics.every((entry) => typeof (entry[1] as { error?: { stack?: unknown } })?.error?.stack === "string"),
  "browser startup failures emit stack-bearing diagnostics while retaining concise runtime errors",
);

const executorRegistry = make_test_executor_registry(Object.freeze({
  id: "deployment-node",
  kind: "node",
  label: "Deployment fixture",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
}), Object.freeze([Object.freeze({
  suite: "hosted/deployment",
  descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const) }),
  cases: Object.freeze([{ suite: "hosted/deployment", caseId: "routing-fixture", name: "routing fixture", run() {} }]),
})]));
const server = await start_hosted_test_server({
  port: 0,
  executorRegistry,
  runSelected: (registry, selectionIds, onEvent = () => undefined, options = {}) => (
    run_selected_test_ids(registry, selectionIds, onEvent, options)
  ),
});
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

const successDiagnostics: unknown[][] = [];
console.error = (...args: unknown[]) => { successDiagnostics.push(args); };
const runtime = make_remote_hosted_test_runtime({
  url: publicBase,
  environment: production,
  WebSocketConstructor: RoutedWebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});
try {
  await runtime.ready();
  const discovery = await runtime.discover();
  const run = await runtime.start_selected([discovery.catalog.tests[0]!.id]);
  await run.ready();
  await run.actionResult;
  const initialUrls = openedUrls.map((value) => new URL(value));
  expect_deployment(
    initialUrls.length === 2
      && initialUrls.every((url) => url.origin === "wss://example.test" && url.pathname === "/hosted-tests" && url.searchParams.get("token") === "public")
      && initialUrls[0]?.searchParams.get("locus") === HOSTED_TEST_COORDINATOR_HOST_ID
      && initialUrls[1]?.searchParams.get("locus") === run.association.reportHostId,
    "coordinator and report connections share the configured base endpoint",
  );

  server.disconnectConnections(HOSTED_TEST_COORDINATOR_HOST_ID);
  const deadline = Date.now() + 1_000;
  while ((openedUrls.length < 3 || runtime.status !== "ready") && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  const reconnectUrl = openedUrls[2] === undefined ? undefined : new URL(openedUrls[2]);
  expect_deployment(
    reconnectUrl?.origin === "wss://example.test"
      && reconnectUrl.pathname === "/hosted-tests"
      && reconnectUrl.searchParams.get("token") === "public"
      && reconnectUrl.searchParams.get("locus") === HOSTED_TEST_COORDINATOR_HOST_ID
      && runtime.status === "ready",
    "coordinator reconnect reuses the configured base endpoint",
  );
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
  console.error = originalConsoleError;
}
expect_deployment(successDiagnostics.length === 0, "successful discovery, execution, and recovery remain quiet");

const serverSecret = "server-secret-must-not-appear";
const endpointSecret = "endpoint-secret-must-not-appear";
const diagnosticServer = await start_hosted_test_server({
  port: 0,
  executorRegistry,
  async runSelected() {
    throw new Error("Browser executor startup failed.", {
      cause: new Error(`Authorization: Bearer ${serverSecret}`),
    });
  },
});

function diagnostic_server_url(address: string): string {
  const publicUrl = new URL(address);
  const localUrl = new URL(diagnosticServer.url);
  localUrl.pathname = publicUrl.pathname;
  localUrl.search = publicUrl.search;
  return localUrl.toString();
}

class DiagnosticRoutedWebSocket extends WebSocket {
  constructor(address: string) { super(diagnostic_server_url(address)); }
}

class MalformedDiscoveryWebSocket extends DiagnosticRoutedWebSocket {
  override emit(event: string | symbol, ...args: any[]): boolean {
    if (event === "message" && Buffer.isBuffer(args[0])) {
      const message = JSON.parse(args[0].toString()) as {
        type?: unknown;
        result?: { executor?: unknown; protocolVersion?: unknown; catalog?: { tests?: unknown } };
      };
      if (message.type === "ack" && message.result?.executor !== undefined && message.result.catalog !== undefined) {
        args[0] = Buffer.from(JSON.stringify({
          ...message,
          result: {
            ...message.result,
            protocolVersion: 2,
            externalTargets: [],
            catalog: { tests: message.result.catalog.tests },
          },
        }));
      }
    }
    return super.emit(event, ...args);
  }
}

const malformedDiagnostics: unknown[][] = [];
console.error = (...args: unknown[]) => { malformedDiagnostics.push(args); };
const malformedRuntime = make_remote_hosted_test_runtime({
  url: `wss://diagnostics.example/socket?token=${endpointSecret}`,
  environment: production,
  WebSocketConstructor: MalformedDiscoveryWebSocket as unknown as BrowserWebSocketConstructor,
});
let malformedError: Error | undefined;
try {
  await malformedRuntime.ready();
  malformedError = await captured_error(malformedRuntime.discover());
} finally {
  malformedRuntime.dispose();
  console.error = originalConsoleError;
}
expect_deployment(
  malformedError?.message === "Invalid tests.discover result shape.",
  "malformed discovery retains a concise user-facing failure",
);
const malformedDiagnostic = malformedDiagnostics.find((entry) => (
  (entry[1] as { operation?: unknown })?.operation === "tests.discover"
))?.[1] as {
  endpoint?: unknown;
  error?: { stack?: unknown; cause?: { issues?: unknown; received?: { protocolVersion?: unknown; catalog?: { keys?: unknown } } } };
} | undefined;
expect_deployment(
  malformedDiagnostic?.endpoint === "wss://diagnostics.example"
    && typeof malformedDiagnostic.error?.stack === "string"
    && Array.isArray(malformedDiagnostic.error?.cause?.issues)
    && malformedDiagnostic.error.cause.issues.includes("$.externalTargets: unexpected field")
    && malformedDiagnostic.error.cause.issues.includes("$.catalog.suites: missing required field")
    && malformedDiagnostic.error.cause.received?.protocolVersion === 2
    && JSON.stringify(malformedDiagnostic.error.cause.received?.catalog?.keys) === JSON.stringify(["tests"])
    && !JSON.stringify(malformedDiagnostics).includes(endpointSecret),
  "malformed discovery emits bounded contract evidence without endpoint query secrets",
);

const actionDiagnostics: unknown[][] = [];
console.error = (...args: unknown[]) => { actionDiagnostics.push(args); };
const failureRuntime = make_remote_hosted_test_runtime({
  url: `wss://diagnostics.example/socket?token=${endpointSecret}`,
  environment: production,
  WebSocketConstructor: DiagnosticRoutedWebSocket as unknown as BrowserWebSocketConstructor,
});
try {
  await failureRuntime.ready();
  const discovery = await failureRuntime.discover();
  const run = await failureRuntime.start_selected([discovery.catalog.tests[0]!.id]);
  await run.ready();
  const actionError = await captured_error(run.actionResult);
  expect_deployment(actionError?.message === "Browser executor startup failed.", "hosted action rejection remains concise in the client");
  run.dispose();
} finally {
  failureRuntime.dispose();
  await diagnosticServer.stop();
  console.error = originalConsoleError;
}
const serverActionDiagnostic = actionDiagnostics.find((entry) => (
  (entry[1] as { action?: unknown })?.action === "tests.runSelected"
))?.[1] as { clientId?: unknown; requestId?: unknown; runId?: unknown; attemptId?: unknown; executorId?: unknown; error?: { stack?: unknown; cause?: unknown } } | undefined;
const browserActionDiagnostic = actionDiagnostics.find((entry) => (
  (entry[1] as { operation?: unknown })?.operation === "tests.runSelected"
))?.[1] as { endpoint?: unknown; clientId?: unknown; requestId?: unknown; executorId?: unknown; error?: { stack?: unknown } } | undefined;
const serializedActionDiagnostics = JSON.stringify(actionDiagnostics);
expect_deployment(
  typeof serverActionDiagnostic?.clientId === "string"
    && typeof serverActionDiagnostic.requestId === "string"
    && typeof serverActionDiagnostic.runId === "string"
    && typeof serverActionDiagnostic.attemptId === "string"
    && serverActionDiagnostic.executorId === "deployment-node"
    && typeof serverActionDiagnostic.error?.stack === "string"
    && serverActionDiagnostic.error.cause !== undefined
    && browserActionDiagnostic?.endpoint === "wss://diagnostics.example"
    && typeof browserActionDiagnostic.clientId === "string"
    && typeof browserActionDiagnostic.requestId === "string"
    && browserActionDiagnostic.executorId === "deployment-node"
    && typeof browserActionDiagnostic.error?.stack === "string"
    && !serializedActionDiagnostics.includes(serverSecret)
    && !serializedActionDiagnostics.includes(endpointSecret),
  "server and browser action failures retain identifiers, stack/cause, and redaction",
);

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

stopCalls = 0;
const ownerExits: number[] = [];
let observedOwnerPid: number = 0;
await run_hosted_test_server_process({
  environment: { HOST: "0.0.0.0", PORT: "4321", HSON_PLAYWRIGHT_OWNER_PID: "4242" },
  process: {
    once() {},
    exit(code) { ownerExits.push(code); },
  },
  async startServer() { return fakeServer; },
  ownerProcessExists(pid) { observedOwnerPid = pid; return false; },
  log() {},
  logError() {},
});
await new Promise<void>((resolve) => setTimeout(resolve, 150));
expect_deployment(
  observedOwnerPid === 4242 && stopCalls === 1 && ownerExits.length === 1 && ownerExits[0] === 0,
  "a vanished Playwright owner shuts down its hosted web server through the bounded stop path",
);

console.log(JSON.stringify({ openedUrls, stopCalls, configurationFailure: missingError.message }));
