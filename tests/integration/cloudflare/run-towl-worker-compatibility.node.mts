import {
  HOSTED_TEST_DURABLE_OBJECT_NAME,
  route_towl_worker_request,
} from "../../harness/runtimes/cloudflare/worker-routing";
import { resolve_towl_websocket_url } from "../../../src/app/demos/towl/mount-towl";

function expect_towl_worker(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`TOWL Worker compatibility: ${message}`);
}

const routedNames: string[] = [];
const routedRequests: Request[] = [];
const stableId = Object.freeze({ stable: true });
const namespace = {
  idFromName(name: string) {
    routedNames.push(name);
    return stableId;
  },
  get(id: object) {
    expect_towl_worker(id === stableId, "the stable Durable Object id is preserved");
    return {
      async fetch(request: Request) {
        routedRequests.push(request);
        return new Response("towl-authority-reached");
      },
    };
  },
};

const browserOrigin = "https://hson.terminalgothic.com";
const session = await route_towl_worker_request(new Request("https://worker.example/session", {
  headers: { Origin: browserOrigin },
}), namespace);
expect_towl_worker(session.status === 204, "the generic browser bootstrap is accepted without creating a credential");
expect_towl_worker(session.headers.get("access-control-allow-origin") === browserOrigin, "bootstrap CORS is exact-origin");
expect_towl_worker(session.headers.get("set-cookie") === null, "compatibility admission sets no privileged browser secret");

const websocketUrl = resolve_towl_websocket_url("shared-room", {
  PROD: true,
  VITE_LIVEHOST_WS_URL: "wss://worker.example",
});
expect_towl_worker(websocketUrl === "wss://worker.example/towl?locus=towl%3Ashared-room", "the generic origin derives the existing /towl route");
const upgrade = await route_towl_worker_request(new Request(websocketUrl, {
  headers: { Origin: browserOrigin, Upgrade: "websocket" },
}), namespace);
expect_towl_worker(upgrade.status === 200 && routedRequests.length === 1, "the /towl upgrade reaches the Durable Object");
expect_towl_worker(routedNames[0] === HOSTED_TEST_DURABLE_OBJECT_NAME, "the existing Durable Object identity is unchanged");

for (const path of ["/hosted-tests", "/circuit-verification"] as const) {
  const response = await route_towl_worker_request(new Request(`https://worker.example${path}?locus=${path.slice(1)}`, {
    headers: { Origin: browserOrigin, Upgrade: "websocket" },
  }), namespace);
  expect_towl_worker(response.status === 404, `${path} remains absent from the public Worker surface`);
}
expect_towl_worker(routedRequests.length === 1, "non-TOWL applications never reach the Durable Object");

const rejectedOrigin = await route_towl_worker_request(new Request(websocketUrl, {
  headers: { Origin: "https://unlisted.example", Upgrade: "websocket" },
}), namespace);
expect_towl_worker(rejectedOrigin.status === 403, "unlisted browser origins are rejected");

console.log(JSON.stringify({
  sessionStatus: session.status,
  websocketUrl,
  durableObjectName: routedNames[0],
  routedRequests: routedRequests.map((request) => request.url),
  hostedTestsStatus: 404,
  circuitVerificationStatus: 404,
}));
