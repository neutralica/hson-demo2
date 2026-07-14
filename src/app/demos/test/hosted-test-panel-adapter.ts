import type { LiveHostEventListener } from "hson-live/types";
import type { HostedTestRunResult } from "../../hosted-test/hosted-test-action.types";
import { run_hosted_test_action } from "../../hosted-test/hosted-test-client-action";
import type { HostedTestReport } from "../../hosted-test/hosted-test-report.types";
import type { HostedTestReportMirror } from "../../hosted-test/hosted-test-report-mirror.types";
import { make_hosted_test_report_router } from "../../hosted-test/hosted-test-report-router";
import type { HostedTestReportRouter } from "../../hosted-test/hosted-test-report-router.types";
import type { HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { TestEvent, TestRunMode, TestSummary } from "./tests.types";

export type HostedTestPanelSink = Readonly<{
  reset(): void;
  onEvent(event: TestEvent): void;
  renderSummary(summary: TestSummary): void;
  renderReport(): void;
  showInfrastructureError(message: string): void;
}>;

export type HostedTestPanelClient = Readonly<{
  on_event(listener: LiveHostEventListener): () => void;
  action(name: "tests.run", payload: Readonly<{ suite: HostedTestSuiteId }>): Promise<unknown>;
}>;

export type HostedTestPanelAdapter = Readonly<{
  readonly router: HostedTestReportRouter | undefined;
  start(suite: HostedTestSuiteId): Promise<HostedTestRunResult>;
  dispose(): void;
}>;

type OwnedRun = {
  generation: number;
  router: HostedTestReportRouter;
  stopMirror?: () => void;
};

export function hosted_test_suite_for_panel_mode(mode: TestRunMode): HostedTestSuiteId | undefined {
  if (mode === "livemap-replay") return "livemap/replay";
  if (mode === "livehost-all") return "livehost/all";
  if (mode === "node-all") return "node/all";
  return undefined;
}

export function hosted_test_report_to_panel_summary(report: HostedTestReport): TestSummary {
  const failures = report.cases
    .filter((testCase) => testCase.status === "fail")
    .map((testCase) => ({
      suite: testCase.suite,
      name: testCase.name,
      err: testCase.err ?? "Unknown error",
      ms: testCase.ms,
    }));
  return {
    suites: report.run.status === "idle"
      ? 0
      : Math.max(1, new Set(report.cases.map((testCase) => testCase.suite)).size),
    cases: report.summary.cases,
    pass: report.summary.pass,
    fail: report.summary.fail,
    skip: report.summary.skip,
    msTotal: report.cases.reduce((total, testCase) => total + testCase.ms, 0),
    failures,
  };
}

function make_report_observer(sink: HostedTestPanelSink): (mirror: HostedTestReportMirror) => () => void {
  const startedSuites = new Set<string>();
  let emittedCases = 0;
  let terminalEmitted = false;
  let infrastructureErrorShown = false;

  return (mirror) => mirror.subscribe((capture) => {
    const report = capture.value;
    const terminal = report.run.status === "passed" || report.run.status === "failed" || report.run.status === "error";
    for (let index = emittedCases; index < report.cases.length; index += 1) {
      const testCase = report.cases[index];
      if (testCase === undefined) continue;
      if (!startedSuites.has(testCase.suite)) {
        startedSuites.add(testCase.suite);
        sink.onEvent({ t: "suite_begin", suite: testCase.suite });
      }
      sink.onEvent({ t: "case_begin", suite: testCase.suite, name: testCase.name });
      sink.onEvent({
        t: "case_end",
        suite: testCase.suite,
        name: testCase.name,
        status: testCase.status,
        ms: testCase.ms,
        ...(testCase.err !== null ? { err: testCase.err } : {}),
      });
    }
    emittedCases = report.cases.length;
    if (terminal && !terminalEmitted) {
      terminalEmitted = true;
      if (startedSuites.size === 0) startedSuites.add(report.run.suite);
      for (const suite of startedSuites) {
        sink.onEvent({
          t: "suite_end",
          suite,
          ms: report.cases
            .filter((testCase) => testCase.suite === suite)
            .reduce((total, testCase) => total + testCase.ms, 0),
        });
      }
    }
    if (report.run.status === "error" && report.error !== null && !infrastructureErrorShown) {
      infrastructureErrorShown = true;
      sink.showInfrastructureError(report.error.message);
    }
    sink.renderSummary(hosted_test_report_to_panel_summary(report));
    sink.renderReport();
  });
}

export function make_hosted_test_panel_adapter(
  client: HostedTestPanelClient,
  sink: HostedTestPanelSink,
): HostedTestPanelAdapter {
  let generation = 0;
  let current: OwnedRun | undefined;

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
      generation += 1;
      const runGeneration = generation;
      dispose_current();
      sink.reset();

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
        if (current !== owned || generation !== runGeneration) return result;
        await router.wait_for_terminal();
        router.accept_result(result);
        return result;
      } catch (error) {
        if (current !== owned || generation !== runGeneration) throw error;
        router.accept_action_error(error);
        throw error;
      }
    },
    dispose() {
      generation += 1;
      dispose_current();
    },
  });
}
