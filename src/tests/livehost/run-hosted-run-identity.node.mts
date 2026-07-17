import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import {
  make_hosted_test_panel_adapter,
  type HostedTestPanelReportUpdate,
} from "../../app/demos/test/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../app/demos/test/hosted-test-panel-runtime";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { run_test_suites } from "../../hosted-test/test-runner";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";

function expect_identity(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted run identity: ${message}`);
}

const WebSocketConstructor = WebSocket as unknown as BrowserWebSocketConstructor;
let executions = 0;
let fixtureVersion = 1;
let fixturePasses = true;

const registry = make_hosted_test_suite_registry([{
  id: "livemap/replay",
  label: "run identity fixture",
  run(onEvent = () => undefined, options = {}) {
    executions += 1;
    const observedVersion = fixtureVersion;
    const observedPass = fixturePasses;
    return run_test_suites([{
      suite: "hosted/run-identity",
      cases: [{
        suite: "hosted/run-identity",
        name: `fixture-v${observedVersion}`,
        run() {
          if (!observedPass) throw new Error(`fixture-v${observedVersion} failed`);
        },
      }],
    }], onEvent, options);
  },
}]);

function sink() {
  const updates: HostedTestPanelReportUpdate[] = [];
  return {
    updates,
    value: {
      reset() { updates.length = 0; },
      ingest(update: HostedTestPanelReportUpdate) { updates.push(update); },
      showInfrastructureError(message: string) { throw new Error(message); },
    },
  };
}

const server = await start_hosted_test_server({ port: 0, registry });
try {
  const firstSink = sink();
  const firstRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const firstAdapter = make_hosted_test_panel_adapter(firstRuntime, firstSink.value);
  await firstRuntime.ready();

  const first = await firstAdapter.start("livemap/replay");
  const second = await firstAdapter.start("livemap/replay");
  expect_identity(first.runId !== second.runId, "two consecutive runs of one suite receive different run IDs");
  expect_identity(executions === 2, "two user starts execute the suite twice");
  expect_identity(first.ok && second.ok, "the initial fixture version passes both fresh executions");

  const firstBrowserClientId = firstRuntime.client.clientId;
  firstAdapter.dispose();
  firstRuntime.dispose();

  const refreshedSink = sink();
  const refreshedRuntime = make_remote_hosted_test_runtime({ url: server.url, WebSocketConstructor });
  const refreshedAdapter = make_hosted_test_panel_adapter(refreshedRuntime, refreshedSink.value);
  await refreshedRuntime.ready();
  expect_identity(refreshedRuntime.client.clientId !== firstBrowserClientId, "a browser refresh receives a new LiveHost client identity");

  const recovered = await refreshedAdapter.recover(second.runId);
  expect_identity(recovered.runId === second.runId && recovered.ok, "an explicitly known prior run ID recovers its completed report");
  expect_identity(executions === 2, "report recovery performs no suite execution");
  expect_identity(refreshedAdapter.capture()?.run.id === second.runId, "the recovered report remains correlated to the explicit run ID");

  fixtureVersion = 2;
  fixturePasses = false;
  const fresh = await refreshedAdapter.start("livemap/replay");
  const freshReport = refreshedAdapter.capture();
  const freshCases = refreshedSink.updates.flatMap((update) => update.newCases);
  expect_identity(fresh.runId !== recovered.runId, "Run after refresh creates a new run instead of returning the recovered report");
  expect_identity(Number(executions) === 3, "Run after refresh executes the suite again");
  expect_identity(!fresh.ok && freshReport?.run.status === "failed", "changed failing fixture code controls the fresh outcome");
  expect_identity(freshCases.some((testCase) => testCase.name === "fixture-v2" && testCase.status === "fail"), "the next report contains the changed fixture version");
  expect_identity(fresh.runId === freshReport?.run.id && fresh.runId !== second.runId, "a stale completed outcome cannot satisfy the fresh action request");

  refreshedAdapter.dispose();
  refreshedRuntime.dispose();
  console.log(JSON.stringify({ executions, firstRunId: first.runId, recoveredRunId: recovered.runId, freshRunId: fresh.runId }));
} finally {
  await server.stop();
}
