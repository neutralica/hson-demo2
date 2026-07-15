import { WebSocketServer, type WebSocket } from "ws";
import { create_hosted_test_livehost, make_hosted_test_run_retention } from "../../app/hosted-test/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../registered-hosted-test-suites";
import { inspect_hosted_test_case } from "../hosted-test-case-inspection";
import { make_node_websocket_livehost_socket } from "./node-websocket-socket";

export type HostedTestServerOptions = Readonly<{
  host?: string;
  port?: number;
  registry?: HostedTestSuiteRegistry;
}>;

export type HostedTestServer = Readonly<{
  host: string;
  port: number;
  url: string;
  connectionCount(): number;
  metrics(): Readonly<{ sentMessages: number; sentBytes: number }>;
  stop(): Promise<void>;
}>;

export async function start_hosted_test_server(options: HostedTestServerOptions = {}): Promise<HostedTestServer> {
  const bindHost = options.host ?? "127.0.0.1";
  const registry = options.registry ?? make_registered_hosted_test_suite_registry();
  const retention = make_hosted_test_run_retention(16);
  const liveHost = create_hosted_test_livehost(registry, undefined, undefined, {}, inspect_hosted_test_case, retention);
  const server = new WebSocketServer({ host: bindHost, port: options.port ?? 8787 });
  const connections = new Map<WebSocket, () => void>();
  let stopped = false;
  let sentMessages = 0;
  let sentBytes = 0;

  server.on("connection", (websocket) => {
    const disconnect = liveHost.connect(make_node_websocket_livehost_socket(websocket, (message) => {
      sentMessages += 1;
      sentBytes += Buffer.byteLength(message, "utf8");
    }));
    connections.set(websocket, disconnect);
    websocket.once("close", () => {
      connections.get(websocket)?.();
      connections.delete(websocket);
    });
    websocket.once("error", () => websocket.close(1011, "Hosted-test WebSocket error."));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (typeof address === "string" || address === null) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Hosted-test server did not expose a TCP port.");
  }
  const port = address.port;

  return Object.freeze({
    host: bindHost,
    port,
    url: `ws://${bindHost}:${port}`,
    connectionCount: () => connections.size,
    metrics: () => Object.freeze({ sentMessages, sentBytes }),
    async stop() {
      if (stopped) return;
      stopped = true;
      for (const [websocket, disconnect] of [...connections]) {
        disconnect();
        websocket.close(1001, "Hosted-test server stopping.");
      }
      connections.clear();
      retention.clear();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  });
}
