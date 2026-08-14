import {
  make_hosted_test_panel_adapter,
  hosted_test_suite_for_panel_mode,
  type HostedTestPanelReportUpdate,
  type HostedTestPanelSink,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_in_memory_hosted_test_runtime } from "../../suites/livehost/in-memory-hosted-test-panel-runtime";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { all_node_safe_hosted_test_suites } from "../../harness/hosted/node-safe-hosted-test-suites";
import { all_livehost_suites } from "../../suites/livehost/suite-registry";

function expect_adapter(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted test panel adapter: ${message}`);
}

function make_sink() {
  const updates: HostedTestPanelReportUpdate[] = [];
  const infrastructureErrors: string[] = [];
  let resets = 0;
  let renders = 0;
  const sink: HostedTestPanelSink = {
    reset() {
      resets += 1;
      updates.length = 0;
      infrastructureErrors.length = 0;
    },
    ingest(update) {
      updates.push(update);
      renders += 1;
    },
    showInfrastructureError(message) {
      infrastructureErrors.push(message);
    },
  };
  return {
    sink,
    updates,
    infrastructureErrors,
    get resets() { return resets; },
    get renders() { return renders; },
  };
}

const runtime = make_in_memory_hosted_test_runtime(make_registered_hosted_test_suite_registry());
const visibleSink = make_sink();
let localReplayInvocations = 0;
expect_adapter(
  hosted_test_suite_for_panel_mode("livemap-replay") === "livemap/replay"
    && hosted_test_suite_for_panel_mode("livehost-all") === "livehost/all"
    && hosted_test_suite_for_panel_mode("node-all") === "node/all"
    && hosted_test_suite_for_panel_mode("dom-core") === "dom/core"
    && hosted_test_suite_for_panel_mode("canvas-core") === "canvas/core"
    && hosted_test_suite_for_panel_mode("hosted-all") === "hosted/all",
  "every visible mode resolves through the shared hosted adapter",
);
const visibleAdapter = make_hosted_test_panel_adapter(runtime, visibleSink.sink);
const visibleResult = await visibleAdapter.start("livemap/replay");
expect_adapter(localReplayInvocations === 0, "hosted adapter never invokes the browser-local replay runner");
expect_adapter(visibleResult.ok && visibleAdapter.capture()?.run.id === visibleResult.runId, "real action result correlates with the generic recovered report");
expect_adapter(
  typeof visibleResult.reportRev === "number" && visibleResult.reportRev >= 1 && visibleAdapter.capture()?.run.status === "passed",
  `real visible route completes with authoritative batched lifecycle revisions (rev ${String(visibleResult.reportRev)}, status ${String(visibleAdapter.capture()?.run.status)})`,
);
expect_adapter(visibleSink.updates.flatMap((update) => update.newCases).length === 45, "45 compact case records are ingested exactly once");
const visibleFinal = visibleSink.updates.at(-1)?.report.summary;
expect_adapter(visibleFinal?.cases === 45 && visibleFinal.pass === 45 && visibleFinal.fail === 0, "visible final summary is 45 passing cases");
expect_adapter(visibleSink.renders >= 1, "generic snapshot or commits request panel rendering");
visibleAdapter.dispose();
runtime.dispose();

const livehostRuntime = make_in_memory_hosted_test_runtime(make_registered_hosted_test_suite_registry());
const livehostSink = make_sink();
const livehostAdapter = make_hosted_test_panel_adapter(livehostRuntime, livehostSink.sink);
const livehostResult = await livehostAdapter.start("livehost/all");
const expectedLivehostSuites = all_livehost_suites();
const expectedLivehostCases = expectedLivehostSuites.reduce((total, suite) => total + suite.cases.length, 0);
expect_adapter(livehostResult.suite === "livehost/all" && livehostResult.summary.suites === expectedLivehostSuites.length, `second visible mode uses the same adapter and returns LiveHost collection identity (observed ${livehostResult.summary.suites})`);
expect_adapter(livehostAdapter.capture()?.run.id === livehostResult.runId && livehostAdapter.capture()?.run.suite === "livehost/all", "second result and recovered report correlate suite identity");
expect_adapter(typeof livehostResult.reportRev === "number" && livehostResult.reportRev >= 1, `${expectedLivehostCases}-case LiveHost report streams batched normalized suite/case lifecycle revisions`);
expect_adapter(livehostSink.updates.flatMap((update) => update.newCases).length === expectedLivehostCases, `second hosted mode progressively ingests ${expectedLivehostCases} compact cases`);
const livehostFinal = livehostSink.updates.at(-1)?.report.summary;
expect_adapter(livehostFinal?.cases === expectedLivehostCases && livehostFinal.pass === expectedLivehostCases && livehostFinal.fail === 0, "second hosted mode renders the complete passing LiveHost summary");
livehostAdapter.dispose();
livehostRuntime.dispose();

const nodeRegistry = make_registered_hosted_test_suite_registry();
const expectedNodeSuites = all_node_safe_hosted_test_suites();
const expectedNodeCases = expectedNodeSuites.reduce((total, suite) => total + suite.cases.length, 0);
const nodeRuntime = make_in_memory_hosted_test_runtime(nodeRegistry);
const nodeSink = make_sink();
const nodeAdapter = make_hosted_test_panel_adapter(nodeRuntime, nodeSink.sink);
const nodePanelStarted = performance.now();
const nodeResult = await nodeAdapter.start("node/all");
const nodePanelRoundTripMs = performance.now() - nodePanelStarted;
expect_adapter(localReplayInvocations === 0, "aggregate hosted mode never invokes the browser-local runner");
expect_adapter(nodeResult.suite === "node/all" && nodeResult.summary.suites === expectedNodeSuites.length, "aggregate selector uses the shared adapter and complete canonical suite catalog");
expect_adapter(
  typeof nodeResult.reportRev === "number" && nodeResult.reportRev >= 1 && nodeSink.updates.length >= 1,
  "aggregate report exposes an authoritative terminal revision through one or more batched projections",
);
const nodeCases = nodeSink.updates.flatMap((update) => update.newCases);
expect_adapter(nodeCases.length === expectedNodeCases, "aggregate panel receives every canonical compact case");
expect_adapter(new Set(nodeCases.map((testCase) => `${testCase.suite}\u0000${testCase.name}`)).size === expectedNodeCases, "aggregate panel case identities are unique");
expect_adapter(nodeSink.updates.every((update, index, values) => index === 0 || update.report.summary.cases >= (values[index - 1]?.report.summary.cases ?? 0)), "aggregate case totals never decrease");
const nodeFinal = nodeSink.updates.at(-1)?.report.summary;
expect_adapter(nodeFinal?.cases === expectedNodeCases && nodeFinal.pass === expectedNodeCases && nodeFinal.fail === 0, "aggregate panel renders every canonical case as passing");
console.log(JSON.stringify({ nodePanelRoundTripMs, nodePanelRenders: nodeSink.renders }));
nodeAdapter.dispose();
nodeRuntime.dispose();

expect_adapter(typeof window === "undefined" && typeof document === "undefined", "adapter core remains Node-safe");
console.log("hosted test panel adapter: ok");
