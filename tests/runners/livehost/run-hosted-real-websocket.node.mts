import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";
import { eventually, make_real_websocket_probe, make_real_websocket_runtime } from "./real-websocket-test-runtime";

function expect_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted real WebSocket: ${message}`);
}

const server = await start_hosted_test_server({ port: 0 });
try {
  const runtime = make_real_websocket_runtime(server.url);
  const probe = make_real_websocket_probe(runtime);
  await probe.ready();
  expect_ws(server.connectionCount() === 1, "ready coordinator owns one connection");
  const result = await probe.start("node/all");
  const report = probe.adapter.capture();
  expect_ws(result.ok && result.summary.cases === 1_069, "node/all passes 1,069 cases over a real socket");
  expect_ws(report?.run.id === result.runId && report.run.suite === result.suite, "dedicated report host retains strict run identity");
  expect_ws(probe.updates.flatMap((update) => update.newCases).length === 1_069, "report-host recovery projects every case once");
  expect_ws(server.connectionCount() === 2, "coordinator and report use separate real WebSockets");
  probe.dispose();
  await eventually(() => server.connectionCount() === 0, "real WebSocket disposal");
  console.log(JSON.stringify({ runId: result.runId, cases: result.summary.cases, messages: server.metrics().sentMessages }));
} finally {
  await server.stop();
}
