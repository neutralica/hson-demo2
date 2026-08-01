import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import { make_real_websocket_probe, make_real_websocket_runtime } from "../../suites/livehost/real-websocket-test-runtime";

function expect_canvas_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted canvas real WebSocket: ${message}`);
}

let failNext = true;
const base = make_registered_hosted_test_suite_registry();
const registry = make_hosted_test_suite_registry(base.list().map((descriptor) => descriptor.id !== "canvas/core" ? descriptor : {
  ...descriptor,
  async run(...args: Parameters<typeof descriptor.run>) {
    if (failNext) {
      failNext = false;
      throw new Error("synthetic unsupported canvas operation");
    }
    return descriptor.run(...args);
  },
}));

const server = await start_hosted_test_server({ port: 0, registry });
try {
  const failure = make_real_websocket_probe(make_real_websocket_runtime(server.url));
  await failure.ready();
  let rejected: unknown;
  try { await failure.start("canvas/core"); } catch (error) { rejected = error; }
  expect_canvas_ws(rejected instanceof Error, "infrastructure failure rejects through the action path");
  expect_canvas_ws(failure.adapter.capture()?.run.status === "error", "failure remains an authoritative terminal report");
  expect_canvas_ws(failure.errors.some((message) => message.includes("synthetic unsupported canvas operation")), "failure is visible through the panel error surface");
  failure.dispose();

  const recovery = make_real_websocket_probe(make_real_websocket_runtime(server.url));
  await recovery.ready();
  const result = await recovery.start("canvas/core");
  const report = recovery.adapter.capture();
  expect_canvas_ws(result.ok && result.summary.cases === 62 && result.summary.pass === 62, "later canvas run passes 62 canonical cases");
  expect_canvas_ws(report?.run.id === result.runId && report.run.suite === "canvas/core", "recovery run owns a strictly correlated report host");
  expect_canvas_ws(recovery.updates.flatMap((update) => update.newCases).length === 62, "report host projects every canvas case once");
  recovery.dispose();
  expect_canvas_ws(typeof HTMLCanvasElement === "undefined" && typeof CanvasRenderingContext2D === "undefined", "canvas globals restore after completion");
  console.log(JSON.stringify({ runId: result.runId, cases: result.summary.cases }));
} finally {
  await server.stop();
}
