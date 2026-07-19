import { HostedTestUnknownSuiteError } from "../../app/hosted-test/hosted-test-action-error";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { run_test_suites } from "../../hosted-test/test-runner";
import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";
import { make_real_websocket_probe, make_real_websocket_runtime } from "./real-websocket-test-runtime";

function expect_stale(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted stale suite: ${message}`);
}

let executions = 0;
const registry = make_hosted_test_suite_registry([{
  id: "livemap/replay",
  label: "available fixture",
  run(onEvent = () => undefined, options = {}) {
    executions += 1;
    return run_test_suites([{ suite: "stale/available", cases: [{ suite: "stale/available", name: "available", run() {} }] }], onEvent, options);
  },
}]);

const staleServer = await start_hosted_test_server({ port: 0, registry });
try {
  const probe = make_real_websocket_probe(make_real_websocket_runtime(staleServer.url));
  await probe.ready();
  let rejected: unknown;
  try { await probe.start("dom/core"); } catch (error) { rejected = error; }
  expect_stale(rejected instanceof HostedTestUnknownSuiteError, "unavailable suite remains a classified application rejection");
  expect_stale(executions === 0 && probe.adapter.capture() === undefined, "rejection fabricates neither execution nor report");
  const valid = await probe.start("livemap/replay");
  expect_stale(valid.ok && Number(executions) === 1 && probe.adapter.capture()?.run.id === valid.runId, "later valid run attaches its dedicated report host");
  probe.dispose();
} finally {
  await staleServer.stop();
}

const currentServer = await start_hosted_test_server({ port: 0 });
try {
  const probe = make_real_websocket_probe(make_real_websocket_runtime(currentServer.url));
  await probe.ready();
  const current = await probe.start("dom/core");
  expect_stale(current.ok && current.summary.cases === 953, "updated registry executes the formerly unavailable suite");
  expect_stale(probe.adapter.capture()?.run.id === current.runId, "updated report remains strictly correlated");
  probe.dispose();
} finally {
  await currentServer.stop();
}
console.log("hosted stale-suite real WebSocket: ok");
