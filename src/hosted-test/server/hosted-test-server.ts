import { WebSocketServer, type WebSocket } from "ws";
import type { HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../registered-hosted-test-suites";
import { inspect_hosted_test_case } from "../hosted-test-case-inspection";
import { create_hosted_test_application, HOSTED_TEST_COORDINATOR_HOST_ID } from "../hosted-test-application";
import type { HostedTestCaseInspector } from "../../app/hosted-test/hosted-test-action";
import { make_node_websocket_livehost_socket } from "./node-websocket-socket";
import type { TestExecutorRegistry } from "../../test-system/test-executor";
import { make_test_executor_discovery } from "../../test-system/test-discovery";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { run_fresh_node_selected_test_ids } from "../run-node-selected-test-suites";

export type HostedTestServerOptions = Readonly<{
  host?: string;
  port?: number;
  registry?: HostedTestSuiteRegistry;
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
}>;

export type HostedTestServer = Readonly<{
  host: string;
  port: number;
  url: string;
  connectionCount(): number;
  disconnectConnections(hostId?: string): void;
  metrics(): Readonly<{ sentMessages: number; sentBytes: number }>;
  stop(): Promise<void>;
}>;

export async function start_hosted_test_server(options: HostedTestServerOptions = {}): Promise<HostedTestServer> {
  const bindHost = options.host ?? "127.0.0.1";
  const registry = options.registry ?? make_registered_hosted_test_suite_registry();
  const executorRegistry = options.executorRegistry ?? make_local_node_livehost_executor_registry();
  const application = create_hosted_test_application(registry, {
    inspectCase: options.inspectCase ?? inspect_hosted_test_case,
    discovery: make_test_executor_discovery(executorRegistry),
    executorRegistry,
    runSelected: run_fresh_node_selected_test_ids,
  });
  const server = new WebSocketServer({ host: bindHost, port: options.port ?? 8787 });
  const connections = new Map<WebSocket, Readonly<{ hostId: string; disconnect: () => void }>>();
  let stopped = false;
  let sentMessages = 0;
  let sentBytes = 0;

  server.on("connection", (websocket, request) => {
    const requestUrl = new URL(request.url ?? "/", `ws://${request.headers.host ?? bindHost}`);
    const hostId = requestUrl.searchParams.get("livehost") ?? HOSTED_TEST_COORDINATOR_HOST_ID;
    const connected = application.connect(hostId, make_node_websocket_livehost_socket(websocket, (message) => {
      sentMessages += 1;
      sentBytes += Buffer.byteLength(message, "utf8");
    }));
    if (!connected.ok) {
      websocket.close(1008, connected.error.code ?? "Unknown hosted-test LiveHost.");
      return;
    }
    const disconnect = connected.value;
    connections.set(websocket, { hostId, disconnect });
    websocket.once("close", () => {
      connections.get(websocket)?.disconnect();
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
    disconnectConnections(hostId) {
      for (const [websocket, connection] of [...connections]) {
        if (hostId !== undefined && connection.hostId !== hostId) continue;
        connection.disconnect();
        websocket.close(1012, "Hosted-test connection interrupted.");
      }
    },
    metrics: () => Object.freeze({ sentMessages, sentBytes }),
    async stop() {
      if (stopped) return;
      stopped = true;
      for (const [websocket, connection] of [...connections]) {
        connection.disconnect();
        websocket.close(1001, "Hosted-test server stopping.");
      }
      connections.clear();
      application.dispose();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  });
}
