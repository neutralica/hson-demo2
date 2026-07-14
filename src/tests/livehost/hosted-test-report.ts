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

export const HOSTED_TEST_REPORT_SCHEMA = hson.liveMap.schema.define((s) => {
  const nonNegativeInteger = s.refine(
    s.number,
    "non-negative integer",
    (value) => Number.isInteger(value) && value >= 0,
  );
  const finiteNumber = s.refine(s.number, "finite number", Number.isFinite);
  return s.exact({
    run: s.exact({
      suite: s.literal("livemap/replay"),
      status: s.pick("idle", "running", "passed", "failed", "error"),
      startedAt: finiteNumber.nullable,
      completedAt: finiteNumber.nullable,
    }),
    summary: s.exact({
      cases: nonNegativeInteger,
      pass: nonNegativeInteger,
      fail: nonNegativeInteger,
      skip: nonNegativeInteger,
    }),
    cases: s.array(s.exact({
      key: s.string,
      suite: s.string,
      name: s.string,
      status: s.pick("pass", "fail", "skip"),
      ms: finiteNumber,
      err: s.string.nullable,
    })),
    error: s.exact({ message: s.string }).nullable,
  });
});

const INITIAL_REPORT: HostedTestReport = {
  run: {
    suite: "livemap/replay",
    status: "idle",
    startedAt: null,
    completedAt: null,
  },
  summary: { cases: 0, pass: 0, fail: 0, skip: 0 },
  cases: [],
  error: null,
};

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
  complete: (result: RunResult) => void;
  failInfrastructure: (error: unknown) => void;
}>;

export function make_hosted_test_report(
  now: () => number = Date.now,
  onCommit?: (commit: HostedTestReportCommit) => void,
): HostedTestReportController {
  const initialJson = JSON.parse(JSON.stringify(INITIAL_REPORT)) as JsonValue;
  const map = hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA) as HostedTestReportMap;
  const captured: HostedTestReportCommit[] = [];
  const unsubscribe = map.feed([], (event) => {
    const commit = capture_commit(event.commit);
    captured.push(commit);
    onCommit?.(commit);
  });
  let disposed = false;

  return {
    map,
    commits() {
      return Object.freeze([...captured]);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
    },
    reduce(event) {
      if (event.t === "suite_begin") {
        map.batch((tx) => {
          tx.set(["run", "status"], "running");
          tx.set(["run", "startedAt"], finite_time(now));
          tx.set(["run", "completedAt"], null);
          tx.replace(["error"], null);
        });
        return;
      }

      if (event.t !== "case_end") return;
      const state = map.capture().value;
      const count = state.summary[event.status];
      const cases = state.summary.cases;
      map.batch((tx) => {
        tx.splice(["cases"], state.cases.length, 0, case_report(event));
        tx.set(["summary", "cases"], cases + 1);
        tx.set(["summary", event.status], count + 1);
      });
    },
    complete(result) {
      map.batch((tx) => {
        tx.set(["summary", "cases"], result.summary.cases);
        tx.set(["summary", "pass"], result.summary.pass);
        tx.set(["summary", "fail"], result.summary.fail);
        tx.set(["summary", "skip"], result.summary.skip);
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], result.ok ? "passed" : "failed");
      });
    },
    failInfrastructure(error) {
      map.batch((tx) => {
        tx.set(["run", "completedAt"], finite_time(now));
        tx.set(["run", "status"], "error");
        tx.replace(["error"], infrastructure_error(error));
      });
    },
  };
}
