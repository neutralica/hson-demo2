import type { WebSocket } from "ws";
import type { HostedTestCaseInspector } from "../../../hosted/hosted-test-action";
import { make_hosted_test_run_id_factory } from "../../../hosted/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../../hosted/hosted-test-suite";
import type { TestExecutorRegistry } from "../../../core/test-executor";
import type { HostedTestApplicationOptions } from "../../../hosted/hosted-test-application";
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
import type { NodeApplicationSecurity, NodeHostedApplication } from "hson-live/livehost/node";
import {
  create_node_capacity_livehost_socket,
  type NodeCapacityLiveHostSocket,
} from "./node-capacity-livehost-socket";

export const NODE_HOSTED_TESTS_APPLICATION_NAME = "hosted-tests";
export const HOSTED_TEST_REPORT_AUTHORITY_PREFIX = "hosted-report:";

export type NodeHostedTestsApplicationOptions = Readonly<{
  registry?: HostedTestSuiteRegistry;
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  runSelected?: NonNullable<HostedTestApplicationOptions["runSelected"]>;
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
  connectionSnapshot(): Readonly<{
    total: number;
    coordinator: number;
    reports: number;
    authorityIds: readonly string[];
    sending: number;
    inFlightMessages: number;
    queuedMessages: number;
    queuedBytes: number;
    largestSentBytes: number;
    peakInFlightMessages: number;
    peakQueuedMessages: number;
    peakQueuedBytes: number;
    backpressureRejections: number;
  }>;
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
    runSelected: options.runSelected ?? (externalLaunchers.targets.length === 0
      ? run_fresh_node_selected_test_ids
      : (selectedRegistry, ids, onEvent, runOptions) => selectedVerification.run(
        selectedRegistry,
        externalLaunchers,
        ids,
        onEvent,
        runOptions,
      )),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
  });
  const connections = new Map<WebSocket, Readonly<{
    authorityId: string;
    disconnect: () => void;
    transport: NodeCapacityLiveHostSocket;
  }>>();
  let disposed = false;
  let sentMessages = 0;
  let sentBytes = 0;
  let largestSentBytes = 0;
  let peakInFlightMessages = 0;
  let peakQueuedMessages = 0;
  let peakQueuedBytes = 0;
  let backpressureRejections = 0;

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
      const socket = create_node_capacity_livehost_socket(websocket, {
          onSend(message) {
            const messageBytes = Buffer.byteLength(message, "utf8");
            sentMessages += 1;
            sentBytes += messageBytes;
            largestSentBytes = Math.max(largestSentBytes, messageBytes);
          },
          maxBufferedAmount: context.transportPolicy.maxBufferedAmount,
          onBackpressure() {
            backpressureRejections += 1;
            context.transportPolicy.onBackpressure();
          },
          onCapacityChange(snapshot) {
            peakInFlightMessages = Math.max(peakInFlightMessages, snapshot.inFlightMessages);
            peakQueuedMessages = Math.max(peakQueuedMessages, snapshot.queuedMessages);
            peakQueuedBytes = Math.max(peakQueuedBytes, snapshot.queuedBytes);
          },
      });
      const bounded = options.lifecycle !== undefined;
      if (bounded) websocket.pause();
      let websocketClosed = false;
      websocket.once("close", () => {
        websocketClosed = true;
        connections.get(websocket)?.disconnect();
        connections.delete(websocket);
      });
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
      if (websocketClosed) {
        disconnect();
        return;
      }
      connections.set(websocket, { authorityId, disconnect, transport: socket });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      launcherService.terminate();
      for (const [websocket, connection] of connections) {
        connection.disconnect();
        websocket.close(1012, "Hosted-tests application stopping.");
      }
      connections.clear();
      await authorities.dispose();
    },
  });

  return Object.freeze({
    registration,
    authorities,
    connectionCount: () => connections.size,
    connectionSnapshot() {
      const values = [...connections.values()];
      const capacity = values.map((connection) => connection.transport.capacity());
      return Object.freeze({
        total: values.length,
        coordinator: values.filter((connection) => connection.authorityId === HOSTED_TEST_COORDINATOR_HOST_ID).length,
        reports: values.filter((connection) => connection.authorityId.startsWith(HOSTED_TEST_REPORT_AUTHORITY_PREFIX)).length,
        authorityIds: Object.freeze(values.map((connection) => connection.authorityId).sort()),
        sending: capacity.filter((entry) => entry.sending).length,
        inFlightMessages: capacity.reduce((total, entry) => total + entry.inFlightMessages, 0),
        queuedMessages: capacity.reduce((total, entry) => total + entry.queuedMessages, 0),
        queuedBytes: capacity.reduce((total, entry) => total + entry.queuedBytes, 0),
        largestSentBytes,
        peakInFlightMessages,
        peakQueuedMessages,
        peakQueuedBytes,
        backpressureRejections,
      });
    },
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
