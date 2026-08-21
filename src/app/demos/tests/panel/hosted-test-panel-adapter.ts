import type { LiveMapAnyOp, LiveMapCommitObservation } from "hson-live/types";
import type { HostedTestCancelResult, HostedTestCaseDiagnostic, HostedTestPanelRunResult } from "../../../../shared/hosted-tests/hosted-test-action.types";
import type { HostedTestReport, HostedTestSuiteRunReport } from "../../../../shared/hosted-tests/hosted-test-report.types";
import type { HostedTestRunTarget } from "../../../../shared/hosted-tests/hosted-test-suite-contract";
import type { HostedTestPanelRuntime, HostedTestRemoteRun } from "./hosted-test-panel-runtime";
import type { HostedTestAttemptId } from "../../../../shared/hosted-tests/hosted-test-application.types";

export type HostedTestPanelReportUpdate = Readonly<{
  report: HostedTestReport;
  changedSuites?: readonly HostedTestSuiteRunReport[];
  terminal: boolean;
}>;

export type HostedTestPanelSink = Readonly<{
  reset(target: HostedTestRunTarget, context?: Readonly<{ recovered: boolean; controlStatus?: HostedTestRemoteRun["association"]["controlStatus"] }>): void;
  ingest(update: HostedTestPanelReportUpdate): void;
  showInfrastructureError(message: string): void;
  renderTiming?(timing: HostedTestPanelRunResult["timing"]): void;
}>;

export type HostedTestPanelAdapter = Readonly<{
  start_selected(selectionIds: readonly string[]): Promise<HostedTestPanelRunResult>;
  recover(runId: string, attemptId: HostedTestAttemptId): Promise<HostedTestPanelRunResult>;
  cancel(): Promise<HostedTestCancelResult>;
  inspect(caseKey: string): Promise<HostedTestCaseDiagnostic>;
  capture(): HostedTestReport | undefined;
  dispose(): void;
}>;

function clone_container(value: unknown): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(value)) return [...value];
  if (typeof value === "object" && value !== null) return { ...value };
  throw new Error("Hosted report commit path traversed a non-container value.");
}

/** Apply one already-authoritative data commit with one shallow copy per touched container. */
function apply_report_commit(report: HostedTestReport, observation: LiveMapCommitObservation): HostedTestReport {
  if (observation.kind !== "commit" || !observation.commit.changed) return report;
  const root = clone_container(report);
  const copied = new WeakSet<object>([root]);

  for (const candidate of observation.commit.ops) {
    const op = candidate as LiveMapAnyOp & { readonly kind?: string; readonly path?: readonly (string | number)[]; readonly next?: unknown };
    if (op.kind === undefined || op.path === undefined) {
      throw new Error("Hosted report received a non-data LiveMap commit.");
    }
    if (op.path.length === 0) {
      if (op.kind === "delete" || typeof op.next !== "object" || op.next === null) {
        throw new Error("Hosted report received an invalid root data operation.");
      }
      return op.next as HostedTestReport;
    }

    let parent: Record<PropertyKey, unknown> | unknown[] = root;
    for (let index = 0; index < op.path.length - 1; index += 1) {
      const key = op.path[index] as PropertyKey;
      let child = (parent as Record<PropertyKey, unknown>)[key];
      if (typeof child !== "object" || child === null) {
        throw new Error("Hosted report commit path does not exist in the current projection.");
      }
      if (!copied.has(child)) {
        child = clone_container(child);
        copied.add(child as object);
        (parent as Record<PropertyKey, unknown>)[key] = child;
      }
      parent = child as Record<PropertyKey, unknown> | unknown[];
    }

    const key = op.path[op.path.length - 1] as PropertyKey;
    if (op.kind === "delete") {
      if (Array.isArray(parent) && typeof key === "number") parent.splice(key, 1);
      else delete (parent as Record<PropertyKey, unknown>)[key];
    } else {
      (parent as Record<PropertyKey, unknown>)[key] = op.next;
    }
  }
  return root as unknown as HostedTestReport;
}

