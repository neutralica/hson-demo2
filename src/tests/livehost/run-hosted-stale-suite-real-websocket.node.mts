import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import {
  HostedTestUnknownSuiteError,
  HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE,
  hosted_test_unknown_suite_message,
} from "../../app/hosted-test/hosted-test-action-error";
import type { HostedTestSuiteId, HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import type { TestEvent, TestSummary } from "../../app/demos/test/tests.types";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_stale(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted stale-suite WebSocket: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const fullRegistry = make_registered_hosted_test_suite_registry();
const available = Object.freeze(fullRegistry.list().filter((descriptor) => descriptor.id !== "dom/core"));
let runnerCalls = 0;
const staleRegistry: HostedTestSuiteRegistry = Object.freeze({
  list: () => available,
  get(id: HostedTestSuiteId) {
    const descriptor = available.find((candidate) => candidate.id === id);
    if (descriptor === undefined) throw new Error(`stale registry does not contain ${id}`);
    return Object.freeze({
      ...descriptor,
      async run(...args: Parameters<typeof descriptor.run>) {
        runnerCalls += 1;
        return descriptor.run(...args);
      },
    });
  },
});

function sink_state() {
  const events: TestEvent[] = [];
  const summaries: TestSummary[] = [];
  const errors: string[] = [];
  const sink: HostedTestPanelSink = {
    reset() { events.length = 0; summaries.length = 0; errors.length = 0; },
    onEvent(event) { events.push(event); },
    renderSummary(summary) { summaries.push(summary); },
    renderReport() {},
    showInfrastructureError(message) { errors.push(message); },
  };
  return { sink, events, summaries, errors };
}

const serverA = await start_hosted_test_server({ port: 0, registry: staleRegistry });
try {
  const runtime = make_remote_hosted_test_runtime({ url: serverA.url, WebSocketConstructor });
  const sink = sink_state();
  let reportEvents = 0;
  const stopEvents = runtime.client.on_event(() => { reportEvents += 1; });
  await runtime.ready();
  const adapter = make_hosted_test_panel_adapter(runtime.client, sink.sink);
  let rejected: unknown;
  try {
    await adapter.start("dom/core");
  } catch (error) {
    rejected = error;
  }
  expect_stale(rejected instanceof HostedTestUnknownSuiteError, "stale registry rejection is reconstructed as the application error type");
  expect_stale(rejected.code === HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE, "unknown suite exposes a stable application code");
  expect_stale(rejected.requestedSuite === "dom/core", "unknown suite records the requested suite ID");
  expect_stale(adapter.router?.status === "failed" && adapter.router.failure?.code === "ACTION_ERROR_BEFORE_INITIAL", "router fails before mirror construction");
  expect_stale(adapter.router?.mirror === undefined, "pre-report rejection does not fabricate a mirror");
  expect_stale(sink.errors[0] === hosted_test_unknown_suite_message("dom/core"), "panel receives a specific restart/update message");
  expect_stale(runnerCalls === 0 && reportEvents === 0, "no runner, initial event, or commit event is produced");
  const validResult = await adapter.start("livemap/replay");
  const laterRunnerCalls: number = runnerCalls;
  const laterRouterStatus: string | undefined = adapter.router?.status;
  expect_stale(validResult.ok && validResult.summary.cases === 45 && laterRunnerCalls === 1, "stale server remains healthy for a later available suite");
  expect_stale(laterRouterStatus === "complete", "later valid run replaces failed routing state cleanly");
  adapter.dispose();
  stopEvents();
  runtime.dispose();
} finally {
  await serverA.stop();
}

const serverB = await start_hosted_test_server({ port: 0 });
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
try {
  const runtime = make_remote_hosted_test_runtime({ url: serverB.url, WebSocketConstructor });
  const sink = sink_state();
  await runtime.ready();
  const adapter = make_hosted_test_panel_adapter(runtime.client, sink.sink);
  const result = await adapter.start("dom/core");
  expect_stale(result.ok && result.summary.cases === 923 && result.summary.pass === 923, "the same client-known suite succeeds against the updated registry");
  expect_stale(adapter.router?.status === "complete" && adapter.router.mirror?.capture().value.summary.cases === 923, "reconnected run owns fresh router and mirror state");
  expect_stale(sink.events.filter((event) => event.t === "case_end").length === 923, "updated server drives the complete visible case stream");
  adapter.dispose();
  runtime.dispose();
} finally {
  await serverB.stop();
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

expect_stale(typeof window === "undefined" && typeof document === "undefined", "stale-server regression leaves no hosted DOM globals");
originalLog("hosted stale-suite real WebSocket: ok");
