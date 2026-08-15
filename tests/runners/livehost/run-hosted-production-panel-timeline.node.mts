import { strict as assert } from "node:assert";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { hson } from "hson-live";
import type { BrowserWebSocketConstructor } from "hson-live/livehost";
import { tp_factory } from "../../../src/app/demos/tests/panel/mount-tp";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import type { HostedTestTimelineEvent } from "../../../src/shared/hosted-tests/hosted-test-timeline";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";

async function wait_for(predicate: () => boolean, description: string, deadlineMs: number): Promise<void> {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > deadlineMs) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

async function wait_for_async(predicate: () => Promise<boolean>, description: string, deadlineMs: number): Promise<void> {
  const started = performance.now();
  while (!(await predicate())) {
    if (performance.now() - started > deadlineMs) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

const timeline: HostedTestTimelineEvent[] = [];
const startupOnly = process.argv.includes("--startup-only");
const cancelRun = process.argv.includes("--cancel");
let cancellationTransportInterrupted = false;
assert.ok(!(startupOnly && cancelRun), "startup-only and cancellation modes are mutually exclusive");
const originalConsole = Object.freeze({
  log: console.log,
  warn: console.warn,
  error: console.error,
});
console.log = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;
const memoryBaseline = process.memoryUsage();
let peakRss = memoryBaseline.rss;
let peakHeapUsed = memoryBaseline.heapUsed;
const memorySampler = setInterval(() => {
  const usage = process.memoryUsage();
  peakRss = Math.max(peakRss, usage.rss);
  peakHeapUsed = Math.max(peakHeapUsed, usage.heapUsed);
}, 50);
const observedStages = new Set<HostedTestTimelineEvent["stage"]>();
const observe = (event: HostedTestTimelineEvent): void => {
  if (observedStages.has(event.stage)) return;
  observedStages.add(event.stage);
  timeline.push(event);
};
const serverProcess = fork(
  fileURLToPath(new URL("./hosted-production-server-process.node.mts", import.meta.url)),
  [],
  { execArgv: ["--expose-gc", "--import=tsx"], stdio: ["ignore", "ignore", "ignore", "ipc"] },
);
let requestId = 0;
const pending = new Map<number, Readonly<{ resolve(value: unknown): void; reject(error: Error): void }>>();
let readyResolve!: (url: string) => void;
let readyReject!: (error: Error) => void;
const ready = new Promise<string>((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});
serverProcess.on("message", (message: Readonly<{
  type: "ready" | "timeline" | "response";
  url?: string;
  event?: HostedTestTimelineEvent;
  id?: number;
  value?: unknown;
  error?: string;
}>) => {
  if (message.type === "ready") {
    readyResolve(message.url!);
    return;
  }
  if (message.type === "timeline") {
    observe({ ...message.event!, at: message.event!.at - performance.timeOrigin });
    return;
  }
  const request = pending.get(message.id!);
  if (request === undefined) return;
  pending.delete(message.id!);
  if (message.error === undefined) request.resolve(message.value);
  else request.reject(new Error(message.error));
});
serverProcess.once("error", readyReject);
const serverUrl = await ready;
const serverRequest = <T,>(
  command: "snapshot" | "metrics" | "memory" | "disconnect" | "stop",
  authorityId?: string,
): Promise<T> => new Promise((resolve, reject) => {
  const id = ++requestId;
  pending.set(id, { resolve: (value) => resolve(value as T), reject });
  serverProcess.send({ id, command, ...(authorityId === undefined ? {} : { authorityId }) });
});
const dom = install_hosted_dom_runtime();
let panel: ReturnType<typeof tp_factory> | undefined;
try {
  const runtime = make_remote_hosted_test_runtime({
    url: serverUrl,
    WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
    timeline: observe,
  });
  panel = tp_factory({ hostedRuntime: runtime, timeline: observe });
  panel.mount(hson.liveTree.queryBody().graft());
  await wait_for(
    () => panel?.branch.attrs.get("data-hosted-panel-state") === "ready",
    "production Test panel discovery",
    30_000,
  );
  const runButton = panel.runBtn.dom.must.el();
  runButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  if (startupOnly) {
    await wait_for(
      () => observedStages.has("summary_projected_queued")
        && observedStages.has("first_suite_or_case_started"),
      "production Test panel queued projection and first case start",
      30_000,
    );
  } else {
    if (cancelRun) {
      await wait_for(
        () => observedStages.has("first_suite_or_case_started")
          && panel?.branch.attrs.get("data-hosted-panel-state") === "running",
        "production Test panel cancellable execution",
        30_000,
      );
      const cancelButton = panel.branch.find.byId("test-cancel");
      assert.ok(cancelButton, "production Test panel exposes its authoritative stop control");
      cancelButton.dom.must.el().dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
      await wait_for(
        () => panel?.branch.attrs.get("data-hosted-panel-state") === "cancelling",
        "authoritative production cancellation acknowledgement",
        30_000,
      );
      await serverRequest("disconnect");
      cancellationTransportInterrupted = true;
    }
    await wait_for(
      () => {
        const state = panel?.branch.attrs.get("data-hosted-panel-state");
        return state === "completed" || state === "cancelled" || state === "run-rejected";
      },
      "production Test panel run completion",
      10 * 60_000,
    );
    const panelState = panel.branch.attrs.get("data-hosted-panel-state");
    const expectedPanelState = cancelRun ? "cancelled" : "completed";
    const rejectedConnections = panelState === expectedPanelState ? null : await serverRequest("snapshot");
    assert.equal(panelState, expectedPanelState, JSON.stringify({
      panelState,
      logger: panel.logger.dom.must.el().textContent,
      timeline,
      connections: rejectedConnections,
    }, null, 2));
  }

  const firstByStage = new Map(timeline.map((event) => [event.stage, event]));
  const invoked = firstByStage.get("run_button_invoked");
  assert.ok(invoked, "Run invocation must be observed");
  const startupStages = [
    "selection_completed",
    "coordinator_request_sent",
    "coordinator_request_accepted",
    "run_plan_created",
    "report_seeded_queued",
    "report_host_allocated",
    "initial_report_mutation_committed",
    "coordinator_association_committed",
    "report_client_ready",
    "first_report_frame_serialized",
    "first_report_frame_sent",
    "browser_received_first_report_frame",
    "inspector_projected_queued",
    "logger_projected_queued",
    "summary_projected_queued",
    "first_suite_or_case_started",
  ] as const;
  const terminalStages = [
    "run_finished",
    "report_terminal_committed",
    "panel_run_completed",
  ] as const;
  const required = startupOnly ? startupStages : [...startupStages, ...terminalStages];
  for (const stage of required) assert.ok(firstByStage.has(stage), `timeline stage is observed: ${stage}`);
  const ordered = required.map((stage) => {
    const event = firstByStage.get(stage)!;
    return Object.freeze({ stage, offsetMs: event.at - invoked.at, detail: event.detail ?? null });
  });
  let recovery: unknown = null;
  let recoveredReportBytes = 0;
  let recoveredEvidenceBytes = 0;
  let recoveredExternalOutputBytes = 0;
  let recoveredOpaqueChecks = 0;
  if (!startupOnly) {
    const completedRunId = firstByStage.get("run_finished")?.detail?.runId;
    const completedAttemptId = firstByStage.get("run_finished")?.detail?.attemptId;
    assert.equal(typeof completedRunId, "string", "completed timeline exposes the authoritative run ID");
    assert.equal(typeof completedAttemptId, "string", "completed timeline exposes the authoritative attempt ID");
    const recovered = await runtime.recover_run(completedRunId as string, completedAttemptId as string);
    const recoveredResult = await recovered.actionResult;
    const recoveredReport = recovered.client.recovery.map.capture().value;
    recoveredReportBytes = Buffer.byteLength(JSON.stringify(recoveredReport));
    recoveredEvidenceBytes = recoveredReport.suiteRuns.reduce(
      (total, suite) => total + suite.evidence.reduce(
        (suiteTotal, evidence) => suiteTotal + Buffer.byteLength(evidence.content),
        0,
      ),
      0,
    );
    recoveredExternalOutputBytes = recoveredReport.suiteRuns
      .filter((suite) => suite.executionShape === "opaque-aggregate")
      .reduce((total, suite) => total + suite.evidence
        .filter((item) => item.kind === "stdout" || item.kind === "stderr" || item.kind === "raw_process_output")
        .reduce((suiteTotal, item) => suiteTotal + Buffer.byteLength(item.content), 0), 0);
    recoveredOpaqueChecks = recoveredReport.suiteRuns
      .filter((suite) => suite.executionShape === "opaque-aggregate")
      .reduce((total, suite) => total + suite.counts.passed, 0);
    const recoveredCancelledCases = recoveredReport.suiteRuns
      .filter((suite) => suite.executionShape === "cases")
      .reduce((total, suite) => total + suite.counts.cancelled, 0);
    const recoveredCancelledChecks = recoveredReport.suiteRuns
      .filter((suite) => suite.executionShape === "opaque-aggregate")
      .reduce((total, suite) => total + suite.counts.cancelled, 0);
    const expectedReportStatus = cancelRun ? "cancelled" : "passed";
    if (recoveredReport.run.status !== expectedReportStatus) {
      originalConsole.error(JSON.stringify({
        status: recoveredReport.run.status,
        summary: recoveredReport.summary,
        failedSuites: recoveredReport.suiteRuns
          .filter((suite) => suite.status === "fail")
          .map((suite) => ({
            id: suite.id,
            status: suite.status,
            counts: suite.counts,
            errors: suite.errors,
            failedCases: suite.cases
              .filter((testCase) => testCase.status === "fail")
              .map((testCase) => ({ id: testCase.id, errors: testCase.errors })),
          })),
      }, null, 2));
    }
    assert.equal(recoveredReport.run.status, expectedReportStatus, "recovered production report retains authoritative terminal truth");
    assert.equal(recoveredResult.cancelled === true, cancelRun, "recovered production result retains cancellation truth");
    assert.ok(
      recoveredReport.suiteRuns.every((suite) => suite.counts.executed + suite.counts.cancelled === suite.counts.total),
      "every recovered suite reconciles known execution and cancellation against its planned total",
    );
    if (cancelRun) {
      assert.ok(recoveredCancelledCases + recoveredCancelledChecks > 0, "real production cancellation terminalizes remaining planned work");
    } else {
      const plannedCanonicalCases = recoveredReport.suiteRuns
        .filter((suite) => suite.executionShape === "cases")
        .reduce((total, suite) => total + suite.cases.length, 0);
      assert.equal(recoveredReport.summary.cases, plannedCanonicalCases, "recovered production report retains every planned canonical case");
      assert.equal(recoveredReport.summary.pass, plannedCanonicalCases, "recovered production report retains every planned canonical pass");
    }
    assert.equal(recoveredReport.summary.fail, 0, "recovered production report has no canonical failures");
    if (!cancelRun) {
      const plannedOpaqueChecks = recoveredReport.suiteRuns
        .filter((suite) => suite.executionShape === "opaque-aggregate")
        .reduce((total, suite) => total + suite.counts.declared, 0);
      assert.equal(recoveredOpaqueChecks, plannedOpaqueChecks, "recovered production report retains every planned opaque check pass");
    }
    assert.ok(recoveredResult.attemptId, "recovered production result retains execution-attempt identity");
    recovery = Object.freeze({
      runId: recoveredResult.runId,
      reportRev: recoveredResult.reportRev,
      status: recoveredReport.run.status,
      cases: recoveredReport.summary.cases,
      pass: recoveredReport.summary.pass,
      fail: recoveredReport.summary.fail,
      reportBytes: recoveredReportBytes,
      evidenceBytes: recoveredEvidenceBytes,
      externalOutputBytes: recoveredExternalOutputBytes,
      opaqueChecks: recoveredOpaqueChecks,
      cancelledCases: recoveredCancelledCases,
      cancelledChecks: recoveredCancelledChecks,
      attemptId: recoveredResult.attemptId,
    });
    recovered.dispose();
    await wait_for_async(
      async () => ((await serverRequest<any>("snapshot")).hostedTests.reports === 1),
      "recovered report client disconnect",
      5_000,
    );
  }
  globalThis.gc?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  globalThis.gc?.();
  const retainedMemory = process.memoryUsage();
  const serverMemory = await serverRequest<Readonly<{
    baseline: NodeJS.MemoryUsage;
    peakRss: number;
    peakHeapUsed: number;
    current: NodeJS.MemoryUsage;
  }>>("memory");
  originalConsole.log(JSON.stringify({
    mode: cancelRun ? "cancel" : startupOnly ? "startup" : "all",
    cancellationTransportInterrupted,
    selectionCount: panel.branch.attrs.get("data-hosted-selection-count"),
    timeline: ordered,
    connections: await serverRequest("snapshot"),
    transport: await serverRequest("metrics"),
    memory: {
      browser: {
        baselineRss: memoryBaseline.rss,
        baselineHeapUsed: memoryBaseline.heapUsed,
        peakRss,
        peakHeapUsed,
        retainedRss: retainedMemory.rss,
        retainedHeapUsed: retainedMemory.heapUsed,
      },
      authority: serverMemory,
      combinedUpperBoundAcrossProcesses: {
        peakRss: peakRss + serverMemory.peakRss,
        peakHeapUsed: peakHeapUsed + serverMemory.peakHeapUsed,
        retainedRss: retainedMemory.rss + serverMemory.current.rss,
        retainedHeapUsed: retainedMemory.heapUsed + serverMemory.current.heapUsed,
      },
    },
    recovery,
  }, null, 2));
} finally {
  clearInterval(memorySampler);
  panel?.dispose();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
  dom.dispose();
  await serverRequest("stop");
  serverProcess.disconnect();
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}
