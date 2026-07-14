import type { LiveHostSocketLike } from "hson-live/types";

export type BrowserWebSocketReadyState = "connecting" | "open" | "closed";

export type BrowserWebSocketLike = Readonly<{
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: Readonly<{ data: unknown }>) => void): void;
  addEventListener(type: "close", listener: () => void): void;
  addEventListener(type: "error", listener: () => void): void;
  removeEventListener(type: "open", listener: () => void): void;
  removeEventListener(type: "message", listener: (event: Readonly<{ data: unknown }>) => void): void;
  removeEventListener(type: "close", listener: () => void): void;
  removeEventListener(type: "error", listener: () => void): void;
}>;

export type BrowserWebSocketConstructor = new (url: string) => BrowserWebSocketLike;

export type HostedTestBrowserSocket = Readonly<{
  socket: LiveHostSocketLike;
  ready: Promise<void>;
  readonly status: BrowserWebSocketReadyState;
  dispose(): void;
}>;

export function make_hosted_test_browser_websocket(
  url: string,
  WebSocketConstructor: BrowserWebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor,
): HostedTestBrowserSocket {
  const websocket = new WebSocketConstructor(url);
  const messageListeners = new Set<(message: string) => void>();
  const closeListeners = new Set<() => void>();
  let status: BrowserWebSocketReadyState = "connecting";
  let disposed = false;
  let resolveReady: () => void = () => undefined;
  let rejectReady: (error: Error) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const onOpen = (): void => {
    if (disposed) return;
    status = "open";
    resolveReady();
  };
  const onMessage = (event: Readonly<{ data: unknown }>): void => {
    if (disposed) return;
    if (typeof event.data !== "string") {
      websocket.close(1003, "LiveHost accepts text messages only.");
      return;
    }
    for (const listener of [...messageListeners]) listener(event.data);
  };
  const onClose = (): void => {
    if (status === "connecting") rejectReady(new Error("Hosted-test WebSocket closed before opening."));
    status = "closed";
    for (const listener of [...closeListeners]) listener();
  };
  const onError = (): void => {
    if (status === "connecting") rejectReady(new Error(`Unable to connect hosted-test WebSocket at ${url}.`));
  };

  websocket.addEventListener("open", onOpen);
  websocket.addEventListener("message", onMessage);
  websocket.addEventListener("close", onClose);
  websocket.addEventListener("error", onError);

  const socket: LiveHostSocketLike = {
    send(message) {
      if (status !== "open") throw new Error("Hosted-test WebSocket is not open.");
      websocket.send(message);
    },
    close(code, reason) {
      websocket.close(code, reason);
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    onClose(listener) {
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },
  };

  return Object.freeze({
    socket,
    ready,
    get status() { return status; },
    dispose() {
      if (disposed) return;
      if (status === "connecting") rejectReady(new Error("Hosted-test WebSocket disposed before opening."));
      disposed = true;
      messageListeners.clear();
      closeListeners.clear();
      websocket.removeEventListener("open", onOpen);
      websocket.removeEventListener("message", onMessage);
      websocket.removeEventListener("close", onClose);
      websocket.removeEventListener("error", onError);
      if (status !== "closed") websocket.close(1000, "Hosted-test client disposed.");
      status = "closed";
    },
  });
}
