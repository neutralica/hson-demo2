import { start_hosted_test_server } from "../../hosted-test/server/hosted-test-server";
import { make_real_websocket_probe, make_real_websocket_runtime } from "./real-websocket-test-runtime";

function expect_dom_ws(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted DOM real WebSocket: ${message}`);
}

const server = await start_hosted_test_server({ port: 0 });
try {
  const first = make_real_websocket_probe(make_real_websocket_runtime(server.url));
  await first.ready();
  const result = await first.start("dom/core");
  const report = first.adapter.capture();
  expect_dom_ws(result.ok && result.summary.cases === 953 && result.summary.pass === 953, "DOM collection passes 953 canonical cases");
  expect_dom_ws(report?.run.id === result.runId && report.run.suite === "dom/core", "dedicated DOM report host preserves identity");
  expect_dom_ws(first.updates.flatMap((update) => update.newCases).length === 953, "progressive report recovery projects all DOM cases once");
  first.dispose();

  const runtimeA = make_real_websocket_runtime(server.url);
  const runtimeB = make_real_websocket_runtime(server.url);
  const probeA = make_real_websocket_probe(runtimeA);
  const probeB = make_real_websocket_probe(runtimeB);
  await Promise.all([probeA.ready(), probeB.ready()]);
  const [runA, runB] = await Promise.all([probeA.start("dom/core"), probeB.start("dom/core")]);
  expect_dom_ws(runA.runId !== runB.runId, "two DOM clients receive distinct run IDs");
  expect_dom_ws(probeA.adapter.capture()?.run.id === runA.runId && probeB.adapter.capture()?.run.id === runB.runId, "concurrent clients attach only their own report hosts");
  probeA.dispose();
  probeB.dispose();
  expect_dom_ws(typeof window === "undefined" && typeof document === "undefined", "hosted DOM globals restore after both runs");
  console.log(JSON.stringify({ cases: result.summary.cases, runA: runA.runId, runB: runB.runId }));
} finally {
  await server.stop();
}
