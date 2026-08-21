import assert from "node:assert/strict";
import {
  LOCUS_BOOTSTRAP_MEDIA_TYPE,
  capture_locus_bootstrap,
  create_locus,
  create_locus_bootstrap_client,
  decode_locus_bootstrap,
  encode_locus_bootstrap,
  install_locus_bootstrap,
  type LocusSocketLike,
} from "hson-live/locus";
import { create_node_locus_socket } from "hson-live/locus/node";
import type {
  LiveHostApplication,
  LiveHostApplicationContext,
  LiveHostConnection,
} from "hson-live/livehost";
import {
  create_node_exact_origin_policy,
  start_node_application_host,
  type NodeApplicationSecurity,
} from "hson-live/livehost/node";
import WebSocket from "ws";

const selector = "bootstrap-probe:shared";
const authorities = new Map([[selector, create_locus({
  state: { value: 1 },
  logicalMapId: "demo-bootstrap-map",
  incarnationId: "demo-bootstrap-incarnation",
})]]);
const resolvedByHttp: object[] = [];
const resolvedByConnection: object[] = [];
const authenticatedTransports: string[] = [];
const authorizedApplications: string[] = [];

const security: NodeApplicationSecurity = {
  origin: create_node_exact_origin_policy({ allowedOrigins: ["https://demo.example"] }),
  authenticate(context) {
    authenticatedTransports.push(context.transport);
    return context.headers.get("authorization") === "Bearer demo-bootstrap-secret"
      ? { ok: true, value: { id: "demo-principal", anonymous: false } }
      : { ok: false, status: 401, code: "AUTH_REQUIRED" };
  },
  authorize(context, principal) {
    assert.equal(principal.id, "demo-principal");
    authorizedApplications.push(context.application);
    return { ok: true, value: undefined };
  },
};

function locus_socket(connection: LiveHostConnection): LocusSocketLike {
  return Object.freeze({
    send(message: string) { connection.send(message); },
    close(code?: number, reason?: string) { connection.close(code, reason); },
    onMessage(listener: (message: string) => void) {
      return connection.onMessage((message) => {
        if (typeof message === "string") listener(message);
        else connection.close(1003, "Locus accepts text messages only.");
      });
    },
    onClose(listener: () => void) { return connection.onClose(listener); },
  });
}

const application: LiveHostApplication = {
  name: "bootstrap-probe",
  requests: [{
    method: "GET",
    path: "/_test/locus-bootstrap",
    handle(request: Request) {
      const candidate = new URL(request.url).searchParams.get("locus") ?? "";
      const authority = authorities.get(candidate);
      if (authority === undefined) return new Response("Unknown Locus.", { status: 404 });
      resolvedByHttp.push(authority);
      return new Response(encode_locus_bootstrap(capture_locus_bootstrap(
        authority,
        candidate,
        `/bootstrap-probe?locus=${encodeURIComponent(candidate)}`,
      )), { headers: { "content-type": LOCUS_BOOTSTRAP_MEDIA_TYPE, "cache-control": "no-store" } });
    },
  }],
  connections: [{
    path: "/bootstrap-probe",
    accept(request: Request, connection: LiveHostConnection, context: LiveHostApplicationContext) {
      const candidate = new URL(request.url).searchParams.get("locus") ?? "";
      const authority = authorities.get(candidate);
      if (authority === undefined) { connection.close(1008, "Unknown bootstrap probe Locus."); return; }
      resolvedByConnection.push(authority);
      authority.connect(locus_socket(connection), {
        ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
        attachment: context.principal.value,
      });
    },
  }],
  dispose() {
    for (const authority of authorities.values()) authority.dispose();
    authorities.clear();
  },
};

const host = await start_node_application_host({
  host: "127.0.0.1",
  port: 0,
  deployment: { mode: "production" },
  applications: [application],
  security: new Map([[application.name, security]]),
});

try {
  const endpoint = `${host.httpUrl}/_test/locus-bootstrap?locus=${encodeURIComponent(selector)}`;
  assert.equal((await fetch(endpoint, { headers: { accept: LOCUS_BOOTSTRAP_MEDIA_TYPE, origin: "https://demo.example" } })).status, 401);
  assert.equal(resolvedByHttp.length, 0);
  const response = await fetch(endpoint, { headers: {
    accept: LOCUS_BOOTSTRAP_MEDIA_TYPE,
    origin: "https://demo.example",
    authorization: "Bearer demo-bootstrap-secret",
  } });
  assert.equal(response.status, 200);
  const bootstrap = decode_locus_bootstrap(await response.text());
  const authority = authorities.get(selector);
  assert.ok(authority);
  await authority.mutate((draft) => draft.set(["value"], 2));

  const websocket = new WebSocket(new URL(bootstrap.continuation.endpoint, host.url), { headers: {
    Origin: "https://demo.example",
    Authorization: "Bearer demo-bootstrap-secret",
  } });
  await new Promise<void>((resolve, reject) => {
    websocket.once("open", resolve);
    websocket.once("error", reject);
  });
  const mirror = create_locus_bootstrap_client(install_locus_bootstrap(bootstrap), {
    socket: create_node_locus_socket(websocket),
  });
  assert.equal((await mirror.connect_and_recover()).strategy, "replay");
  await authority.mutate((draft) => draft.set(["value"], 3));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(mirror.map.capture(), authority.map.capture());
  assert.deepEqual([resolvedByHttp.length, resolvedByConnection.length], [1, 1]);
  assert.deepEqual(authenticatedTransports, ["http", "http", "websocket"]);
  assert.deepEqual(authorizedApplications, ["bootstrap-probe", "bootstrap-probe"]);
  mirror.dispose();
  websocket.close();
  process.stdout.write("ok 1 - demo composes Locus bootstrap through generic LiveHost routes\n1..1\n");
} finally {
  await host.dispose();
}
