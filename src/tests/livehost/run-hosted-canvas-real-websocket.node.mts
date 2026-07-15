import { performance } from "node:perf_hooks";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import { hosted_test_report_cases } from "../../app/hosted-test/hosted-test-report.types";
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
import { JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS } from "../../hosted-test/dom/canvas/jsdom-hosted-canvas-suites";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_canvas_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted canvas real WebSocket: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

let failNextCanvasRun = false;
const baseRegistry = make_registered_hosted_test_suite_registry();
const registry = make_hosted_test_suite_registry(baseRegistry.list().map((descriptor) => descriptor.id !== "canvas/core"
  ? descriptor
  : {
    ...descriptor,
    async run(...args: Parameters<typeof descriptor.run>) {
      if (!failNextCanvasRun) return descriptor.run(...args);
      failNextCanvasRun = false;
      return with_hosted_dom_runtime((runtime) => {
        const canvas = runtime.document.getElementById("unsupported");
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Synthetic hosted canvas fixture is missing.");
        canvas.getContext("2d")?.getImageData(0, 0, 1, 1);
        throw new Error("Synthetic unsupported canvas operation did not fail.");
      }, { html: "<!doctype html><html><body><canvas id=\"unsupported\"></canvas></body></html>" });
    },
  }));
const server = await start_hosted_test_server({ port: 0, registry });
let summary: Readonly<Record<string, number>> | undefined;
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
  const result = await run_hosted_test_action(runtime.client, "canvas/core");
  const roundTripMs = performance.now() - started;
  const mirror = await router.wait_for_terminal();
  router.accept_result(result);
  const capture = mirror.capture();
  expect_canvas_ws(result.ok && result.summary.suites === 6 && result.summary.cases === 62 && result.summary.pass === 62, "canvas collection passes 6 suites / 62 canonical cases");
  expect_canvas_ws(initialEvents === 1 && commitEvents === 8, "one initial event precedes eight suite-coherent report commits");
  expect_canvas_ws(capture.rev === 9 && capture.value.run.status === "passed", "mirror reconstructs terminal revision 9");
  expect_canvas_ws(result.runId === router.runId && result.suite === "canvas/core" && mirror.suite === "canvas/core", "result, router, mirror, and stream correlate");
  const keys = new Set(hosted_test_report_cases(capture.value).map((testCase) => testCase.key));
  expect_canvas_ws(keys.size === 62, "every migrated canvas identity appears exactly once");
  expect_canvas_ws(JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS.every((key) => !keys.has(key)), "pixel-output cases are excluded rather than silently skipped");
  expect_canvas_ws(typeof window === "undefined" && typeof document === "undefined" && typeof HTMLCanvasElement === "undefined" && typeof CanvasRenderingContext2D === "undefined" && typeof ResizeObserver === "undefined", "canvas and DOM globals restore after action completion");
  const replayStarted = performance.now();
  const replayMirror = make_hosted_test_report_mirror(decode_hosted_test_report_initial(initialPayload));
  for (const payload of commitPayloads) replayMirror.apply(decode_hosted_test_report_commit_envelope(payload));
  const mirrorReplayMs = performance.now() - replayStarted;
  expect_canvas_ws(JSON.stringify(replayMirror.capture()) === JSON.stringify(capture), "independent mirror replay reconstructs the authoritative canvas report");
  replayMirror.dispose();
  const firstTransport = server.metrics();
  expect_canvas_ws(firstTransport.sentMessages === 11, "first run sends hello, nine report events, and one action acknowledgement");
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
    renderSummary(value) { summaries.push(value); },
    renderReport() { renders += 1; },
    showInfrastructureError(message) { throw new Error(message); },
  };
  const adapter = make_hosted_test_panel_adapter(panelRuntime.client, sink);
  const panelResult = await adapter.start("canvas/core");
  const caseEvents = panelEvents.filter((event) => event.t === "case_end");
  expect_canvas_ws(caseEvents.length === 62 && new Set(caseEvents.map((event) => `${event.suite}::${event.name}`)).size === 62, "existing panel adapter receives every canvas case once");
  expect_canvas_ws(summaries.at(-1)?.pass === 62 && summaries.at(-1)?.fail === 0 && renders === 9, "panel renders the initial, batched, and terminal report revisions");
  expect_canvas_ws(panelResult.runId === adapter.router?.runId, "panel path retains run correlation without a local runner");
  adapter.dispose();
  panelRuntime.dispose();

  failNextCanvasRun = true;
  const failureRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await failureRuntime.ready();
  const failureMessages: string[] = [];
  const failureAdapter = make_hosted_test_panel_adapter(failureRuntime.client, {
    reset() { failureMessages.length = 0; },
    onEvent() { /* report state is inspected through the owned router */ },
    renderSummary() { /* report state is inspected through the owned router */ },
    renderReport() { /* report state is inspected through the owned router */ },
    showInfrastructureError(message) { failureMessages.push(message); },
  });
  let actionError: unknown;
  try {
    await failureAdapter.start("canvas/core");
  } catch (error) {
    actionError = error;
  }
  expect_canvas_ws(actionError instanceof Error, "unsupported canvas operation rejects through the existing action-error path");
  const failureMirror = failureAdapter.router?.mirror;
  expect_canvas_ws(failureMirror?.capture().value.run.status === "error" && failureAdapter.router?.status === "complete", "unsupported operation produces authoritative terminal infrastructure error state");
  expect_canvas_ws(failureMessages.some((message) => message.includes("does not support getImageData")), "existing panel error surface terminates visibly instead of hanging");
  expect_canvas_ws(typeof HTMLCanvasElement === "undefined" && typeof CanvasRenderingContext2D === "undefined", "failure restores canvas globals before action rejection settles");
  failureAdapter.dispose();
  failureRuntime.dispose();

  const recoveryRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await recoveryRuntime.ready();
  const recoveryResult = await run_hosted_test_action(recoveryRuntime.client, "canvas/core");
  expect_canvas_ws(recoveryResult.summary.cases === 62 && recoveryResult.summary.fail === 0, "mutex release permits a later canvas run after failure");
  recoveryRuntime.dispose();

  const runtimeA = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const runtimeB = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await Promise.all([runtimeA.ready(), runtimeB.ready()]);
  const routerA = make_hosted_test_report_router(runtimeA.client);
  const routerB = make_hosted_test_report_router(runtimeB.client);
  const [resultA, resultB] = await Promise.all([
    run_hosted_test_action(runtimeA.client, "canvas/core"),
    run_hosted_test_action(runtimeB.client, "canvas/core"),
  ]);
  const [mirrorA, mirrorB] = await Promise.all([routerA.wait_for_terminal(), routerB.wait_for_terminal()]);
  routerA.accept_result(resultA);
  routerB.accept_result(resultB);
  expect_canvas_ws(resultA.runId !== resultB.runId && routerA.runId === resultA.runId && routerB.runId === resultB.runId, "two serialized canvas clients remain connection-scoped");
  expect_canvas_ws(mirrorA.capture().value.summary.cases === 62 && mirrorB.capture().value.summary.cases === 62, "two sequential mutex owners start with clean recorder state");
  routerA.dispose();
  routerB.dispose();
  runtimeA.dispose();
  runtimeB.dispose();

  const canvasRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const nodeRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await Promise.all([canvasRuntime.ready(), nodeRuntime.ready()]);
  const [canvasResult, nodeResult] = await Promise.all([
    run_hosted_test_action(canvasRuntime.client, "canvas/core"),
    run_hosted_test_action(nodeRuntime.client, "node/all"),
  ]);
  expect_canvas_ws(canvasResult.summary.cases === 62 && nodeResult.summary.cases === 1060 && nodeResult.summary.fail === 0, "canvas and Node-safe requests coordinate without global corruption");
  canvasRuntime.dispose();
  nodeRuntime.dispose();

  const domRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  await domRuntime.ready();
  const domResult = await run_hosted_test_action(domRuntime.client, "dom/core");
  expect_canvas_ws(domResult.summary.cases === 923 && domResult.summary.fail === 0, "following dom/core run remains clean at 923/923");
  domRuntime.dispose();

  summary = Object.freeze({
    cases: result.summary.cases,
    commits: commitEvents,
    events: initialEvents + commitEvents,
    finalRev: capture.rev,
    roundTripMs,
    mirrorReplayMs,
    panelRenders: renders,
    sentMessages: firstTransport.sentMessages,
    sentBytes: firstTransport.sentBytes,
  });
} finally {
  await server.stop();
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

originalLog(JSON.stringify(summary));
