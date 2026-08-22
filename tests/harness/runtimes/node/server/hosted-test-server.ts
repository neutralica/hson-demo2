import type { HostedTestCaseInspector } from "../../../hosted/hosted-test-action";
import type { HostedTestApplicationOptions } from "../../../hosted/hosted-test-application";
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
import { create_node_circuit_verification_application } from "./node-circuit-verification-application";
import { CIRCUIT_VERIFICATION_HOST_ID } from "../../../../../src/shared/circuit-verification-contract";
import type { HostedTestTimelineObserver } from "../../../../../src/shared/hosted-tests/hosted-test-timeline";
import { HOSTED_TEST_AUTHORITY_LIFECYCLE } from "../../../hosted/hosted-test-application";
import type { H2ExecutorTestHooks } from "../h2-isolated-verification";

export type HostedTestServerOptions = Readonly<{
  host?: string;
  port?: number;
  shutdownTimeoutMs?: number;
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  runSelected?: NonNullable<HostedTestApplicationOptions["runSelected"]>;
  log?: (event: NodeHostOperationalEvent) => void;
  deployment?: NodeHostDeployment;
  security?: NodeApplicationSecurity;
  timeline?: HostedTestTimelineObserver;
  /** Private hosted-harness seam for lifecycle certification. */
  h2TestHooks?: H2ExecutorTestHooks;
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
  connectionSnapshot(): Readonly<{
    total: number;
    hostedTests: ReturnType<Awaited<ReturnType<typeof create_node_hosted_tests_application>>["connectionSnapshot"]>;
    towl: number;
    circuitVerification: number;
  }>;
  disconnectConnections(hostId?: string): void;
  metrics(): ReturnType<Awaited<ReturnType<typeof create_node_hosted_tests_application>>["metrics"]>;
  browserMetrics?(): ReturnType<Awaited<ReturnType<typeof create_node_hosted_tests_application>>["browserMetrics"]>;
  stop(): Promise<void>;
}>;

export async function start_hosted_test_server(
  options: HostedTestServerOptions = {},
): Promise<HostedTestServer> {
  const authorityLifecycle = options.authorityLifecycle ?? Object.freeze({
    maxTowlRooms: 128,
    towlIdleMs: 30 * 60_000,
    maxHostedReports: HOSTED_TEST_AUTHORITY_LIFECYCLE.maxReports,
    hostedReportRetentionMs: HOSTED_TEST_AUTHORITY_LIFECYCLE.terminalRetentionMs,
    sweepIntervalMs: HOSTED_TEST_AUTHORITY_LIFECYCLE.sweepIntervalMs,
  });
  const hostedTests = await create_node_hosted_tests_application({
    ...(options.inspectCase === undefined ? {} : { inspectCase: options.inspectCase }),
    ...(options.executorRegistry === undefined ? {} : { executorRegistry: options.executorRegistry }),
    ...(options.runSelected === undefined ? {} : { runSelected: options.runSelected }),
    ...(options.security === undefined ? {} : { security: options.security }),
    ...(options.timeline === undefined ? {} : { timeline: options.timeline }),
    ...(options.h2TestHooks === undefined ? {} : { h2TestHooks: options.h2TestHooks }),
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
  let circuitVerification;
  try {
    circuitVerification = await create_node_circuit_verification_application({
      ...(options.security === undefined ? {} : { security: options.security }),
    });
  } catch (error) {
    await hostedTests.registration.dispose();
    await towl.registration.dispose();
    throw error;
  }
  let host: NodeApplicationHost;
  try {
    host = await start_node_application_host({
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 8787,
      shutdownTimeoutMs: options.shutdownTimeoutMs ?? 5_000,
      deployment: options.deployment ?? { mode: "development" },
      applications: [hostedTests.registration, towl.registration, circuitVerification.registration],
      ...(options.security === undefined ? {} : {
        security: new Map([
          [hostedTests.registration.name, options.security],
          [towl.registration.name, options.security],
          [circuitVerification.registration.name, options.security],
        ]),
      }),
      ...(options.log === undefined ? {} : { log: options.log }),
    });
  } catch (error) {
    await hostedTests.registration.dispose();
    await towl.registration.dispose();
    await circuitVerification.registration.dispose();
    throw error;
  }
  return Object.freeze({
    host: host.host,
    port: host.port,
    url: host.url,
    connectionCount: host.connectionCount,
    connectionSnapshot() {
      return Object.freeze({
        total: host.connectionCount(),
        hostedTests: hostedTests.connectionSnapshot(),
        towl: towl.connectionCount(),
        circuitVerification: circuitVerification.connectionCount(),
      });
    },
    disconnectConnections(hostId) {
      if (hostId === undefined || hostId === CIRCUIT_VERIFICATION_HOST_ID) {
        circuitVerification.disconnectConnections();
      }
      if (hostId === undefined || hostId !== CIRCUIT_VERIFICATION_HOST_ID) {
        hostedTests.disconnectConnections(hostId);
      }
    },
    metrics() {
      const hosted = hostedTests.metrics();
      const circuit = circuitVerification.metrics();
      return Object.freeze({
        sentMessages: hosted.sentMessages + circuit.sentMessages,
        sentBytes: hosted.sentBytes + circuit.sentBytes,
        largestSentBytes: hosted.largestSentBytes,
        reportSnapshots: hosted.reportSnapshots,
        reportSnapshotBytes: hosted.reportSnapshotBytes,
        reportCommits: hosted.reportCommits,
        reportCommitBytes: hosted.reportCommitBytes,
        reportRecoveryCommits: hosted.reportRecoveryCommits,
        reportRecoveryCommitBytes: hosted.reportRecoveryCommitBytes,
      });
    },
    browserMetrics: hostedTests.browserMetrics,
    stop: host.dispose,
  });
}
