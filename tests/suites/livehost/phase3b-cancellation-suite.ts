import type { LiveHostSocketLike } from "hson-live/types";
import { hson } from "hson-live";
import type { TestCase, TestEvent, TestSuite } from "../../harness/core/test-contracts";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { TestRunPlan } from "../../harness/core/test-run-plan";
import { run_test_suites } from "../../harness/core/test-runner";
import { create_hosted_test_application, HOSTED_TEST_COORDINATOR_HOST_ID } from "../../harness/hosted/hosted-test-application";
import type { HostedTestCancelResult, HostedTestSelectedRunResult } from "../../harness/hosted/hosted-test-action.types";
import { hosted_test_recovery_association } from "../../harness/hosted/hosted-test-application.types";
import { make_hosted_test_execution_control } from "../../harness/hosted/hosted-test-execution-control";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import {
  DEFAULT_HOSTED_TEST_REPORT_OPERATION_BUDGET,
  make_hosted_test_report,
  make_initial_hosted_test_report,
} from "../../harness/reporting/hosted/hosted-test-report";
import type { HostedTestReport, HostedTestReportMap, HostedTestReportState } from "../../harness/reporting/hosted/hosted-test-report.types";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3B cancellation: ${message}`);
}

export type Phase3BCancellationMeasurement = Readonly<{
  plannedCases: number;
  elapsedMs: number;
  maximumCommitOps: number;
  operationBudget: number;
}>;

let largeCancellationMeasurement: Phase3BCancellationMeasurement | undefined;

export function phase3b_cancellation_measurement(): Phase3BCancellationMeasurement | undefined {
  return largeCancellationMeasurement;
}

function test_case(suite: string, caseId: string, name: string, run: TestCase["run"]): TestCase {
  return Object.freeze({ suite, caseId, name, run });
}

function tick(): Promise<void> {
  return new Promise((resolve) => {
    const immediate = (globalThis as typeof globalThis & { setImmediate?: (callback: () => void) => void }).setImmediate;
    if (immediate) immediate(resolve);
    else setTimeout(resolve, 0);
  });
}

function blackhole_socket(): LiveHostSocketLike {
  return Object.freeze({
    send() {},
    close() {},
    onMessage() { return () => undefined; },
    onClose() { return () => undefined; },
  });
}

async function eventually<T>(read: () => T | undefined, message: string): Promise<T> {
  for (let index = 0; index < 200; index += 1) {
    const value = read();
    if (value !== undefined) return value;
    await tick();
  }
  throw new Error(`Phase 3B cancellation did not observe ${message}.`);
}

const EXECUTOR = Object.freeze({
  id: "phase3b-cooperative",
  kind: "cloudflare-worker" as const,
  label: "Phase 3B cooperative fixture",
  location: "hosted" as const,
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
});

function fixture_suite(
  starts: string[],
  running?: Readonly<{ entered(): void; wait(signal: AbortSignal): Promise<void> }>,
): TestSuite {
  const suite = "livehost/phase3b-fixture";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({ subject: "livehost" as const, requirements: Object.freeze(["javascript"] as const) }),
    cases: Object.freeze([
      test_case(suite, "first", "first", () => { starts.push("first"); }),
      test_case(suite, "running", "running", async () => {
        starts.push("running");
        running?.entered();
        if (running !== undefined) await running.wait(activeFixtureSignal!);
      }),
      test_case(suite, "queued-a", "queued a", () => { starts.push("queued-a"); }),
      test_case(suite, "queued-b", "queued b", () => { starts.push("queued-b"); }),
    ]),
  });
}

let activeFixtureSignal: AbortSignal | undefined;

type MidRunEvidence = Readonly<{
  cancel: HostedTestCancelResult;
  duplicate: HostedTestCancelResult;
  result: HostedTestSelectedRunResult;
  report: HostedTestReport;
  starts: readonly string[];
  recoveredStatus: string;
  recoveredCancellationRequest: string | undefined;
}>;

let midRunEvidence: Promise<MidRunEvidence> | undefined;

function mid_run_evidence(): Promise<MidRunEvidence> {
  midRunEvidence ??= (async () => {
    const starts: string[] = [];
    let enteredResolve = (): void => undefined;
    const entered = new Promise<void>((resolve) => { enteredResolve = resolve; });
    const suite = fixture_suite(starts, {
      entered: enteredResolve,
      wait: (signal) => new Promise<void>((resolve) => {
        if (signal.aborted) { resolve(); return; }
        signal.addEventListener("abort", () => resolve(), { once: true });
      }),
    });
    const executorRegistry = make_test_executor_registry(EXECUTOR, Object.freeze([suite]));
    const application = create_hosted_test_application(make_hosted_test_suite_registry([]), {
      makeRunId: () => "phase3b-mid-run",
      discovery: Object.freeze({
        protocolVersion: 1,
        catalogVersion: "phase3b",
        executor: executorRegistry.executor,
        catalog: executorRegistry.catalog,
        externalTargets: Object.freeze([]),
      }),
      executorRegistry,
      runSelected: (registry, ids, onEvent, options) => {
        activeFixtureSignal = options?.signal;
        return run_test_suites(Object.freeze([fixture_suite(starts, {
          entered: enteredResolve,
          wait: (signal) => new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            signal.addEventListener("abort", () => resolve(), { once: true });
          }),
        })]), onEvent ?? (() => undefined), options);
      },
    });
    const runPromise = application.coordinator.dispatch_action({
      type: "action", id: "run", clientId: "phase3b-client", requestId: "run-request",
      name: "tests.runSelected", payload: { testIds: executorRegistry.catalog.tests.map((entry) => entry.id) },
    });
    await entered;
    const association = await eventually(() => application.coordinator.map.capture().value.runs["phase3b-mid-run"], "mid-run association");
    const cancelResponse = await application.coordinator.dispatch_action({
      type: "action", id: "cancel", clientId: "phase3b-client", requestId: "cancel-request",
      name: "tests.cancel", payload: { runId: association.id, attemptId: association.activeAttemptId },
    });
    expect(cancelResponse.type === "ack", "mid-run cancellation is acknowledged");
    const duplicateResponse = await application.coordinator.dispatch_action({
      type: "action", id: "cancel-duplicate", clientId: "phase3b-other", requestId: "cancel-other-request",
      name: "tests.cancel", payload: { runId: association.id, attemptId: association.activeAttemptId },
    });
    expect(duplicateResponse.type === "ack", "duplicate cancellation is acknowledged");
    const runResponse = await runPromise;
    expect(runResponse.type === "ack", "cancelled selected run reaches an action result");
    const result = runResponse.result as unknown as HostedTestSelectedRunResult;
    const reportHost = application.store.get(result.reportHostId!);
    expect(reportHost !== undefined, "cancelled run retains its report host");
    const report = reportHost.map.capture().value as unknown as HostedTestReport;
    const recovered = hosted_test_recovery_association(
      application.coordinator.map.capture().value,
      result.runId,
      result.attemptId,
    );
    expect(recovered !== undefined, "cancelled attempt remains explicitly recoverable");
    const evidence = Object.freeze({
      cancel: cancelResponse.result as unknown as HostedTestCancelResult,
      duplicate: duplicateResponse.result as unknown as HostedTestCancelResult,
      result,
      report: JSON.parse(JSON.stringify(report)) as HostedTestReport,
      starts: Object.freeze([...starts]),
      recoveredStatus: recovered.controlStatus,
      recoveredCancellationRequest: recovered.cancellation?.requestId,
    });
    await application.dispose();
    activeFixtureSignal = undefined;
    return evidence;
  })();
  return midRunEvidence;
}

type BeforeStartEvidence = Readonly<{
  starts: readonly string[];
  report: HostedTestReport;
  controlStatus: string;
}>;

let beforeStartEvidence: Promise<BeforeStartEvidence> | undefined;

function before_start_evidence(): Promise<BeforeStartEvidence> {
  if (beforeStartEvidence !== undefined) return beforeStartEvidence;
  const pending: Promise<BeforeStartEvidence> = (async () => {
    const starts: string[] = [];
    const suite = fixture_suite(starts);
    const executorRegistry = make_test_executor_registry(EXECUTOR, Object.freeze([suite]));
    const application = create_hosted_test_application(make_hosted_test_suite_registry([]), {
      makeRunId: () => "phase3b-before-start",
      discovery: Object.freeze({
        protocolVersion: 1,
        catalogVersion: "phase3b",
        executor: executorRegistry.executor,
        catalog: executorRegistry.catalog,
        externalTargets: Object.freeze([]),
      }),
      executorRegistry,
      requireReportReady: true,
    });
    const runPromise = application.coordinator.dispatch_action({
      type: "action", id: "run-before", clientId: "phase3b-before", requestId: "run-before-request",
      name: "tests.runSelected", payload: { testIds: executorRegistry.catalog.tests.map((entry) => entry.id) },
    });
    const run = await eventually(() => application.coordinator.map.capture().value.runs["phase3b-before-start"], "before-start association");
    const cancel = await application.coordinator.dispatch_action({
      type: "action", id: "cancel-before", clientId: "phase3b-before", requestId: "cancel-before-request",
      name: "tests.cancel", payload: { runId: run.id, attemptId: run.activeAttemptId },
    });
    expect(cancel.type === "ack", "before-start cancel is accepted without report readiness");
    const response = await runPromise;
    expect(response.type === "ack", "before-start cancelled action settles");
    const result = response.result as unknown as HostedTestSelectedRunResult;
    const report = application.store.get(result.reportHostId!)?.map.capture().value as unknown as HostedTestReport;
    const controlStatus = application.coordinator.map.capture().value.runs[result.runId]
      ?.attempts[result.attemptId]?.controlStatus;
    expect(controlStatus !== undefined, "before-start attempt retains terminal control status");
    const evidence: BeforeStartEvidence = Object.freeze({
      starts: Object.freeze([...starts]),
      report: JSON.parse(JSON.stringify(report)) as HostedTestReport,
      controlStatus,
    });
    await application.dispose();
    return evidence;
  })();
  beforeStartEvidence = pending;
  return pending;
}

function plan(caseCount: number, runId = "phase3b-report"): TestRunPlan {
  return Object.freeze({
    runId,
    protocolVersion: 1,
    catalogVersion: "phase3b",
    executorId: "phase3b",
    selectionIds: Object.freeze(Array.from({ length: caseCount }, (_, index) => `livehost/phase3b-report::case-${index}`)),
    suites: Object.freeze([Object.freeze({
      id: "livehost/phase3b-report",
      title: "Phase 3B report fixture",
      subject: "livehost" as const,
      collections: Object.freeze([]),
      provenance: "hson-demo2" as const,
      order: 0,
      executionShape: "cases" as const,
      cases: Object.freeze(Array.from({ length: caseCount }, (_, index) => Object.freeze({
        id: `livehost/phase3b-report::case-${index}`,
        caseId: `case-${index}`,
        title: `case ${index}`,
        order: index,
      }))),
    })]),
  });
}

function empty_cancelled_result(msTotal = 0) {
  return Object.freeze({
    ok: false,
    cancelled: true as const,
    summary: Object.freeze({ suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal, failures: Object.freeze([]) }),
  });
}

export function phase3b_cancellation_control_suite(): TestSuite {
  const suite = "livehost/cancellation-control";
  return Object.freeze({ suite, cases: Object.freeze([
    test_case(suite, "cancel-is-idempotent", "cancel is idempotent", async () => {
      const control = make_hosted_test_execution_control();
      let accepts = 0;
      const first = control.requestCancellation(async () => { accepts += 1; });
      const second = control.requestCancellation(async () => { accepts += 1; });
      expect(await first && await second && accepts === 1, "duplicate control requests share one acceptance");
      expect(control.diagnostics().destructiveCancellationSignals === 1, "one destructive abort signal is issued");
    }),
    test_case(suite, "natural-completion-wins", "natural completion wins before cancel", async () => {
      const control = make_hosted_test_execution_control();
      control.begin();
      expect(await control.acceptNaturalTerminal(), "natural completion is accepted while running");
      expect(!(await control.requestCancellation(async () => undefined)), "late cancel cannot reopen terminal execution");
    }),
    test_case(suite, "cancel-reservation-wins", "cancel reservation wins before completion", async () => {
      const control = make_hosted_test_execution_control();
      control.begin();
      let release = (): void => undefined;
      const accepted = control.requestCancellation(() => new Promise<void>((resolve) => { release = resolve; }));
      const terminal = control.acceptNaturalTerminal();
      release();
      expect(await accepted && !(await terminal), "reserved cancellation orders before natural terminality");
    }),
    test_case(suite, "post-fence-events", "post-fence events admit only cancellation acknowledgement", async () => {
      const control = make_hosted_test_execution_control();
      await control.requestCancellation(async () => undefined);
      expect(!control.acceptsEvent({ t: "case_begin", suite: "s", caseId: "c", name: "c" }), "new case begin is fenced");
      expect(control.acceptsEvent({ t: "case_cancelled", suite: "s", caseId: "c", name: "c", ms: 0 }), "cancellation acknowledgement remains admissible");
    }),
    test_case(suite, "release-idempotent", "release is idempotent", async () => {
      const control = make_hosted_test_execution_control();
      control.release();
      control.release();
      await control.released();
      expect(control.phase() === "released", "repeated release remains terminal");
    }),
    test_case(suite, "pre-cancel-opaque-completion", "pre-cancel opaque completion evidence remains admissible", async () => {
      const control = make_hosted_test_execution_control();
      await control.requestCancellation(async () => undefined);
      expect(control.acceptsEvent({
        t: "external_end", id: "opaque", suite: "opaque", name: "opaque", subject: "livehost",
        runtime: "node", executableChecks: 1, collections: [], status: "pass", ms: 1,
        stdout: "", stderr: "", exitCode: null, signal: "SIGTERM", timedOut: false,
        completionAcceptedBeforeCancellation: true,
      }), "completion frame observed before the fence preserves its aggregate truth");
    }),
    test_case(suite, "acceptance-failure", "cancellation acceptance failure does not abort executor control", async () => {
      const control = make_hosted_test_execution_control();
      control.begin();
      let rejected = false;
      try { await control.requestCancellation(async () => { throw new Error("control persistence failed"); }); }
      catch { rejected = true; }
      expect(rejected && control.phase() === "running" && !control.signal.aborted, "failed authority persistence leaves the running attempt truthful");
      expect(control.diagnostics().destructiveCancellationSignals === 0, "control failure sends no destructive termination signal");
    }),
  ]) });
}

export function phase3b_canonical_cancellation_suite(): TestSuite {
  const suite = "livehost/cancellation-canonical";
  return Object.freeze({ suite, cases: Object.freeze([
    test_case(suite, "cancel-before-suite", "cancel before suite starts", async () => {
      const controller = new AbortController();
      controller.abort();
      const events: TestEvent[] = [];
      const result = await run_test_suites([fixture_suite([])], (event) => events.push(event), { signal: controller.signal });
      expect(result.cancelled === true && events.length === 0, "pre-aborted runner begins no semantic work");
    }),
    test_case(suite, "mid-case-fences-next", "mid-case cancellation fences the next case", async () => {
      const controller = new AbortController();
      const starts: string[] = [];
      const runningSuite = fixture_suite(starts, {
        entered: () => queueMicrotask(() => controller.abort()),
        wait: () => new Promise(() => undefined),
      });
      activeFixtureSignal = controller.signal;
      const events: TestEvent[] = [];
      const result = await run_test_suites([runningSuite], (event) => events.push(event), { signal: controller.signal });
      activeFixtureSignal = undefined;
      expect(result.cancelled === true && starts.join("|") === "first|running", "no queued case starts after abort");
      expect(events.some((event) => event.t === "case_cancelled" && event.caseId === "running"), "running case acknowledges cancellation");
    }),
    test_case(suite, "completed-case-preserved", "completed case remains a pass", async () => {
      const evidence = await mid_run_evidence();
      const first = evidence.report.suiteRuns[0]?.cases.find((entry) => entry.caseId === "first");
      expect(first?.status === "pass", "pre-fence completion is preserved");
    }),
    test_case(suite, "running-case-cancelled", "running case becomes cancelled", async () => {
      const evidence = await mid_run_evidence();
      const running = evidence.report.suiteRuns[0]?.cases.find((entry) => entry.caseId === "running");
      expect(running?.status === "cancelled", "cancellation wins over late running completion");
    }),
    test_case(suite, "synchronous-case-limit", "long synchronous case completes before queued cancel is observed", async () => {
      const controller = new AbortController();
      const starts: string[] = [];
      const syncSuite: TestSuite = Object.freeze({ suite: "livehost/sync-cancel", cases: Object.freeze([
        test_case("livehost/sync-cancel", "sync", "sync", () => {
          starts.push("sync");
          const immediate = (globalThis as typeof globalThis & { setImmediate?: (callback: () => void) => void }).setImmediate;
          if (immediate) immediate(() => controller.abort());
          else setTimeout(() => controller.abort(), 0);
          const until = performance.now() + 8;
          while (performance.now() < until) { /* same-event-loop work is not preemptible */ }
        }),
        test_case("livehost/sync-cancel", "next", "next", () => { starts.push("next"); }),
      ]) });
      const events: TestEvent[] = [];
      await run_test_suites([syncSuite], (event) => events.push(event), { signal: controller.signal, yieldEveryCases: 1 });
      expect(starts.join("|") === "sync", "scheduler observes cancellation only after synchronous control returns");
      expect(events.some((event) => event.t === "case_end" && event.caseId === "sync" && event.status === "pass"), "synchronous completion remains truthful");
    }),
  ]) });
}

export function phase3b_report_cancellation_suite(): TestSuite {
  const suite = "livehost/cancellation-report";
  return Object.freeze({ suite, cases: Object.freeze([
    test_case(suite, "queued-terminalization", "queued planned cases terminalize cancelled", async () => {
      const runPlan = plan(4);
      const report = make_hosted_test_report(Date.now, undefined, "canonical/selected", { runId: runPlan.runId, runPlan });
      report.cancel(empty_cancelled_result());
      await report.settle();
      expect(report.map.capture().value.suiteRuns[0]?.cases.every((entry) => entry.status === "cancelled"), "all queued cases become cancelled");
    }),
    test_case(suite, "canonical-counts", "canonical cancellation counts reconcile", async () => {
      const runPlan = plan(4, "phase3b-counts");
      const report = make_hosted_test_report(Date.now, undefined, "canonical/selected", { runId: runPlan.runId, runPlan });
      report.cancel(empty_cancelled_result());
      await report.settle();
      const counts = report.map.capture().value.suiteRuns[0]?.counts;
      expect(counts?.declared === 4 && counts.total === 4 && counts.executed === 0 && counts.cancelled === 4, "cancelled work is accounted but not claimed executed");
    }),
    test_case(suite, "failure-precedence", "failure takes precedence over cancellation", async () => {
      const runPlan = plan(3, "phase3b-failure-precedence");
      const report = make_hosted_test_report(() => 1, undefined, "canonical/selected", { runId: runPlan.runId, runPlan });
      report.reduce({ t: "suite_begin", suite: runPlan.suites[0]!.id, totalPlanned: 3 });
      report.reduce({ t: "case_begin", suite: runPlan.suites[0]!.id, caseId: "case-0", name: "case 0" });
      report.reduce({ t: "case_end", suite: runPlan.suites[0]!.id, caseId: "case-0", name: "case 0", status: "fail", ms: 1, err: "known failure" });
      report.cancel(empty_cancelled_result());
      await report.settle();
      const state = report.map.capture().value;
      expect(state.run.status === "failed" && state.suiteRuns[0]?.counts.failed === 1 && state.suiteRuns[0]?.counts.cancelled === 2, "known assertion failure is never erased");
    }),
    test_case(suite, "pass-cancel-derivation", "pass plus cancelled derives cancelled", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.report.run.status === "cancelled" && evidence.report.suiteRuns[0]?.status === "cancelled", "pass and cancelled mixture is cancelled");
    }),
    test_case(suite, "large-bounded-cancellation", "large cancellation publishes bounded commits", async () => {
      const runPlan = plan(2_000, "phase3b-large-cancel");
      const map = hson.liveMap.fromJson(make_initial_hosted_test_report("canonical/selected", runPlan.runId, runPlan) as HostedTestReportState) as unknown as HostedTestReportMap;
      let maximumOps = 0;
      const stop = map.commits.observe((observation) => {
        if (observation.kind === "commit") maximumOps = Math.max(maximumOps, observation.commit.ops.length);
      });
      const report = make_hosted_test_report(Date.now, undefined, "canonical/selected", {
        runId: runPlan.runId,
        runPlan,
        map,
        mutate: async (operation) => operation(map),
      });
      const started = performance.now();
      report.cancel(empty_cancelled_result());
      await report.settle();
      const elapsedMs = performance.now() - started;
      stop();
      const state = map.capture().value;
      largeCancellationMeasurement = Object.freeze({
        plannedCases: 2_000,
        elapsedMs,
        maximumCommitOps: maximumOps,
        operationBudget: DEFAULT_HOSTED_TEST_REPORT_OPERATION_BUDGET,
      });
      expect(state.suiteRuns[0]?.counts.cancelled === 2_000, "large plan terminalizes every case");
      expect(maximumOps <= DEFAULT_HOSTED_TEST_REPORT_OPERATION_BUDGET * 8, "publication operation count remains bounded independently of plan size");
      expect(elapsedMs < 5_000, "large cancellation completes without quadratic rescan behavior");
    }),
    test_case(suite, "terminal-never-reopens", "late completion cannot reopen terminal cancellation", async () => {
      const runPlan = plan(1, "phase3b-terminal-fence");
      const report = make_hosted_test_report(() => 1, undefined, "canonical/selected", { runId: runPlan.runId, runPlan });
      report.cancel(empty_cancelled_result());
      await report.settle();
      let contradiction = false;
      try {
        report.reduceLifecycle({
          t: "case_finished", runId: runPlan.runId, executorId: "late", sequence: 4, timestamp: 2,
          suiteId: runPlan.suites[0]!.id, caseId: "case-0", status: "pass", durationMs: 1,
        });
      } catch { contradiction = true; }
      expect(contradiction, "late contradictory evidence is rejected");
    }),
    test_case(suite, "opaque-cancel-accounting", "opaque cancellation separates known execution from cancelled checks", async () => {
      const runPlan: TestRunPlan = Object.freeze({
        runId: "phase3b-opaque-accounting",
        protocolVersion: 1,
        catalogVersion: "phase3b",
        executorId: "phase3b",
        selectionIds: Object.freeze(["livehost/phase3b-opaque"]),
        suites: Object.freeze([Object.freeze({
          id: "livehost/phase3b-opaque",
          title: "opaque",
          subject: "livehost" as const,
          collections: Object.freeze([]),
          provenance: "hson-live" as const,
          order: 0,
          executionShape: "opaque-aggregate" as const,
          sourceRef: "hson-live:phase3b",
          declaredChecks: 37,
          cases: Object.freeze([]),
        })]),
      });
      const report = make_hosted_test_report(Date.now, undefined, "canonical/selected", { runId: runPlan.runId, runPlan });
      report.cancel(empty_cancelled_result());
      await report.settle();
      const counts = report.map.capture().value.suiteRuns[0]?.counts;
      expect(counts?.declared === 37 && counts.total === 37 && counts.executed === 0 && counts.cancelled === 37, "no completion frame fabricates no executed aggregate");
    }),
  ]) });
}

export function phase3b_cancellation_authority_suite(): TestSuite {
  const suite = "livehost/cancellation-authority";
  return Object.freeze({ suite, cases: Object.freeze([
    test_case(suite, "exact-target", "cancel targets exact run and attempt", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.cancel.runId === evidence.result.runId && evidence.cancel.attemptId === evidence.result.attemptId, "cancel identity matches the exact attempt");
    }),
    test_case(suite, "cancelling-intermediate", "cancelling is a real intermediate control state", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.cancel.accepted && evidence.cancel.controlStatus === "cancelling", "acceptance is distinct from executor/report terminality");
    }),
    test_case(suite, "duplicate-authority", "duplicate cancel returns the first authority identity", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.duplicate.cancellation?.requestId === "cancel-request", "later cancel does not replace first authoritative request identity");
    }),
    test_case(suite, "settled-recovery", "cancelled attempt settles and recovers", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.recoveredStatus === "settled" && evidence.recoveredCancellationRequest === "cancel-request", "recovery joins the same settled cancellation");
    }),
    test_case(suite, "no-post-fence-start", "no post-fence case starts", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.starts.join("|") === "first|running", "queued cases never begin after acceptance");
    }),
    test_case(suite, "cancel-before-start", "cancel before execution starts runs zero cases", async () => {
      const evidence = await before_start_evidence();
      expect(evidence.starts.length === 0 && evidence.controlStatus === "settled", "report-ready barrier is cancellation-aware and starts no work");
    }),
    test_case(suite, "before-start-report", "cancel before start produces recoverable terminal report", async () => {
      const evidence = await before_start_evidence();
      expect(evidence.report.run.status === "cancelled" && evidence.report.suiteRuns[0]?.counts.cancelled === 4, "before-start report is terminal and exact");
    }),
    test_case(suite, "stale-cancel", "stale attempt cancel cannot target another attempt", async () => {
      const evidence = await mid_run_evidence();
      expect(evidence.result.attemptId !== `${evidence.result.runId}:attempt:2`, "fixture establishes one exact attempt");
      // Exact schema/lookup rejection is certified by the application path in a
      // separate action to avoid relying on UI row identity.
      const app = create_hosted_test_application(make_hosted_test_suite_registry([]));
      const response = await app.coordinator.dispatch_action({
        type: "action", id: "stale", clientId: "stale", requestId: "stale-request",
        name: "tests.cancel", payload: { runId: evidence.result.runId, attemptId: `${evidence.result.runId}:attempt:2` },
      });
      expect(response.type === "error", "unknown stale attempt is rejected");
      await app.dispose();
    }),
    test_case(suite, "transport-loss-independent", "coordinator and report disconnect do not imply cancellation", async () => {
      const starts: string[] = [];
      let enteredResolve = (): void => undefined;
      const entered = new Promise<void>((resolve) => { enteredResolve = resolve; });
      const fixture = fixture_suite(starts, {
        entered: enteredResolve,
        wait: (signal) => new Promise<void>((resolve) => {
          if (signal.aborted) { resolve(); return; }
          signal.addEventListener("abort", () => resolve(), { once: true });
        }),
      });
      const executorRegistry = make_test_executor_registry(EXECUTOR, Object.freeze([fixture]));
      const app = create_hosted_test_application(make_hosted_test_suite_registry([]), {
        makeRunId: () => "phase3b-transport-independent",
        discovery: Object.freeze({
          protocolVersion: 1, catalogVersion: "phase3b", executor: executorRegistry.executor,
          catalog: executorRegistry.catalog, externalTargets: Object.freeze([]),
        }),
        executorRegistry,
        runSelected: (_registry, _ids, onEvent, options) => {
          activeFixtureSignal = options?.signal;
          return run_test_suites([fixture], onEvent ?? (() => undefined), options);
        },
      });
      const running = app.coordinator.dispatch_action({
        type: "action", id: "transport-run", clientId: "transport", requestId: "transport-run-request",
        name: "tests.runSelected", payload: { testIds: executorRegistry.catalog.tests.map((entry) => entry.id) },
      });
      await entered;
      const run = app.coordinator.map.capture().value.runs["phase3b-transport-independent"]!;
      const coordinatorConnection = app.connect(HOSTED_TEST_COORDINATOR_HOST_ID, blackhole_socket());
      const reportConnection = app.connect(run.attempts[run.activeAttemptId]!.reportHostId, blackhole_socket());
      expect(coordinatorConnection.ok && reportConnection.ok, "both authorities accept independent transports");
      coordinatorConnection.value();
      reportConnection.value();
      await tick();
      expect(app.coordinator.map.capture().value.runs[run.id]?.attempts[run.activeAttemptId]?.controlStatus === "running", "socket loss leaves server execution running");
      await app.coordinator.dispatch_action({
        type: "action", id: "transport-cancel", clientId: "transport", requestId: "transport-cancel-request",
        name: "tests.cancel", payload: { runId: run.id, attemptId: run.activeAttemptId },
      });
      await running;
      await app.dispose();
      activeFixtureSignal = undefined;
    }),
  ]) });
}

export function all_phase3b_cancellation_suites(): readonly TestSuite[] {
  const descriptor = Object.freeze({ subject: "livehost" as const, requirements: Object.freeze(["javascript"] as const) });
  return Object.freeze([
    phase3b_cancellation_control_suite(),
    phase3b_canonical_cancellation_suite(),
    phase3b_report_cancellation_suite(),
    phase3b_cancellation_authority_suite(),
  ].map((suite) => Object.freeze({ ...suite, descriptor })));
}
