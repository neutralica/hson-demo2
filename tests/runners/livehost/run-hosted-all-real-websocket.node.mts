import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import { hson } from "hson-live";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_hosted_test_case_list } from "../../../src/app/demos/tests/panel/hosted-test-case-list";
import { make_hosted_test_panel_adapter, type HostedTestPanelReportUpdate, type HostedTestPanelSink } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import type { HostedTestCaseReport, HostedTestReport } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../harness/reporting/hosted/hosted-test-report-initial";
import { HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../harness/reporting/hosted/hosted-test-report-wire";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { DEFERRED_BROWSER_FIDELITY_CASES } from "../../harness/hosted/final-harness-migration-inventory";
import { all_hosted_test_suites } from "../../harness/hosted/hosted-all-test-suites";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

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
  const canonicalKeys = canonical.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.caseId}`));
  expect_all(canonical.length === 142 && canonicalKeys.length === 2437, "canonical list contains 142 suites / 2437 cases");
  expect_all(new Set(canonicalKeys).size === canonicalKeys.length, "canonical list has no duplicate suite::name identity");
  expect_all(DEFERRED_BROWSER_FIDELITY_CASES.every((entry) => !new Set(canonicalKeys).has(entry.id)), "the four canvas browser-fidelity cases remain excluded");

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
  const stopEvents = runtime.client.on_event((message) => {
    if (message.event === HOSTED_TEST_REPORT_INITIAL_EVENT) {
      initialEvents += 1;
    }
    if (message.event === HOSTED_TEST_REPORT_COMMIT_EVENT) {
      commitEvents += 1;
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
  const adapter = make_hosted_test_panel_adapter(runtime, sink);
  const started = performance.now();
  const result = await adapter.start("hosted/all");
  const roundTripMs = performance.now() - started;
  const mirror = adapter.capture();
  expect_all(result.ok && result.suite === "hosted/all", "one remote action returns the complete hosted suite identity");
  expect_all(result.summary.suites === 142 && result.summary.cases === 2437 && result.summary.pass === 2437 && result.summary.fail === 0, "complete remote result passes every canonical case");
  expect_all(mirror !== undefined && mirror.run.id === result.runId && mirror.run.suite === result.suite, "result and generic recovered mirror correlate");
  const panelCases = updates.flatMap((update) => update.newCases);
  expect_all(panelCases.length === 2437 && new Set(panelCases.map((testCase) => testCase.key)).size === 2437, "panel receives every compact case exactly once");
  expect_all(updates.at(-1)?.report.summary.cases === 2437 && updates.at(-1)?.report.summary.pass === 2437, "panel completes from generic recovered state");
  expect_all(updates.every((update, index, values) => index === 0 || update.report.summary.cases >= (values[index - 1]?.report.summary.cases ?? 0)), "panel totals are monotonic");
  expect_all(initialEvents === 0 && commitEvents === 0, "primary runtime emits no hosted-specific report protocol events");
  expect_all(typeof result.reportRev === "number" && result.reportRev > 1 && renders > 0, "generic report stream reaches an authoritative terminal revision");
  expect_all(typeof window === "undefined" && typeof document === "undefined" && typeof HTMLCanvasElement === "undefined", "host runtimes restore all browser globals");
  const transport = server.metrics();
  expect_all(transport.sentMessages > renders && transport.sentBytes > 0, "transport contains generic session, recovery, commit, and action messages");

  metrics = Object.freeze({
    suites: result.summary.suites,
    cases: result.summary.cases,
    commits: result.reportRev ?? 0,
    events: 0,
    finalRev: result.reportRev ?? 0,
    panelUpdates: renders,
    serverRunnerMs,
    roundTripMs,
    mirrorReplayMs: 0,
    sentMessages: transport.sentMessages,
    sentBytes: transport.sentBytes,
  });
  const secondResult = await adapter.start("hosted/all");
  expect_all(secondResult.runId !== result.runId && secondResult.summary.cases === 2437, "a sequential complete run owns a fresh correlated report");
  expect_all(adapter.capture()?.summary.pass === 2437, "the sequential run starts clean and reconstructs independently");
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
  expect_all(snapshot.suites === 142 && snapshot.cases === 2437, "the actual hosted/all compact records populate one 142-suite / 2437-case model");
  expect_all(snapshot.metrics.suiteRowsCreated === 143 && snapshot.metrics.caseRowsCreated === 0 && snapshot.metrics.visibleCaseRows === 0, "the completed collapsed projection creates 143 suite rows and zero case rows");
  expect_all(snapshot.metrics.listenerRegistrations === 1 && snapshot.metrics.cssSurfaceAccesses === 1, "the completed projection owns one delegated listener and one CSS surface");
  expect_all(
    snapshot.metrics.liveTreesConstructed === 859,
    `the completed collapsed projection constructs 859 LiveTrees rather than fully expanding every case (actual ${snapshot.metrics.liveTreesConstructed})`,
  );
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
