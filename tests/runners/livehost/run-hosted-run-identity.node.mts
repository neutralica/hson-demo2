import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import {
  make_hosted_test_panel_adapter,
  type HostedTestPanelReportUpdate,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { run_test_suites } from "../../harness/core/test-runner";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

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
        caseId: `fixture-v${observedVersion}`,
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
  const firstActionIds = ["shared-request", "second-request"];
  const firstRuntime = make_remote_hosted_test_runtime({
    url: server.url,
    WebSocketConstructor,
    makeClientId: () => "browser-one",
    makeActionId: () => firstActionIds.shift() ?? "unexpected-browser-one-request",
  });
  const firstAdapter = make_hosted_test_panel_adapter(firstRuntime, firstSink.value);
  await firstRuntime.ready();

  const first = await firstAdapter.start("livemap/replay");
  const second = await firstAdapter.start("livemap/replay");
  expect_identity(first.runId !== second.runId, "two consecutive runs of one suite receive different run IDs");
  expect_identity(
    first.attemptId !== second.attemptId
      && first.attemptId === `${first.runId}:attempt:1`
      && second.attemptId === `${second.runId}:attempt:1`,
    "fresh runs receive distinct first-attempt identities",
  );
  expect_identity(executions === 2, "two user starts execute the suite twice");
  expect_identity(first.ok && second.ok, "the initial fixture version passes both fresh executions");

  const secondBrowserSink = sink();
  const secondBrowserRuntime = make_remote_hosted_test_runtime({
    url: server.url,
    WebSocketConstructor,
    makeClientId: () => "browser-two",
    makeActionId: () => "shared-request",
  });
  const secondBrowserAdapter = make_hosted_test_panel_adapter(secondBrowserRuntime, secondBrowserSink.value);
  await secondBrowserRuntime.ready();
  const sameRequestIdRun = await secondBrowserAdapter.start("livemap/replay");
  expect_identity(sameRequestIdRun.runId !== first.runId, "two clients sharing one request ID receive distinct run IDs");
  expect_identity(Number(executions) === 3, "the second client's shared request ID starts a fresh execution");
  const associations = secondBrowserRuntime.client.recovery.map.capture().value.requests;
  expect_identity(associations["browser-one"]?.["shared-request"]?.runId === first.runId, "the first client retains its request association");
  expect_identity(associations["browser-two"]?.["shared-request"]?.runId === sameRequestIdRun.runId, "the second client retains an independent request association");
  expect_identity(
    associations["browser-one"]?.["shared-request"]?.attemptId === first.attemptId
      && associations["browser-two"]?.["shared-request"]?.attemptId === sameRequestIdRun.attemptId,
    "request indexes retain attempt identity without treating a shared request ID as an attempt",
  );

  firstAdapter.dispose();
  firstRuntime.dispose();
  secondBrowserAdapter.dispose();
  secondBrowserRuntime.dispose();

  const refreshedSink = sink();
  const refreshedRuntime = make_remote_hosted_test_runtime({
    url: server.url,
    WebSocketConstructor,
    makeClientId: () => "browser-after-reload",
    makeActionId: () => "shared-request",
  });
  const refreshedAdapter = make_hosted_test_panel_adapter(refreshedRuntime, refreshedSink.value);
  await refreshedRuntime.ready();
  expect_identity(refreshedRuntime.client.clientId !== "browser-one", "a browser refresh receives a new LiveHost client identity");

  const recovered = await refreshedAdapter.recover(sameRequestIdRun.runId);
  expect_identity(
    recovered.runId === sameRequestIdRun.runId
      && recovered.attemptId === sameRequestIdRun.attemptId
      && recovered.ok,
    "an explicitly known prior run ID recovers its completed attempt and report",
  );
  expect_identity(Number(executions) === 3, "report recovery performs no suite execution");
  expect_identity(refreshedAdapter.capture()?.run.id === sameRequestIdRun.runId, "the recovered report remains correlated to the explicit run ID");

  fixtureVersion = 2;
  fixturePasses = false;
  const fresh = await refreshedAdapter.start("livemap/replay");
  const freshReport = refreshedAdapter.capture();
  const freshCases = refreshedSink.updates.flatMap((update) => update.newCases);
  expect_identity(fresh.runId !== recovered.runId, "Run after refresh creates a new run instead of returning the recovered report");
  expect_identity(fresh.attemptId !== recovered.attemptId, "Run after refresh creates a new execution attempt identity");
  expect_identity(Number(executions) === 4, "Run after refresh executes the suite again");
  expect_identity(!fresh.ok && freshReport?.run.status === "failed", "changed failing fixture code controls the fresh outcome");
  expect_identity(freshCases.some((testCase) => testCase.name === "fixture-v2" && testCase.status === "fail"), "the next report contains the changed fixture version");
  expect_identity(fresh.runId === freshReport?.run.id && fresh.runId !== second.runId, "a stale completed outcome cannot satisfy the fresh action request");

  refreshedAdapter.dispose();
  refreshedRuntime.dispose();
  console.log(JSON.stringify({ executions, firstRunId: first.runId, sharedRequestRunId: sameRequestIdRun.runId, recoveredRunId: recovered.runId, freshRunId: fresh.runId }));
} finally {
  await server.stop();
}
