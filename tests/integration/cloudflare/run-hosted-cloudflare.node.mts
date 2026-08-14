import type { LiveHostSocketLike } from "hson-live/types";
import { make_hosted_test_durable_object_runtime } from "../../harness/runtimes/cloudflare/hosted-test-durable-object-runtime";
import { make_cloudflare_hosted_test_suite_registry } from "../../harness/runtimes/cloudflare/cloudflare-hosted-test-suites";
import { HOSTED_TEST_SUITE_IDS } from "../../harness/hosted/hosted-test-suite";
import {
  HOSTED_TEST_DURABLE_OBJECT_NAME,
  route_hosted_test_worker_request,
} from "../../harness/runtimes/cloudflare/worker-routing";
import { create_hosted_test_application } from "../../harness/hosted/hosted-test-application";
import { compose_worker_authority_application } from "../../harness/hosted/livehost-authority-composition";
import { create_towl_authority_application } from "../../harness/hosted/towl-authority-application";
import { make_cloudflare_livehost_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import {
  decode_test_executor_discovery,
  make_test_executor_discovery,
} from "../../harness/core/test-discovery";
import { test_catalog_version } from "../../harness/core/test-catalog";
import type { HostedTestSelectedRunResult } from "../../harness/hosted/hosted-test-action.types";
import { hosted_test_report_cases, type HostedTestReportState } from "../../harness/reporting/hosted/hosted-test-report.types";
import { make_towl_socket } from "../../suites/towl/towl-test-helpers";
import { all_livehost_suites } from "../../suites/livehost/suite-registry";

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
  new Request("https://worker.example/socket?livehost=hosted-tests"),
  namespace,
);
expect_cloudflare(nonUpgrade.status === 426 && routedRequests.length === 0, "non-upgrade requests are rejected before Durable Object routing");

for (const url of ["https://worker.example/socket", "https://worker.example/socket?livehost="] as const) {
  const response = await route_hosted_test_worker_request(
    new Request(url, { headers: { Upgrade: "websocket" } }),
    namespace,
  );
  expect_cloudflare(response.status === 400, `missing livehost is rejected for ${url}`);
}

