import type { LiveHostEventListener } from "hson-live/types";
import type { HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestPanelRunResult, HostedTestRunRequest, HostedTestRunResult } from "../../../../../tests/harness/hosted/hosted-test-action.types";
import { inspect_hosted_test_action, run_hosted_test_action } from "../../../../../tests/harness/hosted/hosted-test-client-action";
import type { HostedTestCaseReport, HostedTestReport } from "../../../../../tests/harness/reporting/hosted/hosted-test-report.types";
import type { HostedTestReportMirror } from "../../../../../tests/harness/reporting/hosted/hosted-test-report-mirror.types";
import { make_hosted_test_report_router } from "../../../../../tests/harness/reporting/hosted/hosted-test-report-router";
import type { HostedTestReportRouter } from "../../../../../tests/harness/reporting/hosted/hosted-test-report-router.types";
import { is_hosted_test_suite_id, type HostedTestRunTarget, type HostedTestSuiteId } from "../../../../../tests/harness/hosted/hosted-test-suite";
import type { TestRunMode } from "../../../../../tests/harness/core/test-contracts";
import { hosted_test_action_error_message } from "../../../../../tests/harness/hosted/hosted-test-action-error";
import type { HostedTestPanelRuntime, HostedTestRemoteRun } from "./hosted-test-panel-runtime";

export type HostedTestPanelReportUpdate = Readonly<{
  report: HostedTestReport;
  newCases: readonly HostedTestCaseReport[];
  newSuiteTimings: readonly Readonly<{ suite: string; ms: number }>[];
  terminal: boolean;
}>;

export type HostedTestPanelSink = Readonly<{
  reset(target: HostedTestRunTarget, context?: Readonly<{ recovered: boolean }>): void;
  ingest(update: HostedTestPanelReportUpdate): void;
  showInfrastructureError(message: string): void;
  renderTiming?(timing: HostedTestPanelRunResult["timing"]): void;
}>;

export type HostedTestPanelClient = Readonly<{
  on_event(listener: LiveHostEventListener): () => void;
  action(name: "tests.run", payload: HostedTestRunRequest): Promise<unknown>;
}>;

export type HostedTestPanelAdapter = Readonly<{
  readonly router: HostedTestReportRouter | undefined;
  start(suite: HostedTestSuiteId): Promise<HostedTestPanelRunResult>;
  start_selected(testIds: readonly string[]): Promise<HostedTestPanelRunResult>;
  recover(runId: string): Promise<HostedTestPanelRunResult>;
  inspect(caseKey: string): Promise<HostedTestCaseDiagnostic>;
  capture(): HostedTestReport | undefined;
  dispose(): void;
}>;

type OwnedRun = {
  generation: number;
  router: HostedTestReportRouter;
  stopMirror?: () => void;
};

export function hosted_test_suite_for_panel_mode(mode: TestRunMode): HostedTestSuiteId {
  if (mode === "hosted-all") return "hosted/all";
  if (mode === "livemap-replay") return "livemap/replay";
  if (mode === "livehost-all") return "livehost/all";
  if (mode === "node-all") return "node/all";
  if (mode === "dom-core") return "dom/core";
  if (mode === "canvas-core") return "canvas/core";
  return `category/${mode}`;
}

function make_report_observer(sink: HostedTestPanelSink): (mirror: HostedTestReportMirror) => () => void {
  let consumedCaseBatches = 0;
  let consumedSuiteTimings = 0;
  let infrastructureErrorShown = false;

  return (mirror) => mirror.subscribe((capture) => {
    const report = capture.value;
    const terminal = report.run.status === "passed" || report.run.status === "failed" || report.run.status === "error";
    const newCases: HostedTestCaseReport[] = [];
    while (true) {
      const batchKey = (consumedCaseBatches + 1).toString().padStart(6, "0");
      const batch = report.caseBatches[batchKey];
      if (batch === undefined) break;
      consumedCaseBatches += 1;
      newCases.push(...batch);
    }
    const newSuiteTimings = report.suites.slice(consumedSuiteTimings);
    consumedSuiteTimings = report.suites.length;
    sink.ingest(Object.freeze({
      report,
      newCases: Object.freeze(newCases),
      newSuiteTimings: Object.freeze([...newSuiteTimings]),
      terminal,
    }));
    if (report.run.status === "error" && report.error !== null && !infrastructureErrorShown) {
      infrastructureErrorShown = true;
      sink.showInfrastructureError(report.error.message);
    }
  });
}

