import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  LIVEHOST_BOOTSTRAP_MEDIA_TYPE,
  create_livehost,
  create_livehost_bootstrap_client,
  decode_livehost_bootstrap,
  install_livehost_bootstrap,
} from "hson-live/livehost";
import {
  create_node_livehost_socket,
  handle_node_livehost_bootstrap_request,
  start_node_application_host,
  type NodeHostedApplication,
} from "hson-live/livehost/node";
import WebSocket from "ws";

const selector = "bootstrap-probe:shared";
const authorities = new Map([
  [selector, create_livehost({
    state: { value: 1 },
    logicalMapId: "demo-bootstrap-map",
    incarnationId: "demo-bootstrap-incarnation",
    authority: "shared",
  })],
]);
const resolvedByHttp: object[] = [];
const resolvedByWebSocket: object[] = [];

const application: NodeHostedApplication = {
  name: "bootstrap-probe",
  authorities: [{ kind: "exact", value: selector }],
  httpRoutes: [{
    method: "GET",
    path: "/_test/livehost-bootstrap",
    handle(request: IncomingMessage, response: ServerResponse) {
      return handle_node_livehost_bootstrap_request(request, response, {
        resolve(candidate) {
          const authority = authorities.get(candidate);
          if (authority === undefined) {
            return {
              ok: false,
              status: 404,
              code: "LIVEHOST_BOOTSTRAP_AUTHORITY_UNKNOWN",
              message: "Unknown bootstrap probe authority.",
            };
          }
          resolvedByHttp.push(authority);
          return {
            ok: true,
            authority,
            websocketEndpoint: `/?livehost=${encodeURIComponent(candidate)}`,
          };
        },
      });
    },
  }],
  acceptWebSocket(candidate, websocket) {
    const authority = authorities.get(candidate);
    if (authority === undefined) {
      websocket.close(1008, "Unknown bootstrap probe authority.");
      return;
    }
    resolvedByWebSocket.push(authority);
    authority.connect(create_node_livehost_socket(websocket));
  },
  dispose() {
    for (const authority of authorities.values()) authority.dispose();
    authorities.clear();
  },
};

const host = await start_node_application_host({
  host: "127.0.0.1",
  port: 0,
  applications: [application],
});

try {
  const response = await fetch(
    `${host.httpUrl}/_test/livehost-bootstrap?livehost=${encodeURIComponent(selector)}`,
    { headers: { accept: LIVEHOST_BOOTSTRAP_MEDIA_TYPE } },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), LIVEHOST_BOOTSTRAP_MEDIA_TYPE);
  const bootstrap = decode_livehost_bootstrap(await response.text());

  const authority = authorities.get(selector);
  assert.ok(authority);
  authority.map.set(["value"], 2);

  const websocket = new WebSocket(new URL(bootstrap.continuation.endpoint, host.url));
  await new Promise<void>((resolve, reject) => {
    websocket.once("open", resolve);
    websocket.once("error", reject);
  });
  const mirror = create_livehost_bootstrap_client(
    install_livehost_bootstrap(bootstrap),
    { socket: create_node_livehost_socket(websocket) },
  );
  const recovered = await mirror.connect_and_recover();
  assert.equal(recovered.strategy, "replay");

  authority.map.set(["value"], 3);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(mirror.map.capture(), authority.map.capture());
  assert.equal(resolvedByHttp.length, 1);
  assert.equal(resolvedByWebSocket.length, 1);
  assert.equal(resolvedByHttp[0], authority);
  assert.equal(resolvedByWebSocket[0], authority);

  mirror.dispose();
  websocket.close();
  process.stdout.write("ok 1 - demo consumes built LiveHost HTTP bootstrap and WebSocket continuation\n");
  process.stdout.write("1..1\n");
} finally {
  await host.stop();
}
