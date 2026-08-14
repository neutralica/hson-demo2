import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostSocketLike, LiveMapAnyOp, LiveMapCommit } from "hson-live/types";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import type { TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { ExternalLibraryLauncherTarget } from "../../harness/core/external-launcher-contract";
import { run_selected_test_ids } from "../../harness/core/run-selected-test-suites";
import {
  create_hosted_test_application,
  HOSTED_TEST_COORDINATOR_HOST_ID,
} from "../../harness/hosted/hosted-test-application";
import {
  hosted_test_recovery_association,
  hosted_test_run_association,
} from "../../harness/hosted/hosted-test-application.types";
import type { HostedTestSelectedRunResult } from "../../harness/hosted/hosted-test-action.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import type { HostedTestReportState } from "../../harness/reporting/hosted/hosted-test-report.types";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

function expect_phase3a(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3A coordinator: ${message}`);
}

type MessageListener = (message: string) => void;

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<MessageListener>();
  const secondMessages = new Set<MessageListener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  const socket = (
    ownMessages: Set<MessageListener>,
    peerMessages: Set<MessageListener>,
    ownCloses: Set<() => void>,
    peerCloses: Set<() => void>,
  ): LiveHostSocketLike => ({
    send(message) { queueMicrotask(() => { for (const listener of peerMessages) listener(message); }); },
    close() { queueMicrotask(() => { for (const listener of peerCloses) listener(); }); },
    onMessage(listener) { ownMessages.add(listener); return () => ownMessages.delete(listener); },
    onClose(listener) { ownCloses.add(listener); return () => ownCloses.delete(listener); },
  });
  return Object.freeze([
    socket(firstMessages, secondMessages, firstCloses, secondCloses),
    socket(secondMessages, firstMessages, secondCloses, firstCloses),
  ]);
}

const suites: readonly TestSuite[] = Object.freeze([Object.freeze({
  suite: "transform/phase3a-coordinator",
  descriptor: Object.freeze({
    subject: "transform" as const,
    requirements: Object.freeze(["javascript" as const]),
    collections: Object.freeze(["unit" as const]),
    provenance: "hson-demo2" as const,
    order: 0,
  }),
  cases: Object.freeze([
    Object.freeze({
      suite: "transform/phase3a-coordinator",
      caseId: "first",
      name: "first",
      run() {},
    }),
    Object.freeze({
      suite: "transform/phase3a-coordinator",
      caseId: "second",
      name: "second",
      run() {},
    }),
  ]),
})]);

const executorRegistry = make_test_executor_registry(Object.freeze({
  id: "phase3a-node",
  kind: "node" as const,
  label: "Phase 3A Node",
  location: "local" as const,
  capabilities: Object.freeze({ provides: Object.freeze(["javascript" as const]) }),
  supportsStreaming: true,
  supportsCancellation: false,
}), suites);

const opaque: ExternalLibraryLauncherTarget = Object.freeze({
  id: "transform/phase3a-opaque",
  launcherId: "transform.phase3a-opaque",
  sourceRef: "hson-live:transform.phase3a-opaque",
  subject: "transform",
  displayName: "Phase 3A opaque proof",
  runtime: "node",
  executableChecks: 2,
  collections: Object.freeze(["unit" as const]),
  tags: Object.freeze(["phase3a"]),
  requirements: Object.freeze(["javascript" as const]),
  order: 1,
});

let releaseExecution: () => void = () => undefined;
let markExecutionStarted: () => void = () => undefined;
const executionGate = new Promise<void>((resolve) => { releaseExecution = resolve; });
const executionStarted = new Promise<void>((resolve) => { markExecutionStarted = resolve; });
let executions = 0;

const application = create_hosted_test_application(make_hosted_test_suite_registry([]), {
  makeRunId: () => "phase3a-run",
  makeAttemptId: (runId, ordinal) => `${runId}:attempt:${ordinal}`,
  discovery: make_test_executor_discovery(executorRegistry, Object.freeze([opaque])),
  executorRegistry,
  lifecycle: { maxReports: 4, terminalRetentionMs: 60_000 },
  async runSelected(registry, ids, onEvent = () => undefined, options) {
    executions += 1;
    markExecutionStarted();
    await executionGate;
    const canonicalIds = ids.filter((id) => id !== opaque.id);
    const result = await run_selected_test_ids(registry, canonicalIds, onEvent, options);
    if (ids.includes(opaque.id)) {
      const common = {
        id: opaque.id,
        suite: opaque.id,
        name: opaque.displayName,
        subject: opaque.subject,
        runtime: opaque.runtime,
        executableChecks: opaque.executableChecks,
        collections: opaque.collections,
      } as const;
      onEvent({ t: "external_state", ...common, status: "queued" });
      onEvent({ t: "external_state", ...common, status: "running" });
      onEvent({
        t: "external_end",
        ...common,
        status: "pass",
        ms: 1,
        stdout: "",
        stderr: "",
        exitCode: 0,
        signal: null,
        timedOut: false,
        completion: Object.freeze({
          version: 1,
          launcherId: opaque.launcherId,
          executed: opaque.executableChecks,
          passed: opaque.executableChecks,
          failed: 0,
        }),
      });
    }
    return result;
  },
});

const coordinatorCommits: LiveMapCommit<LiveMapAnyOp>[] = [];
const statuses: string[] = [];
const stopCommits = application.coordinator.map.commits.observe((observation) => {
  if (observation.kind !== "commit") return;
  const commit = observation.commit;
  coordinatorCommits.push(commit);
  const run = application.coordinator.map.capture().value.runs["phase3a-run"];
  const status = run?.attempts[run.activeAttemptId]?.controlStatus;
  if (status !== undefined && statuses.at(-1) !== status) statuses.push(status);
});

const [clientSocket, hostSocket] = make_socket_pair();
const disconnectHost = application.connect(HOSTED_TEST_COORDINATOR_HOST_ID, hostSocket);
expect_phase3a(disconnectHost.ok, "coordinator accepts one generic LiveHost client");
const client = create_livehost_client({
  socket: clientSocket,
  clientId: "phase3a-client",
  actionId: () => "phase3a-request",
  recovery: { logicalMapId: HOSTED_TEST_COORDINATOR_HOST_ID },
  session: {},
});
client.connect();
await client.session.create();
await client.recovery.recover();

const canonical = executorRegistry.catalog.tests.map((descriptor) => descriptor.id);
const submittedIds = [opaque.id, canonical[1]!, canonical[0]!];
const firstResponse = client.action("tests.runSelected", { testIds: submittedIds });
await executionStarted;

const runningState = application.coordinator.map.capture().value;
const requestAssociation = runningState.requests[client.clientId]?.[firstResponse.request.requestId];
expect_phase3a(requestAssociation !== undefined, "accepted request is indexed by retry-safe client/request identity");
const runningAssociation = hosted_test_run_association(runningState, requestAssociation);
expect_phase3a(runningAssociation !== undefined, "request index resolves through keyed run and attempt records");
expect_phase3a(
  runningAssociation.runId === "phase3a-run"
    && runningAssociation.attemptId === "phase3a-run:attempt:1"
    && runningAssociation.controlStatus === "running",
  "run identity and execution-attempt identity are distinct, stable control identities",
);
expect_phase3a(
  runningAssociation.acceptedPlan?.selectionIds.join("|")
    === [canonical[0], canonical[1], opaque.id].join("|"),
  "coordinator owns the server-normalized immutable RunPlan rather than request order",
);
expect_phase3a(
  Object.keys(runningState.runs["phase3a-run"]!).join("|")
    === "id|clientId|requestId|suite|activeAttemptId|acceptedPlan|attempts",
  "coordinator state contains control and recovery data only",
);

submittedIds.length = 0;
expect_phase3a(
  runningAssociation.acceptedPlan?.selectionIds.length === 3,
  "accepted RunPlan is detached from later request-payload mutation",
);

const duplicateResponse = client.retry_action(firstResponse.request);
releaseExecution();
const [first, duplicate] = await Promise.all([firstResponse, duplicateResponse]);
expect_phase3a(
  first.type === "ack" && duplicate.type === "ack",
  `original and retry delivery both settle (${JSON.stringify(first)} / ${JSON.stringify(duplicate)})`,
);
const firstResult = first.result as unknown as HostedTestSelectedRunResult;
const duplicateResult = duplicate.result as unknown as HostedTestSelectedRunResult;
expect_phase3a(
  executions === 1
    && firstResult.runId === duplicateResult.runId
    && firstResult.attemptId === duplicateResult.attemptId,
  "transport retry joins one execution attempt instead of creating another attempt",
);

const settledState = application.coordinator.map.capture().value;
const recovered = hosted_test_recovery_association(
  settledState,
  firstResult.runId,
  firstResult.attemptId,
);
expect_phase3a(
  recovered?.controlStatus === "settled"
    && recovered.acceptedPlan?.selectionIds.join("|") === firstResult.testIds.join("|"),
  "explicit run/attempt recovery returns the accepted RunPlan and settled control association",
);
expect_phase3a(
  hosted_test_recovery_association(settledState, firstResult.runId, "unknown-attempt") === undefined,
  "recovery never silently substitutes another attempt for an explicit unknown attempt",
);

const [reportClientSocket, reportHostSocket] = make_socket_pair();
const connectedReport = await application.connectBounded(recovered.reportHostId, reportHostSocket);
expect_phase3a(connectedReport.ok, "attempt resolves its dedicated report authority");
const reportClient = create_livehost_client<HostedTestReportState>({
  socket: reportClientSocket,
  recovery: { logicalMapId: recovered.reportHostId },
  session: {},
});
reportClient.connect();
await reportClient.session.create();
await reportClient.recovery.recover();
const report = reportClient.recovery.map.capture().value;
expect_phase3a(
  report.plan?.selectionIds.join("|") === recovered.acceptedPlan?.selectionIds.join("|")
    && report.suiteRuns.some((suite) => suite.id === opaque.id && suite.counts.passed === opaque.executableChecks),
  "report projects the accepted plan while exclusively owning lifecycle and result counts",
);
expect_phase3a(
  !Object.hasOwn(settledState.runs[firstResult.runId]!, "summary")
    && !Object.hasOwn(settledState.runs[firstResult.runId]!, "failures")
    && !Object.hasOwn(settledState.runs[firstResult.runId]!, "result"),
  "coordinator does not duplicate report results",
);

expect_phase3a(
  statuses.join("|") === "accepted|running|settled",
  "control state publishes accepted, running, and settled transitions truthfully",
);
const statusCommits = coordinatorCommits.filter((commit) => commit.ops.some((op) => (
  "path" in op && op.path.at(-1) === "controlStatus"
)));
expect_phase3a(
  statusCommits.length === 2 && statusCommits.every((commit) => commit.ops.length === 1),
  "ordinary attempt control changes are one path-local operation each",
);

let invalidStateRejected = false;
try {
  await application.coordinator.mutate((draft) => draft.replace(
    ["runs", firstResult.runId, "attempts", firstResult.attemptId, "controlStatus"],
    "passed" as never,
  ));
} catch {
  invalidStateRejected = true;
}
expect_phase3a(
  invalidStateRejected
    && application.coordinator.map.capture().value.runs[firstResult.runId]
      ?.attempts[firstResult.attemptId]?.controlStatus === "settled",
  "permanently attached exact schema rejects result-like coordinator status without mutating authority",
);

await reportClient.session.goodbye();
reportClient.disconnect();
reportClient.recovery.dispose();
reportClient.session.dispose();
connectedReport.value();
const evicted = await application.evictReport(recovered.reportHostId);
expect_phase3a(
  evicted.status === "evicted",
  `terminal report can be explicitly evicted (${JSON.stringify(evicted)})`,
);
const pruned = application.coordinator.map.capture().value;
expect_phase3a(
  pruned.runs[firstResult.runId] === undefined
    && pruned.requests[client.clientId]?.[firstResponse.request.requestId] === undefined,
  "report eviction prunes its coordinator recovery record and request index",
);

stopCommits();
client.disconnect();
client.recovery.dispose();
client.session.dispose();
disconnectHost.value();
await application.dispose();

const server = await start_hosted_test_server({
  port: 0,
  registry: make_hosted_test_suite_registry([]),
  executorRegistry,
  runSelected: (registry, ids, onEvent, options) => run_selected_test_ids(
    registry,
    ids,
    onEvent ?? (() => undefined),
    options,
  ),
});
const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
const sink = { reset() {}, ingest() {}, showInfrastructureError(message: string) { throw new Error(message); } };
const firstBrowser = make_remote_hosted_test_runtime({
  url: server.url,
  WebSocketConstructor,
  makeClientId: () => "phase3a-browser-before-refresh",
});
const firstAdapter = make_hosted_test_panel_adapter(firstBrowser, sink);
await firstBrowser.ready();
await firstBrowser.discover();
const browserResult = await firstAdapter.start_selected([canonical[1]!, canonical[0]!]);
const browserAssociation = hosted_test_recovery_association(
  firstBrowser.client.recovery.map.capture().value,
  browserResult.runId,
  browserResult.attemptId,
);
expect_phase3a(
  browserAssociation?.acceptedPlan?.selectionIds.join("|") === canonical.join("|"),
  "production browser path recovers the server-normalized accepted RunPlan",
);
firstAdapter.dispose();
firstBrowser.dispose();

const refreshedBrowser = make_remote_hosted_test_runtime({
  url: server.url,
  WebSocketConstructor,
  makeClientId: () => "phase3a-browser-after-refresh",
});
const refreshedAdapter = make_hosted_test_panel_adapter(refreshedBrowser, sink);
await refreshedBrowser.ready();
const refreshedResult = await refreshedAdapter.recover(browserResult.runId, browserResult.attemptId);
expect_phase3a(
  refreshedResult.runId === browserResult.runId
    && refreshedResult.attemptId === browserResult.attemptId
    && "testIds" in refreshedResult
    && refreshedResult.testIds.join("|") === canonical.join("|"),
  "fresh browser identity recovers the exact prior run, attempt, and accepted selection without re-execution",
);
refreshedAdapter.dispose();
refreshedBrowser.dispose();
await server.stop();

console.log(JSON.stringify({
  runId: firstResult.runId,
  attemptId: firstResult.attemptId,
  acceptedSelection: firstResult.testIds,
  coordinatorRevisions: coordinatorCommits.length,
  controlStatuses: statuses,
  reportCases: report.summary.cases,
  opaqueChecks: report.suiteRuns.find((suite) => suite.id === opaque.id)?.counts.passed,
  evicted: evicted.status,
  browserRecovery: {
    runId: refreshedResult.runId,
    attemptId: refreshedResult.attemptId,
    testIds: "testIds" in refreshedResult ? refreshedResult.testIds : [],
  },
}));
