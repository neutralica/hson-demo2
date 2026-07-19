import type { LiveHostSocketLike } from "hson-live/types";

export type CloudflareLiveHostSocket = Readonly<{
  socket: LiveHostSocketLike;
  receive(message: string | ArrayBuffer): void;
  closed(): void;
  errored(): void;
}>;

export type CloudflareAcceptedWebSocket = WebSocket & Readonly<{
  accept(): void;
}>;

export function make_cloudflare_websocket_livehost_socket(
  websocket: CloudflareAcceptedWebSocket,
): CloudflareLiveHostSocket {
  const messageListeners = new Set<(message: string) => void>();
  const closeListeners = new Set<() => void>();
  let detached = false;

  function detach(): void {
    if (detached) return;
    detached = true;
    for (const listener of [...closeListeners]) listener();
    messageListeners.clear();
    closeListeners.clear();
  }

  const socket: LiveHostSocketLike = Object.freeze({
    send(message) {
      if (!detached && websocket.readyState === 1) websocket.send(message);
    },
    close(code, reason) {
      if (!detached) websocket.close(code, reason);
    },
    onMessage(listener) {
      if (detached) return;
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onClose(listener) {
      if (detached) {
        listener();
        return;
      }
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },
  });

  return Object.freeze({
    socket,
    receive(message) {
      if (detached) return;
      if (typeof message !== "string") {
        websocket.close(1003, "LiveHost accepts text messages only.");
        return;
      }
      for (const listener of [...messageListeners]) listener(message);
    },
    closed: detach,
    errored() {
      if (detached) return;
      websocket.close(1011, "Hosted-test WebSocket error.");
      detach();
    },
  });
}
