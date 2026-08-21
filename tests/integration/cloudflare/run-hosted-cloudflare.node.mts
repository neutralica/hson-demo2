import type { LocusSocketLike } from "hson-live/types";
import { make_hosted_test_durable_object_runtime } from "../../harness/runtimes/cloudflare/hosted-test-durable-object-runtime";
import {
  HOSTED_TEST_DURABLE_OBJECT_NAME,
  route_hosted_test_worker_request,
} from "../../harness/runtimes/cloudflare/worker-routing";
import { create_hosted_test_application } from "../../harness/hosted/hosted-test-application";
import { compose_worker_authority_application } from "../../harness/hosted/livehost-authority-composition";
import { create_towl_authority_application } from "../../harness/hosted/towl-authority-application";
import { make_cloudflare_locus_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import { decode_test_executor_discovery } from "../../../src/shared/testing/test-discovery-contract";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { test_catalog_version } from "../../../src/shared/testing/test-catalog-contract";
import type { HostedTestSelectedRunResult } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import { hosted_test_report_cases, type HostedTestReportState } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { make_towl_socket } from "../../suites/towl/towl-test-helpers";

function expect_cloudflare(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted Cloudflare: ${message}`);
}

const routedNames: string[] = [];
const routedIds: object[] = [];
const routedRequests: Request[] = [];
const stableId = Object.freeze({ stable: true });
const namespace = {
  idFromName(name: string) {
    routedNames.push(name);
    return stableId;
  },
  get(id: object) {
    routedIds.push(id);
    return {
      async fetch(request: Request) {
        routedRequests.push(request);
        return new Response("durable-object-reached", { status: 200 });
      },
    };
  },
};

const nonUpgrade = await route_hosted_test_worker_request(
  new Request("https://worker.example/socket?locus=hosted-tests"),
  namespace,
);
expect_cloudflare(nonUpgrade.status === 426 && routedRequests.length === 0, "non-upgrade requests are rejected before Durable Object routing");

for (const url of ["https://worker.example/socket", "https://worker.example/socket?locus="] as const) {
  const response = await route_hosted_test_worker_request(
    new Request(url, { headers: { Upgrade: "websocket" } }),
    namespace,
  );
  expect_cloudflare(response.status === 400, `missing livehost is rejected for ${url}`);
}

const coordinatorRequest = new Request(
  "https://worker.example/optional/path?token=public&locus=hosted-tests",
  { headers: { Upgrade: "WebSocket" } },
);
const reportRequest = new Request(
  "https://worker.example/optional/path?token=public&locus=hosted-report%3Arun-1",
  { headers: { Upgrade: "websocket" } },
);
const coordinatorResponse = await route_hosted_test_worker_request(coordinatorRequest, namespace);
const reportResponse = await route_hosted_test_worker_request(reportRequest, namespace);
expect_cloudflare(
  coordinatorResponse.status === 200 && reportResponse.status === 200 && routedRequests.length === 2,
  "valid upgrade requests reach the Durable Object stub",
);
expect_cloudflare(
  routedNames.length === 2
    && routedNames.every((name) => name === HOSTED_TEST_DURABLE_OBJECT_NAME)
    && routedIds[0] === stableId
    && routedIds[1] === stableId,
  "multiple clients route through one stable idFromName Durable Object identity",
);
expect_cloudflare(
  routedRequests[0]?.url === coordinatorRequest.url
    && routedRequests[1]?.url === reportRequest.url
    && new URL(routedRequests[1]!.url).searchParams.get("locus") === "hosted-report:run-1",
  "the optional path, existing query, and Locus routing reach the object unchanged",
);

type Listener = (event: Readonly<{ data?: string | ArrayBuffer }>) => void;
class FakeWebSocket {
  readyState = 1;
  accepts = 0;
  readonly sent: string[] = [];
  readonly closes: Readonly<{ code?: number; reason?: string }>[] = [];
  private readonly listeners = new Map<string, Set<Listener>>();

  accept(): void { this.accepts += 1; }
  send(message: string): void { this.sent.push(message); }
  close(code?: number, reason?: string): void { this.closes.push({ ...(code === undefined ? {} : { code }), ...(reason === undefined ? {} : { reason }) }); }
  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string, data?: string | ArrayBuffer): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(data === undefined ? {} : { data });
  }
}

const hostIds: string[] = [];
const received: string[] = [];
let detachments = 0;
const application = {
  async connectBounded(hostId: string, socket: LocusSocketLike) {
    hostIds.push(hostId);
    socket.onMessage((message) => received.push(`${hostId}:${message}`));
    socket.onClose(() => undefined);
    let detached = false;
    return {
      ok: true as const,
      value() {
        if (detached) return;
        detached = true;
        detachments += 1;
      },
    };
  },
};
const runtime = make_hosted_test_durable_object_runtime(application);
const coordinatorSocket = new FakeWebSocket();
const reportSocket = new FakeWebSocket();
await runtime.accept("hosted-tests", coordinatorSocket as unknown as WebSocket & { accept(): void });
await runtime.accept("hosted-report:run-1", reportSocket as unknown as WebSocket & { accept(): void });
expect_cloudflare(
  coordinatorSocket.accepts === 1 && reportSocket.accepts === 1
    && hostIds.join("|") === "hosted-tests|hosted-report:run-1",
  "ordinary Durable Object acceptance keeps coordinator and report host IDs distinguishable in one authority",
);

coordinatorSocket.emit("message", "livehost-text-frame");
expect_cloudflare(received[0] === "hosted-tests:livehost-text-frame", "text frames reach the existing LocusSocketLike message listener");

coordinatorSocket.emit("message", new Uint8Array([1, 2, 3]).buffer);
expect_cloudflare(
  coordinatorSocket.closes.at(-1)?.code === 1003,
  "binary frames are rejected with the existing unsupported-data close code",
);

reportSocket.emit("close");
reportSocket.emit("close");
expect_cloudflare(detachments === 1, "socket close detaches its Locus connection exactly once");

runtime.dispose();
expect_cloudflare(detachments === 2, "runtime disposal detaches every remaining Locus connection");

const cloudflareDiagnosticEntries: unknown[][] = [];
const originalConsoleError = console.error;
try {
  console.error = (...args: unknown[]): void => { cloudflareDiagnosticEntries.push(args); };

  const quietRuntime = make_hosted_test_durable_object_runtime(application);
  const quietSocket = new FakeWebSocket();
  await quietRuntime.accept("hosted-tests", quietSocket as unknown as WebSocket & { accept(): void });
  quietSocket.emit("close");
  quietRuntime.dispose();
  expect_cloudflare(cloudflareDiagnosticEntries.length === 0, "successful Cloudflare authority traffic remains quiet");

  const rejectedRuntime = make_hosted_test_durable_object_runtime({
    async connectBounded() {
      return {
        ok: false as const,
        error: {
          code: "LOCUS_STORE_UNKNOWN_ID",
          message: "Unknown hosted report authority; token=report-token-value",
        },
      };
    },
  });
  const rejectedSocket = new FakeWebSocket();
  await rejectedRuntime.accept(
    "hosted-report:run-diagnostic-1",
    rejectedSocket as unknown as WebSocket & { accept(): void },
  );
  rejectedRuntime.dispose();

  const throwingRuntime = make_hosted_test_durable_object_runtime({
    async connectBounded() {
      throw new Error("Authority construction failed; authorization=Bearer top-secret", {
        cause: new Error("cookie=session-cookie-value"),
      });
    },
  });
  const throwingSocket = new FakeWebSocket();
  let throwingCause: unknown;
  try {
    await throwingRuntime.accept(
      "towl:room-secret-value",
      throwingSocket as unknown as WebSocket & { accept(): void },
    );
  } catch (cause) {
    throwingCause = cause;
  }
  throwingRuntime.dispose();
  expect_cloudflare(throwingCause instanceof Error, "Cloudflare authority exceptions retain their existing failure semantics");
} finally {
  console.error = originalConsoleError;
}

const cloudflareDiagnosticText = JSON.stringify(cloudflareDiagnosticEntries);
expect_cloudflare(
  cloudflareDiagnosticEntries.length === 2
    && cloudflareDiagnosticText.includes("authority.connect")
    && cloudflareDiagnosticText.includes("LOCUS_STORE_UNKNOWN_ID")
    && cloudflareDiagnosticText.includes("hosted-report:run-diagnostic-1")
    && cloudflareDiagnosticText.includes('"cause"'),
  `Cloudflare authority rejection and exception diagnostics retain safe operation, identity, code, stack, and cause context (${cloudflareDiagnosticText})`,
);
for (const secret of ["report-token-value", "top-secret", "session-cookie-value", "room-secret-value"] as const) {
  expect_cloudflare(!cloudflareDiagnosticText.includes(secret), `Cloudflare authority diagnostics redact ${secret}`);
}

const workerExecutorRegistry = make_cloudflare_locus_executor_registry();
const workerDiscovery = make_test_executor_discovery(workerExecutorRegistry);
const workerApplication = create_hosted_test_application({
  discovery: workerDiscovery,
  executorRegistry: workerExecutorRegistry,
});
const discoveryResponse = await workerApplication.coordinator.dispatch_action({
  type: "action",
  id: "worker-discover",
  clientId: "worker-test",
  requestId: "worker-discover-request",
  name: "tests.discover",
  payload: {},
});
expect_cloudflare(discoveryResponse.type === "ack", "the Worker-hosted application registers tests.discover");
const decodedDiscovery = discoveryResponse.type === "ack"
  ? decode_test_executor_discovery(JSON.parse(JSON.stringify(discoveryResponse.result)))
  : undefined;
expect_cloudflare(decodedDiscovery?.ok === true, "the Worker discovery response is JSON-safe and strictly decodable");
if (decodedDiscovery?.ok !== true) throw new Error("hosted Cloudflare: decoded discovery unexpectedly unavailable");
expect_cloudflare(
  decodedDiscovery.value.executor.id === "cloudflare-livehost"
    && decodedDiscovery.value.executor.kind === "cloudflare-worker",
  "the Worker executor has stable Worker identity",
);
expect_cloudflare(
  decodedDiscovery.value.executor.capabilities.provides.join(",") === "javascript",
  "the Worker advertises only the capability required by its canonical proof registry",
);
expect_cloudflare(
  decodedDiscovery.value.catalog.tests.length === workerExecutorRegistry.registrations.length
    && decodedDiscovery.value.catalog.tests.every((test) => workerExecutorRegistry.get(test.id) !== undefined),
  "every advertised Worker descriptor has exactly one executable registration",
);
expect_cloudflare(
  decodedDiscovery.value.catalogVersion === test_catalog_version(decodedDiscovery.value.catalog),
  "the Worker catalog version matches its descriptor content",
);
expect_cloudflare(
  !Object.hasOwn(decodedDiscovery.value, "externalTargets")
    && decodedDiscovery.value.catalog.suites.every((suite) => suite.executionShape === "cases"),
  "Worker discovery contains only exact executable case suites and no external side list",
);

let selectedActionNumber = 0;
async function run_worker_selected(selectionIds: readonly string[]): Promise<Readonly<{
  result: HostedTestSelectedRunResult;
  report: HostedTestReportState;
}>> {
  selectedActionNumber += 1;
  const response = await workerApplication.coordinator.dispatch_action({
    type: "action",
    id: `worker-selected-${selectedActionNumber}`,
    clientId: "worker-selected-test",
    requestId: `worker-selected-request-${selectedActionNumber}`,
    name: "tests.runSelected",
    payload: { selectionIds: [...selectionIds] },
  });
  expect_cloudflare(response.type === "ack", `Worker selected action ${selectedActionNumber} is acknowledged (${JSON.stringify(response)})`);
  const result = response.result as unknown as HostedTestSelectedRunResult;
  expect_cloudflare(typeof result.reportHostId === "string", "Worker selected action exposes its streamed report host");
  const reportHost = workerApplication.store.get(result.reportHostId);
  expect_cloudflare(reportHost !== undefined, "Worker selected report remains available through the existing report store");
  return Object.freeze({
    result,
    report: reportHost.map.snap() as HostedTestReportState,
  });
}

const workerFirst = workerExecutorRegistry.catalog.tests[0];
expect_cloudflare(workerFirst !== undefined, "Worker executor has an advertised exact test");
const workerSingle = await run_worker_selected([workerFirst.id]);
expect_cloudflare(
  workerSingle.result.ok
    && workerSingle.result.summary.cases === 1
    && hosted_test_report_cases(workerSingle.report)[0]?.id === workerFirst.id,
  "one exact advertised Worker test executes through canonical selection",
);
const workerSameSuite = workerExecutorRegistry.catalog.tests
  .filter((descriptor) => descriptor.suiteId === workerFirst.suiteId)
  .slice(0, 3);
const workerSeveral = await run_worker_selected(workerSameSuite.map((descriptor) => descriptor.id).reverse());
expect_cloudflare(
  hosted_test_report_cases(workerSeveral.report).map((testCase) => testCase.id).join("|")
    === workerSameSuite.map((descriptor) => descriptor.id).join("|"),
  `several Worker tests execute once in frozen descriptor order (observed ${hosted_test_report_cases(workerSeveral.report).map((testCase) => testCase.id).join("|")})`,
);
const workerSecondSuite = workerExecutorRegistry.catalog.tests.find((descriptor) => descriptor.suiteId !== workerFirst.suiteId);
expect_cloudflare(workerSecondSuite !== undefined, "Worker catalog includes multiple original suites");
const workerCross = await run_worker_selected([workerSecondSuite.id, workerFirst.id]);
expect_cloudflare(
  workerCross.result.summary.cases === 2 && workerCross.result.summary.suites === 2,
  "Worker exact selection spans original suites without a legacy route",
);
const workerWhole = await run_worker_selected(workerExecutorRegistry.catalog.tests.map((descriptor) => descriptor.id));
expect_cloudflare(
  workerWhole.result.ok
    && workerWhole.result.summary.cases === workerExecutorRegistry.catalog.tests.length
    && hosted_test_report_cases(workerWhole.report).length === workerExecutorRegistry.catalog.tests.length,
  "the entire discovered Worker catalog is canonically executable",
);
const nodeOnlyId = "livehost/hosted-replay-action-in-memory::hosted-replay-action-preserves-request-result-and-failure-semantics";
const nodeOnlyWorkerResponse = await workerApplication.coordinator.dispatch_action({
  type: "action",
  id: "worker-selected-node-only",
  clientId: "worker-selected-test",
  requestId: "worker-selected-node-only-request",
  name: "tests.runSelected",
  payload: { selectionIds: [nodeOnlyId] },
});
expect_cloudflare(
  nodeOnlyWorkerResponse.type === "error"
    && nodeOnlyWorkerResponse.error.message.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR")
    && nodeOnlyWorkerResponse.error.message.includes("cloudflare-livehost"),
  `the Worker rejects a Node-only stable ID before execution (${JSON.stringify(nodeOnlyWorkerResponse)})`,
);
const transformOnlyId = "transform/json/basic-test::test.unknownfail";
const transformWorkerResponse = await workerApplication.coordinator.dispatch_action({
  type: "action",
  id: "worker-selected-transform-only",
  clientId: "worker-selected-test",
  requestId: "worker-selected-transform-only-request",
  name: "tests.runSelected",
  payload: { selectionIds: [transformOnlyId] },
});
expect_cloudflare(
  transformWorkerResponse.type === "error"
    && transformWorkerResponse.error.message.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR"),
  "the Worker rejects a synthetic-DOM Transform ID before report construction",
);
const canvasOnlyId = "livetree/canvas::canvas.inscope-false-on-non-canvas-node";
const canvasWorkerResponse = await workerApplication.coordinator.dispatch_action({
  type: "action",
  id: "worker-selected-canvas-only",
  clientId: "worker-selected-test",
  requestId: "worker-selected-canvas-only-request",
  name: "tests.runSelected",
  payload: { selectionIds: [canvasOnlyId] },
});
expect_cloudflare(
  canvasWorkerResponse.type === "error"
    && canvasWorkerResponse.error.message.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR"),
  "the Worker rejects a deterministic-canvas Node ID before report construction",
);
const legacyWorkerRun = await (workerApplication.coordinator.dispatch_action as unknown as (action: unknown) => Promise<{ type: string }> )({
  type: "action",
  id: "worker-legacy-after-selected",
  clientId: "worker-selected-test",
  requestId: "worker-legacy-after-selected-request",
  name: "tests.run",
  payload: { suite: "livehost/all" },
});
expect_cloudflare(legacyWorkerRun.type === "error", "legacy Worker tests.run is rejected after canonical selection");
const workerTowl = create_towl_authority_application();
const composedWorkerApplication = compose_worker_authority_application(workerApplication, workerTowl);
const workerTowlConnection = await composedWorkerApplication.connectBounded("towl:worker-room", make_towl_socket());
expect_cloudflare(
  workerTowlConnection.ok
    && workerTowl.store.has("towl:worker-room")
    && !workerApplication.store.has("towl:worker-room"),
  "the Worker explicitly composes TOWL while keeping its authority store separate from hosted tests",
);
await composedWorkerApplication.dispose();

console.log(JSON.stringify({
  durableObjectName: HOSTED_TEST_DURABLE_OBJECT_NAME,
  routedRequests: routedRequests.map((request) => request.url),
  hostIds,
  detachments,
  discovery: {
    executor: workerDiscovery.executor.id,
    tests: workerDiscovery.catalog.tests.length,
    selectedCases: workerWhole.result.summary.cases,
    selectedSuites: workerWhole.result.summary.suites,
    nodeOnlyRejection: nodeOnlyWorkerResponse.type === "error"
      ? {
        code: nodeOnlyWorkerResponse.error.code,
        message: nodeOnlyWorkerResponse.error.message,
      }
      : null,
    transformRejection: transformWorkerResponse.type === "error"
      ? transformWorkerResponse.error.code
      : null,
    canvasRejection: canvasWorkerResponse.type === "error"
      ? canvasWorkerResponse.error.code
      : null,
    payloadBytes: new TextEncoder().encode(JSON.stringify(workerDiscovery)).byteLength,
  },
}));
