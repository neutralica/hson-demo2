import assert from "node:assert/strict";
import { create_node_exact_origin_policy } from "hson-live/livehost/node";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import type { TestEvent, TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_registry, type TestExecutorDescriptor } from "../../harness/core/test-executor";
import { run_test_suites } from "../../harness/core/test-runner";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { HOSTED_TEST_EVENT_LOOP_BUDGET_MS } from "../../harness/hosted/hosted-test-scheduling";
import { run_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import { make_real_websocket_runtime } from "../../suites/livehost/real-websocket-test-runtime";

function busy_for(ms: number): void {
  const deadline = performance.now() + ms;
  while (performance.now() < deadline) { /* bounded synchronous fixture */ }
}

async function scheduler_probe(): Promise<Readonly<{ checkpoints: readonly number[]; elapsedMs: number }>> {
  const suite = "progress/fast-cases";
  const total = 96;
  let completed = 0;
  const checkpoints: number[] = [];
  const schedule = (): void => {
    setImmediate(() => {
      checkpoints.push(completed);
      if (completed < total) schedule();
    });
  };
  schedule();
  const startedAt = performance.now();
  const result = await run_test_suites([{
    suite,
    cases: Array.from({ length: total }, (_, index) => ({
      suite,
      caseId: `fast-${index}`,
      name: `fast ${index}`,
      run: () => busy_for(0.5),
    })),
  }], (event) => { if (event.t === "case_end") completed += 1; }, {
    yieldEveryCases: 0,
    yieldAfterMs: HOSTED_TEST_EVENT_LOOP_BUDGET_MS,
    yieldBetweenSuites: false,
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(result.summary.cases, total);
  assert.ok(checkpoints.some((count) => count > 0 && count < total), "macrotasks observe partial fast-case progress");
  return Object.freeze({ checkpoints: Object.freeze(checkpoints), elapsedMs: performance.now() - startedAt });
}

async function single_case_probe(): Promise<number> {
  const suite = "progress/synchronous-case";
  let scheduledRan = false;
  let ranBeforeCaseEnd = true;
  const startedAt = performance.now();
  await run_test_suites([{
    suite,
    cases: [{ suite, caseId: "blocking", name: "blocking", run: () => busy_for(25) }],
  }], (event) => {
    if (event.t === "case_begin") setImmediate(() => { scheduledRan = true; });
    if (event.t === "case_end") ranBeforeCaseEnd = scheduledRan;
  }, { yieldEveryCases: 0, yieldAfterMs: 2, yieldBetweenSuites: false });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(ranBeforeCaseEnd, false, "a synchronous case remains one non-preemptible unit");
  assert.equal(scheduledRan, true);
  return performance.now() - startedAt;
}

const producedAt = new Map<string, number>();
const hostedSuite: TestSuite = Object.freeze({
  suite: "progress/websocket",
  descriptor: Object.freeze({
    title: "progress websocket",
    subject: "integration",
    requirements: Object.freeze(["javascript"] as const),
    collections: Object.freeze(["unit"] as const),
    provenance: "hson-demo2",
    order: 0,
  }),
  cases: Object.freeze(Array.from({ length: 320 }, (_, index) => Object.freeze({
    suite: "progress/websocket",
    caseId: `case-${index.toString().padStart(3, "0")}`,
    name: `case ${index}`,
    run: () => busy_for(0.75),
  }))),
});
const executor: TestExecutorDescriptor = Object.freeze({
  id: "progress-node",
  kind: "node",
  label: "Progress Node",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
});
const executorRegistry = make_test_executor_registry(executor, [hostedSuite]);
const selectedIds = executorRegistry.catalog.tests.map((test) => test.id);

const heartbeatEvents: string[] = [];
const server = await start_hosted_test_server({
  port: 0,
  registry: make_hosted_test_suite_registry([]),
  executorRegistry,
  runSelected(selectedRegistry, testIds, onEvent, options) {
    return run_node_selected_test_ids(selectedRegistry, testIds, (event: TestEvent) => {
      if (event.t === "case_end") producedAt.set(`${event.suite}::${event.caseId}`, performance.now());
      onEvent?.(event);
    }, options);
  },
  deployment: {
    mode: "production",
    limits: { heartbeatIntervalMs: 5_000, heartbeatDeadlineMs: 4_000 },
  },
  security: {
    origin: create_node_exact_origin_policy({ allowedOrigins: ["http://127.0.0.1"], allowMissing: true }),
    authenticate() { return { ok: true, value: { anonymous: true } }; },
    authorizeAuthority() { return { ok: true, value: undefined }; },
  },
  log(event) {
    heartbeatEvents.push(event.type);
    if (event.outcome === "rejected") console.error(JSON.stringify(event));
  },
});

let timerLast = performance.now();
let maximumTimerGapMs = 0;
const timer = setInterval(() => {
  const observedAt = performance.now();
  maximumTimerGapMs = Math.max(maximumTimerGapMs, observedAt - timerLast);
  timerLast = observedAt;
}, 1);

try {
  const runtime = make_real_websocket_runtime(server.url);
  await runtime.ready();
  await runtime.discover();
  await new Promise((resolve) => setTimeout(resolve, 60));
  const updates: Array<Readonly<{
    at: number;
    terminal: boolean;
    cases: number;
    suiteStatus: string | undefined;
    passed: number;
    sequence: number;
  }>> = [];
  const deliveryLatencies: number[] = [];
  const deliveredKeys: string[] = [];
  let queuedPresentedAt = Number.POSITIVE_INFINITY;
  const adapter = make_hosted_test_panel_adapter(runtime, {
    reset() {
      updates.length = 0;
      deliveryLatencies.length = 0;
      deliveredKeys.length = 0;
      queuedPresentedAt = performance.now();
    },
    ingest(update) {
      const observedAt = performance.now();
      const suiteRun = update.report.suiteRuns[0];
      updates.push(Object.freeze({
        at: observedAt,
        terminal: update.terminal,
        cases: update.newCases.length,
        suiteStatus: suiteRun?.status,
        passed: suiteRun?.counts.passed ?? 0,
        sequence: update.report.run.lastSequence,
      }));
      for (const testCase of update.newCases) {
        deliveredKeys.push(testCase.key);
        const produced = producedAt.get(testCase.key);
        if (produced !== undefined) deliveryLatencies.push(observedAt - produced);
      }
    },
    showInfrastructureError(message) { throw new Error(message); },
  });
  const startedAt = performance.now();
  let result;
  try {
    result = await adapter.start_selected(selectedIds);
  } catch (error) {
    console.error(JSON.stringify({ maximumTimerGapMs, heartbeatEvents }));
    throw error;
  }
  const roundTripMs = performance.now() - startedAt;
  assert.equal(result.summary.cases, 320);
  assert.equal(result.summary.fail, 0);
  assert.ok(queuedPresentedAt <= Math.min(...producedAt.values()), "queued presentation precedes case execution");
  assert.ok(updates.some((update) => !update.terminal && update.suiteStatus === "running"), "running suite state is visible before terminal completion");
  assert.ok(updates.some((update) => !update.terminal && update.passed > 0), "normalized pass progress is visible during execution");
  assert.ok(updates.some((update) => !update.terminal && update.cases > 0), "report cases arrive before terminal completion");
  assert.ok(new Set(updates.filter((update) => !update.terminal).map((update) => update.sequence)).size > 2, "normalized chronology advances across intermediate revisions");
  assert.ok(deliveryLatencies.length === 320, "every produced case reaches browser-side report application");
  assert.deepEqual(deliveredKeys, selectedIds, "streamed case order remains identical to RunPlan order");
  assert.ok(!heartbeatEvents.includes("heartbeat-timeout"), "short heartbeat cycles remain healthy during the run");
  const transport = server.connectionSnapshot().hostedTests;
  assert.equal(transport.backpressureRejections, 0);
  assert.equal(transport.inFlightMessages, 0, "WebSocket sends drain after terminal application");
  assert.equal(transport.queuedMessages, 0, "no report messages remain queued after terminal application");
  const orderedLatencies = [...deliveryLatencies].sort((left, right) => left - right);
  const percentile = (fraction: number): number => orderedLatencies[Math.floor((orderedLatencies.length - 1) * fraction)] ?? 0;
  console.log(JSON.stringify({
    scheduler: await scheduler_probe(),
    synchronousCaseMs: await single_case_probe(),
    websocket: {
      roundTripMs,
      progressiveUpdates: updates.filter((update) => !update.terminal && update.cases > 0).length,
      progressiveSequences: new Set(updates.filter((update) => !update.terminal).map((update) => update.sequence)).size,
      firstProgressMs: (updates.find((update) => !update.terminal && update.cases > 0)?.at ?? startedAt) - startedAt,
      producedToAppliedMedianMs: percentile(0.5),
      producedToAppliedP95Ms: percentile(0.95),
      maximumTimerGapMs,
      sentMessages: server.metrics().sentMessages,
      heartbeatTimeouts: heartbeatEvents.filter((type) => type === "heartbeat-timeout").length,
    },
  }));
  adapter.dispose();
  runtime.dispose();
} finally {
  clearInterval(timer);
  await server.stop();
}
