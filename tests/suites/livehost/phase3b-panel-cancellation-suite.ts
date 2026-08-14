import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { HostedTestCancelResult, HostedTestPanelRunResult } from "../../harness/hosted/hosted-test-action.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { hosted_test_recovery_association } from "../../harness/hosted/hosted-test-application.types";
import type { HostedTestReport } from "../../harness/reporting/hosted/hosted-test-report.types";
import { make_hosted_test_panel_adapter } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_in_memory_hosted_test_runtime } from "./in-memory-hosted-test-panel-runtime";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3B panel cancellation: ${message}`);
}

function test_case(suite: string, caseId: string, name: string, run: TestCase["run"]): TestCase {
  return Object.freeze({ suite, caseId, name, run });
}

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function eventually(condition: () => boolean, message: string): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (condition()) return;
    await tick();
  }
  throw new Error(`Phase 3B panel cancellation did not observe ${message}.`);
}

type PanelEvidence = Readonly<{
  cancellation: HostedTestCancelResult;
  duplicate: HostedTestCancelResult;
  original: HostedTestPanelRunResult;
  recovered: HostedTestPanelRunResult;
  report: HostedTestReport;
  recoveredControlStatus: string | undefined;
  cancellingRecoveryStatus: string | undefined;
  infrastructureErrors: readonly string[];
}>;

let panelEvidence: Promise<PanelEvidence> | undefined;

function panel_evidence(): Promise<PanelEvidence> {
  panelEvidence ??= (async () => {
    const suiteId = "livehost/phase3b-panel-fixture";
    let releaseCleanup = (): void => undefined;
    const cleanupGate = new Promise<void>((resolve) => { releaseCleanup = resolve; });
    let cleanupEnteredResolve = (): void => undefined;
    const cleanupEntered = new Promise<void>((resolve) => { cleanupEnteredResolve = resolve; });
    let enteredResolve = (): void => undefined;
    const entered = new Promise<void>((resolve) => { enteredResolve = resolve; });
    const fixture: TestSuite = Object.freeze({
      suite: suiteId,
      descriptor: Object.freeze({ subject: "livehost" as const, requirements: Object.freeze(["javascript", "node"] as const) }),
      cases: Object.freeze([Object.freeze({
        suite: suiteId,
        caseId: "held",
        name: "held",
        run: () => { enteredResolve(); return new Promise<void>(() => undefined); },
        cleanup: async () => { cleanupEnteredResolve(); await cleanupGate; },
      })]),
    });
    const executor = Object.freeze({
      id: "phase3b-panel-node",
      kind: "node" as const,
      label: "Phase 3B panel fixture",
      location: "hosted" as const,
      capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
      supportsStreaming: true,
      supportsCancellation: true,
    });
    const registry = make_test_executor_registry(executor, Object.freeze([fixture]));
    const runtime = make_in_memory_hosted_test_runtime(make_hosted_test_suite_registry([]), registry);
    await runtime.ready();
    await runtime.discover();
    let report: HostedTestReport | undefined;
    let recoveredControlStatus: string | undefined;
    let attachedResolve = (): void => undefined;
    const attached = new Promise<void>((resolve) => { attachedResolve = resolve; });
    const infrastructureErrors: string[] = [];
    const adapter = make_hosted_test_panel_adapter(runtime, {
      reset(_target, context) {
        if (context?.recovered === false) attachedResolve();
        if (context?.recovered) recoveredControlStatus = context.controlStatus;
      },
      ingest(update) { report = update.report; },
      showInfrastructureError(message) { infrastructureErrors.push(message); },
    });
    const selectedId = registry.catalog.tests[0]!.id;
    const originalPromise = adapter.start_selected([selectedId]);
    await Promise.all([entered, attached]);
    const cancellation = await adapter.cancel();
    await cleanupEntered;
    expect(cancellation.accepted && cancellation.controlStatus === "cancelling", "panel receives authoritative cancelling acknowledgement");
    await eventually(() => runtime.client.recovery.map.capture().value.runs[cancellation.runId]
      ?.attempts[cancellation.attemptId]?.controlStatus === "cancelling", "coordinator cancelling projection");
    const cancellingRecoveryStatus = hosted_test_recovery_association(
      runtime.client.recovery.map.capture().value,
      cancellation.runId,
      cancellation.attemptId,
    )?.controlStatus;
    const duplicate = await adapter.cancel();
    releaseCleanup();
    await eventually(() => runtime.client.recovery.map.capture().value.runs[cancellation.runId]
      ?.attempts[cancellation.attemptId]?.controlStatus === "settled", "coordinator settlement after cleanup");
    const original = await originalPromise;
    const recovered = await adapter.recover(cancellation.runId, cancellation.attemptId);
    const terminalReport = adapter.capture();
    expect(terminalReport !== undefined, "recovered panel retains terminal report");
    const evidence = Object.freeze({
      cancellation,
      duplicate,
      original,
      recovered,
      report: JSON.parse(JSON.stringify(terminalReport)) as HostedTestReport,
      recoveredControlStatus,
      cancellingRecoveryStatus,
      infrastructureErrors: Object.freeze([...infrastructureErrors]),
    });
    adapter.dispose();
    runtime.dispose();
    return evidence;
  })();
  return panelEvidence;
}

export function phase3b_panel_cancellation_suite(): TestSuite {
  const suite = "livehost/cancellation-panel-recovery";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({ subject: "livehost" as const, requirements: Object.freeze(["javascript", "node"] as const) }),
    cases: Object.freeze([
      test_case(suite, "panel-cancel-exact", "panel sends exact run and attempt cancellation", async () => {
        const evidence = await panel_evidence();
        expect(evidence.cancellation.runId === evidence.original.runId && evidence.cancellation.attemptId === evidence.original.attemptId, "panel cancellation targets returned attempt identity");
      }),
      test_case(suite, "panel-no-optimistic-terminal", "panel waits for authoritative terminal report", async () => {
        const evidence = await panel_evidence();
        expect(evidence.cancellation.controlStatus === "cancelling" && evidence.report.run.status === "cancelled", "accepted control state precedes terminal report truth");
      }),
      test_case(suite, "panel-recovery-same-attempt", "panel recovery rejoins the same cancelling attempt", async () => {
        const evidence = await panel_evidence();
        expect(evidence.cancellingRecoveryStatus === "cancelling" && evidence.recoveredControlStatus === "settled"
          && evidence.recovered.runId === evidence.original.runId && evidence.recovered.attemptId === evidence.original.attemptId,
        "cancelling recovery truth persists into terminal reattachment without attempt two");
      }),
      test_case(suite, "panel-duplicate-cancel", "recovered duplicate cancel is idempotent", async () => {
        const evidence = await panel_evidence();
        expect(evidence.duplicate.cancellation?.requestId === evidence.cancellation.cancellation?.requestId, "duplicate request returns first cancellation identity");
      }),
      test_case(suite, "panel-cancel-not-infrastructure", "panel cancellation is not an infrastructure error", async () => {
        const evidence = await panel_evidence();
        expect(evidence.original.cancelled === true && evidence.recovered.cancelled === true && evidence.infrastructureErrors.length === 0, "cancellation resolves normally without assertion/control error presentation");
      }),
    ]),
  });
}
