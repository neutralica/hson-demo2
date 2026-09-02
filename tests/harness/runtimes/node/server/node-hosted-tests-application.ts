import type {
  LiveHostApplication,
  LiveHostApplicationContext,
  LiveHostConnection,
} from "hson-live/livehost";
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
import { make_node_livehost_hosted_test_executor_registry } from "../livehost-node-executor";
import { create_node_selected_verification_service } from "../run-node-selected-verifications";
import { run_fresh_node_selected_test_ids } from "../run-node-selected-test-suites";
import { make_hosted_test_case_inspector } from "../../../hosted/hosted-test-case-inspection";
import {
  create_hosted_test_application,
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestApplication,
} from "../../../hosted/hosted-test-application";
import type { NodeApplicationSecurity } from "hson-live/livehost/node";
import {
  create_node_capacity_locus_socket,
  type NodeCapacityLocusSocket,
} from "./node-capacity-livehost-socket";
import { observe_hosted_test_timeline, type HostedTestTimelineObserver } from "../../../../../src/shared/hosted-tests/hosted-test-timeline";
import { create_playwright_browser_executor, LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR } from "../browser/playwright-browser-executor";

export const NODE_HOSTED_TESTS_APPLICATION_NAME = "hosted-tests";
export const NODE_HOSTED_TESTS_CONNECTION_PATH = "/hosted-tests";
export const HOSTED_TEST_REPORT_AUTHORITY_PREFIX = "hosted-report:";

function redact_node_hosted_diagnostic_text(value: string, maxLength: number): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(authorization|cookie|token|credential|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/((?:wss?|https?):\/\/[^\s?#]+)\?[^\s#]*/gi, "$1?[redacted]")
    .slice(0, maxLength);
}

function safe_node_hosted_error(error: unknown, depth = 0): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return Object.freeze({ type: error === null ? "null" : typeof error });
  const code = Reflect.get(error, "code");
  return Object.freeze({
    name: error.name,
    message: redact_node_hosted_diagnostic_text(error.message, 2_048),
    ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? { code } : {}),
    ...(error.stack === undefined ? {} : { stack: redact_node_hosted_diagnostic_text(error.stack, 8_192) }),
    ...(depth === 0 && error.cause instanceof Error ? { cause: safe_node_hosted_error(error.cause, depth + 1) } : {}),
  });
}

export type NodeHostedTestsApplicationOptions = Readonly<{
  inspectCase?: HostedTestCaseInspector;
  executorRegistry?: TestExecutorRegistry;
  runSelected?: NonNullable<HostedTestApplicationOptions["runSelected"]>;
  security?: NodeApplicationSecurity;
  timeline?: HostedTestTimelineObserver;
  /** Internal deployment capture mode: retain original-run structured case diagnostics. */
  retainRichDiagnostics?: boolean;
  lifecycle?: Readonly<{
    maxReports: number;
    terminalRetentionMs: number;
    sweepIntervalMs?: number;
  }>;
}>;

export type NodeHostedTestsApplication = Readonly<{
  registration: LiveHostApplication;
  security?: NodeApplicationSecurity;
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
  browserMetrics(): ReturnType<ReturnType<typeof create_playwright_browser_executor>["metrics"]>;
}>;

