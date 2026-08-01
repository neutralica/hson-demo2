import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { HostedTestActionRejectedError } from "../../harness/hosted/hosted-test-action-error";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { run_test_suites } from "../../harness/core/test-runner";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

function expect_classification(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted retry classification: ${message}`);
}

let socketConstructions = 0;
class CountingWebSocket extends WebSocket {
  constructor(address: string | URL, protocols?: string | string[]) {
    super(address, protocols);
    socketConstructions += 1;
  }
}

let executions = 0;
const registry = make_hosted_test_suite_registry(["livemap/replay", "livehost/all"].map((id) => ({
  id: id as "livemap/replay" | "livehost/all",
  label: id,
  run(onEvent = () => undefined, options = {}) {
    executions += 1;
    return run_test_suites([{
      suite: id,
      cases: [{ suite: id, name: "classification fixture", run() {} }],
    }], onEvent, options);
  },
})));

const server = await start_hosted_test_server({ port: 0, registry });
try {
  const runtime = make_remote_hosted_test_runtime({
    url: server.url,
    WebSocketConstructor: CountingWebSocket as unknown as BrowserWebSocketConstructor,
    makeClientId: () => "classification-client",
    makeActionId: () => "shared-classification-request",
  });
  const adapter = make_hosted_test_panel_adapter(runtime, {
    reset() {},
    ingest() {},
    showInfrastructureError() {},
  });
  await runtime.ready();
  await adapter.start("livemap/replay");
  expect_classification(socketConstructions === 2, "the initial run opens one coordinator and one report connection");

  let rejection: unknown;
  try { await adapter.start("livehost/all"); }
  catch (error) { rejection = error; }
  expect_classification(
    rejection instanceof HostedTestActionRejectedError && rejection.code === "LIVEHOST_ACTION_REQUEST_ID_CONFLICT",
    "a reused request ID with different content remains an explicit classified rejection",
  );
  expect_classification(socketConstructions === 2, `a classified server rejection does not reconnect or retry (opened ${socketConstructions} sockets)`);
  expect_classification(executions === 1, "a classified conflict does not execute a second suite");

  adapter.dispose();
  runtime.dispose();
  console.log(JSON.stringify({ socketConstructions, executions, code: rejection.code }));
} finally {
  await server.stop();
}
