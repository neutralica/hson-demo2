import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { run_hosted_test_action } from "../../app/hosted-test/hosted-test-action";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../app/hosted-test/hosted-test-report-initial";
import { decode_hosted_test_report_initial } from "../../app/hosted-test/hosted-test-report-initial";
import { make_hosted_test_report_mirror } from "../../app/hosted-test/hosted-test-report-mirror";
import { make_hosted_test_report_router } from "../../app/hosted-test/hosted-test-report-router";
import { HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../app/hosted-test/hosted-test-report-wire";
import { decode_hosted_test_report_commit_envelope } from "../../app/hosted-test/hosted-test-report-wire";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import type { TestEvent, TestSummary } from "../../app/demos/test/tests.types";
import {
  all_jsdom_hosted_test_suites,
  JSDOM_HOSTED_DEFERRED_CASE_KEYS,
} from "../../hosted-test/dom/jsdom-hosted-test-suites";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_dom_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted DOM real WebSocket: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

let serverRunnerMs = 0;
const measuredBaseRegistry = make_registered_hosted_test_suite_registry();
const measuredRegistry = make_hosted_test_suite_registry(measuredBaseRegistry.list().map((descriptor) => descriptor.id !== "dom/core"
  ? descriptor
  : {
    ...descriptor,
    async run(...args: Parameters<typeof descriptor.run>) {
      const started = performance.now();
      try { return await descriptor.run(...args); }
      finally { serverRunnerMs = performance.now() - started; }
    },
  }));
const server = await start_hosted_test_server({ port: 0, registry: measuredRegistry });
let resultSummary: Readonly<Record<string, number>> | undefined;
try {
  const runtime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
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
  await runtime.ready();
  const router = make_hosted_test_report_router(runtime.client);
  const started = performance.now();
  const result = await run_hosted_test_action(runtime.client, "dom/core");
  const roundTripMs = performance.now() - started;
  const mirror = await router.wait_for_terminal();
  router.accept_result(result);
  const capture = mirror.capture();
  expect_dom_ws(result.ok && result.summary.suites === 73 && result.summary.cases === 923, "DOM collection passes 73 suites / 923 canonical cases");
  expect_dom_ws(result.summary.pass === 923 && result.summary.fail === 0, "every migrated DOM and deterministic geometry case passes");
  expect_dom_ws(initialEvents === 1 && commitEvents > 0, "one initial state precedes a non-empty batched commit stream");
  expect_dom_ws(commitEvents === 83 && initialEvents + commitEvents === 84, "expanded DOM collection retains suite-coherent batching");
  expect_dom_ws(capture.rev === commitEvents + 1, "mirror revision matches contiguous commit count");
  expect_dom_ws(capture.rev === 84, "expanded DOM report terminates at revision 84");
  expect_dom_ws(capture.value.summary.cases === 923 && capture.value.run.status === "passed", "mirror reconstructs terminal DOM report");
  expect_dom_ws(result.runId === router.runId && result.suite === "dom/core" && mirror.suite === "dom/core", "result, router, and mirror correlate");
  const authoritativeKeys = new Set(capture.value.cases.map((testCase) => testCase.key));
  expect_dom_ws(authoritativeKeys.has("livetree/construction-parity::construction: liveTree.fromUntrustedHtml returns mutable sanitized branch"), "runtime-bound DOMPurify case crosses WebSocket");
  expect_dom_ws([
    "livetree/coverage-css-and-content::CssManager: element has non-zero rect after QUID CSS",
    "livetree/document::dom.doc: point queries resolve mounted target tree",
    "livetree/document::dom.doc: elementsFromPoint returns a stack",
    "livetree/create-size::dom.clientSize: mounted html element returns size",
    "livetree/new-svg/::svg bbox returns mounted geometry",
    "livetree/graph-dom-markup-surface::svg bbox is mounted renderer-backed",
  ].every((key) => authoritativeKeys.has(key)), "every explicitly injected geometry case crosses WebSocket");
  expect_dom_ws(JSDOM_HOSTED_DEFERRED_CASE_KEYS.every((key) => !authoritativeKeys.has(key)), "rendered pseudo-element cases remain precisely deferred");
  expect_dom_ws(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined" && typeof CSS === "undefined", "DOM globals are absent after action completion");
  const replayStarted = performance.now();
  const replayMirror = make_hosted_test_report_mirror(decode_hosted_test_report_initial(initialPayload));
  for (const payload of commitPayloads) replayMirror.apply(decode_hosted_test_report_commit_envelope(payload));
  const independentReplayMs = performance.now() - replayStarted;
  expect_dom_ws(JSON.stringify(replayMirror.capture()) === JSON.stringify(capture), "independent mirror replay reconstructs the authoritative report");
  replayMirror.dispose();
  const firstTransport = server.metrics();
  expect_dom_ws(firstTransport.sentMessages === initialEvents + commitEvents + 2, "first run sends hello, report events, and one action acknowledgement");
  router.dispose();
  stopEvents();
  runtime.dispose();

  const panelRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await panelRuntime.ready();
  const panelEvents: TestEvent[] = [];
  const summaries: TestSummary[] = [];
  let renders = 0;
  const sink: HostedTestPanelSink = {
    reset() { panelEvents.length = 0; summaries.length = 0; },
    onEvent(event) { panelEvents.push(event); },
    renderSummary(summary) { summaries.push(summary); },
    renderReport() { renders += 1; },
    showInfrastructureError(message) { throw new Error(message); },
  };
  const adapter = make_hosted_test_panel_adapter(panelRuntime.client, sink);
  const panelResult = await adapter.start("dom/core");
  const caseEvents = panelEvents.filter((event) => event.t === "case_end");
  expect_dom_ws(caseEvents.length === 923 && new Set(caseEvents.map((event) => `${event.suite}::${event.name}`)).size === 923, "panel receives every DOM case exactly once");
  expect_dom_ws(summaries.at(-1)?.pass === 923 && summaries.at(-1)?.fail === 0 && renders > 1, "panel renders progressive batched state");
  expect_dom_ws(panelResult.runId === adapter.router?.runId, "panel uses the existing correlated router path");
  adapter.dispose();
  panelRuntime.dispose();

  const runtimeA = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const runtimeB = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await Promise.all([runtimeA.ready(), runtimeB.ready()]);
  const routerA = make_hosted_test_report_router(runtimeA.client);
  const routerB = make_hosted_test_report_router(runtimeB.client);
  const [resultA, resultB] = await Promise.all([
    run_hosted_test_action(runtimeA.client, "dom/core"),
    run_hosted_test_action(runtimeB.client, "dom/core"),
  ]);
  const [mirrorA, mirrorB] = await Promise.all([routerA.wait_for_terminal(), routerB.wait_for_terminal()]);
  routerA.accept_result(resultA);
  routerB.accept_result(resultB);
  expect_dom_ws(resultA.runId !== resultB.runId, "two DOM clients receive distinct run IDs");
  expect_dom_ws(routerA.runId === resultA.runId && routerB.runId === resultB.runId, "each DOM stream remains connection-scoped");
  expect_dom_ws(mirrorA.capture().value.summary.cases === 923 && mirrorB.capture().value.summary.cases === 923, "serialized DOM actions both complete without state crossover");
  routerA.dispose();
  routerB.dispose();
  runtimeA.dispose();
  runtimeB.dispose();

  const domRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const nodeRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await Promise.all([domRuntime.ready(), nodeRuntime.ready()]);
  const [domResult, nodeResult] = await Promise.all([
    run_hosted_test_action(domRuntime.client, "dom/core"),
    run_hosted_test_action(nodeRuntime.client, "node/all"),
  ]);
  expect_dom_ws(domResult.summary.cases === 923 && nodeResult.summary.cases === 1060 && nodeResult.summary.fail === 0, "DOM and Node-safe requests coordinate without global corruption");
  domRuntime.dispose();
  nodeRuntime.dispose();
  expect_dom_ws(typeof window === "undefined" && typeof document === "undefined" && typeof DOMParser === "undefined" && typeof CSS === "undefined", "concurrent lifecycle leaves no DOM globals");

  let failNextDom = true;
  const baseRegistry = make_registered_hosted_test_suite_registry();
  const failureRegistry = make_hosted_test_suite_registry(baseRegistry.list().map((descriptor) => descriptor.id !== "dom/core"
    ? descriptor
    : {
      ...descriptor,
      async run(onEvent, options) {
        if (!failNextDom) return descriptor.run(onEvent, options);
        failNextDom = false;
        return with_hosted_dom_runtime(() => {
          onEvent?.({ t: "suite_begin", suite: "dom/synthetic-failure", totalPlanned: 0 });
          throw new Error("synthetic jsdom hosted failure");
        });
      },
    }));
  const failureServer = await start_hosted_test_server({ port: 0, registry: failureRegistry });
  try {
    const failureRuntime = make_remote_hosted_test_runtime({ url: failureServer.url, WebSocketConstructor });
    await failureRuntime.ready();
    const failureRouter = make_hosted_test_report_router(failureRuntime.client);
    let rejected: unknown;
    try {
      await run_hosted_test_action(failureRuntime.client, "dom/core");
    } catch (error) {
      rejected = error;
      expect_dom_ws(failureRouter.status === "complete", "terminal DOM error report arrives before action rejection");
    }
    const failureMirror = await failureRouter.wait_for_terminal();
    failureRouter.accept_action_error(rejected);
    expect_dom_ws(failureMirror.capture().value.run.status === "error", "throwing DOM action publishes terminal infrastructure error");
    expect_dom_ws(typeof window === "undefined" && typeof document === "undefined", "throwing DOM action restores process globals");
    failureRouter.dispose();
    failureRuntime.dispose();

    const recoveryRuntime = make_remote_hosted_test_runtime({ url: failureServer.url, WebSocketConstructor });
    await recoveryRuntime.ready();
    const recoveryResult = await run_hosted_test_action(recoveryRuntime.client, "dom/core");
    expect_dom_ws(recoveryResult.ok && recoveryResult.summary.cases === 923, "mutex releases and a later DOM action succeeds");
    recoveryRuntime.dispose();
  } finally {
    await failureServer.stop();
  }

  const metrics = server.metrics();
  resultSummary = Object.freeze({
    suites: all_jsdom_hosted_test_suites().length,
    cases: result.summary.cases,
    commits: commitEvents,
    events: initialEvents + commitEvents,
    finalRev: capture.rev,
    roundTripMs,
    serverRunnerMs,
    independentReplayMs,
    panelRenders: renders,
    firstServerMessages: firstTransport.sentMessages,
    firstServerBytes: firstTransport.sentBytes,
    serverMessages: metrics.sentMessages,
    serverBytes: metrics.sentBytes,
  });
} finally {
  await server.stop();
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

originalLog(JSON.stringify(resultSummary));
