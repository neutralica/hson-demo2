import { create_towl_authority_application } from "../towl/towl-authority-application";
import { make_towl_durable_object_runtime } from "./towl-durable-object-runtime";
import type { CloudflareAcceptedWebSocket } from "./cloudflare-websocket-socket";
import {
  is_websocket_upgrade,
  locus_id,
  request_error,
  route_towl_worker_request,
  type TowlDurableObjectNamespace,
} from "./towl-worker-routing";

export interface TowlWorkerEnv {
  // The provider-bound binding name predates retirement of hosted testing.
  HOSTED_TESTS: TowlDurableObjectNamespace;
}

type DurableObjectState = Readonly<{ storage: unknown }>;
type TowlWebSocketPair = Readonly<{
  0: CloudflareAcceptedWebSocket;
  1: CloudflareAcceptedWebSocket;
}>;

declare const WebSocketPair: { new(): TowlWebSocketPair };

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

// Cloudflare migrations bind this historical exported class name. Its runtime
// behavior is TOWL-only; changing the name requires a provider migration.
export class HostedTestDurableObject {
  private readonly towl = create_towl_authority_application({
    maxRooms: 128,
    idleMs: 30 * 60_000,
    sweepIntervalMs: 60_000,
  });
  private readonly sockets = make_towl_durable_object_runtime(this.towl);

  constructor(private readonly state: DurableObjectState, _env: TowlWorkerEnv) {
    void this.state;
  }

  async fetch(request: Request): Promise<Response> {
    if (!is_websocket_upgrade(request)) return request_error("Expected a WebSocket upgrade request.", 426);
    const hostId = locus_id(request);
    if (hostId === undefined || !hostId.startsWith("towl:")) {
      return request_error("TOWL WebSocket requests require a TOWL locus selector.", 400);
    }

    try {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      await this.sockets.accept(hostId, server);
      return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
    } catch (cause) {
      console.error("[towl:cloudflare] websocket.upgrade failed", Object.freeze({
        application: "towl",
        operation: "websocket.upgrade",
        endpoint: new URL(request.url).origin,
        authorityKind: "towl",
        authorityId: "[redacted]",
        error: safe_worker_error(cause),
      }));
      throw cause;
    }
  }
}

export default {
  fetch(request: Request, env: TowlWorkerEnv): Promise<Response> {
    return route_towl_worker_request(request, env.HOSTED_TESTS);
  },
};