const coordinatorRequest = new Request(
  "https://worker.example/optional/path?token=public&livehost=hosted-tests",
  { headers: { Upgrade: "WebSocket" } },
);
const reportRequest = new Request(
  "https://worker.example/optional/path?token=public&livehost=hosted-report%3Arun-1",
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
    && new URL(routedRequests[1]!.url).searchParams.get("livehost") === "hosted-report:run-1",
  "the optional path, existing query, and livehost routing reach the object unchanged",
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
  connect(hostId: string, socket: LiveHostSocketLike) {
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
runtime.accept("hosted-tests", coordinatorSocket as unknown as WebSocket & { accept(): void });
runtime.accept("hosted-report:run-1", reportSocket as unknown as WebSocket & { accept(): void });
expect_cloudflare(
  coordinatorSocket.accepts === 1 && reportSocket.accepts === 1
    && hostIds.join("|") === "hosted-tests|hosted-report:run-1",
  "ordinary Durable Object acceptance keeps coordinator and report host IDs distinguishable in one authority",
);

coordinatorSocket.emit("message", "livehost-text-frame");
expect_cloudflare(received[0] === "hosted-tests:livehost-text-frame", "text frames reach the existing LiveHostSocketLike message listener");

coordinatorSocket.emit("message", new Uint8Array([1, 2, 3]).buffer);
expect_cloudflare(
  coordinatorSocket.closes.at(-1)?.code === 1003,
  "binary frames are rejected with the existing unsupported-data close code",
);

reportSocket.emit("close");
reportSocket.emit("close");
expect_cloudflare(detachments === 1, "socket close detaches its LiveHost connection exactly once");

runtime.dispose();
expect_cloudflare(detachments === 2, "runtime disposal detaches every remaining LiveHost connection");

const registry = make_cloudflare_hosted_test_suite_registry();
expect_cloudflare(
  registry.list().length === HOSTED_TEST_SUITE_IDS.length,
  "the Worker registry keeps every existing hosted-test route explicit",
);
const replay = await registry.get("livemap/replay").run();
expect_cloudflare(replay.ok && replay.summary.cases === 45, "the Worker-compatible replay route executes through the existing runner");
const advertisedRun = await registry.get("livehost/all").run();
const advertisedLiveHostCases = all_livehost_suites().reduce((total, suite) => total + suite.cases.length, 0);
expect_cloudflare(advertisedRun.ok && advertisedRun.summary.cases === advertisedLiveHostCases, "an advertised Worker test family remains executable through the legacy run surface");
let unavailable: unknown;
try { await registry.get("hosted/all").run(); }
catch (error) { unavailable = error; }
expect_cloudflare(
  unavailable instanceof Error && unavailable.message.includes("CLOUDFLARE_HOSTED_SUITE_UNAVAILABLE"),
  "Node/jsdom-only routes remain explicit and fail without importing a shadow implementation",
);

const workerExecutorRegistry = make_cloudflare_livehost_executor_registry();
const workerDiscovery = make_test_executor_discovery(workerExecutorRegistry);
const workerApplication = create_hosted_test_application(registry, {
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
const unsupportedDiscoveryRoutes = [
  "hosted/all", "node/all", "dom/core", "canvas/core", "category/livetree", "category/livemap", "category/dev",
];
expect_cloudflare(
  !decodedDiscovery.value.catalog.tests.some((test) => unsupportedDiscoveryRoutes.includes(test.id) || unsupportedDiscoveryRoutes.includes(test.suite)),
  "legacy unsupported route IDs are absent from Worker discovery",
);

let selectedActionNumber = 0;
async function run_worker_selected(testIds: readonly string[]): Promise<Readonly<{
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
    payload: { testIds: [...testIds] },
  });
  expect_cloudflare(response.type === "ack", `Worker selected action ${selectedActionNumber} is acknowledged (${JSON.stringify(response)})`);
  const result = response.result as unknown as HostedTestSelectedRunResult;
  expect_cloudflare(typeof result.reportHostId === "string", "Worker selected action exposes its streamed report host");
  const reportHost = workerApplication.store.get(result.reportHostId);
  expect_cloudflare(reportHost !== undefined, "Worker selected report remains available through the existing report store");
  return Object.freeze({
    result,
    report: reportHost.map.capture().value as HostedTestReportState,
  });
}

const workerFirst = workerExecutorRegistry.catalog.tests[0];
expect_cloudflare(workerFirst !== undefined, "Worker executor has an advertised exact test");
const workerSingle = await run_worker_selected([workerFirst.id]);
expect_cloudflare(
  workerSingle.result.ok
    && workerSingle.result.summary.cases === 1
    && hosted_test_report_cases(workerSingle.report)[0]?.key === workerFirst.id,
  "one exact advertised Worker test executes through canonical selection",
);
const workerSameSuite = workerExecutorRegistry.catalog.tests
  .filter((descriptor) => descriptor.suiteId === workerFirst.suiteId)
  .slice(0, 3);
const workerSeveral = await run_worker_selected(workerSameSuite.map((descriptor) => descriptor.id).reverse());
expect_cloudflare(
  hosted_test_report_cases(workerSeveral.report).map((testCase) => testCase.key).join("|")
    === workerSameSuite.map((descriptor) => descriptor.id).join("|"),
  `several Worker tests execute once in frozen descriptor order (observed ${hosted_test_report_cases(workerSeveral.report).map((testCase) => testCase.key).join("|")})`,
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
  payload: { testIds: [nodeOnlyId] },
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
  payload: { testIds: [transformOnlyId] },
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
  payload: { testIds: [canvasOnlyId] },
});
expect_cloudflare(
  canvasWorkerResponse.type === "error"
    && canvasWorkerResponse.error.message.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR"),
  "the Worker rejects a deterministic-canvas Node ID before report construction",
);
const legacyWorkerRun = await workerApplication.coordinator.dispatch_action({
  type: "action",
  id: "worker-legacy-after-selected",
  clientId: "worker-selected-test",
  requestId: "worker-legacy-after-selected-request",
  name: "tests.run",
  payload: { suite: "livehost/all" },
});
expect_cloudflare(legacyWorkerRun.type === "ack", "legacy Worker tests.run remains operational after canonical selection");
const workerTowl = create_towl_authority_application();
const composedWorkerApplication = compose_worker_authority_application(workerApplication, workerTowl);
const workerTowlConnection = composedWorkerApplication.connect("towl:worker-room", make_towl_socket());
expect_cloudflare(
  workerTowlConnection.ok
    && workerTowl.store.has("towl:worker-room")
    && !workerApplication.store.has("towl:worker-room"),
  "the Worker explicitly composes TOWL while keeping its authority store separate from hosted tests",
);
composedWorkerApplication.dispose();

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