export function make_hosted_test_panel_adapter(
  runtime: HostedTestPanelRuntime,
  sink: HostedTestPanelSink,
): HostedTestPanelAdapter {
  let generation = 0;
  let current: HostedTestRemoteRun | undefined;
  let stopChanges: (() => void) | undefined;
  let lastResult: HostedTestPanelRunResult | undefined;
  let currentReport: HostedTestReport | undefined;
  const inspectionRequests = new Map<string, Promise<HostedTestCaseDiagnostic>>();

  function dispose_current(): void {
    stopChanges?.();
    stopChanges = undefined;
    current?.dispose();
    current = undefined;
    currentReport = undefined;
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
    if (requestedTarget === undefined) sink.reset(target, {
      recovered: true,
      controlStatus: run.association.controlStatus,
    });
    if (generation !== runGeneration) {
      run.dispose();
      throw new Error("Hosted test run was superseded before report recovery.");
    }
    current = run;
    currentReport = run.client.recovery.map.snap();
    let projectedOnce = false;
    let infrastructureErrorShown = false;
    let terminalResolve: () => void = () => undefined;
    const terminal = new Promise<void>((resolve) => { terminalResolve = resolve; });

    const project = (observation?: LiveMapCommitObservation): void => {
      if (current !== run || generation !== runGeneration) return;
      if (observation?.kind === "snapshot") currentReport = run.client.recovery.map.snap();
      else if (observation?.kind === "commit" && currentReport !== undefined) currentReport = apply_report_commit(currentReport, observation);
      else if (observation === undefined && projectedOnce) currentReport = run.client.recovery.map.snap();
      const report = currentReport ?? run.client.recovery.map.snap();
      projectedOnce = true;
      if (report.run.id !== run.association.runId || report.run.suite !== target) {
        throw new Error("Recovered hosted report identity does not match the requested run.");
      }
      const terminalState = report.run.status === "passed" || report.run.status === "failed"
        || report.run.status === "cancelled" || report.run.status === "error";
      let changedSuites = report.suiteRuns;
      if (observation?.kind === "commit") {
        const indexes = new Set<number>();
        let replacesRoot = false;
        for (const candidate of observation.commit.ops) {
          const op = candidate as LiveMapAnyOp & { readonly path?: readonly (string | number)[] };
          if (op.path?.length === 0) replacesRoot = true;
          else if (op.path?.[0] === "suiteRuns" && typeof op.path[1] === "number") indexes.add(op.path[1]);
        }
        changedSuites = replacesRoot
          ? report.suiteRuns
          : Object.freeze([...indexes].sort((left, right) => left - right).flatMap((index) => (
              report.suiteRuns[index] === undefined ? [] : [report.suiteRuns[index]!]
            )));
      }
      sink.ingest(Object.freeze({
        report,
        changedSuites,
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
    await run.ready();
    try {
      const [result] = await Promise.all([run.actionResult, terminal]);
      if (current !== run || generation !== runGeneration) {
        return Object.freeze({ ...result, timing: Object.freeze({ ...result.timing, roundTripMs: performance.now() - roundTripStartedAt }) });
      }
      const report = currentReport ?? run.client.recovery.map.snap();
      const cursor = run.client.recovery.lastAppliedRev ?? -1;
      const expectedOk = report.run.status === "passed";
      const expectedCancelled = report.run.status === "cancelled";
      const mismatches = [
        result.runId !== report.run.id ? "runId" : undefined,
        result.attemptId !== run.association.attemptId ? "attemptId" : undefined,
        result.reportHostId !== run.association.reportHostId ? "reportHostId" : undefined,
        result.suite !== report.run.suite ? "suite" : undefined,
        result.reportRev === undefined || cursor < result.reportRev ? "reportRev" : undefined,
        result.ok !== expectedOk ? "ok" : undefined,
        (result.cancelled === true) !== expectedCancelled ? "cancelled" : undefined,
        result.summary.cases !== report.summary.cases ? "summary.cases" : undefined,
        result.summary.pass !== report.summary.pass ? "summary.pass" : undefined,
        result.summary.fail !== report.summary.fail ? "summary.fail" : undefined,
        result.summary.skip !== report.summary.skip ? "summary.skip" : undefined,
      ].filter((value): value is string => value !== undefined);
      if (mismatches.length > 0) {
        throw new Error(`Hosted action result does not agree with the recovered authoritative report: ${mismatches.join(", ")}.`);
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
        sink.showInfrastructureError(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }

  return Object.freeze({
    async start_selected(selectionIds: readonly string[]) {
      return present(() => runtime.start_selected(selectionIds), "canonical/selected");
    },
    async recover(runId: string, attemptId: HostedTestAttemptId) {
      return present(() => runtime.recover_run(runId, attemptId));
    },
    async cancel() {
      if (current === undefined) throw new Error("No active hosted test attempt is available to cancel.");
      return current.cancel();
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
      finally {
        if (inspectionRequests.get(caseKey) === pending) inspectionRequests.delete(caseKey);
      }
    },
    capture() {
      return currentReport;
    },
    dispose() {
      generation += 1;
      lastResult = undefined;
      inspectionRequests.clear();
      dispose_current();
    },
  });
}
