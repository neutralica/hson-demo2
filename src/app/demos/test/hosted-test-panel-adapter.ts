import type { LiveHostEventListener } from "hson-live/types";
import type { HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestPanelRunResult, HostedTestRunRequest, HostedTestRunResult } from "../../hosted-test/hosted-test-action.types";
import { inspect_hosted_test_action, run_hosted_test_action } from "../../hosted-test/hosted-test-client-action";
import type { HostedTestCaseReport, HostedTestReport } from "../../hosted-test/hosted-test-report.types";
import type { HostedTestReportMirror } from "../../hosted-test/hosted-test-report-mirror.types";
import { make_hosted_test_report_router } from "../../hosted-test/hosted-test-report-router";
import type { HostedTestReportRouter } from "../../hosted-test/hosted-test-report-router.types";
import type { HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { TestRunMode } from "./tests.types";
import { hosted_test_action_error_message } from "../../hosted-test/hosted-test-action-error";

export type HostedTestPanelReportUpdate = Readonly<{
  report: HostedTestReport;
  newCases: readonly HostedTestCaseReport[];
  newSuiteTimings: readonly Readonly<{ suite: string; ms: number }>[];
  terminal: boolean;
}>;

export type HostedTestPanelSink = Readonly<{
  reset(suite: HostedTestSuiteId): void;
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
  client: HostedTestPanelClient,
  sink: HostedTestPanelSink,
): HostedTestPanelAdapter {
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
      sink.reset(suite);

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
