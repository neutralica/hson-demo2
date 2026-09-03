import type { LocusResult, LocusSocketLike } from "hson-live/types";
import {
  make_cloudflare_websocket_locus_socket,
  type CloudflareAcceptedWebSocket,
} from "./cloudflare-websocket-socket";

type TowlAuthorityConnector = Readonly<{
  connectBounded(hostId: string, socket: LocusSocketLike): Promise<LocusResult<() => void>>;
}>;

function redact_diagnostic_text(value: string, maxLength: number): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(authorization|cookie|token|credential|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/((?:wss?|https?):\/\/[^\s?#]+)\?[^\s#]*/gi, "$1?[redacted]")
    .slice(0, maxLength);
}

function safe_error(error: unknown, depth = 0): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return Object.freeze({ type: error === null ? "null" : typeof error });
  const code = Reflect.get(error, "code");
  return Object.freeze({
    name: error.name,
    message: redact_diagnostic_text(error.message, 2_048),
    ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? { code } : {}),
    ...(error.stack === undefined ? {} : { stack: redact_diagnostic_text(error.stack, 8_192) }),
    ...(depth === 0 && error.cause instanceof Error ? { cause: safe_error(error.cause, depth + 1) } : {}),
  });
}

function log_failure(
  operation: "authority.connect" | "websocket.error" | "websocket.message",
  error: unknown,
  rejectionCode?: unknown,
): void {
  const safeRejectionCode = typeof rejectionCode === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(rejectionCode)
    ? rejectionCode
    : undefined;
  console.error(`[towl:cloudflare] ${operation} failed`, Object.freeze({
    application: "towl",
    operation,
    authorityKind: "towl",
    authorityId: "[redacted]",
    ...(safeRejectionCode === undefined ? {} : { rejectionCode: safeRejectionCode }),
    error: safe_error(error),
  }));
}

export type TowlDurableObjectRuntime = Readonly<{
  accept(hostId: string, websocket: CloudflareAcceptedWebSocket): Promise<void>;
  dispose(): void;
}>;

export function make_towl_durable_object_runtime(application: TowlAuthorityConnector): TowlDurableObjectRuntime {
  const connections = new Map<CloudflareAcceptedWebSocket, () => void>();
  let disposed = false;

  async function accept(hostId: string, websocket: CloudflareAcceptedWebSocket): Promise<void> {
    if (disposed) {
      websocket.close(1012, "TOWL authority is restarting.");
      return;
    }

    websocket.accept();
    const transport = make_cloudflare_websocket_locus_socket(websocket);
    let connected: Awaited<ReturnType<TowlAuthorityConnector["connectBounded"]>>;
    try {
      connected = await application.connectBounded(hostId, transport.socket);
    } catch (cause) {
      log_failure("authority.connect", cause);
      transport.closed();
      throw cause;
    }
    if (!connected.ok) {
      log_failure("authority.connect", new Error(redact_diagnostic_text(connected.error.message, 2_048)), connected.error.code);
      websocket.close(1008, connected.error.code ?? "Unknown TOWL room.");
      transport.closed();
      return;
    }

    let closed = false;
    const onMessage = (event: MessageEvent): void => {
      try { transport.receive(event.data as string | ArrayBuffer); }
      catch (cause) {
        log_failure("websocket.message", cause);
        throw cause;
      }
    };
    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      websocket.removeEventListener("message", onMessage);
      websocket.removeEventListener("close", cleanup);
      websocket.removeEventListener("error", onError);
      transport.closed();
      connected.value();
      connections.delete(websocket);
    };
    const onError = (): void => {
      log_failure("websocket.error", new Error("Cloudflare WebSocket error event."));
      transport.errored();
      cleanup();
    };
    websocket.addEventListener("message", onMessage);
    websocket.addEventListener("close", cleanup);
    websocket.addEventListener("error", onError);
    connections.set(websocket, cleanup);
  }

  return Object.freeze({
    accept,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [websocket, cleanup] of [...connections]) {
        websocket.close(1012, "TOWL authority is restarting.");
        cleanup();
      }
      connections.clear();
    },
  });
}