export async function create_node_hosted_tests_application(
  options: NodeHostedTestsApplicationOptions = {},
): Promise<NodeHostedTestsApplication> {
  const executorRegistry = options.executorRegistry ?? make_node_livehost_hosted_test_executor_registry();
  const externalLaunchers = options.executorRegistry === undefined
    ? await resolve_external_library_launchers()
    : Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([]) });
  const launcherService = create_external_library_launcher_service();
  const browserExecutor = create_playwright_browser_executor(launcherService.processSupervisor);
  const selectedVerification = create_node_selected_verification_service(launcherService, browserExecutor);
  const discovery = make_test_executor_discovery(
    executorRegistry,
    externalLaunchers.targets,
  );
  const authorities = create_hosted_test_application({
    makeRunId: make_hosted_test_run_id_factory(),
    inspectCase: options.inspectCase ?? make_hosted_test_case_inspector(executorRegistry),
    discovery,
    executorRegistry,
    runSelected: options.runSelected ?? (externalLaunchers.targets.length === 0
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
    ...(options.retainRichDiagnostics === true ? { retainRichDiagnostics: true } : {}),
    requireReportReady: true,
    assignExecutor(suite) {
      return suite.requirements.includes("browser")
        && executor_supports(LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR, suite)
        ? LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id
        : executorRegistry.executor.id;
    },
  });
  const connections = new Map<LiveHostConnection, Readonly<{
    authorityId: string;
    disconnect: () => void;
    transport: NodeCapacityLocusSocket;
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

  const registration: LiveHostApplication = Object.freeze({
    name: NODE_HOSTED_TESTS_APPLICATION_NAME,
    ready: () => !disposed,
    connections: Object.freeze([Object.freeze({
      path: NODE_HOSTED_TESTS_CONNECTION_PATH,
      async accept(request: Request, connection: LiveHostConnection, context: LiveHostApplicationContext) {
      const authorityId = new URL(request.url).searchParams.get("locus") ?? "";
      if (authorityId !== HOSTED_TEST_COORDINATOR_HOST_ID && !authorityId.startsWith(HOSTED_TEST_REPORT_AUTHORITY_PREFIX)) {
        connection.close(1008, "Unknown hosted-test Locus.");
        return;
      }
      if (disposed) {
        connection.close(1012, "Hosted-tests application stopping.");
        return;
      }
      const socket = create_node_capacity_locus_socket(connection, {
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
              } catch { /* Locus owns protocol validation. */ }
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
              } catch { /* Locus owns protocol validation. */ }
            }
          },
          onCapacityChange(snapshot) {
            peakInFlightMessages = Math.max(peakInFlightMessages, snapshot.inFlightMessages);
            peakQueuedMessages = Math.max(peakQueuedMessages, snapshot.queuedMessages);
            peakQueuedBytes = Math.max(peakQueuedBytes, snapshot.queuedBytes);
          },
      });
      const bounded = options.lifecycle !== undefined;
      let connectionClosed = false;
      connection.onClose(() => {
        connectionClosed = true;
        connections.get(connection)?.disconnect();
        connections.delete(connection);
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
      } catch (cause) {
        console.error("[hosted-tests] authority connection failed", Object.freeze({
          application: NODE_HOSTED_TESTS_APPLICATION_NAME,
          authorityId,
          correlationId: context.correlationId,
          error: safe_node_hosted_error(cause),
        }));
        throw cause;
      }
      if (!connected.ok) {
        console.error("[hosted-tests] authority connection rejected", Object.freeze({
          application: NODE_HOSTED_TESTS_APPLICATION_NAME,
          authorityId,
          correlationId: context.correlationId,
          errorCode: connected.error.code,
          message: redact_node_hosted_diagnostic_text(connected.error.message, 2_048),
        }));
        connection.close(1008, connected.error.code ?? "Unknown hosted-test Locus.");
        return;
      }
      const disconnect = connected.value;
      if (connectionClosed) {
        disconnect();
        return;
      }
      connections.set(connection, { authorityId, disconnect, transport: socket });
      },
    })]),
    async dispose() {
      if (disposed) return;
      disposed = true;
      launcherService.terminate();
      for (const [transport, hostedConnection] of connections) {
        hostedConnection.disconnect();
        transport.close(1012, "Hosted-tests application stopping.");
      }
      connections.clear();
      await authorities.dispose();
      await browserExecutor.dispose();
    },
  });

  return Object.freeze({
    registration,
    ...(options.security === undefined ? {} : { security: options.security }),
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
      for (const [transport, hostedConnection] of [...connections]) {
        if (authorityId !== undefined && hostedConnection.authorityId !== authorityId) continue;
        hostedConnection.disconnect();
        transport.close(1012, "Hosted-test connection interrupted.");
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
    browserMetrics: browserExecutor.metrics,
  });
}
