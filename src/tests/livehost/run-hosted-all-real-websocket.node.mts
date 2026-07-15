import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import { hson } from "hson-live";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { make_hosted_test_case_list } from "../../app/demos/test/hosted-test-case-list";
import { make_hosted_test_panel_adapter, type HostedTestPanelReportUpdate, type HostedTestPanelSink } from "../../app/demos/test/hosted-test-panel-adapter";
import type { HostedTestCaseReport, HostedTestReport } from "../../app/hosted-test/hosted-test-report.types";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import { HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../app/hosted-test/hosted-test-report-initial";
import { decode_hosted_test_report_initial } from "../../app/hosted-test/hosted-test-report-initial";
import { make_hosted_test_report_mirror } from "../../app/hosted-test/hosted-test-report-mirror";
import { decode_hosted_test_report_commit_envelope, HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../app/hosted-test/hosted-test-report-wire";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { DEFERRED_BROWSER_FIDELITY_CASES } from "../../hosted-test/final-harness-migration-inventory";
import { all_hosted_test_suites } from "../../hosted-test/hosted-all-test-suites";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_all(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted/all real WebSocket: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

let metrics: Readonly<Record<string, number>> | undefined;
let server: Awaited<ReturnType<typeof start_hosted_test_server>> | undefined;
let projectionCases: HostedTestCaseReport[] = [];
let projectionTimings: Array<Readonly<{ suite: string; ms: number }>> = [];
let projectionReport: HostedTestReport | undefined;
try {
  const canonical = all_hosted_test_suites();
  const canonicalKeys = canonical.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`));
  expect_all(canonical.length === 120 && canonicalKeys.length === 2045, "canonical list contains 120 suites / 2045 cases");
  expect_all(new Set(canonicalKeys).size === canonicalKeys.length, "canonical list has no duplicate suite::name identity");
  expect_all(DEFERRED_BROWSER_FIDELITY_CASES.every((entry) => !new Set(canonicalKeys).has(entry.id)), "the eight browser-fidelity cases remain excluded");

  const baseRegistry = make_registered_hosted_test_suite_registry();
  let serverRunnerMs = 0;
  const registry = make_hosted_test_suite_registry(baseRegistry.list().map((descriptor) => descriptor.id !== "hosted/all"
    ? descriptor
    : {
      ...descriptor,
      async run(...args: Parameters<typeof descriptor.run>) {
        const started = performance.now();
        try { return await descriptor.run(...args); }
        finally { serverRunnerMs = performance.now() - started; }
      },
    }));
  server = await start_hosted_test_server({ port: 0, registry });
  const runtime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await runtime.ready();

  const updates: HostedTestPanelReportUpdate[] = [];
  let renders = 0;
  let initialEvents = 0;
  let commitEvents = 0;
  let initialPayload: unknown;
  const commitPayloads: unknown[] = [];
  const stopEvents = runtime.client.on_event((message) => {
    if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
      initialEvents += 1;
      initialPayload = message.payload;
    }
    if (message.event === HOSTED_TEST_REPORT_COMMIT_EVENT) {
      commitEvents += 1;
      commitPayloads.push(message.payload);
    }
  });
  const sink: HostedTestPanelSink = {
    reset() {
      updates.length = 0;
      projectionCases = [];
      projectionTimings = [];
      projectionReport = undefined;
    },
    ingest(update) {
      updates.push(update);
      projectionCases.push(...update.newCases);
      projectionTimings.push(...update.newSuiteTimings);
      projectionReport = update.report;
      renders += 1;
    },
    showInfrastructureError(message) { throw new Error(message); },
  };
  const adapter = make_hosted_test_panel_adapter(runtime.client, sink);
  const started = performance.now();
  const result = await adapter.start("hosted/all");
  const roundTripMs = performance.now() - started;
  const mirror = adapter.router?.mirror;
  expect_all(result.ok && result.suite === "hosted/all", "one remote action returns the complete hosted suite identity");
  expect_all(result.summary.suites === 120 && result.summary.cases === 2045 && result.summary.pass === 2045 && result.summary.fail === 0, "complete remote result passes every canonical case");
  expect_all(mirror !== undefined && mirror.runId === result.runId && mirror.suite === result.suite, "result, router, and mirror correlate");
  const panelCases = updates.flatMap((update) => update.newCases);
  expect_all(panelCases.length === 2045 && new Set(panelCases.map((testCase) => `${testCase.suite}::${testCase.name}`)).size === 2045, "panel receives every compact case exactly once");
  expect_all(updates[0]?.report.summary.cases === 0 && updates.at(-1)?.report.summary.cases === 2045 && updates.at(-1)?.report.summary.pass === 2045, "panel starts authoritative-empty and completes successfully");
  expect_all(updates.every((update, index, values) => index === 0 || update.report.summary.cases >= (values[index - 1]?.report.summary.cases ?? 0)), "panel totals are monotonic");
  expect_all(initialEvents === 1 && commitEvents > 0 && mirror.rev === commitEvents + 1, "one initial state precedes a contiguous batched stream");
  expect_all(renders === initialEvents + commitEvents, "adapter delivers one incremental update per received report revision");
  expect_all(typeof window === "undefined" && typeof document === "undefined" && typeof HTMLCanvasElement === "undefined", "host runtimes restore all browser globals");
  const transport = server.metrics();
  expect_all(transport.sentMessages === initialEvents + commitEvents + 2 && transport.sentBytes > 0, "transport contains hello, report stream, and acknowledgement only");
  const replayStarted = performance.now();
  const replayMirror = make_hosted_test_report_mirror(decode_hosted_test_report_initial(initialPayload));
  for (const payload of commitPayloads) replayMirror.apply(decode_hosted_test_report_commit_envelope(payload));
  const mirrorReplayMs = performance.now() - replayStarted;
  expect_all(JSON.stringify(replayMirror.capture()) === JSON.stringify(mirror.capture()), "independent mirror replay reconstructs the complete report");
  replayMirror.dispose();

  metrics = Object.freeze({
    suites: result.summary.suites,
    cases: result.summary.cases,
    commits: commitEvents,
    events: initialEvents + commitEvents,
    finalRev: mirror.rev,
    panelUpdates: renders,
    serverRunnerMs,
    roundTripMs,
    mirrorReplayMs,
    sentMessages: transport.sentMessages,
    sentBytes: transport.sentBytes,
  });
  const secondResult = await adapter.start("hosted/all");
  expect_all(secondResult.runId !== result.runId && secondResult.summary.cases === 2045, "a sequential complete run owns a fresh correlated report");
  expect_all(adapter.router?.mirror?.capture().value.summary.pass === 2045, "the sequential run starts clean and reconstructs independently");
  expect_all(typeof window === "undefined" && typeof document === "undefined" && typeof HTMLCanvasElement === "undefined", "the sequential run also restores all host globals");
  updates.length = 0;
  adapter.dispose();
  stopEvents();
  runtime.dispose();
} finally {
  if (server !== undefined) await server.stop();
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

expect_all(projectionReport !== undefined, "the completed adapter retains one latest authoritative report for projection measurement");
const projectionRuntime = install_hosted_dom_runtime();
try {
  const projectionHost = hson.liveTree.queryBody().graft();
  const projection = make_hosted_test_case_list(projectionHost, { async view() {}, async copy() {} });
  projection.ingest(Object.freeze({
    report: projectionReport,
    newCases: Object.freeze(projectionCases),
    newSuiteTimings: Object.freeze(projectionTimings),
    terminal: true,
  }));
  const snapshot = projection.snapshot();
  expect_all(snapshot.suites === 120 && snapshot.cases === 2045, "the actual hosted/all compact records populate one 120-suite / 2045-case model");
  expect_all(snapshot.metrics.suiteRowsCreated === 120 && snapshot.metrics.caseRowsCreated === 0 && snapshot.metrics.visibleCaseRows === 0, "the completed collapsed projection creates 120 suite rows and zero case rows");
  expect_all(snapshot.metrics.listenerRegistrations === 1 && snapshot.metrics.cssSurfaceAccesses === 1, "the completed projection owns one delegated listener and one CSS surface");
  expect_all(snapshot.metrics.liveTreesConstructed === 721, "the completed collapsed projection constructs 721 LiveTrees rather than 12,631");
  expect_all(snapshot.metrics.syntheticEvents === 0 && snapshot.metrics.fullCaseFlattens === 0, "the actual projection emits no synthetic events and performs no full-case flatten");
  const largestSuite = Object.entries(snapshot.caseKeysBySuite).reduce((largest, entry) => entry[1].length > largest[1].length ? entry : largest);
  projection.set_expanded(largestSuite[0], true);
  const expandedSnapshot = projection.snapshot();
  expect_all(expandedSnapshot.metrics.visibleCaseRows === largestSuite[1].length, "expanding the largest suite creates only that suite's canonical case rows");
  expect_all(expandedSnapshot.metrics.listenerRegistrations === 1, "large-suite expansion adds no case listeners");
  projection.set_expanded(largestSuite[0], false);
  expect_all(projection.snapshot().metrics.visibleCaseRows === 0, "collapsing the largest suite clears all LiveDemo-owned visible row references");
  metrics = Object.freeze({
    ...metrics,
    suiteRows: snapshot.metrics.suiteRowsCreated,
    caseRows: snapshot.metrics.caseRowsCreated,
    projectionLiveTrees: snapshot.metrics.liveTreesConstructed,
    projectionListeners: snapshot.metrics.listenerRegistrations,
    projectionCssSurfaces: snapshot.metrics.cssSurfaceAccesses,
    projectionRenderPasses: snapshot.metrics.renderPasses,
    largestExpandedSuiteCases: largestSuite[1].length,
  });
  projection.dispose();
} finally {
  projectionRuntime.dispose();
}

console.log(JSON.stringify(metrics));
