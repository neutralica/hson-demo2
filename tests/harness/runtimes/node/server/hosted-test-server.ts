import type { HostedTestCaseInspector } from "../../../hosted/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../../hosted/hosted-test-suite";
import type { TestExecutorRegistry } from "../../../core/test-executor";
import {
  start_node_application_host,
  type NodeApplicationHost,
  type NodeApplicationSecurity,
  type NodeHostDeployment,
  type NodeHostOperationalEvent,
} from "hson-live/livehost/node";
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
  deployment?: NodeHostDeployment;
  security?: NodeApplicationSecurity;
  authorityLifecycle?: Readonly<{
    maxTowlRooms: number;
    towlIdleMs: number;
    maxHostedReports: number;
    hostedReportRetentionMs: number;
    sweepIntervalMs: number;
  }>;
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
  const authorityLifecycle = options.authorityLifecycle ?? Object.freeze({
    maxTowlRooms: 128,
    towlIdleMs: 30 * 60_000,
    maxHostedReports: 16,
    hostedReportRetentionMs: 10 * 60_000,
    sweepIntervalMs: 30_000,
  });
  const hostedTests = await create_node_hosted_tests_application({
    ...(options.registry === undefined ? {} : { registry: options.registry }),
    ...(options.inspectCase === undefined ? {} : { inspectCase: options.inspectCase }),
    ...(options.executorRegistry === undefined ? {} : { executorRegistry: options.executorRegistry }),
    ...(options.security === undefined ? {} : { security: options.security }),
    lifecycle: {
      maxReports: authorityLifecycle.maxHostedReports,
      terminalRetentionMs: authorityLifecycle.hostedReportRetentionMs,
      sweepIntervalMs: authorityLifecycle.sweepIntervalMs,
    },
  });
  const towl = create_node_towl_application({
    ...(options.security === undefined ? {} : { security: options.security }),
    lifecycle: {
      maxRooms: authorityLifecycle.maxTowlRooms,
      idleMs: authorityLifecycle.towlIdleMs,
      sweepIntervalMs: authorityLifecycle.sweepIntervalMs,
    },
  });
  let host: NodeApplicationHost;
  try {
    host = await start_node_application_host({
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 8787,
      shutdownTimeoutMs: options.shutdownTimeoutMs ?? 5_000,
      deployment: options.deployment ?? { mode: "development" },
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
