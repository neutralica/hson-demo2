import { hson } from "hson-live";
import type { LiveMapAnyOp, LiveMapBatchTx, LiveMapCommit, LiveMapOp } from "hson-live/livemap";
import type { JsonValue, LivePath } from "hson-live/types";
import { TEST_SUBJECT_IDENTIFIERS } from "../../../../src/shared/testing/test-contracts";
import type { RunResult, TestEvent } from "../../core/test-contracts";
import { make_test_lifecycle_adapter } from "../../core/test-lifecycle";
import { TEST_ERROR_KINDS, TEST_LIFECYCLE_STATUSES, type TestLifecycleCounts, type TestLifecycleError, type TestLifecycleEvent, type TestLifecycleStatus, type TestLifecycleTerminalStatus } from "../../../../src/shared/testing/test-lifecycle-contract";
import type { TestRunPlan } from "../../../../src/shared/testing/test-run-contract";
import type { HostedTestCaseReport, HostedTestInfrastructureError, HostedTestPlannedCaseReport, HostedTestReport, HostedTestReportCommit, HostedTestReportMap } from "../../../../src/shared/hosted-tests/hosted-test-report.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET, HOSTED_TEST_SUITE_IDS } from "../../../../src/shared/hosted-tests/hosted-test-suite-contract";
import type { HostedTestRunTarget } from "../../../../src/shared/hosted-tests/hosted-test-suite-contract";

export const HOSTED_TEST_REPORT_SCHEMA = hson.liveMap.schema.define((s) => {
  const nonNegativeInteger = s.number.constrain(
    "non-negative integer",
    (value) => Number.isInteger(value) && value >= 0,
  );
  const finiteNumber = s.number.constrain("finite number", Number.isFinite);
  const lifecycleError = s.object.exact({
    kind: s.pick(...TEST_ERROR_KINDS),
    executorId: s.string,
    message: s.string,
    stack: s.string.nullable,
    expected: s.string.nullable,
    actual: s.string.nullable,
  });
  const counts = s.object.exact({
    declared: nonNegativeInteger,
    total: nonNegativeInteger,
    executed: nonNegativeInteger,
    passed: nonNegativeInteger,
    failed: nonNegativeInteger,
    skipped: nonNegativeInteger,
    unsupported: nonNegativeInteger,
    cancelled: nonNegativeInteger,
  });
  return s.object.exact({
    run: s.object.exact({
      id: s.string.optional,
      suite: s.pick(...HOSTED_TEST_SUITE_IDS, HOSTED_TEST_SELECTED_RUN_TARGET),
      status: s.pick("idle", "running", "passed", "failed", "cancelled", "error"),
      startedAt: finiteNumber.nullable,
      completedAt: finiteNumber.nullable,
      timing: s.object.exact({ runnerMs: finiteNumber, hostMs: finiteNumber }).nullable,
      lastSequence: nonNegativeInteger,
      lastEventSignature: s.string,
    }),
    summary: s.object.exact({
      cases: nonNegativeInteger,
      pass: nonNegativeInteger,
      fail: nonNegativeInteger,
      skip: nonNegativeInteger,
    }),
    plan: s.object.exact({
      protocolVersion: nonNegativeInteger,
      catalogVersion: s.string,
      executorId: s.string,
      selectionIds: s.array(s.string),
    }).nullable,
    suiteRuns: s.array(s.object.exact({
      id: s.string,
      title: s.string,
      subject: s.pick(...TEST_SUBJECT_IDENTIFIERS),
      collections: s.array(s.pick("unit", "dev")),
      provenance: s.pick("hson-demo2", "hson-live"),
      order: nonNegativeInteger,
      executionShape: s.pick("cases", "opaque-aggregate"),
      sourceRef: s.string.nullable,
      declaredChecks: nonNegativeInteger.nullable,
      status: s.pick(...TEST_LIFECYCLE_STATUSES),
      queuedAt: finiteNumber,
      startedAt: finiteNumber.nullable,
      completedAt: finiteNumber.nullable,
      durationMs: finiteNumber.nullable,
      ms: finiteNumber.nullable,
      counts,
      errors: s.array(lifecycleError),
      evidence: s.array(s.object.exact({
        id: s.string,
        sequence: nonNegativeInteger,
        timestamp: finiteNumber,
        executorId: s.string,
        kind: s.pick("stdout", "stderr", "runtime_warning", "raw_process_output", "protocol_control", "artifact"),
        name: s.string,
        content: s.string,
        truncated: s.boolean,
        knownBytes: nonNegativeInteger.nullable,
        reference: s.string.nullable,
        mediaType: s.string.nullable,
      })),
      evidenceRefs: s.array(s.string),
      caseOrder: s.array(s.string),
      runtime: s.string.nullable,
      executorIds: s.array(s.string),
      lastSequence: nonNegativeInteger,
      lastEventSignature: s.string,
      cases: s.array(s.object.exact({
        id: s.string,
        caseId: s.string,
        title: s.string,
        order: nonNegativeInteger,
        status: s.pick(...TEST_LIFECYCLE_STATUSES),
        queuedAt: finiteNumber,
        startedAt: finiteNumber.nullable,
        completedAt: finiteNumber.nullable,
        durationMs: finiteNumber.nullable,
        ms: finiteNumber.nullable,
        err: s.string.nullable,
        errors: s.array(lifecycleError),
        evidenceRefs: s.array(s.string),
        executorId: s.string.nullable,
        lastSequence: nonNegativeInteger,
        lastEventSignature: s.string,
      })),
    })),
    caseBatches: s.record(s.array(s.object.exact({
      key: s.string,
      suite: s.string,
      caseId: s.string,
      name: s.string,
      status: s.pick("pass", "fail", "skip"),
      ms: finiteNumber,
      err: s.string.nullable,
    }))),
    suites: s.array(s.object.exact({ suite: s.string, ms: finiteNumber })),
    externalResults: s.record(s.object.exact({
      id: s.string,
      suite: s.string,
      name: s.string,
      subject: s.string,
      runtime: s.string,
      executableChecks: nonNegativeInteger,
      collections: s.array(s.string),
      status: s.pick("queued", "running", "pass", "fail", "cancelled"),
      ms: finiteNumber,
      stdout: s.string,
      stderr: s.string,
      exitCode: s.number.nullable,
      signal: s.string.nullable,
      timedOut: s.boolean,
      spawnError: s.string.nullable,
    })),
    error: lifecycleError.nullable,
  });
});

