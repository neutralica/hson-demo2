import type { HostedTestApplication } from "../hosted-test-application";
import {
  make_cloudflare_websocket_livehost_socket,
  type CloudflareAcceptedWebSocket,
} from "./cloudflare-websocket-socket";

type CloudflareHostedTestApplication = Pick<HostedTestApplication, "connect">;

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
    const connected = application.connect(hostId, transport.socket);
    if (!connected.ok) {
      websocket.close(1008, connected.error.code ?? "Unknown hosted-test LiveHost.");
      transport.closed();
      return;
    }

    let closed = false;
    const onMessage = (event: MessageEvent): void => transport.receive(event.data as string | ArrayBuffer);
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
