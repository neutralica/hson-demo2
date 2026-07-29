import type { HostedTestCaseInspector } from "../../app/hosted-test/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";
import type { TestExecutorRegistry } from "../../test-system/test-executor";
import {
  start_node_application_host,
  type NodeApplicationHost,
  type NodeHostOperationalEvent,
} from "./node-application-host";
import {
  create_node_hosted_tests_application,
} from "./node-hosted-tests-application";
import { create_node_towl_application } from "./node-towl-application";

export type HostedTestServerOptions = Readonly<{
  host?: string;
  port?: number;
  shutdownTimeoutMs?: number;
  registry?: HostedTestSuiteRegistry;
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  log?: (event: NodeHostOperationalEvent) => void;
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

export async function start_hosted_test_server(
  options: HostedTestServerOptions = {},
): Promise<HostedTestServer> {
  const hostedTests = await create_node_hosted_tests_application({
    ...(options.registry === undefined ? {} : { registry: options.registry }),
    ...(options.inspectCase === undefined ? {} : { inspectCase: options.inspectCase }),
    ...(options.executorRegistry === undefined ? {} : { executorRegistry: options.executorRegistry }),
  });
  const towl = create_node_towl_application();
  let host: NodeApplicationHost;
  try {
    host = await start_node_application_host({
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 8787,
      shutdownTimeoutMs: options.shutdownTimeoutMs ?? 5_000,
      applications: [hostedTests.registration, towl.registration],
      ...(options.log === undefined ? {} : { log: options.log }),
    });
  } catch (error) {
    await hostedTests.registration.dispose();
    await towl.registration.dispose();
    throw error;
  }
  return Object.freeze({
    host: host.host,
    port: host.port,
    url: host.url,
    connectionCount: host.connectionCount,
    disconnectConnections(hostId) {
      hostedTests.disconnectConnections(hostId);
    },
    metrics: hostedTests.metrics,
    stop: host.stop,
  });
}
