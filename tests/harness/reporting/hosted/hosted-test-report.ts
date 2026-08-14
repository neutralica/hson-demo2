import { hson } from "hson-live";
import type { LiveMapAnyOp, LiveMapCommit, LiveMapOp } from "hson-live/livemap";
import type { JsonValue, LivePath } from "hson-live/types";
import { TEST_SUBJECT_IDENTIFIERS, type RunResult, type TestEvent } from "../../core/test-contracts";
import type { TestRunPlan } from "../../core/test-run-plan";
import type {
  HostedTestCaseReport,
  HostedTestInfrastructureError,
  HostedTestReport,
  HostedTestReportCommit,
  HostedTestReportMap,
} from "./hosted-test-report.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET, HOSTED_TEST_SUITE_IDS } from "../../hosted/hosted-test-suite";
import type { HostedTestRunTarget } from "../../hosted/hosted-test-suite";

export const HOSTED_TEST_REPORT_SCHEMA = hson.liveMap.schema.define((s) => {
  const nonNegativeInteger = s.number.constrain(
    "non-negative integer",
    (value) => Number.isInteger(value) && value >= 0,
  );
  const finiteNumber = s.number.constrain("finite number", Number.isFinite);
  return s.object.exact({
    run: s.object.exact({
      id: s.string.optional,
      suite: s.pick(...HOSTED_TEST_SUITE_IDS, HOSTED_TEST_SELECTED_RUN_TARGET),
      status: s.pick("idle", "running", "passed", "failed", "error"),
      startedAt: finiteNumber.nullable,
      completedAt: finiteNumber.nullable,
      timing: s.object.exact({ runnerMs: finiteNumber, hostMs: finiteNumber }).nullable,
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
      status: s.pick("queued", "running", "pass", "fail"),
      ms: finiteNumber.nullable,
      cases: s.array(s.object.exact({
        id: s.string,
        caseId: s.string,
        title: s.string,
        order: nonNegativeInteger,
        status: s.pick("queued", "running", "pass", "fail", "skip"),
        ms: finiteNumber.nullable,
        err: s.string.nullable,
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
      status: s.pick("queued", "running", "pass", "fail"),
      ms: finiteNumber,
      stdout: s.string,
      stderr: s.string,
      exitCode: s.number.nullable,
      signal: s.string.nullable,
      timedOut: s.boolean,
      spawnError: s.string.nullable,
    })),
    error: s.object.exact({ message: s.string }).nullable,
  });
});

export function make_initial_hosted_test_report(
  suite: HostedTestRunTarget,
  runId?: string,
  runPlan?: TestRunPlan,
): HostedTestReport {
  return {
    run: {
      ...(runId !== undefined ? { id: runId } : {}),
      suite,
      status: "idle",
      startedAt: null,
      completedAt: null,
      timing: null,
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
      ms: null,
      cases: plannedSuite.cases.map((testCase) => ({
        id: testCase.id,
        caseId: testCase.caseId,
        title: testCase.title,
        order: testCase.order,
        status: "queued",
        ms: null,
        err: null,
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

function infrastructure_error(error: unknown): HostedTestInfrastructureError {
  return { message: error instanceof Error ? error.message : String(error) };
}

function case_report(event: Extract<TestEvent, { t: "case_end" }>): HostedTestCaseReport {
  return {
    key: `${event.suite}::${event.caseId}`,
    suite: event.suite,
    caseId: event.caseId, name: event.name,
    status: event.status,
    ms: finite_or_zero(event.ms),
    err: event.err ?? null,
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
  reduce: (event: TestEvent) => void;
  complete: (result: RunResult, timing?: Readonly<{ runnerMs: number; hostMs: number }>) => void;
  settle: () => Promise<void>;
  failInfrastructure: (error: unknown) => void;
}>;

export const DEFAULT_HOSTED_TEST_CASE_BATCH_SIZE = 32;

export type HostedTestReportOptions = Readonly<{
  caseBatchSize?: number;
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
  const initialJson = JSON.parse(JSON.stringify(make_initial_hosted_test_report(suite, options.runId, options.runPlan))) as JsonValue;
  const map = options.map === undefined
    ? hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap
    : options.map;
  const captured: HostedTestReportCommit[] = [];
  const unsubscribe = map.feed([], (event) => {
    const commit = capture_commit(event.commit);
    captured.push(commit);
    onCommit?.(commit);
  });
  let disposed = false;
  const pendingMutations = new Set<Promise<unknown>>();
  let pendingCases: HostedTestCaseReport[] = [];
  let caseBatchId = 0;
  const suiteRunIndex = new Map((options.runPlan?.suites ?? []).map((plannedSuite, index) => [plannedSuite.id, index]));
  const caseRunIndex = new Map((options.runPlan?.suites ?? []).flatMap((plannedSuite, suiteIndex) => (
    plannedSuite.cases.map((testCase, caseIndex) => [testCase.id, { suiteIndex, caseIndex }] as const)
  )));

  function mutate(operation: (draft: HostedTestReportMap) => LiveMapCommit): void {
    if (options.mutate === undefined) {
      operation(map);
      return;
    }
    const pending = options.mutate(operation);
    pendingMutations.add(pending);
    void pending.finally(() => pendingMutations.delete(pending));
  }

  function update_suite_run(suiteId: string, status: "running" | "pass" | "fail", ms?: number): void {
    const index = suiteRunIndex.get(suiteId);
    if (index === undefined) return;
    mutate((draft) => draft.batch((tx) => {
      tx.set(["suiteRuns", index, "status"], status);
      if (ms !== undefined) tx.replace(["suiteRuns", index, "ms"], finite_or_zero(ms));
    }));
  }

  function update_case_run(event: Extract<TestEvent, { t: "case_begin" | "case_end" }>): void {
    const location = caseRunIndex.get(`${event.suite}::${event.caseId}`);
    if (location === undefined) return;
    mutate((draft) => draft.batch((tx) => {
      tx.set(
        ["suiteRuns", location.suiteIndex, "cases", location.caseIndex, "status"],
        event.t === "case_begin" ? "running" : event.status,
      );
      if (event.t === "case_end") {
        tx.replace(["suiteRuns", location.suiteIndex, "cases", location.caseIndex, "ms"], finite_or_zero(event.ms));
        tx.replace(["suiteRuns", location.suiteIndex, "cases", location.caseIndex, "err"], event.err ?? null);
      }
    }));
  }

  function flush_pending_cases(suiteEnd?: Readonly<{ suite: string; ms: number }>): void {
    if (pendingCases.length === 0 && suiteEnd === undefined) return;
    const batch = pendingCases;
    const state = map.capture().value;
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
      mutate((draft) => draft.batch((tx) => {
        if (batch.length > 0) {
          caseBatchId += 1;
          tx.setMany(["caseBatches"], { [caseBatchId.toString().padStart(6, "0")]: batch });
          tx.set(["summary", "cases"], state.summary.cases + batch.length);
          tx.set(["summary", "pass"], state.summary.pass + pass);
          tx.set(["summary", "fail"], state.summary.fail + fail);
          tx.set(["summary", "skip"], state.summary.skip + skip);
        }
        if (suiteEnd !== undefined) tx.splice(["suites"], state.suites.length, 0, suiteEnd);
      }));
      pendingCases = [];
    } catch (error) {
      if (map.rev !== beforeRev) pendingCases = [];
      throw error;
    }
  }

  return {
    map,
    commits() {
      return Object.freeze([...captured]);
    },
    async settle() {
      while (pendingMutations.size > 0) await Promise.all([...pendingMutations]);
    },
    dispose() {
      if (disposed) return;
      flush_pending_cases();
      disposed = true;
      unsubscribe();
    },
    reduce(event) {
      if (event.t === "suite_begin") {
        update_suite_run(event.suite, "running");
        if (map.capture().value.run.status !== "idle") return;
        mutate((draft) => draft.batch((tx) => {
          tx.set(["run", "status"], "running");
          tx.set(["run", "startedAt"], finite_time(now));
          tx.set(["run", "completedAt"], null);
          tx.replace(["error"], null);
        }));
        return;
      }

      if (event.t === "suite_end") {
        const suiteIndex = suiteRunIndex.get(event.suite);
        const suiteRun = suiteIndex === undefined ? undefined : map.capture().value.suiteRuns[suiteIndex];
        if (suiteRun?.executionShape === "cases") {
          update_suite_run(event.suite, suiteRun.cases.some((testCase) => testCase.status === "fail") ? "fail" : "pass", event.ms);
        }
        flush_pending_cases({ suite: event.suite, ms: finite_or_zero(event.ms) });
        return;
      }

      if (event.t === "external_end") {
        update_suite_run(event.suite, event.status, event.ms);
        flush_pending_cases();
        mutate((draft) => draft.setMany(["externalResults"], {
          [event.id]: {
            id: event.id,
            suite: event.suite,
            name: event.name,
            subject: event.subject,
            runtime: event.runtime,
            executableChecks: event.executableChecks,
            collections: [...event.collections],
            status: event.status,
            ms: finite_or_zero(event.ms),
            stdout: event.stdout,
            stderr: event.stderr,
            exitCode: event.exitCode,
            signal: event.signal,
            timedOut: event.timedOut,
            spawnError: event.spawnError ?? null,
          },
        }));
        return;
      }

      if (event.t === "external_state") {
        if (event.status === "running") update_suite_run(event.suite, "running");
        flush_pending_cases();
        mutate((draft) => draft.setMany(["externalResults"], {
          [event.id]: {
            id: event.id,
            suite: event.suite,
            name: event.name,
            subject: event.subject,
            runtime: event.runtime,
            executableChecks: event.executableChecks,
            collections: [...event.collections],
            status: event.status,
            ms: 0,
            stdout: "",
            stderr: "",
            exitCode: null,
            signal: null,
            timedOut: false,
            spawnError: null,
          },
        }));
        return;
      }

      if (event.t === "case_begin") {
        update_case_run(event);
        return;
      }
      if (event.t !== "case_end") return;
      update_case_run(event);
      pendingCases.push(case_report(event));
      if (pendingCases.length >= caseBatchSize) flush_pending_cases();
    },
    complete(result, timing) {
      flush_pending_cases();
      mutate((draft) => draft.batch((tx) => {
        tx.set(["summary", "cases"], result.summary.cases);
        tx.set(["summary", "pass"], result.summary.pass);
        tx.set(["summary", "fail"], result.summary.fail);
        tx.set(["summary", "skip"], result.summary.skip);
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], result.ok ? "passed" : "failed");
        tx.replace(["run", "timing"], timing ?? { runnerMs: result.summary.msTotal, hostMs: result.summary.msTotal });
      }));
    },
    failInfrastructure(error) {
      flush_pending_cases();
      mutate((draft) => draft.batch((tx) => {
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], "error");
        tx.replace(["error"], infrastructure_error(error));
      }));
    },
  };
}