export function make_hosted_test_panel_adapter(
  client: HostedTestPanelClient | HostedTestPanelRuntime,
  sink: HostedTestPanelSink,
): HostedTestPanelAdapter {
  if ("start_run" in client) return make_generic_hosted_test_panel_adapter(client, sink);
  let generation = 0;
  let current: OwnedRun | undefined;
  let lastResult: HostedTestPanelRunResult | undefined;
  const inspectionRequests = new Map<string, Promise<HostedTestCaseDiagnostic>>();

  function dispose_current(): void {
    const owned = current;
    current = undefined;
    if (owned === undefined) return;
    owned.stopMirror?.();
    owned.router.dispose();
  }

  return Object.freeze({
    get router() {
      return current?.router;
    },
    async start(suite: HostedTestSuiteId) {
      const roundTripStartedAt = performance.now();
      generation += 1;
      const runGeneration = generation;
      dispose_current();
      lastResult = undefined;
      inspectionRequests.clear();
      sink.reset(suite, { recovered: false });

      let owned: OwnedRun;
      const observe = make_report_observer(sink);
      const router = make_hosted_test_report_router(client, {
        onMirror(mirror) {
          if (current !== owned || generation !== runGeneration) return;
          owned.stopMirror = observe(mirror);
        },
      });
      owned = { generation: runGeneration, router };
      current = owned;

      try {
        const result = await run_hosted_test_action(client, suite);
        if (current !== owned || generation !== runGeneration) {
          return Object.freeze({ ...result, timing: Object.freeze({ ...result.timing, roundTripMs: performance.now() - roundTripStartedAt }) });
        }
        await router.wait_for_terminal();
        router.accept_result(result);
        const panelResult: HostedTestPanelRunResult = Object.freeze({
          ...result,
          timing: Object.freeze({ ...result.timing, roundTripMs: performance.now() - roundTripStartedAt }),
        });
        lastResult = panelResult;
        sink.renderTiming?.(panelResult.timing);
        return panelResult;
      } catch (error) {
        if (current !== owned || generation !== runGeneration) throw error;
        try {
          router.accept_action_error(error);
        } catch {
          // A rejection before initial state has no authoritative report to
          // render. Surface the action failure directly and leave the router's
          // first normalized failure available for inspection.
          if (router.mirror === undefined) {
            sink.showInfrastructureError(hosted_test_action_error_message(error, suite));
          }
        }
        throw error;
      }
    },
    async start_selected() {
      throw new Error("Canonical selected execution requires the generic hosted-test runtime.");
    },
    async recover() {
      throw new Error("Explicit report recovery requires the generic hosted-test runtime.");
    },
    async inspect(caseKey: string) {
      const result = lastResult;
      if (result === undefined) throw new Error("Hosted case inspection is available after the run settles.");
      const existing = inspectionRequests.get(caseKey);
      if (existing !== undefined) return existing;
      const pending = inspect_hosted_test_action(
        client as unknown as Readonly<{ action: (name: "tests.inspect", payload: HostedTestInspectRequest) => Promise<unknown> }>,
        { runId: result.runId, caseKey },
      );
      inspectionRequests.set(caseKey, pending);
      try { return await pending; }
      catch (error) { inspectionRequests.delete(caseKey); throw error; }
    },
    capture() {
      return current?.router.mirror?.capture().value;
    },
    dispose() {
      generation += 1;
      lastResult = undefined;
      inspectionRequests.clear();
      dispose_current();
    },
  });
}

