import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { serialize_hosted_case_diagnostic } from "../../../src/app/demos/tests/panel/hosted-test-report-view";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import { make_hosted_test_run_retention } from "../../harness/hosted/hosted-test-action";
import { hosted_test_report_cases } from "../../harness/reporting/hosted/hosted-test-report.types";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";

function expect_inspect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted case inspection: ${message}`);
}

const retention = make_hosted_test_run_retention(2);
retention.retain("run-1", "node/all");
retention.retain("run-2", "dom/core");
retention.retain("run-3", "canvas/core");
expect_inspect(retention.size() === 2 && retention.get("run-1") === undefined, "run inspection retention evicts the oldest entry at its fixed bound");
retention.clear();
expect_inspect(retention.size() === 0, "run inspection retention clears on host shutdown");

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
});
await runtime.ready();
const sink: HostedTestPanelSink = {
  reset() {}, ingest() {}, showInfrastructureError(message) { throw new Error(message); },
};
const adapter = make_hosted_test_panel_adapter(runtime, sink);
const result = await adapter.start("category/unit");
expect_inspect(result.summary.cases === 101, "focused Unit descriptor executes remotely");
const ordinary = await adapter.inspect("unit/test-harness::failed assertion row fails case and run");
expect_inspect(ordinary.type === "ordinary" && ordinary.caseKey.includes("unit/test-harness"), "ordinary inspection reruns one selected case");
expect_inspect(serialize_hosted_case_diagnostic(ordinary).includes(ordinary.name), "ordinary view/copy serializer contains the selected case");

const transformResult = await adapter.start("category/transform");
const registeredTransformCount = make_local_node_livehost_executor_registry().catalog.tests.filter(
  (descriptor) => descriptor.subject === "transform",
).length;
expect_inspect(
  transformResult.summary.cases === registeredTransformCount,
  "focused Transform descriptor executes the registered Transform cases remotely",
);
const transformReport = adapter.capture();
const transformCase = transformReport ? hosted_test_report_cases(transformReport)[0] : undefined;
expect_inspect(transformCase !== undefined, "transform report exposes a compact case identity");
const transform = await adapter.inspect(transformCase.key);
expect_inspect(transform.type === "transform" && transform.artifacts.length > 0, "transform inspection lazily returns full textual artifacts");

let unknownFailed = false;
try { await adapter.inspect("missing::case"); }
catch (error) { unknownFailed = error instanceof Error && error.message.includes("HOSTED_TEST_UNKNOWN_CASE"); }
expect_inspect(unknownFailed, "unknown case inspection fails visibly with stable identity");

adapter.dispose();
runtime.dispose();
await server.stop();
expect_inspect(typeof window === "undefined" && typeof document === "undefined", "inspection restores hosted DOM globals");
console.log(JSON.stringify({ ordinary: ordinary.caseKey, transform: transform.caseKey, artifacts: transform.artifacts.length }));
