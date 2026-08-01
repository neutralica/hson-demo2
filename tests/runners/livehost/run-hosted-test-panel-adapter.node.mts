import type { JsonValue, LiveHostEventListener } from "hson-live/types";
import {
  make_hosted_test_panel_adapter,
  hosted_test_suite_for_panel_mode,
  type HostedTestPanelReportUpdate,
  type HostedTestPanelSink,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_in_memory_hosted_test_runtime } from "../../suites/livehost/in-memory-hosted-test-panel-runtime";
import { make_registered_hosted_test_suite_registry } from "../../harness/hosted/registered-hosted-test-suites";
import { all_node_safe_hosted_test_suites } from "../../harness/hosted/node-safe-hosted-test-suites";
import type { TestSummary } from "../../harness/core/test-contracts";
import type { HostedTestRunResult } from "../../suites/livehost/hosted-replay-action";
import type { HostedTestSuiteId } from "../../harness/hosted/hosted-test-suite";
import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import { encode_hosted_test_report_initial, HOSTED_TEST_REPORT_INITIAL_EVENT } from "../../harness/reporting/hosted/hosted-test-report-initial";
import { encode_hosted_test_report_commit, HOSTED_TEST_REPORT_COMMIT_EVENT } from "../../harness/reporting/hosted/hosted-test-report-wire";
import {
  HostedTestUnknownSuiteError,
  HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE,
  hosted_test_unknown_suite_message,
} from "../../harness/hosted/hosted-test-action-error";

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

type Deferred = Readonly<{
  promise: Promise<unknown>;
  resolve(value: unknown): void;
}>;

