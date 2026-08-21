import {
  create_hosted_test_application,
  HOSTED_TEST_AUTHORITY_LIFECYCLE,
  type HostedTestApplication,
} from "../../hosted/hosted-test-application";
import { compose_worker_authority_application } from "../../hosted/livehost-authority-composition";
import { create_towl_authority_application } from "../../hosted/towl-authority-application";
import { make_hosted_test_durable_object_runtime } from "./hosted-test-durable-object-runtime";
import type { CloudflareAcceptedWebSocket } from "./cloudflare-websocket-socket";
import { make_cloudflare_locus_executor_registry } from "./cloudflare-test-executor";
import { make_test_executor_discovery } from "../../core/test-discovery";
import {
  is_websocket_upgrade,
  locus_id,
  request_error,
  route_hosted_test_worker_request,
  type HostedTestDurableObjectNamespace,
} from "./worker-routing";

export interface HostedTestWorkerEnv {
  HOSTED_TESTS: HostedTestDurableObjectNamespace;
}

export function create_cloudflare_hosted_test_application(): HostedTestApplication {
  const executorRegistry = make_cloudflare_locus_executor_registry();
  return create_hosted_test_application({
    discovery: make_test_executor_discovery(executorRegistry),
    executorRegistry,
    lifecycle: HOSTED_TEST_AUTHORITY_LIFECYCLE,
  });
}

type HostedTestDurableObjectState = Readonly<{ storage: unknown }>;
type HostedTestWebSocketPair = Readonly<{
  0: CloudflareAcceptedWebSocket;
  1: CloudflareAcceptedWebSocket;
}>;

declare const WebSocketPair: { new(): HostedTestWebSocketPair };

function redact_worker_diagnostic_text(value: string, maxLength: number): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(authorization|cookie|token|credential|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/((?:wss?|https?):\/\/[^\s?#]+)\?[^\s#]*/gi, "$1?[redacted]")
    .slice(0, maxLength);
}

function safe_worker_error(error: unknown, depth = 0): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return Object.freeze({ type: error === null ? "null" : typeof error });
  const code = Reflect.get(error, "code");
  return Object.freeze({
    name: error.name,
    message: redact_worker_diagnostic_text(error.message, 2_048),
    ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? { code } : {}),
    ...(error.stack === undefined ? {} : { stack: redact_worker_diagnostic_text(error.stack, 8_192) }),
    ...(depth === 0 && error.cause instanceof Error ? { cause: safe_worker_error(error.cause, depth + 1) } : {}),
  });
}

function safe_worker_authority(hostId: string): Readonly<Record<string, string>> {
  if (hostId === "hosted-tests") return Object.freeze({ authorityKind: "hosted-test-coordinator", authorityId: hostId });
  if (/^hosted-report:[A-Za-z0-9._:-]{1,240}$/.test(hostId)) {
    return Object.freeze({ authorityKind: "hosted-test-report", authorityId: hostId });
  }
  return Object.freeze({
    authorityKind: hostId.startsWith("towl:") ? "towl" : "unknown",
    authorityId: "[redacted]",
  });
}

export class HostedTestDurableObject {
  private readonly hostedTests = create_cloudflare_hosted_test_application();
  private readonly towl = create_towl_authority_application();
  private readonly application = compose_worker_authority_application(this.hostedTests, this.towl);
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
    const hostId = locus_id(request);
    if (hostId === undefined) {
      return request_error("Hosted-test WebSocket requests require a non-empty locus query parameter.", 400);
    }

    try {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      await this.sockets.accept(hostId, server);
      return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
    } catch (cause) {
      console.error("[hosted-tests:cloudflare] websocket.upgrade failed", Object.freeze({
        application: "hosted-tests",
        operation: "websocket.upgrade",
        endpoint: new URL(request.url).origin,
        ...safe_worker_authority(hostId),
        error: safe_worker_error(cause),
      }));
      throw cause;
    }
  }
}

export default {
  fetch(request: Request, env: HostedTestWorkerEnv): Promise<Response> {
    return route_hosted_test_worker_request(request, env.HOSTED_TESTS);
  },
};
