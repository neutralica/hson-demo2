import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import type { TestEvent, TestSummary } from "../../app/demos/test/tests.types";
import { HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../app/hosted-test/hosted-test-report-initial";
import { decode_hosted_test_report_initial } from "../../app/hosted-test/hosted-test-report-initial";
import { make_hosted_test_report_mirror } from "../../app/hosted-test/hosted-test-report-mirror";
import { decode_hosted_test_report_commit_envelope, HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../app/hosted-test/hosted-test-report-wire";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { DEFERRED_BROWSER_FIDELITY_CASES } from "../../hosted-test/final-harness-migration-inventory";
import { all_hosted_test_suites } from "../../hosted-test/hosted-all-test-suites";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
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

  const events: TestEvent[] = [];
  const summaries: TestSummary[] = [];
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
    reset() { events.length = 0; summaries.length = 0; },
    onEvent(event) { events.push(event); },
    renderSummary(summary) { summaries.push(summary); },
    renderReport() { renders += 1; },
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
  const caseEvents = events.filter((event) => event.t === "case_end");
  expect_all(caseEvents.length === 2045 && new Set(caseEvents.map((event) => `${event.suite}::${event.name}`)).size === 2045, "panel receives every case exactly once");
  expect_all(summaries[0]?.cases === 0 && summaries.at(-1)?.cases === 2045 && summaries.at(-1)?.pass === 2045, "panel starts authoritative-empty and completes successfully");
  expect_all(summaries.every((summary, index, values) => index === 0 || summary.cases >= (values[index - 1]?.cases ?? 0)), "panel totals are monotonic");
  expect_all(initialEvents === 1 && commitEvents > 0 && mirror.rev === commitEvents + 1, "one initial state precedes a contiguous batched stream");
  expect_all(renders === initialEvents + commitEvents, "panel renders once per received report revision");
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
    panelRenders: renders,
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
  adapter.dispose();
  stopEvents();
  runtime.dispose();
} finally {
  if (server !== undefined) await server.stop();
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

console.log(JSON.stringify(metrics));