export function make_initial_hosted_test_report(
  suite: HostedTestRunTarget,
  runId?: string,
  runPlan?: TestRunPlan,
  queuedAt = Date.now(),
): HostedTestReport {
  return {
    run: {
      ...(runId !== undefined ? { id: runId } : {}),
      suite,
      status: "idle",
      startedAt: null,
      completedAt: null,
      timing: null,
      lastSequence: 0,
      lastEventSignature: "",
    },
    summary: { cases: 0, pass: 0, fail: 0, skip: 0 },
    plan: runPlan === undefined ? null : {
      protocolVersion: runPlan.protocolVersion,
      catalogVersion: runPlan.catalogVersion,
      executorId: runPlan.executorId,
      selectionIds: [...runPlan.selectionIds],
    },
    suiteRuns: runPlan === undefined ? [] : runPlan.suites.map((plannedSuite) => ({
      id: plannedSuite.id,
      title: plannedSuite.title,
      subject: plannedSuite.subject,
      collections: [...plannedSuite.collections],
      provenance: plannedSuite.provenance,
      order: plannedSuite.order,
      executionShape: plannedSuite.executionShape,
      sourceRef: plannedSuite.sourceRef ?? null,
      declaredChecks: plannedSuite.declaredChecks ?? null,
      status: "queued",
      queuedAt,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      ms: null,
      counts: {
        declared: plannedSuite.executionShape === "cases" ? plannedSuite.cases.length : plannedSuite.declaredChecks ?? 0,
        total: plannedSuite.executionShape === "cases" ? plannedSuite.cases.length : 0,
        executed: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        unsupported: 0,
        cancelled: 0,
      },
      errors: [],
      evidence: [],
      evidenceRefs: [],
      caseOrder: plannedSuite.cases.map((testCase) => testCase.id),
      runtime: null,
      executorIds: [],
      lastSequence: 0,
      lastEventSignature: "",
      cases: plannedSuite.cases.map((testCase) => ({
        id: testCase.id,
        caseId: testCase.caseId,
        title: testCase.title,
        order: testCase.order,
        status: "queued",
        queuedAt,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        ms: null,
        err: null,
        errors: [],
        evidenceRefs: [],
        executorId: null,
        lastSequence: 0,
        lastEventSignature: "",
      })),
    })),
    caseBatches: {},
    suites: [],
    externalResults: {},
    error: null,
  };
}

function finite_or_zero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function finite_time(now: () => number): number {
  const value = now();
  return Number.isFinite(value) ? value : 0;
}

function normalized_error(error: TestLifecycleError, executorId: string): HostedTestInfrastructureError {
  return {
    kind: error.kind,
    executorId,
    message: error.message,
    stack: error.stack ?? null,
    expected: error.expected ?? null,
    actual: error.actual ?? null,
  };
}

function case_report(
  event: Extract<TestLifecycleEvent, { t: "case_finished" }> & Readonly<{ status: "pass" | "fail" | "skip" }>,
  name: string,
): HostedTestCaseReport {
  return {
    key: `${event.suiteId}::${event.caseId}`,
    suite: event.suiteId,
    caseId: event.caseId,
    name,
    status: event.status,
    ms: finite_or_zero(event.durationMs),
    err: event.error?.message ?? null,
  };
}

function clone_path(path: LivePath): LivePath {
  return Object.freeze([...path]);
}

function clone_value(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    const clone = value.map(clone_value);
    Object.freeze(clone);
    return clone;
  }
  if (typeof value === "object" && value !== null) {
    const clone: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) clone[key] = clone_value(child);
    Object.freeze(clone);
    return clone;
  }
  return value;
}

function clone_optional_value(value: JsonValue | undefined): JsonValue | undefined {
  return value === undefined ? undefined : clone_value(value);
}

function clone_op(op: LiveMapOp): LiveMapOp {
  if (op.kind === "splice") {
    const removed = op.removed.map(clone_value);
    const inserted = op.inserted.map(clone_value);
    Object.freeze(removed);
    Object.freeze(inserted);
    return Object.freeze({
      kind: "splice",
      path: clone_path(op.path),
      start: op.start,
      removed,
      inserted,
      prev: clone_value(op.prev),
      next: clone_value(op.next),
    });
  }
  if (op.kind === "delete") {
    return Object.freeze({
      kind: "delete",
      path: clone_path(op.path),
      prev: clone_optional_value(op.prev),
      next: undefined,
    });
  }
  if (op.kind === "rename") {
    return Object.freeze({
      kind: op.kind,
      path: clone_path(op.path),
      from: op.from,
      to: op.to,
      prev: clone_value(op.prev),
      next: clone_value(op.next),
    });
  }
  if (op.kind === "move") {
    return Object.freeze({
      kind: op.kind,
      path: clone_path(op.path),
      from: op.from,
      to: op.to,
      prev: clone_value(op.prev),
      next: clone_value(op.next),
    });
  }
  return Object.freeze({
    kind: op.kind,
    path: clone_path(op.path),
    prev: clone_optional_value(op.prev),
    next: clone_optional_value(op.next),
  });
}

function capture_commit(commit: LiveMapCommit): HostedTestReportCommit {
  const ops = commit.ops.map(clone_op);
  Object.freeze(ops);
  return Object.freeze({
    changed: commit.changed,
    prevRev: commit.prevRev,
    rev: commit.rev,
    ops,
  });
}

export type HostedTestReportController = Readonly<{
  map: HostedTestReportMap;
  commits: () => readonly HostedTestReportCommit[];
  dispose: () => void;
  /** Compatibility adapter: legacy runner events are normalized before reduction. */
  reduce: (event: TestEvent) => void;
  reduceLifecycle: (event: TestLifecycleEvent) => void;
  complete: (result: RunResult, timing?: Readonly<{ runnerMs: number; hostMs: number }>) => void;
  cancel: (result: RunResult, timing?: Readonly<{ runnerMs: number; hostMs: number }>) => void;
  settle: () => Promise<void>;
  failInfrastructure: (error: unknown) => void;
}>;

