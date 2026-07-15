import { hson } from "hson-live";
import type { LiveMapCommit, LiveMapOp } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { RunResult, TestEvent } from "../../app/demos/test/tests.types";
import type {
  HostedTestCaseReport,
  HostedTestInfrastructureError,
  HostedTestReport,
  HostedTestReportCommit,
  HostedTestReportMap,
} from "./hosted-test-report.types";
import { HOSTED_TEST_SUITE_IDS } from "./hosted-test-suite";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export const HOSTED_TEST_REPORT_SCHEMA = hson.liveMap.schema.define((s) => {
  const nonNegativeInteger = s.refine(
    s.number,
    "non-negative integer",
    (value) => Number.isInteger(value) && value >= 0,
  );
  const finiteNumber = s.refine(s.number, "finite number", Number.isFinite);
  return s.exact({
    run: s.exact({
      suite: s.pick(...HOSTED_TEST_SUITE_IDS),
      status: s.pick("idle", "running", "passed", "failed", "error"),
      startedAt: finiteNumber.nullable,
      completedAt: finiteNumber.nullable,
      timing: s.exact({ runnerMs: finiteNumber, hostMs: finiteNumber }).nullable,
    }),
    summary: s.exact({
      cases: nonNegativeInteger,
      pass: nonNegativeInteger,
      fail: nonNegativeInteger,
      skip: nonNegativeInteger,
    }),
    caseBatches: s.record(s.array(s.exact({
      key: s.string,
      suite: s.string,
      name: s.string,
      status: s.pick("pass", "fail", "skip"),
      ms: finiteNumber,
      err: s.string.nullable,
    }))),
    suites: s.array(s.exact({ suite: s.string, ms: finiteNumber })),
    error: s.exact({ message: s.string }).nullable,
  });
});

function initial_report(suite: HostedTestSuiteId): HostedTestReport {
  return {
    run: {
      suite,
      status: "idle",
      startedAt: null,
      completedAt: null,
      timing: null,
    },
    summary: { cases: 0, pass: 0, fail: 0, skip: 0 },
    caseBatches: {},
    suites: [],
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
    key: `${event.suite}::${event.name}`,
    suite: event.suite,
    name: event.name,
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
  failInfrastructure: (error: unknown) => void;
}>;

export const DEFAULT_HOSTED_TEST_CASE_BATCH_SIZE = 32;

export type HostedTestReportOptions = Readonly<{
  caseBatchSize?: number;
}>;

export function make_hosted_test_report(
  now: () => number = Date.now,
  onCommit?: (commit: HostedTestReportCommit) => void,
  suite: HostedTestSuiteId = "livemap/replay",
  options: HostedTestReportOptions = {},
): HostedTestReportController {
  const caseBatchSize = options.caseBatchSize ?? DEFAULT_HOSTED_TEST_CASE_BATCH_SIZE;
  if (!Number.isInteger(caseBatchSize) || caseBatchSize <= 0) {
    throw new Error("Hosted test report caseBatchSize must be a positive integer.");
  }
  const initialJson = JSON.parse(JSON.stringify(initial_report(suite))) as JsonValue;
  const map = hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA) as HostedTestReportMap;
  const captured: HostedTestReportCommit[] = [];
  const unsubscribe = map.feed([], (event) => {
    const commit = capture_commit(event.commit);
    captured.push(commit);
    onCommit?.(commit);
  });
  let disposed = false;
  let pendingCases: HostedTestCaseReport[] = [];
  let caseBatchId = 0;

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
      map.batch((tx) => {
        if (batch.length > 0) {
          caseBatchId += 1;
          tx.setMany(["caseBatches"], { [caseBatchId.toString().padStart(6, "0")]: batch });
          tx.set(["summary", "cases"], state.summary.cases + batch.length);
          tx.set(["summary", "pass"], state.summary.pass + pass);
          tx.set(["summary", "fail"], state.summary.fail + fail);
          tx.set(["summary", "skip"], state.summary.skip + skip);
        }
        if (suiteEnd !== undefined) tx.splice(["suites"], state.suites.length, 0, suiteEnd);
      });
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
    dispose() {
      if (disposed) return;
      flush_pending_cases();
      disposed = true;
      unsubscribe();
    },
    reduce(event) {
      if (event.t === "suite_begin") {
        if (map.capture().value.run.status !== "idle") return;
        map.batch((tx) => {
          tx.set(["run", "status"], "running");
          tx.set(["run", "startedAt"], finite_time(now));
          tx.set(["run", "completedAt"], null);
          tx.replace(["error"], null);
        });
        return;
      }

      if (event.t === "suite_end") {
        flush_pending_cases({ suite: event.suite, ms: finite_or_zero(event.ms) });
        return;
      }

      if (event.t !== "case_end") return;
      pendingCases.push(case_report(event));
      if (pendingCases.length >= caseBatchSize) flush_pending_cases();
    },
    complete(result, timing) {
      flush_pending_cases();
      map.batch((tx) => {
        tx.set(["summary", "cases"], result.summary.cases);
        tx.set(["summary", "pass"], result.summary.pass);
        tx.set(["summary", "fail"], result.summary.fail);
        tx.set(["summary", "skip"], result.summary.skip);
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], result.ok ? "passed" : "failed");
        tx.replace(["run", "timing"], timing ?? { runnerMs: result.summary.msTotal, hostMs: result.summary.msTotal });
      });
    },
    failInfrastructure(error) {
      flush_pending_cases();
      map.batch((tx) => {
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], "error");
        tx.replace(["error"], infrastructure_error(error));
      });
    },
  };
}
