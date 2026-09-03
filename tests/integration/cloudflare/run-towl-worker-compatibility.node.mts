import type { LocusSocketLike } from "hson-live/types";
import { resolve_towl_websocket_url } from "../../../src/app/demos/towl/mount-towl";
import { make_towl_durable_object_runtime } from "../../../src/server/cloudflare/towl-durable-object-runtime";
import { TOWL_DURABLE_OBJECT_INSTANCE_NAME, route_towl_worker_request } from "../../../src/server/cloudflare/towl-worker-routing";
import { create_towl_authority_application } from "../../../src/server/towl/towl-authority-application";

function expect_towl_worker(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`TOWL Worker compatibility: ${message}`);
}

const routedNames: string[] = [];
const routedRequests: Request[] = [];
const stableId = Object.freeze({ stable: true });
const namespace = {
  idFromName(name: string) { routedNames.push(name); return stableId; },
  get(id: object) {
    expect_towl_worker(id === stableId, "the stable Durable Object id is preserved");
    return { async fetch(request: Request) { routedRequests.push(request); return new Response("towl-authority-reached"); } };
  },
};

const browserOrigin = "https://hson.terminalgothic.com";
const session = await route_towl_worker_request(new Request("https://worker.example/session", {
  headers: { Origin: browserOrigin },
}), namespace);
expect_towl_worker(session.status === 204, "browser bootstrap remains available");
expect_towl_worker(session.headers.get("access-control-allow-origin") === browserOrigin, "bootstrap CORS is exact-origin");
expect_towl_worker(session.headers.get("set-cookie") === null, "compatibility admission sets no privileged browser secret");

const websocketUrl = resolve_towl_websocket_url("shared-room", { PROD: true, VITE_LIVEHOST_WS_URL: "wss://worker.example" });
const nonUpgrade = await route_towl_worker_request(new Request(websocketUrl, { headers: { Origin: browserOrigin } }), namespace);
expect_towl_worker(nonUpgrade.status === 426, "non-upgrade TOWL requests are rejected");
const missingLocus = await route_towl_worker_request(new Request("https://worker.example/towl", {
  headers: { Origin: browserOrigin, Upgrade: "websocket" },
}), namespace);
expect_towl_worker(missingLocus.status === 400, "TOWL upgrades require a room selector");
const upgrade = await route_towl_worker_request(new Request(websocketUrl, {
  headers: { Origin: browserOrigin, Upgrade: "websocket" },
}), namespace);
expect_towl_worker(upgrade.status === 200 && routedRequests.length === 1, "the /towl upgrade reaches the Durable Object");
expect_towl_worker(routedNames[0] === TOWL_DURABLE_OBJECT_INSTANCE_NAME, "the existing provider identity is unchanged");

for (const path of ["/hosted-tests", "/circuit-verification"] as const) {
  const response = await route_towl_worker_request(new Request(`https://worker.example${path}?locus=${path.slice(1)}`, {
    headers: { Origin: browserOrigin, Upgrade: "websocket" },
  }), namespace);
  expect_towl_worker(response.status === 404, `${path} remains absent from the public Worker surface`);
}
expect_towl_worker(routedRequests.length === 1, "retired routes never reach the Durable Object");
const rejectedOrigin = await route_towl_worker_request(new Request(websocketUrl, {
  headers: { Origin: "https://unlisted.example", Upgrade: "websocket" },
}), namespace);
expect_towl_worker(rejectedOrigin.status === 403, "unlisted browser origins are rejected");

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
    listeners.add(listener); this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string, data?: string | ArrayBuffer): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(data === undefined ? {} : { data });
  }
}

const hostIds: string[] = [];
const received: string[] = [];
let detachments = 0;
const lifecycleApplication = {
  async connectBounded(hostId: string, socket: LocusSocketLike) {
    hostIds.push(hostId);
    socket.onMessage((message) => received.push(`${hostId}:${message}`));
    let detached = false;
    return { ok: true as const, value() { if (!detached) { detached = true; detachments += 1; } } };
  },
};
const runtime = make_towl_durable_object_runtime(lifecycleApplication);
const firstSocket = new FakeWebSocket();
const secondSocket = new FakeWebSocket();
await runtime.accept("towl:first-room", firstSocket as unknown as WebSocket & { accept(): void });
await runtime.accept("towl:second-room", secondSocket as unknown as WebSocket & { accept(): void });
expect_towl_worker(firstSocket.accepts === 1 && secondSocket.accepts === 1, "ordinary Durable Object socket acceptance is retained");
firstSocket.emit("message", "locus-text-frame");
expect_towl_worker(received[0] === "towl:first-room:locus-text-frame", "text frames reach the Locus socket");
firstSocket.emit("message", new Uint8Array([1, 2, 3]).buffer);
expect_towl_worker(firstSocket.closes.at(-1)?.code === 1003, "binary frames are rejected");
secondSocket.emit("close"); secondSocket.emit("close");
expect_towl_worker(detachments === 1, "socket close detaches exactly once");
runtime.dispose();
expect_towl_worker(detachments === 2, "runtime disposal detaches remaining connections");

const towl = create_towl_authority_application({
  maxRooms: 4,
  idleMs: 60_000,
  sweepIntervalMs: 60_000,
});
const actualRuntime = make_towl_durable_object_runtime(towl);
const actualSocket = new FakeWebSocket();
await actualRuntime.accept("towl:compatibility-room", actualSocket as unknown as WebSocket & { accept(): void });
expect_towl_worker(towl.hasRoom("towl:compatibility-room"), "the Worker runtime owns an actual TOWL authority");
actualSocket.emit("close"); actualRuntime.dispose(); towl.dispose();

const diagnostics: unknown[][] = [];
const originalConsoleError = console.error;
try {
  console.error = (...args: unknown[]): void => { diagnostics.push(args); };
  const rejectedRuntime = make_towl_durable_object_runtime({
    async connectBounded() {
      return { ok: false as const, error: { code: "LOCUS_STORE_UNKNOWN_ID", message: "Unknown room; token=room-token-value" } };
    },
  });
  await rejectedRuntime.accept("towl:room-secret-value", new FakeWebSocket() as unknown as WebSocket & { accept(): void });
  rejectedRuntime.dispose();
} finally { console.error = originalConsoleError; }
const diagnosticText = JSON.stringify(diagnostics);
expect_towl_worker(diagnosticText.includes("LOCUS_STORE_UNKNOWN_ID"), "safe rejection codes remain observable");
for (const secret of ["room-token-value", "room-secret-value"] as const) {
  expect_towl_worker(!diagnosticText.includes(secret), `diagnostics redact ${secret}`);
}

console.log(JSON.stringify({
  sessionStatus: session.status,
  websocketUrl,
  durableObjectName: routedNames[0],
  routedRequests: routedRequests.map((request) => request.url),
  retiredRoutes: { hostedTests: 404, circuitVerification: 404 },
  hostIds,
  detachments,
}));
