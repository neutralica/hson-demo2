import type { LiveHostAuthorityConnector } from "../../hosted/livehost-authority-composition";
import {
  make_cloudflare_websocket_livehost_socket,
  type CloudflareAcceptedWebSocket,
} from "./cloudflare-websocket-socket";

type CloudflareHostedTestApplication = Pick<LiveHostAuthorityConnector, "connect">;

function redact_cloudflare_diagnostic_text(value: string, maxLength: number): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(authorization|cookie|token|credential|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/((?:wss?|https?):\/\/[^\s?#]+)\?[^\s#]*/gi, "$1?[redacted]")
    .slice(0, maxLength);
}

function safe_cloudflare_authority(hostId: string): Readonly<Record<string, string>> {
  if (hostId === "hosted-tests") return Object.freeze({ authorityKind: "hosted-test-coordinator", authorityId: hostId });
  if (/^hosted-report:[A-Za-z0-9._:-]{1,240}$/.test(hostId)) {
    return Object.freeze({ authorityKind: "hosted-test-report", authorityId: hostId });
  }
  return Object.freeze({
    authorityKind: hostId.startsWith("towl:") ? "towl" : "unknown",
    authorityId: "[redacted]",
  });
}

function safe_cloudflare_error(error: unknown, depth = 0): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return Object.freeze({ type: error === null ? "null" : typeof error });
  const code = Reflect.get(error, "code");
  return Object.freeze({
    name: error.name,
    message: redact_cloudflare_diagnostic_text(error.message, 2_048),
    ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? { code } : {}),
    ...(error.stack === undefined ? {} : { stack: redact_cloudflare_diagnostic_text(error.stack, 8_192) }),
    ...(depth === 0 && error.cause instanceof Error ? { cause: safe_cloudflare_error(error.cause, depth + 1) } : {}),
  });
}

function log_cloudflare_authority_failure(
  operation: "authority.connect" | "websocket.error" | "websocket.message",
  hostId: string,
  error: unknown,
  rejectionCode?: unknown,
): void {
  const safeRejectionCode = typeof rejectionCode === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(rejectionCode)
    ? rejectionCode
    : undefined;
  console.error(`[hosted-tests:cloudflare] ${operation} failed`, Object.freeze({
    application: "hosted-tests",
    operation,
    ...safe_cloudflare_authority(hostId),
    ...(safeRejectionCode === undefined ? {} : { rejectionCode: safeRejectionCode }),
    error: safe_cloudflare_error(error),
  }));
}

export type HostedTestDurableObjectRuntime = Readonly<{
  accept(hostId: string, websocket: CloudflareAcceptedWebSocket): void;
  dispose(): void;
}>;

export function make_hosted_test_durable_object_runtime(
  application: CloudflareHostedTestApplication,
): HostedTestDurableObjectRuntime {
  const connections = new Map<CloudflareAcceptedWebSocket, () => void>();
  let disposed = false;

  function accept(hostId: string, websocket: CloudflareAcceptedWebSocket): void {
    if (disposed) {
      websocket.close(1012, "Hosted-test authority is restarting.");
      return;
    }

    // Ordinary acceptance is intentional. Keeping the socket attached to the
    // live object prevents reconstruction while this in-memory authority is in use.
    websocket.accept();
    const transport = make_cloudflare_websocket_livehost_socket(websocket);
    let connected: ReturnType<CloudflareHostedTestApplication["connect"]>;
    try {
      connected = application.connect(hostId, transport.socket);
    } catch (cause) {
      log_cloudflare_authority_failure("authority.connect", hostId, cause);
      transport.closed();
      throw cause;
    }
    if (!connected.ok) {
      log_cloudflare_authority_failure(
        "authority.connect",
        hostId,
        new Error(redact_cloudflare_diagnostic_text(connected.error.message, 2_048)),
        connected.error.code,
      );
      websocket.close(1008, connected.error.code ?? "Unknown hosted-test LiveHost.");
      transport.closed();
      return;
    }

    let closed = false;
    const onMessage = (event: MessageEvent): void => {
      try {
        transport.receive(event.data as string | ArrayBuffer);
      } catch (cause) {
        log_cloudflare_authority_failure("websocket.message", hostId, cause);
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
      log_cloudflare_authority_failure("websocket.error", hostId, new Error("Cloudflare WebSocket error event."));
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
        websocket.close(1012, "Hosted-test authority is restarting.");
        cleanup();
      }
      connections.clear();
    },
  });
}
