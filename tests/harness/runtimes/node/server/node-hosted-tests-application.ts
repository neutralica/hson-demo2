import type { WebSocket } from "ws";
import type { HostedTestCaseInspector } from "../../../hosted/hosted-test-action";
import { make_hosted_test_run_id_factory } from "../../../hosted/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../../hosted/hosted-test-suite";
import type { TestExecutorRegistry } from "../../../core/test-executor";
import {
  create_external_library_launcher_service,
  resolve_external_library_launchers,
} from "../external-library-launchers";
import { make_test_executor_discovery } from "../../../core/test-discovery";
import { make_local_node_livehost_executor_registry } from "../livehost-node-executor";
import { create_node_selected_verification_service } from "../run-node-selected-verifications";
import { run_fresh_node_selected_test_ids } from "../run-node-selected-test-suites";
import { make_hosted_test_case_inspector } from "../../../hosted/hosted-test-case-inspection";
import {
  create_hosted_test_application,
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestApplication,
} from "../../../hosted/hosted-test-application";
import { make_registered_hosted_test_suite_registry } from "../../../hosted/registered-hosted-test-suites";
import {
  create_node_livehost_socket,
  type NodeApplicationSecurity,
  type NodeHostedApplication,
} from "hson-live/livehost/node";

export const NODE_HOSTED_TESTS_APPLICATION_NAME = "hosted-tests";
export const HOSTED_TEST_REPORT_AUTHORITY_PREFIX = "hosted-report:";

export type NodeHostedTestsApplicationOptions = Readonly<{
  registry?: HostedTestSuiteRegistry;
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  security?: NodeApplicationSecurity;
  lifecycle?: Readonly<{
    maxReports: number;
    terminalRetentionMs: number;
    sweepIntervalMs?: number;
  }>;
}>;

export type NodeHostedTestsApplication = Readonly<{
  registration: NodeHostedApplication;
  authorities: HostedTestApplication;
  connectionCount(): number;
  disconnectConnections(authorityId?: string): void;
  metrics(): Readonly<{ sentMessages: number; sentBytes: number }>;
}>;

export async function create_node_hosted_tests_application(
  options: NodeHostedTestsApplicationOptions = {},
): Promise<NodeHostedTestsApplication> {
  const registry = options.registry ?? make_registered_hosted_test_suite_registry();
  const executorRegistry = options.executorRegistry ?? make_local_node_livehost_executor_registry();
  const externalLaunchers = options.executorRegistry === undefined
    ? await resolve_external_library_launchers()
    : Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([]) });
  const launcherService = create_external_library_launcher_service();
  const selectedVerification = create_node_selected_verification_service(launcherService);
  const authorities = create_hosted_test_application(registry, {
    makeRunId: make_hosted_test_run_id_factory(),
    inspectCase: options.inspectCase ?? make_hosted_test_case_inspector(executorRegistry),
    discovery: make_test_executor_discovery(executorRegistry, externalLaunchers.targets),
    executorRegistry,
    runSelected: externalLaunchers.targets.length === 0
      ? run_fresh_node_selected_test_ids
      : (selectedRegistry, ids, onEvent, runOptions) => selectedVerification.run(
        selectedRegistry,
        externalLaunchers,
        ids,
        onEvent,
        runOptions,
      ),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
  });
  const connections = new Map<WebSocket, Readonly<{ authorityId: string; disconnect: () => void }>>();
  let disposed = false;
  let sentMessages = 0;
  let sentBytes = 0;

  const registration: NodeHostedApplication = Object.freeze({
    name: NODE_HOSTED_TESTS_APPLICATION_NAME,
    authorities: Object.freeze([
      Object.freeze({ kind: "exact" as const, value: HOSTED_TEST_COORDINATOR_HOST_ID }),
      Object.freeze({ kind: "prefix" as const, value: HOSTED_TEST_REPORT_AUTHORITY_PREFIX }),
    ]),
    ...(options.security === undefined ? {} : { security: options.security }),
    ready: () => !disposed,
    async acceptWebSocket(authorityId, websocket, context) {
      if (disposed) {
        websocket.close(1012, "Hosted-tests application stopping.");
        return;
      }
      const socket = create_node_livehost_socket(websocket, {
          onSend(message) {
            sentMessages += 1;
            sentBytes += Buffer.byteLength(message, "utf8");
          },
          maxBufferedAmount: context.transportPolicy.maxBufferedAmount,
          onBackpressure: context.transportPolicy.onBackpressure,
      });
      const bounded = options.lifecycle !== undefined;
      if (bounded) websocket.pause();
      let connected;
      try {
        connected = bounded
          ? await authorities.connectBounded(
              authorityId,
              socket,
              {
                ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
                attachment: context.principal.value,
              },
            )
          : authorities.connect(
              authorityId,
              socket,
              {
                ...(context.principal.id === undefined ? {} : { principalId: context.principal.id }),
                attachment: context.principal.value,
              },
            );
      } finally {
        if (bounded) websocket.resume();
      }
      if (!connected.ok) {
        websocket.close(1008, connected.error.code ?? "Unknown hosted-test LiveHost.");
        return;
      }
      const disconnect = connected.value;
      connections.set(websocket, { authorityId, disconnect });
      websocket.once("close", () => {
        connections.get(websocket)?.disconnect();
        connections.delete(websocket);
      });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      launcherService.terminate();
      for (const connection of connections.values()) connection.disconnect();
      connections.clear();
      await authorities.dispose();
    },
  });

  return Object.freeze({
    registration,
    authorities,
    connectionCount: () => connections.size,
    disconnectConnections(authorityId) {
      for (const [websocket, connection] of [...connections]) {
        if (authorityId !== undefined && connection.authorityId !== authorityId) continue;
        connection.disconnect();
        websocket.close(1012, "Hosted-test connection interrupted.");
      }
    },
    metrics: () => Object.freeze({ sentMessages, sentBytes }),
  });
}
