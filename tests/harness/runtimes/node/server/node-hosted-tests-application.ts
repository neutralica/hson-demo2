import type { WebSocket } from "ws";
import type { HostedTestCaseInspector } from "../../../hosted/hosted-test-action";
import { make_hosted_test_run_id_factory } from "../../../hosted/hosted-test-action";
import type { TestExecutorRegistry } from "../../../core/test-executor";
import { executor_supports } from "../../../core/test-executor";
import type { HostedTestApplicationOptions } from "../../../hosted/hosted-test-application";
import {
  create_external_library_launcher_service,
  resolve_external_library_launchers,
} from "../external-library-launchers";
import { make_test_executor_discovery } from "../../../core/test-discovery";
import { make_local_node_livehost_executor_registry } from "../livehost-node-executor";
import { create_node_selected_verification_service } from "../run-node-selected-verifications";
import { run_fresh_node_selected_test_ids } from "../run-node-selected-test-suites";
import {
  node_command_suite_descriptor,
  resolve_node_command_surfaces,
} from "../node-command-surfaces";
import { make_hosted_test_case_inspector } from "../../../hosted/hosted-test-case-inspection";
import {
  create_hosted_test_application,
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestApplication,
} from "../../../hosted/hosted-test-application";
import type { NodeApplicationSecurity, NodeHostedApplication } from "hson-live/livehost/node";
import {
  create_node_capacity_livehost_socket,
  type NodeCapacityLiveHostSocket,
} from "./node-capacity-livehost-socket";
import { observe_hosted_test_timeline, type HostedTestTimelineObserver } from "../../../../../src/shared/hosted-tests/hosted-test-timeline";

export const NODE_HOSTED_TESTS_APPLICATION_NAME = "hosted-tests";
export const HOSTED_TEST_REPORT_AUTHORITY_PREFIX = "hosted-report:";

export type NodeHostedTestsApplicationOptions = Readonly<{
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  runSelected?: NonNullable<HostedTestApplicationOptions["runSelected"]>;
  security?: NodeApplicationSecurity;
  timeline?: HostedTestTimelineObserver;
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
  metrics(): Readonly<{
    sentMessages: number;
    sentBytes: number;
    largestSentBytes: number;
    reportSnapshots: number;
    reportSnapshotBytes: number;
    reportCommits: number;
    reportCommitBytes: number;
    reportRecoveryCommits: number;
    reportRecoveryCommitBytes: number;
  }>;
}>;

export async function create_node_hosted_tests_application(
  options: NodeHostedTestsApplicationOptions = {},
): Promise<NodeHostedTestsApplication> {
  const executorRegistry = options.executorRegistry ?? make_local_node_livehost_executor_registry();
  const externalLaunchers = options.executorRegistry === undefined
    ? await resolve_external_library_launchers()
    : Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([]) });
  const hsonLiveRoot = "repositoryRoot" in externalLaunchers ? externalLaunchers.repositoryRoot : undefined;
  const commandSurfaces = options.executorRegistry === undefined
    ? resolve_node_command_surfaces({
        demoRoot: process.cwd(),
        ...(hsonLiveRoot === undefined ? {} : { hsonLiveRoot }),
      })
    : Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([]) });
  for (const target of commandSurfaces.targets) {
    if (!executor_supports(executorRegistry.executor, target)) {
      throw new Error(`HOSTED_TEST_COMMAND_ASSIGNMENT_UNSATISFIED: ${target.id}`);
    }
  }
  const launcherService = create_external_library_launcher_service();
  const selectedVerification = create_node_selected_verification_service(launcherService, commandSurfaces);
  const discovery = make_test_executor_discovery(
    executorRegistry,
    externalLaunchers.targets,
    commandSurfaces.targets.map(node_command_suite_descriptor),
  );
  const authorities = create_hosted_test_application({
    makeRunId: make_hosted_test_run_id_factory(),
    inspectCase: options.inspectCase ?? make_hosted_test_case_inspector(executorRegistry),
    discovery,
    executorRegistry,
    runSelected: options.runSelected ?? (externalLaunchers.targets.length === 0 && commandSurfaces.targets.length === 0
      ? run_fresh_node_selected_test_ids
      : (selectedRegistry, ids, onEvent, runOptions) => selectedVerification.run(
        selectedRegistry,
        discovery.catalog,
        externalLaunchers,
        ids,
        onEvent,
        runOptions,
      )),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    ...(options.timeline === undefined ? {} : { timeline: options.timeline }),
    requireReportReady: true,
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
  let reportSnapshots = 0;
  let reportSnapshotBytes = 0;
  let reportCommits = 0;
  let reportCommitBytes = 0;
  let reportRecoveryCommits = 0;
  let reportRecoveryCommitBytes = 0;
  const reportedInitialFrames = new Set<string>();
  const serializedInitialFrames = new Set<string>();

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
            if (authorityId.startsWith(HOSTED_TEST_REPORT_AUTHORITY_PREFIX)) {
              try {
                const decoded = JSON.parse(message) as { type?: unknown };
                if (decoded.type === "recovery-snapshot") {
                  reportSnapshots += 1;
                  reportSnapshotBytes += messageBytes;
                } else if (decoded.type === "commit") {
                  reportCommits += 1;
                  reportCommitBytes += messageBytes;
                } else if (decoded.type === "recovery-commit") {
                  reportRecoveryCommits += 1;
                  reportRecoveryCommitBytes += messageBytes;
                }
                if (decoded.type === "recovery-snapshot") {
                  if (!serializedInitialFrames.has(authorityId)) {
                    serializedInitialFrames.add(authorityId);
                    observe_hosted_test_timeline(options.timeline, "first_report_frame_serialized", {
                      reportHostId: authorityId,
                      bytes: messageBytes,
                    });
                  }
                }
              } catch { /* LiveHost owns protocol validation. */ }
            }
          },
          onSent(message) {
            if (authorityId.startsWith(HOSTED_TEST_REPORT_AUTHORITY_PREFIX) && !reportedInitialFrames.has(authorityId)) {
              try {
                const decoded = JSON.parse(message) as { type?: unknown };
                if (decoded.type === "recovery-snapshot") {
                  reportedInitialFrames.add(authorityId);
                  const messageBytes = Buffer.byteLength(message, "utf8");
                  observe_hosted_test_timeline(options.timeline, "first_report_frame_sent", {
                    reportHostId: authorityId,
                    bytes: messageBytes,
                  });
                }
              } catch { /* LiveHost owns protocol validation. */ }
            }
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
    metrics: () => Object.freeze({
      sentMessages,
      sentBytes,
      largestSentBytes,
      reportSnapshots,
      reportSnapshotBytes,
      reportCommits,
      reportCommitBytes,
      reportRecoveryCommits,
      reportRecoveryCommitBytes,
    }),
  });
}