function make_generic_hosted_test_panel_adapter(
  runtime: HostedTestPanelRuntime,
  sink: HostedTestPanelSink,
): HostedTestPanelAdapter {
  let generation = 0;
  let current: HostedTestRemoteRun | undefined;
  let stopChanges: (() => void) | undefined;
  let lastResult: HostedTestPanelRunResult | undefined;
  const inspectionRequests = new Map<string, Promise<HostedTestCaseDiagnostic>>();

  function dispose_current(): void {
    stopChanges?.();
    stopChanges = undefined;
    current?.dispose();
    current = undefined;
  }

  async function present(
    open: () => Promise<HostedTestRemoteRun>,
    requestedTarget?: HostedTestRunTarget,
  ): Promise<HostedTestPanelRunResult> {
    const roundTripStartedAt = performance.now();
    generation += 1;
    const runGeneration = generation;
    dispose_current();
    lastResult = undefined;
    inspectionRequests.clear();
    if (requestedTarget !== undefined) sink.reset(requestedTarget, { recovered: false });

    const run = await open();
    const target = run.association.suite;
    if (requestedTarget === undefined) sink.reset(target, { recovered: true });
    if (generation !== runGeneration) {
      run.dispose();
      throw new Error("Hosted test run was superseded before report recovery.");
    }
    current = run;
    let consumedCaseBatches = 0;
    let consumedSuiteTimings = 0;
    let infrastructureErrorShown = false;
    let terminalResolve: () => void = () => undefined;
    const terminal = new Promise<void>((resolve) => { terminalResolve = resolve; });

    const project = (): void => {
      if (current !== run || generation !== runGeneration) return;
      const report = run.client.recovery.map.capture().value;
      if (report.run.id !== run.association.runId || report.run.suite !== target) {
        throw new Error("Recovered hosted report identity does not match the requested run.");
      }
      const terminalState = report.run.status === "passed" || report.run.status === "failed" || report.run.status === "error";
      const newCases: HostedTestCaseReport[] = [];
      while (true) {
        const batchKey = (consumedCaseBatches + 1).toString().padStart(6, "0");
        const batch = report.caseBatches[batchKey];
        if (batch === undefined) break;
        consumedCaseBatches += 1;
        newCases.push(...batch);
      }
      const newSuiteTimings = report.suites.slice(consumedSuiteTimings);
      consumedSuiteTimings = report.suites.length;
      sink.ingest(Object.freeze({
        report,
        newCases: Object.freeze(newCases),
        newSuiteTimings: Object.freeze([...newSuiteTimings]),
        terminal: terminalState,
      }));
      if (report.run.status === "error" && report.error !== null && !infrastructureErrorShown) {
        infrastructureErrorShown = true;
        sink.showInfrastructureError(report.error.message);
      }
      if (terminalState) terminalResolve();
    };

    stopChanges = run.on_change(project);
    project();
    try {
      const [result] = await Promise.all([run.actionResult, terminal]);
      if (current !== run || generation !== runGeneration) {
        return Object.freeze({ ...result, timing: Object.freeze({ ...result.timing, roundTripMs: performance.now() - roundTripStartedAt }) });
      }
      const report = run.client.recovery.map.capture().value;
      const cursor = run.client.recovery.lastAppliedRev ?? -1;
      const expectedOk = report.run.status === "passed";
      if (result.runId !== report.run.id || result.reportHostId !== run.association.reportHostId
        || result.suite !== report.run.suite || result.reportRev === undefined || cursor < result.reportRev
        || result.ok !== expectedOk || result.summary.cases !== report.summary.cases
        || result.summary.pass !== report.summary.pass || result.summary.fail !== report.summary.fail
        || result.summary.skip !== report.summary.skip) {
        throw new Error("Hosted action result does not agree with the recovered authoritative report.");
      }
      const panelResult: HostedTestPanelRunResult = Object.freeze({
        ...result,
        timing: Object.freeze({ ...result.timing, roundTripMs: performance.now() - roundTripStartedAt }),
      });
      lastResult = panelResult;
      sink.renderTiming?.(panelResult.timing);
      return panelResult;
    } catch (error) {
      if (current === run && generation === runGeneration && !infrastructureErrorShown) {
        sink.showInfrastructureError(
          is_hosted_test_suite_id(target)
            ? hosted_test_action_error_message(error, target)
            : error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    }
  }

  return Object.freeze({
    get router() { return undefined; },
    async start(suite: HostedTestSuiteId) {
      return present(() => runtime.start_run(suite), suite);
    },
    async start_selected(testIds: readonly string[]) {
      return present(() => runtime.start_selected(testIds), "canonical/selected");
    },
    async recover(runId: string) {
      return present(() => runtime.recover_run(runId));
    },
    async inspect(caseKey: string) {
      const result = lastResult;
      const run = current;
      if (!result || !run) throw new Error("Hosted case inspection is available after the run settles.");
      const existing = inspectionRequests.get(caseKey);
      if (existing) return existing;
      const pending = run.inspect({ runId: result.runId, caseKey });
      inspectionRequests.set(caseKey, pending);
      try { return await pending; }
      catch (error) { inspectionRequests.delete(caseKey); throw error; }
    },
    capture() {
      return current?.client.recovery.map.capture().value;
    },
    dispose() {
      generation += 1;
      lastResult = undefined;
      inspectionRequests.clear();
      dispose_current();
    },
  });
}
