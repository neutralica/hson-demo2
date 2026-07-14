import { create_livehost_client } from "hson-live";
import type { LiveHostClient } from "hson-live/types";
import type { HostedTestActions } from "../../hosted-test/hosted-test-action.types";
import {
  make_hosted_test_browser_websocket,
  type BrowserWebSocketConstructor,
  type HostedTestBrowserSocket,
} from "../../hosted-test/browser-websocket-socket";

export type HostedTestPanelRuntimeStatus = "connecting" | "ready" | "failed" | "disposed";

export type HostedTestPanelRuntime = Readonly<{
  client: LiveHostClient<undefined, HostedTestActions>;
  readonly status: HostedTestPanelRuntimeStatus;
  readonly failure: Error | undefined;
  ready(): Promise<void>;
  dispose(): void;
}>;

export type HostedTestPanelRuntimeOptions = Readonly<{
  url?: string;
  WebSocketConstructor?: BrowserWebSocketConstructor;
}>;

function configured_url(): string {
  const meta = import.meta as ImportMeta & { readonly env?: Readonly<{ VITE_HOSTED_TEST_WS_URL?: string }> };
  return meta.env?.VITE_HOSTED_TEST_WS_URL ?? "ws://127.0.0.1:8787";
}

export function make_remote_hosted_test_runtime(
  options: HostedTestPanelRuntimeOptions = {},
): HostedTestPanelRuntime {
  const transport: HostedTestBrowserSocket = make_hosted_test_browser_websocket(
    options.url ?? configured_url(),
    options.WebSocketConstructor,
  );
  const client = create_livehost_client<undefined, HostedTestActions>({ socket: transport.socket });
  let status: HostedTestPanelRuntimeStatus = "connecting";
  let retainedFailure: Error | undefined;
  let disposed = false;
  const stopTransportClose = transport.socket.onClose(() => {
    if (disposed) return;
    retainedFailure = new Error("Hosted-test WebSocket connection closed.");
    status = "failed";
  });
  const readiness = transport.ready.then(() => {
    if (disposed) throw new Error("Hosted-test runtime was disposed while connecting.");
    client.connect();
    status = "ready";
  }).catch((cause: unknown) => {
    retainedFailure = cause instanceof Error ? cause : new Error(String(cause));
    if (!disposed) status = "failed";
    throw retainedFailure;
  });

  return Object.freeze({
    client,
    get status() { return status; },
    get failure() { return retainedFailure; },
    ready: () => readiness,
    dispose() {
      if (disposed) return;
      disposed = true;
      status = "disposed";
      client.disconnect();
      stopTransportClose?.();
      transport.dispose();
    },
  });
}