type MutableHostedTestPlannedCaseReport = Omit<HostedTestPlannedCaseReport, "errors" | "evidenceRefs"> & {
  errors: HostedTestInfrastructureError[];
  evidenceRefs: string[];
};

export const DEFAULT_HOSTED_TEST_CASE_BATCH_SIZE = 32;
export const DEFAULT_HOSTED_TEST_LIFECYCLE_BATCH_SIZE = 8;
export const DEFAULT_HOSTED_TEST_REPORT_FLUSH_INTERVAL_MS = 100;
export const DEFAULT_HOSTED_TEST_REPORT_OPERATION_BUDGET = 64;
const HOSTED_TEST_CASE_LIFECYCLE_OPERATION_WEIGHT = 4;

export type HostedTestReportOptions = Readonly<{
  caseBatchSize?: number;
  captureCommits?: boolean;
  runId?: string;
  runPlan?: TestRunPlan;
  map?: HostedTestReportMap;
  mutate?: (mutation: (draft: HostedTestReportMap) => LiveMapCommit) => Promise<LiveMapCommit<LiveMapAnyOp>>;
}>;

export function make_hosted_test_report(
  now: () => number = Date.now,
  onCommit?: (commit: HostedTestReportCommit) => void,
  suite: HostedTestRunTarget = "livemap/replay",
  options: HostedTestReportOptions = {},
): HostedTestReportController {
  const caseBatchSize = options.caseBatchSize ?? DEFAULT_HOSTED_TEST_CASE_BATCH_SIZE;
  if (!Number.isInteger(caseBatchSize) || caseBatchSize <= 0) {
    throw new Error("Hosted test report caseBatchSize must be a positive integer.");
  }
  const queuedAt = finite_time(now);
  const initialJson = JSON.parse(JSON.stringify(make_initial_hosted_test_report(suite, options.runId, options.runPlan, queuedAt))) as JsonValue;
  const map = options.map === undefined
    ? hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap
    : options.map;
  const captured: HostedTestReportCommit[] = [];
  const unsubscribe = options.captureCommits === false
    ? () => undefined
    : map.feed([], (event) => {
        const commit = capture_commit(event.commit);
        captured.push(commit);
        onCommit?.(commit);
      });
  let disposed = false;
  const pendingMutations = new Set<Promise<unknown>>();
  let pendingMutationFailure: unknown;
  type ReportTxOperation = (tx: LiveMapBatchTx<HostedTestReport>) => void;
  type PendingReportOperation = Readonly<{
    operation: ReportTxOperation;
    weight: number;
    coalesce?: "queued-run-stamp";
  }>;
  let pendingReportOperations: PendingReportOperation[] = [];
  let reportFlushTimer: ReturnType<typeof setTimeout> | undefined;
  let activeMutation: Promise<unknown> | undefined;
  type PendingCaseLifecycleOperation = Readonly<{
    operation: ReportTxOperation;
    caseKey?: string;
    phase?: "start" | "finish";
    stamp?: Readonly<{ event: TestLifecycleEvent; eventSignature: string }>;
    counts?: Readonly<{ suiteIndex: number; value: TestLifecycleCounts }>;
  }>;
  let pendingCaseLifecycle: PendingCaseLifecycleOperation[] = [];
  let pendingCases: HostedTestCaseReport[] = [];
  const recovered = map.capture().value;
  const reportRunId = recovered.run.id ?? options.runId ?? `legacy:${suite}`;
  let caseBatchId = Math.max(0, ...Object.keys(recovered.caseBatches).map((key) => Number(key) || 0));
  let suiteTimingCount = recovered.suites.length;
  let summaryCases = recovered.summary.cases;
  let summaryPass = recovered.summary.pass;
  let summaryFail = recovered.summary.fail;
  let summarySkip = recovered.summary.skip;
  let runStatus = recovered.run.status;
  let hasRunInfrastructureError = recovered.error !== null;
  let pendingCompletion: Readonly<{
    result: RunResult;
    timing: Readonly<{ runnerMs: number; hostMs: number }>;
  }> | undefined;
  let lastSequence = recovered.run.lastSequence;
  let lastRunSignature = recovered.run.lastEventSignature;
  let runProjection = { ...recovered.run };
  const runProjectionBySequence = new Map<number, typeof runProjection>();
  const suiteRunIndex = new Map(recovered.suiteRuns.map((suiteRun, index) => [suiteRun.id, index]));
  const suiteCounts = new Map(recovered.suiteRuns.map((suiteRun) => [suiteRun.id, { ...suiteRun.counts }]));
  const caseTitles = new Map(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.map((testCase) => [testCase.id, testCase.title] as const)
  )));
  const caseRunIndex = new Map(recovered.suiteRuns.flatMap((suiteRun, suiteIndex) => (
    suiteRun.cases.map((testCase, caseIndex) => [testCase.id, { suiteIndex, caseIndex }] as const)
  )));
  const suiteStatuses = new Map(recovered.suiteRuns.map((suiteRun) => [suiteRun.id, suiteRun.status]));
  const caseStatuses = new Map(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.map((testCase) => [testCase.id, testCase.status] as const)
  )));
  const caseRunStates = new Map<string, MutableHostedTestPlannedCaseReport>(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.map((testCase) => [testCase.id, {
      ...testCase,
      errors: [...testCase.errors],
      evidenceRefs: [...testCase.evidenceRefs],
    }] as const)
  )));
  const suiteExecutors = new Map(recovered.suiteRuns.map((suiteRun) => [suiteRun.id, new Set(suiteRun.executorIds)]));
  const caseExecutors = new Map(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.flatMap((testCase) => testCase.executorId === null ? [] : [[testCase.id, testCase.executorId] as const])
  )));
  const caseTerminalEvidence = new Map(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.flatMap((testCase) => terminal(testCase.status) ? [[
      testCase.id,
      JSON.stringify({ status: testCase.status, durationMs: testCase.durationMs, errors: testCase.errors }),
    ] as const] : [])
  )));
  const suiteTerminalEvidence = new Map(recovered.suiteRuns.flatMap((suiteRun) => terminal(suiteRun.status) ? [[
    suiteRun.id,
    JSON.stringify({ status: suiteRun.status, durationMs: suiteRun.durationMs, counts: suiteRun.counts, errors: suiteRun.errors }),
  ] as const] : []));
  const receipts = new Map<number, string>();
  if (recovered.run.lastSequence > 0) receipts.set(recovered.run.lastSequence, recovered.run.lastEventSignature);
  for (const suiteRun of recovered.suiteRuns) {
    if (suiteRun.lastSequence > 0) receipts.set(suiteRun.lastSequence, suiteRun.lastEventSignature);
    for (const testCase of suiteRun.cases) {
      if (testCase.lastSequence > 0) receipts.set(testCase.lastSequence, testCase.lastEventSignature);
    }
  }
  const evidenceCounts = new Map(recovered.suiteRuns.map((suiteRun) => [suiteRun.id, suiteRun.evidence.length]));
  const caseEvidenceCounts = new Map(recovered.suiteRuns.flatMap((suiteRun) => (
    suiteRun.cases.map((testCase) => [testCase.id, testCase.evidenceRefs.length] as const)
  )));
  const errorKeys = new Map(recovered.suiteRuns.map((suiteRun) => [
    suiteRun.id,
    new Set(suiteRun.errors.map((error) => `${error.executorId}\u0000${error.kind}\u0000${error.message}`)),
  ]));

  function clear_report_flush_timer(): void {
    if (reportFlushTimer === undefined) return;
    clearTimeout(reportFlushTimer);
    reportFlushTimer = undefined;
  }

  function start_report_mutation(): void {
    clear_report_flush_timer();
    if (options.mutate === undefined || activeMutation !== undefined || pendingReportOperations.length === 0) return;
    const operations: PendingReportOperation[] = [];
    let operationWeight = 0;
    while (pendingReportOperations.length > 0) {
      const next = pendingReportOperations[0]!;
      if (operations.length > 0 && operationWeight + next.weight > DEFAULT_HOSTED_TEST_REPORT_OPERATION_BUDGET) break;
      pendingReportOperations.shift();
      operations.push(next);
      operationWeight += next.weight;
    }
    let pending: Promise<unknown>;
    try {
      pending = options.mutate((draft) => draft.batch((tx) => {
        for (const entry of operations) entry.operation(tx);
      }));
    } catch (error) {
      pendingMutationFailure ??= error;
      return;
    }
    activeMutation = pending;
    pendingMutations.add(pending);
    void pending.then(
      () => {
        pendingMutations.delete(pending);
        activeMutation = undefined;
        schedule_report_mutation();
      },
      (error) => {
        pendingMutations.delete(pending);
        activeMutation = undefined;
        pendingMutationFailure ??= error;
      },
    );
  }

  function schedule_report_mutation(): void {
    if (options.mutate === undefined || activeMutation !== undefined
      || reportFlushTimer !== undefined || pendingReportOperations.length === 0) return;
    reportFlushTimer = setTimeout(start_report_mutation, DEFAULT_HOSTED_TEST_REPORT_FLUSH_INTERVAL_MS);
  }

  function mutate(
    operation: ReportTxOperation,
    weight = 1,
    coalesce?: PendingReportOperation["coalesce"],
  ): void {
    if (options.mutate === undefined) {
      map.batch(operation);
      return;
    }
    if (coalesce !== undefined && pendingReportOperations.at(-1)?.coalesce === coalesce) {
      pendingReportOperations[pendingReportOperations.length - 1] = { operation, weight, coalesce };
    } else {
      pendingReportOperations.push({ operation, weight, ...(coalesce === undefined ? {} : { coalesce }) });
    }
    schedule_report_mutation();
  }

  function mutate_queued_run_stamp(event: TestLifecycleEvent, eventSignature: string): void {
    mutate((tx) => stamp_run(tx, event, eventSignature), 1, "queued-run-stamp");
  }

  function flush_case_lifecycle(): void {
    if (pendingCaseLifecycle.length === 0) return;
    const operations = pendingCaseLifecycle;
    pendingCaseLifecycle = [];
    mutate((tx) => {
      for (const entry of operations) entry.operation(tx);
      const counts = new Map<number, TestLifecycleCounts>();
      for (const entry of operations) {
        if (entry.counts !== undefined) counts.set(entry.counts.suiteIndex, entry.counts.value);
      }
      for (const [suiteIndex, value] of counts) tx.set(["suiteRuns", suiteIndex, "counts"], value);
      let stamp: PendingCaseLifecycleOperation["stamp"];
      for (let index = operations.length - 1; index >= 0; index -= 1) {
        if (operations[index]!.stamp === undefined) continue;
        stamp = operations[index]!.stamp;
        break;
      }
      if (stamp !== undefined) stamp_run(tx, stamp.event, stamp.eventSignature);
    }, HOSTED_TEST_CASE_LIFECYCLE_OPERATION_WEIGHT);
  }

  function mutate_case(
    operation: ReportTxOperation,
    metadata: Omit<PendingCaseLifecycleOperation, "operation"> = {},
  ): void {
    if (options.mutate === undefined || options.runPlan === undefined) {
      mutate((tx) => {
        operation(tx);
        if (metadata.counts !== undefined) {
          tx.set(["suiteRuns", metadata.counts.suiteIndex, "counts"], metadata.counts.value);
        }
        if (metadata.stamp !== undefined) stamp_run(tx, metadata.stamp.event, metadata.stamp.eventSignature);
      });
      return;
    }
    if (metadata.phase === "finish") {
      pendingCaseLifecycle = pendingCaseLifecycle.filter((entry) => (
        entry.caseKey !== metadata.caseKey || entry.phase !== "start"
      ));
    }
    pendingCaseLifecycle.push({ operation, ...metadata });
    if (pendingCaseLifecycle.length >= DEFAULT_HOSTED_TEST_LIFECYCLE_BATCH_SIZE * 2) flush_case_lifecycle();
  }

  function terminal(status: TestLifecycleStatus): status is TestLifecycleTerminalStatus {
    return status !== "queued" && status !== "running";
  }

  function transition(current: TestLifecycleStatus, next: TestLifecycleStatus, identity: string): boolean {
    if (current === next) return false;
    if (terminal(current)) throw new Error(`TEST_LIFECYCLE_TERMINAL_REOPEN: ${identity} cannot transition ${current} -> ${next}.`);
    if (current === "queued" && next !== "running" && next !== "skip" && next !== "unsupported" && next !== "cancelled") {
      throw new Error(`TEST_LIFECYCLE_START_REQUIRED: ${identity} cannot transition queued -> ${next}.`);
    }
    if (next === "queued") throw new Error(`TEST_LIFECYCLE_REQUEUE_FORBIDDEN: ${identity} cannot return to queued.`);
    return true;
  }

  function signature(event: TestLifecycleEvent): string {
    return JSON.stringify(event);
  }

  function validate_event(event: TestLifecycleEvent): string | undefined {
    if (event.runId !== reportRunId) throw new Error(`TEST_LIFECYCLE_RUN_MISMATCH: ${event.runId} !== ${reportRunId}.`);
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || !Number.isFinite(event.timestamp)) {
      throw new Error("TEST_LIFECYCLE_EVENT_INVALID: sequence and timestamp must be finite positive chronology evidence.");
    }
    const eventSignature = signature(event);
    if (event.sequence <= lastSequence) {
      if (receipts.get(event.sequence) === eventSignature) return undefined;
      throw new Error(`TEST_LIFECYCLE_SEQUENCE_CONTRADICTION: sequence ${event.sequence} conflicts with accepted evidence.`);
    }
    lastSequence = event.sequence;
    lastRunSignature = eventSignature;
    receipts.set(event.sequence, eventSignature);
    runProjection = { ...runProjection, lastSequence: event.sequence, lastEventSignature: eventSignature };
    runProjectionBySequence.set(event.sequence, runProjection);
    return eventSignature;
  }

  function stamp_run(tx: LiveMapBatchTx<HostedTestReport>, event: TestLifecycleEvent, eventSignature: string): void {
    const projection = runProjectionBySequence.get(event.sequence);
    if (projection === undefined || projection.lastEventSignature !== eventSignature) {
      throw new Error(`TEST_LIFECYCLE_RUN_PROJECTION_MISSING: sequence ${event.sequence} has no accepted run projection.`);
    }
    tx.replace(["run"], projection);
    for (const sequence of runProjectionBySequence.keys()) {
      if (sequence <= event.sequence) runProjectionBySequence.delete(sequence);
    }
  }

  function canonical_counts(suiteId: string): TestLifecycleCounts {
    return { ...(suiteCounts.get(suiteId) ?? {
      declared: 0, total: 0, executed: 0, passed: 0, failed: 0,
      skipped: 0, unsupported: 0, cancelled: 0,
    }) };
  }

  function record_case_terminal(suiteId: string, status: TestLifecycleTerminalStatus): void {
    const counts = suiteCounts.get(suiteId);
    if (counts === undefined) return;
    if (status !== "cancelled") counts.executed += 1;
    if (status === "pass") counts.passed += 1;
    else if (status === "fail") counts.failed += 1;
    else if (status === "skip") counts.skipped += 1;
    else if (status === "unsupported") counts.unsupported += 1;
    else counts.cancelled += 1;
  }

  function validate_counts(counts: TestLifecycleCounts, suiteId: string): void {
    const values = Object.values(counts);
    if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error(`TEST_LIFECYCLE_COUNTS_INVALID: ${suiteId} counts must be non-negative safe integers.`);
    }
    const executed = counts.passed + counts.failed + counts.skipped + counts.unsupported;
    if (counts.executed !== executed || counts.executed + counts.cancelled > counts.total || counts.total > counts.declared) {
      throw new Error(`TEST_LIFECYCLE_COUNTS_CONTRADICTION: ${suiteId} counts do not reconcile.`);
    }
  }

  function attach_suite_executor(
    tx: LiveMapBatchTx<HostedTestReport>,
    suiteId: string,
    suiteIndex: number,
    executorId: string,
  ): void {
    const executors = suiteExecutors.get(suiteId) ?? new Set<string>();
    if (executors.has(executorId)) return;
    const index = executors.size;
    executors.add(executorId);
    suiteExecutors.set(suiteId, executors);
    tx.splice(["suiteRuns", suiteIndex, "executorIds"], index, 0, executorId);
  }

  function assign_case_executor(caseKey: string, executorId: string): void {
    const assigned = caseExecutors.get(caseKey);
    if (assigned !== undefined && assigned !== executorId) {
      throw new Error(`TEST_LIFECYCLE_CASE_EXECUTOR_CONTRADICTION: ${caseKey} started on ${assigned} and reported from ${executorId}.`);
    }
    caseExecutors.set(caseKey, executorId);
  }

  function append_suite_error(
    tx: LiveMapBatchTx<HostedTestReport>,
    suiteId: string,
    error: TestLifecycleError,
    executorId: string,
  ): void {
    const suiteIndex = suiteRunIndex.get(suiteId);
    if (suiteIndex === undefined) return;
    const key = `${executorId}\u0000${error.kind}\u0000${error.message}`;
    const keys = errorKeys.get(suiteId) ?? new Set<string>();
    if (keys.has(key)) return;
    keys.add(key);
    errorKeys.set(suiteId, keys);
    tx.splice(["suiteRuns", suiteIndex, "errors"], keys.size - 1, 0, normalized_error(error, executorId));
  }

  function flush_pending_cases(suiteEnd?: Readonly<{ suite: string; ms: number }>): void {
    if (pendingCases.length === 0 && suiteEnd === undefined) return;
    const batch = pendingCases;
    let pass = 0;
    let fail = 0;
    let skip = 0;
    for (const testCase of batch) {
      if (testCase.status === "pass") pass += 1;
      else if (testCase.status === "fail") fail += 1;
      else skip += 1;
    }
    const beforeRev = map.rev;
    try {
      mutate((tx) => {
        if (batch.length > 0) {
          caseBatchId += 1;
          tx.setMany(["caseBatches"], { [caseBatchId.toString().padStart(6, "0")]: batch });
          summaryCases += batch.length;
          summaryPass += pass;
          summaryFail += fail;
          summarySkip += skip;
          tx.set(["summary", "cases"], summaryCases);
          tx.set(["summary", "pass"], summaryPass);
          tx.set(["summary", "fail"], summaryFail);
          tx.set(["summary", "skip"], summarySkip);
        }
        if (suiteEnd !== undefined) {
          tx.splice(["suites"], suiteTimingCount, 0, suiteEnd);
          suiteTimingCount += 1;
        }
      });
      pendingCases = [];
    } catch (error) {
      if (map.rev !== beforeRev) pendingCases = [];
      throw error;
    }
  }

  function write_case_batch(tx: LiveMapBatchTx<HostedTestReport>, batch: HostedTestCaseReport[]): void {
    if (batch.length === 0) return;
    let pass = 0;
    let fail = 0;
    let skip = 0;
    for (const testCase of batch) {
      if (testCase.status === "pass") pass += 1;
      else if (testCase.status === "fail") fail += 1;
      else skip += 1;
    }
    caseBatchId += 1;
    tx.setMany(["caseBatches"], { [caseBatchId.toString().padStart(6, "0")]: batch });
    summaryCases += batch.length;
    summaryPass += pass;
    summaryFail += fail;
    summarySkip += skip;
    tx.set(["summary", "cases"], summaryCases);
    tx.set(["summary", "pass"], summaryPass);
    tx.set(["summary", "fail"], summaryFail);
    tx.set(["summary", "skip"], summarySkip);
  }

  function reduce_lifecycle_unchecked(event: TestLifecycleEvent): void {
    const eventSignature = validate_event(event);
    if (eventSignature === undefined) return;
    const suiteIndex = "suiteId" in event ? suiteRunIndex.get(event.suiteId) : undefined;

    if (event.t === "run_planned" || event.t === "suite_queued" || event.t === "case_queued") {
      flush_case_lifecycle();
      if (event.t === "suite_queued" && suiteStatuses.get(event.suiteId) !== "queued") {
        throw new Error(`TEST_LIFECYCLE_REQUEUE_FORBIDDEN: ${event.suiteId} is not queued.`);
      }
      if (event.t === "case_queued" && caseStatuses.get(`${event.suiteId}::${event.caseId}`) !== "queued") {
        throw new Error(`TEST_LIFECYCLE_REQUEUE_FORBIDDEN: ${event.suiteId}::${event.caseId} is not queued.`);
      }
      mutate_queued_run_stamp(event, eventSignature);
      return;
    }

    if (event.t === "suite_started") {
      flush_case_lifecycle();
      if (suiteIndex !== undefined) {
        const current = suiteStatuses.get(event.suiteId) ?? "queued";
        const changed = transition(current, "running", event.suiteId);
        if (changed) suiteStatuses.set(event.suiteId, "running");
      }
      const startsRun = runStatus === "idle";
      if (startsRun) {
        runStatus = "running";
        runProjection = {
          ...runProjection,
          status: "running",
          startedAt: event.timestamp,
          completedAt: null,
        };
        runProjectionBySequence.set(event.sequence, runProjection);
      }
      mutate((tx) => {
        stamp_run(tx, event, eventSignature);
        if (startsRun) {
          tx.replace(["error"], null);
        }
        if (suiteIndex !== undefined) {
          attach_suite_executor(tx, event.suiteId, suiteIndex, event.executorId);
          tx.set(["suiteRuns", suiteIndex, "status"], "running");
          tx.set(["suiteRuns", suiteIndex, "startedAt"], event.timestamp);
          tx.set(["suiteRuns", suiteIndex, "lastSequence"], event.sequence);
          tx.set(["suiteRuns", suiteIndex, "lastEventSignature"], eventSignature);
          if (event.opaque !== undefined) tx.set(["suiteRuns", suiteIndex, "runtime"], event.opaque.runtime);
        }
        if (event.opaque !== undefined) {
          tx.setMany(["externalResults"], { [event.opaque.id]: {
            id: event.opaque.id, suite: event.suiteId, name: event.opaque.name, subject: event.opaque.subject,
            runtime: event.opaque.runtime, executableChecks: event.opaque.executableChecks,
            collections: [...event.opaque.collections], status: "running", ms: 0, stdout: "", stderr: "",
            exitCode: null, signal: null, timedOut: false, spawnError: null,
          } });
        }
      });
      return;
    }

    if (event.t === "case_started") {
      const key = `${event.suiteId}::${event.caseId}`;
      const location = caseRunIndex.get(key);
      let nextState: MutableHostedTestPlannedCaseReport | undefined;
      if (location !== undefined) {
        assign_case_executor(key, event.executorId);
        const current = caseStatuses.get(key) ?? "queued";
        if (transition(current, "running", key)) caseStatuses.set(key, "running");
        const currentState = caseRunStates.get(key)!;
        nextState = {
          ...currentState,
          status: "running",
          startedAt: event.timestamp,
          executorId: event.executorId,
          lastSequence: event.sequence,
          lastEventSignature: eventSignature,
        };
        caseRunStates.set(key, nextState);
      }
      mutate_case((tx) => {
        if (location !== undefined) {
          attach_suite_executor(tx, event.suiteId, location.suiteIndex, event.executorId);
          tx.replace(["suiteRuns", location.suiteIndex, "cases", location.caseIndex], nextState!);
        }
      }, { caseKey: key, phase: "start", stamp: { event, eventSignature } });
      return;
    }

    if (event.t === "case_finished") {
      const key = `${event.suiteId}::${event.caseId}`;
      const location = caseRunIndex.get(key);
      let nextState: MutableHostedTestPlannedCaseReport | undefined;
      const terminalEvidence = JSON.stringify({
        status: event.status,
        durationMs: finite_or_zero(event.durationMs),
        errors: event.error === undefined ? [] : [normalized_error(event.error, event.executorId)],
      });
      if (location !== undefined) {
        assign_case_executor(key, event.executorId);
        const current = caseStatuses.get(key) ?? "queued";
        if (terminal(current)) {
          if (caseTerminalEvidence.get(key) !== terminalEvidence) {
            throw new Error(`TEST_LIFECYCLE_TERMINAL_CONTRADICTION: ${key} received different terminal evidence.`);
          }
          mutate_case(() => undefined, { stamp: { event, eventSignature } });
          return;
        }
        if (transition(current, event.status, key)) {
          caseStatuses.set(key, event.status);
          record_case_terminal(event.suiteId, event.status);
        }
        caseTerminalEvidence.set(key, terminalEvidence);
        const currentState = caseRunStates.get(key)!;
        const durationMs = finite_or_zero(event.durationMs);
        nextState = {
          ...currentState,
          status: event.status,
          completedAt: event.timestamp,
          durationMs,
          ms: durationMs,
          err: event.error?.message ?? null,
          errors: event.error === undefined ? [] : [normalized_error(event.error, event.executorId)],
          executorId: event.executorId,
          lastSequence: event.sequence,
          lastEventSignature: eventSignature,
        };
        caseRunStates.set(key, nextState);
      }
      const counts = canonical_counts(event.suiteId);
      let projectedCase: HostedTestCaseReport | undefined;
      if (event.status === "pass" || event.status === "fail" || event.status === "skip") {
        projectedCase = case_report(
          event as typeof event & Readonly<{ status: "pass" | "fail" | "skip" }>,
          caseTitles.get(key) ?? event.title ?? event.caseId,
        );
        pendingCases.push(projectedCase);
      }
      const projectedBatch = pendingCases.length >= caseBatchSize ? pendingCases : undefined;
      const beforeRev = map.rev;
      try {
        mutate_case((tx) => {
          if (location !== undefined) {
            attach_suite_executor(tx, event.suiteId, location.suiteIndex, event.executorId);
            tx.replace(["suiteRuns", location.suiteIndex, "cases", location.caseIndex], nextState!);
          }
          if (projectedBatch !== undefined) write_case_batch(tx, projectedBatch);
        }, {
          caseKey: key,
          phase: "finish",
          stamp: { event, eventSignature },
          ...(location === undefined ? {} : { counts: { suiteIndex: location.suiteIndex, value: counts } }),
        });
      } catch (error) {
        if (projectedBatch !== undefined && map.rev !== beforeRev) pendingCases = [];
        throw error;
      }
      if (projectedBatch !== undefined) pendingCases = [];
      return;
    }

    if (event.t === "output" || event.t === "artifact") {
      flush_case_lifecycle();
      if (suiteIndex === undefined) {
        mutate((tx) => stamp_run(tx, event, eventSignature));
        return;
      }
      const evidenceIndex = evidenceCounts.get(event.suiteId) ?? 0;
      evidenceCounts.set(event.suiteId, evidenceIndex + 1);
      const evidenceId = `${event.suiteId}:e${event.sequence}`;
      const caseKey = event.caseId === undefined ? undefined : `${event.suiteId}::${event.caseId}`;
      const caseLocation = caseKey === undefined ? undefined : caseRunIndex.get(caseKey);
      if (caseKey !== undefined && caseLocation !== undefined) {
        assign_case_executor(caseKey, event.executorId);
        const current = caseRunStates.get(caseKey)!;
        caseRunStates.set(caseKey, {
          ...current,
          evidenceRefs: [...current.evidenceRefs, evidenceId],
          executorId: event.executorId,
        });
      }
      const kind = event.t === "output" ? event.stream : event.kind;
      const name = event.t === "output" ? event.stream : event.name;
      const content = event.t === "output" ? event.text : event.content;
      mutate((tx) => {
        stamp_run(tx, event, eventSignature);
        tx.splice(["suiteRuns", suiteIndex, "evidence"], evidenceIndex, 0, {
          id: evidenceId, sequence: event.sequence, timestamp: event.timestamp, executorId: event.executorId,
          kind, name, content,
          truncated: event.truncated ?? false, knownBytes: event.knownBytes ?? null,
          reference: event.t === "artifact" ? event.reference ?? null : null,
          mediaType: event.t === "artifact" ? event.mediaType ?? null : null,
        });
        attach_suite_executor(tx, event.suiteId, suiteIndex, event.executorId);
        tx.splice(["suiteRuns", suiteIndex, "evidenceRefs"], evidenceIndex, 0, evidenceId);
        if (caseKey !== undefined && caseLocation !== undefined) {
          const caseEvidenceIndex = caseEvidenceCounts.get(caseKey) ?? 0;
          caseEvidenceCounts.set(caseKey, caseEvidenceIndex + 1);
          tx.splice(
            ["suiteRuns", caseLocation.suiteIndex, "cases", caseLocation.caseIndex, "evidenceRefs"],
            caseEvidenceIndex,
            0,
            evidenceId,
          );
          tx.set(
            ["suiteRuns", caseLocation.suiteIndex, "cases", caseLocation.caseIndex, "executorId"],
            event.executorId,
          );
        }
        tx.set(["suiteRuns", suiteIndex, "lastSequence"], event.sequence);
        tx.set(["suiteRuns", suiteIndex, "lastEventSignature"], eventSignature);
      });
      return;
    }

    if (event.t === "infrastructure_error") {
      flush_case_lifecycle();
      if (event.suiteId === undefined) hasRunInfrastructureError = true;
      mutate((tx) => {
        stamp_run(tx, event, eventSignature);
        if (event.suiteId === undefined) tx.replace(["error"], normalized_error(event.error, event.executorId));
        else append_suite_error(tx, event.suiteId, event.error, event.executorId);
        if (suiteIndex !== undefined) {
          attach_suite_executor(tx, event.suiteId!, suiteIndex, event.executorId);
          tx.set(["suiteRuns", suiteIndex, "lastSequence"], event.sequence);
          tx.set(["suiteRuns", suiteIndex, "lastEventSignature"], eventSignature);
        }
      });
      return;
    }

    if (event.t === "suite_finished") {
      flush_case_lifecycle();
      const finalCounts = event.counts ?? canonical_counts(event.suiteId);
      validate_counts(finalCounts, event.suiteId);
      const terminalEvidence = JSON.stringify({
        status: event.status,
        durationMs: finite_or_zero(event.durationMs),
        counts: finalCounts,
        errors: (event.errors ?? []).map((error) => normalized_error(error, event.executorId)),
      });
      if (suiteIndex !== undefined) {
        const current = suiteStatuses.get(event.suiteId) ?? "queued";
        if (terminal(current)) {
          if (suiteTerminalEvidence.get(event.suiteId) !== terminalEvidence) {
            throw new Error(`TEST_LIFECYCLE_TERMINAL_CONTRADICTION: ${event.suiteId} received different terminal evidence.`);
          }
          mutate((tx) => stamp_run(tx, event, eventSignature));
          return;
        }
        if (transition(current, event.status, event.suiteId)) suiteStatuses.set(event.suiteId, event.status);
        suiteTerminalEvidence.set(event.suiteId, terminalEvidence);
      }
      flush_pending_cases({ suite: event.suiteId, ms: finite_or_zero(event.durationMs) });
      mutate((tx) => {
        stamp_run(tx, event, eventSignature);
        if (suiteIndex !== undefined) {
          attach_suite_executor(tx, event.suiteId, suiteIndex, event.executorId);
          tx.set(["suiteRuns", suiteIndex, "status"], event.status);
          tx.set(["suiteRuns", suiteIndex, "completedAt"], event.timestamp);
          tx.set(["suiteRuns", suiteIndex, "durationMs"], finite_or_zero(event.durationMs));
          tx.set(["suiteRuns", suiteIndex, "ms"], finite_or_zero(event.durationMs));
          tx.set(["suiteRuns", suiteIndex, "counts"], finalCounts);
          for (const error of event.errors ?? []) append_suite_error(tx, event.suiteId, error, event.executorId);
          tx.set(["suiteRuns", suiteIndex, "lastSequence"], event.sequence);
          tx.set(["suiteRuns", suiteIndex, "lastEventSignature"], eventSignature);
        }
        if (event.opaque !== undefined) {
          tx.setMany(["externalResults"], { [event.opaque.id]: {
            id: event.opaque.id, suite: event.suiteId, name: event.opaque.name, subject: event.opaque.subject,
            runtime: event.opaque.runtime, executableChecks: event.opaque.executableChecks,
            collections: [...event.opaque.collections], status: event.status === "cancelled"
              ? "cancelled"
              : event.status === "pass" ? "pass" : "fail",
            ms: finite_or_zero(event.durationMs), stdout: event.opaque.stdout ?? "", stderr: event.opaque.stderr ?? "",
            exitCode: event.opaque.exitCode ?? null, signal: event.opaque.signal ?? null,
            timedOut: event.opaque.timedOut ?? false, spawnError: event.opaque.spawnError ?? null,
          } });
        }
      });
      return;
    }

    if (event.t === "run_finished") {
      flush_case_lifecycle();
      runStatus = event.status === "pass" ? "passed" : event.status === "fail" ? "failed" : "cancelled";
      const completion = pendingCompletion;
      runProjection = {
        ...runProjection,
        completedAt: event.timestamp,
        status: event.status === "pass"
          ? "passed"
          : event.status === "cancelled"
            ? "cancelled"
            : hasRunInfrastructureError ? "error" : "failed",
        ...(completion === undefined ? {} : { timing: completion.timing }),
      };
      runProjectionBySequence.set(event.sequence, runProjection);
      mutate((tx) => {
        stamp_run(tx, event, eventSignature);
        if (completion !== undefined) {
          const plannedCaseStatuses = options.runPlan === undefined ? undefined : [...caseStatuses.values()];
          tx.set(["summary", "cases"], plannedCaseStatuses === undefined
            ? completion.result.summary.cases
            : plannedCaseStatuses.filter((status) => status === "pass" || status === "fail" || status === "skip").length);
          tx.set(["summary", "pass"], plannedCaseStatuses === undefined
            ? completion.result.summary.pass
            : plannedCaseStatuses.filter((status) => status === "pass").length);
          tx.set(["summary", "fail"], plannedCaseStatuses === undefined
            ? completion.result.summary.fail
            : plannedCaseStatuses.filter((status) => status === "fail").length);
          tx.set(["summary", "skip"], plannedCaseStatuses === undefined
            ? completion.result.summary.skip
            : plannedCaseStatuses.filter((status) => status === "skip").length);
        }
      });
      pendingCompletion = undefined;
    }
  }

  function reduce_lifecycle(event: TestLifecycleEvent): void {
    const previousSequence = lastSequence;
    const previousSignature = lastRunSignature;
    const previousRunProjection = runProjection;
    try {
      reduce_lifecycle_unchecked(event);
    } catch (error) {
      if (lastSequence === event.sequence && event.sequence > previousSequence) {
        receipts.delete(event.sequence);
        lastSequence = previousSequence;
        lastRunSignature = previousSignature;
        runProjection = previousRunProjection;
        runProjectionBySequence.delete(event.sequence);
      }
      throw error;
    }
  }

  const adapter = make_test_lifecycle_adapter({
    runId: reportRunId,
    executorId: options.runPlan?.executorId ?? "legacy",
    ...(options.runPlan === undefined ? {} : { runPlan: options.runPlan }),
    initialSequence: lastSequence,
    now,
    emit: reduce_lifecycle,
  });

  return {
    map,
    commits() {
      return Object.freeze([...captured]);
    },
    async settle() {
      flush_case_lifecycle();
      clear_report_flush_timer();
      while (pendingReportOperations.length > 0 || activeMutation !== undefined) {
        start_report_mutation();
        const active = activeMutation;
        if (active !== undefined) await Promise.allSettled([active]);
        if (pendingMutationFailure !== undefined) break;
        clear_report_flush_timer();
      }
      if (pendingMutationFailure !== undefined) throw pendingMutationFailure;
    },
    dispose() {
      if (disposed) return;
      flush_case_lifecycle();
      flush_pending_cases();
      clear_report_flush_timer();
      start_report_mutation();
      disposed = true;
      unsubscribe();
    },
    reduce: adapter.accept,
    reduceLifecycle: reduce_lifecycle,
    complete(result, timing) {
      flush_case_lifecycle();
      flush_pending_cases();
      pendingCompletion = Object.freeze({
        result,
        timing: timing ?? { runnerMs: result.summary.msTotal, hostMs: result.summary.msTotal },
      });
      adapter.finishRun(result.ok ? "pass" : "fail", result.summary.msTotal);
    },
    cancel(result, timing) {
      flush_case_lifecycle();
      flush_pending_cases();
      pendingCompletion = Object.freeze({
        result,
        timing: timing ?? { runnerMs: result.summary.msTotal, hostMs: result.summary.msTotal },
      });
      adapter.cancelRemaining(result.summary.msTotal);
    },
    failInfrastructure(error) {
      flush_case_lifecycle();
      flush_pending_cases();
      adapter.infrastructureError(error);
      adapter.finishRun("fail", 0);
    },
  };
}
