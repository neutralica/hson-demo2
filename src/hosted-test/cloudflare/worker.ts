import { create_hosted_test_application } from "../hosted-test-application";
import { make_hosted_test_durable_object_runtime } from "./hosted-test-durable-object-runtime";
import type { CloudflareAcceptedWebSocket } from "./cloudflare-websocket-socket";
import { make_cloudflare_hosted_test_suite_registry } from "./cloudflare-hosted-test-suites";
import {
  is_websocket_upgrade,
  livehost_id,
  request_error,
  route_hosted_test_worker_request,
  type HostedTestDurableObjectNamespace,
} from "./worker-routing";

export interface HostedTestWorkerEnv {
  HOSTED_TESTS: HostedTestDurableObjectNamespace;
}

type HostedTestDurableObjectState = Readonly<{ storage: unknown }>;
type HostedTestWebSocketPair = Readonly<{
  0: CloudflareAcceptedWebSocket;
  1: CloudflareAcceptedWebSocket;
}>;

declare const WebSocketPair: { new(): HostedTestWebSocketPair };

export class HostedTestDurableObject {
  private readonly application = create_hosted_test_application(
    make_cloudflare_hosted_test_suite_registry(),
  );
  private readonly sockets = make_hosted_test_durable_object_runtime(this.application);

  constructor(
    private readonly state: HostedTestDurableObjectState,
    _env: HostedTestWorkerEnv,
  ) {
    // The SQLite-backed namespace is provisioned for the future canonical
    // checkpoint surface. This non-hibernating slice intentionally stores no
    // partial authority state and does not use state.acceptWebSocket().
    void this.state;
  }

  async fetch(request: Request): Promise<Response> {
    if (!is_websocket_upgrade(request)) return request_error("Expected a WebSocket upgrade request.", 426);
    const hostId = livehost_id(request);
    if (hostId === undefined) {
      return request_error("Hosted-test WebSocket requests require a non-empty livehost query parameter.", 400);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.sockets.accept(hostId, server);
    return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
  }
}

export default {
  fetch(request: Request, env: HostedTestWorkerEnv): Promise<Response> {
    return route_hosted_test_worker_request(request, env.HOSTED_TESTS);
  },
};
