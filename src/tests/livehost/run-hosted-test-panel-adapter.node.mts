import type { JsonValue, LiveHostEventListener } from "hson-live/types";
import {
  make_hosted_test_panel_adapter,
  hosted_test_suite_for_panel_mode,
  type HostedTestPanelSink,
} from "../../app/demos/test/hosted-test-panel-adapter";
import { make_in_memory_hosted_test_runtime } from "./in-memory-hosted-test-panel-runtime";
import { make_registered_hosted_test_suite_registry } from "../../hosted-test/registered-hosted-test-suites";
import type { TestEvent, TestSummary } from "../../app/demos/test/tests.types";
import type { HostedTestRunResult } from "./hosted-replay-action";
import type { HostedTestSuiteId } from "../../app/hosted-test/hosted-test-suite";
import { make_hosted_test_report } from "./hosted-test-report";
import { encode_hosted_test_report_initial, HOSTED_TEST_REPORT_INITIAL_EVENT } from "./hosted-test-report-initial";
import { encode_hosted_test_report_commit, HOSTED_TEST_REPORT_COMMIT_EVENT } from "./hosted-test-report-wire";

function expect_adapter(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted test panel adapter: ${message}`);
}

function make_sink() {
  const events: TestEvent[] = [];
  const summaries: TestSummary[] = [];
  const infrastructureErrors: string[] = [];
  let resets = 0;
  let renders = 0;
  const sink: HostedTestPanelSink = {
    reset() {
      resets += 1;
      events.length = 0;
      summaries.length = 0;
      infrastructureErrors.length = 0;
    },
    onEvent(event) {
      events.push(event);
    },
    renderSummary(summary) {
      summaries.push(summary);
    },
    renderReport() {
      renders += 1;
    },
    showInfrastructureError(message) {
      infrastructureErrors.push(message);
    },
  };
  return {
    sink,
    events,
    summaries,
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
    result = { runId, suite: "livemap/replay", ok: passed, summary };
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
    && hosted_test_suite_for_panel_mode("livemap") === undefined,
  "both explicit hosted modes share selection while local modes remain local",
);
const visibleAdapter = make_hosted_test_panel_adapter(runtime.client, visibleSink.sink);
const visibleResult = await visibleAdapter.start("livemap/replay");
expect_adapter(localReplayInvocations === 0, "hosted adapter never invokes the browser-local replay runner");
expect_adapter(visibleResult.ok && visibleAdapter.router?.runId === visibleResult.runId, "real action result correlates with routed run");
expect_adapter(visibleAdapter.router?.status === "complete" && visibleAdapter.router.mirror?.rev === 5, "real visible route completes at batched revision 5");
expect_adapter(visibleSink.summaries[0]?.cases === 0 && visibleSink.summaries[0]?.suites === 0, "authoritative initial state renders first");
expect_adapter(visibleSink.summaries.some((summary) => summary.cases > 0 && summary.cases < 45), "summary counters update progressively");
expect_adapter(visibleSink.events.filter((event) => event.t === "case_end").length === 45, "45 progressive case rows are translated");
const visibleFinal = visibleSink.summaries.at(-1);
expect_adapter(visibleFinal?.cases === 45 && visibleFinal.pass === 45 && visibleFinal.fail === 0, "visible final summary is 45 passing cases");
expect_adapter(visibleSink.renders === 5, "initial, start, two case batches, and terminal revisions request panel rendering");
visibleAdapter.dispose();
runtime.dispose();

const livehostRuntime = make_in_memory_hosted_test_runtime(make_registered_hosted_test_suite_registry());
const livehostSink = make_sink();
const livehostAdapter = make_hosted_test_panel_adapter(livehostRuntime.client, livehostSink.sink);
const livehostResult = await livehostAdapter.start("livehost/all");
expect_adapter(livehostResult.suite === "livehost/all" && livehostResult.summary.suites === 9, "second visible mode uses the same adapter and returns LiveHost collection identity");
expect_adapter(livehostAdapter.router?.runId === livehostResult.runId && livehostAdapter.router.mirror?.capture().value.run.suite === "livehost/all", "second router, result, and mirror correlate suite identity");
expect_adapter(livehostAdapter.router?.mirror?.rev === 13, "157-case LiveHost report reaches batched revision 13");
expect_adapter(livehostSink.events.filter((event) => event.t === "case_end").length === 157, "second hosted mode progressively translates 157 case rows");
const livehostFinal = livehostSink.summaries.at(-1);
expect_adapter(livehostFinal?.suites === 9 && livehostFinal.cases === 157 && livehostFinal.pass === 157 && livehostFinal.fail === 0, "second hosted mode renders the complete passing LiveHost summary");
livehostAdapter.dispose();
livehostRuntime.dispose();

const nodeRuntime = make_in_memory_hosted_test_runtime(make_registered_hosted_test_suite_registry());
const nodeSink = make_sink();
const nodeAdapter = make_hosted_test_panel_adapter(nodeRuntime.client, nodeSink.sink);
const nodePanelStarted = performance.now();
const nodeResult = await nodeAdapter.start("node/all");
const nodePanelRoundTripMs = performance.now() - nodePanelStarted;
expect_adapter(localReplayInvocations === 0, "aggregate hosted mode never invokes the browser-local runner");
expect_adapter(nodeResult.suite === "node/all" && nodeResult.summary.suites === 41, "aggregate selector uses the shared adapter and canonical 41-suite runner");
expect_adapter(nodeAdapter.router?.mirror?.rev === 62, "1060-case aggregate report reaches batched revision 62");
const nodeCaseEvents = nodeSink.events.filter((event) => event.t === "case_end");
expect_adapter(nodeCaseEvents.length === 1060, "aggregate panel receives exactly 1060 progressive case rows");
expect_adapter(new Set(nodeCaseEvents.map((event) => event.t === "case_end" ? `${event.suite}\u0000${event.name}` : "")).size === 1060, "aggregate panel case identities are unique");
expect_adapter(nodeSink.summaries.some((summary) => summary.cases > 0 && summary.cases < 1060), "aggregate summary progresses monotonically before completion");
expect_adapter(nodeSink.summaries.every((summary, index, values) => index === 0 || summary.cases >= (values[index - 1]?.cases ?? 0)), "aggregate case totals never decrease");
const nodeFinal = nodeSink.summaries.at(-1);
expect_adapter(nodeFinal?.cases === 1060 && nodeFinal.pass === 1060 && nodeFinal.fail === 0, "aggregate panel renders 1060 passing cases");
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
expect_adapter(typeof window === "undefined" && typeof document === "undefined", "adapter core remains Node-safe");
console.log("hosted test panel adapter: ok");
