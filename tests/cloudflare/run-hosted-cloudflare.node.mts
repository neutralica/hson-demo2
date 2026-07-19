import type { LiveHostSocketLike } from "hson-live/types";
import { make_hosted_test_durable_object_runtime } from "../../src/hosted-test/cloudflare/hosted-test-durable-object-runtime";
import { make_cloudflare_hosted_test_suite_registry } from "../../src/hosted-test/cloudflare/cloudflare-hosted-test-suites";
import { HOSTED_TEST_SUITE_IDS } from "../../src/app/hosted-test/hosted-test-suite";
import {
  HOSTED_TEST_DURABLE_OBJECT_NAME,
  route_hosted_test_worker_request,
} from "../../src/hosted-test/cloudflare/worker-routing";

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
let unavailable: unknown;
try { await registry.get("hosted/all").run(); }
catch (error) { unavailable = error; }
expect_cloudflare(
  unavailable instanceof Error && unavailable.message.includes("CLOUDFLARE_HOSTED_SUITE_UNAVAILABLE"),
  "Node/jsdom-only routes remain explicit and fail without importing a shadow implementation",
);

console.log(JSON.stringify({
  durableObjectName: HOSTED_TEST_DURABLE_OBJECT_NAME,
  routedRequests: routedRequests.map((request) => request.url),
  hostIds,
  detachments,
}));