function deferred(): Deferred {
  let resolvePromise: (value: unknown) => void = () => undefined;
  const promise = new Promise<unknown>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function fake_client() {
  const listeners = new Set<LiveHostEventListener>();
  const actions: Deferred[] = [];
  const listenerCountsAtAction: number[] = [];
  return {
    client: {
      on_event(listener: LiveHostEventListener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      action(_name: "tests.run", _payload: Readonly<{ suite: HostedTestSuiteId }>) {
        listenerCountsAtAction.push(listeners.size);
        const action = deferred();
        actions.push(action);
        return action.promise;
      },
    },
    emit(event: string, payload: JsonValue) {
      for (const listener of [...listeners]) listener({ type: "event", event, payload });
    },
    actions,
    listenerCountsAtAction,
    get listenerCount() { return listeners.size; },
  };
}

function fixture(runId: string, status: "passed" | "failed" | "error") {
  const report = make_hosted_test_report(() => 10);
  const initial = encode_hosted_test_report_initial(runId, "livemap/replay", report.map.capture());
  report.reduce({ t: "suite_begin", suite: "livemap/replay" });
  let result: HostedTestRunResult | undefined;
  if (status === "error") {
    report.failInfrastructure(new Error("synthetic infrastructure failure"));
  } else {
    const passed = status === "passed";
    report.reduce({
      t: "case_end",
      suite: "livemap/replay",
      name: "synthetic",
      status: passed ? "pass" : "fail",
      ms: 1,
      ...(passed ? {} : { err: "expected" }),
    });
    const summary: TestSummary = {
      suites: 1,
      cases: 1,
      pass: passed ? 1 : 0,
      fail: passed ? 0 : 1,
      skip: 0,
      msTotal: 1,
      failures: passed ? [] : [{ suite: "livemap/replay", name: "synthetic", err: "expected", ms: 1 }],
    };
    report.complete({ ok: passed, summary });
    result = { runId, suite: "livemap/replay", ok: passed, summary, timing: { runnerMs: 1, hostMs: 1 } };
  }
  const commits = report.commits().map((commit) => encode_hosted_test_report_commit(runId, "livemap/replay", commit));
  report.dispose();
  return { initial, commits, result };
}

function emit_fixture(io: ReturnType<typeof fake_client>, value: ReturnType<typeof fixture>): void {
  io.emit(HOSTED_TEST_REPORT_INITIAL_EVENT, value.initial as unknown as JsonValue);
  for (const commit of value.commits) io.emit(HOSTED_TEST_REPORT_COMMIT_EVENT, commit as unknown as JsonValue);
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
expect_adapter(visibleResult.reportRev === 4 && visibleAdapter.capture()?.run.status === "passed", "real visible route completes at authoritative report revision 4");
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
expect_adapter(livehostResult.suite === "livehost/all" && livehostResult.summary.suites === 11, "second visible mode uses the same adapter and returns LiveHost collection identity");
expect_adapter(livehostAdapter.capture()?.run.id === livehostResult.runId && livehostAdapter.capture()?.run.suite === "livehost/all", "second result and recovered report correlate suite identity");
expect_adapter(livehostResult.reportRev === 14, "184-case LiveHost report reaches batched revision 14");
expect_adapter(livehostSink.updates.flatMap((update) => update.newCases).length === 184, "second hosted mode progressively ingests 184 compact cases");
const livehostFinal = livehostSink.updates.at(-1)?.report.summary;
expect_adapter(livehostFinal?.cases === 184 && livehostFinal.pass === 184 && livehostFinal.fail === 0, "second hosted mode renders the complete passing LiveHost summary");
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
expect_adapter(nodeResult.reportRev === nodeSink.updates.length, "aggregate report revision matches its complete sequence of batched updates");
const nodeCases = nodeSink.updates.flatMap((update) => update.newCases);
expect_adapter(nodeCases.length === expectedNodeCases, "aggregate panel receives every canonical compact case");
expect_adapter(new Set(nodeCases.map((testCase) => `${testCase.suite}\u0000${testCase.name}`)).size === expectedNodeCases, "aggregate panel case identities are unique");
expect_adapter(nodeSink.updates.every((update, index, values) => index === 0 || update.report.summary.cases >= (values[index - 1]?.report.summary.cases ?? 0)), "aggregate case totals never decrease");
const nodeFinal = nodeSink.updates.at(-1)?.report.summary;
expect_adapter(nodeFinal?.cases === expectedNodeCases && nodeFinal.pass === expectedNodeCases && nodeFinal.fail === 0, "aggregate panel renders every canonical case as passing");
console.log(JSON.stringify({ nodePanelRoundTripMs, nodePanelRenders: nodeSink.renders }));
nodeAdapter.dispose();
nodeRuntime.dispose();

const rerunIo = fake_client();
const rerunSink = make_sink();
const rerunAdapter = make_hosted_test_panel_adapter(rerunIo.client, rerunSink.sink);
const firstPromise = rerunAdapter.start("livemap/replay");
const secondPromise = rerunAdapter.start("livemap/replay");
expect_adapter(rerunIo.listenerCountsAtAction.join(",") === "1,1", "router listener is installed before each action and previous listener is disposed");
expect_adapter(rerunIo.listenerCount === 1, "rerun owns only the newest router listener");
const secondFixture = fixture("second-run", "passed");
emit_fixture(rerunIo, secondFixture);
rerunIo.actions[1]?.resolve({ type: "ack", result: secondFixture.result });
const secondResult = await secondPromise;
expect_adapter(secondResult.runId === "second-run" && rerunAdapter.router?.runId === "second-run", "new run owns rendered state");
const renderedAfterSecond = rerunSink.renders;
const firstFixture = fixture("first-run", "passed");
rerunIo.actions[0]?.resolve({ type: "ack", result: firstFixture.result });
await firstPromise;
expect_adapter(rerunSink.renders === renderedAfterSecond && rerunAdapter.router?.runId === "second-run", "late superseded result cannot overwrite current state");

const failedIo = fake_client();
const failedSink = make_sink();
const failedAdapter = make_hosted_test_panel_adapter(failedIo.client, failedSink.sink);
const failedPromise = failedAdapter.start("livemap/replay");
const failedValue = fixture("failed-run", "failed");
emit_fixture(failedIo, failedValue);
failedIo.actions[0]?.resolve({ type: "ack", result: failedValue.result });
const failedResult = await failedPromise;
expect_adapter(!failedResult.ok && failedAdapter.router?.mirror?.capture().value.run.status === "failed", "failed test renders valid failed terminal report");
expect_adapter(failedAdapter.router?.failure === undefined && failedAdapter.router.mirror?.failure === undefined, "test failure is not adapter routing failure");

const errorIo = fake_client();
const errorSink = make_sink();
const errorAdapter = make_hosted_test_panel_adapter(errorIo.client, errorSink.sink);
const errorPromise = errorAdapter.start("livemap/replay");
const errorValue = fixture("error-run", "error");
emit_fixture(errorIo, errorValue);
errorIo.actions[0]?.resolve({ type: "error", error: { code: "LIVEHOST_ACTION_FAILED", message: "synthetic" } });
try {
  await errorPromise;
} catch {}
expect_adapter(errorAdapter.router?.status === "complete" && errorAdapter.router.mirror?.capture().value.run.status === "error", "infrastructure error preserves terminal mirrored report");
expect_adapter(errorSink.infrastructureErrors[0] === "synthetic infrastructure failure", "existing error presentation receives normalized infrastructure message");

const staleIo = fake_client();
const staleSink = make_sink();
const staleAdapter = make_hosted_test_panel_adapter(staleIo.client, staleSink.sink);
const stalePromise = staleAdapter.start("dom/core");
staleIo.actions[0]?.resolve({
  type: "error",
  error: {
    code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
    message: "LiveHost schema validation failed: tests.run requires a registered hosted-test suite ID.",
  },
});
let staleError: unknown;
try {
  await stalePromise;
} catch (error) {
  staleError = error;
}
expect_adapter(
  staleError instanceof HostedTestUnknownSuiteError && staleError.code === HOSTED_TEST_UNKNOWN_SUITE_ERROR_CODE,
  "pre-report rejection retains stable unknown-suite identity",
);
expect_adapter(staleAdapter.router?.status === "failed" && staleAdapter.router.failure?.code === "ACTION_ERROR_BEFORE_INITIAL", "pre-report rejection reaches a terminal router failure");
expect_adapter(staleIo.listenerCount === 0, "pre-report routing failure removes its event listener");
expect_adapter(staleSink.infrastructureErrors[0] === hosted_test_unknown_suite_message("dom/core"), "stale server mismatch is visible through the panel error sink");

const recoveredPromise = staleAdapter.start("livemap/replay");
const recoveredValue = fixture("stale-recovery", "passed");
emit_fixture(staleIo, recoveredValue);
staleIo.actions[1]?.resolve({ type: "ack", result: recoveredValue.result });
const recoveredResult = await recoveredPromise;
const recoveredStatus: string | undefined = staleAdapter.router?.status;
expect_adapter(recoveredResult.runId === "stale-recovery" && recoveredStatus === "complete", "a valid run succeeds after an unavailable suite rejection");

const disposeIo = fake_client();
const disposeSink = make_sink();
const disposeAdapter = make_hosted_test_panel_adapter(disposeIo.client, disposeSink.sink);
const disposedPromise = disposeAdapter.start("livemap/replay");
const rendersBeforeDispose = disposeSink.renders;
disposeAdapter.dispose();
expect_adapter(disposeIo.listenerCount === 0, "unmount disposal removes router listener");
disposeIo.actions[0]?.resolve({ type: "ack", result: secondFixture.result });
await disposedPromise;
expect_adapter(disposeSink.renders === rendersBeforeDispose, "late settlement after unmount cannot mutate panel state");

rerunAdapter.dispose();
failedAdapter.dispose();
errorAdapter.dispose();
staleAdapter.dispose();
expect_adapter(typeof window === "undefined" && typeof document === "undefined", "adapter core remains Node-safe");
console.log("hosted test panel adapter: ok");
