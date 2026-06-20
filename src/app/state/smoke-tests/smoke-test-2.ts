import type { JsonValue } from "hson-live/types";
import { create_test_log } from "../../phases/phase-3-demo/demo-test/test-logger";
import type { StateSmokeResult } from "../state.types";
import { state_smoke_test } from "./state-smoke-runner";

type TestLogSummary = {
  suites: number;
  cases: number;
  pass: number;
  fail: number;
  skip: number;
  msTotal: number;
};

type TestLogSnapshot = {
  summary: TestLogSummary;
  failures: readonly JsonValue[];
  lastLine: string;
};

type DynamicTestLog = {
  onEvent?: (event: JsonValue) => void;
  snapshot?: () => TestLogSnapshot;
  getSummary?: () => TestLogSummary;
  listFailures?: () => readonly JsonValue[];
  getLastLine?: () => string;
};

function asDynamicTestLog(value: unknown): DynamicTestLog {
  return value as DynamicTestLog;
}

function sendLogEvent(log: DynamicTestLog, event: JsonValue): void {
  if (typeof log.onEvent !== "function") {
    throw new Error("test log does not expose onEvent(event)");
  }

  log.onEvent(event);
}

function readLogSummary(log: DynamicTestLog): TestLogSummary {
  if (typeof log.getSummary === "function") return log.getSummary();
  if (typeof log.snapshot === "function") return log.snapshot().summary;

  throw new Error("test log does not expose getSummary() or snapshot()");
}

function readLogFailures(log: DynamicTestLog): readonly JsonValue[] {
  if (typeof log.listFailures === "function") return log.listFailures();
  if (typeof log.snapshot === "function") return log.snapshot().failures;

  throw new Error("test log does not expose listFailures() or snapshot()");
}

function readLastLine(log: DynamicTestLog): string {
  if (typeof log.getLastLine === "function") return log.getLastLine();
  if (typeof log.snapshot === "function") return log.snapshot().lastLine;

  throw new Error("test log does not expose getLastLine() or snapshot()");
}

function passLogEvents(log: DynamicTestLog): void {
  sendLogEvent(log, { t: "suite_begin", suite: "demo", total: 1 });
  sendLogEvent(log, { t: "case_begin", suite: "demo", name: "passes" });
  sendLogEvent(log, { t: "case_end", suite: "demo", name: "passes", status: "pass", ms: 4 });
  sendLogEvent(log, { t: "suite_end", suite: "demo", ms: 4 });
}

function failLogEvents(log: DynamicTestLog): void {
  sendLogEvent(log, { t: "suite_begin", suite: "demo", total: 1 });
  sendLogEvent(log, { t: "case_begin", suite: "demo", name: "fails" });
  sendLogEvent(log, {
    t: "case_end",
    suite: "demo",
    name: "fails",
    status: "fail",
    err: "expected failure",
    meta: { source: "smoke" },
    ms: 7,
  });
  sendLogEvent(log, { t: "suite_end", suite: "demo", ms: 7 });
}

export function smoke_log_schema(): StateSmokeResult {
  return state_smoke_test("test log store schema", (t) => {
    t.step("test log records passing event flow", () => {
      const log = asDynamicTestLog(create_test_log());

      passLogEvents(log);

      const summary = readLogSummary(log);

      t.eq("summary suites", summary.suites as JsonValue, 1);
      t.eq("summary cases", summary.cases as JsonValue, 1);
      t.eq("summary pass", summary.pass as JsonValue, 1);
      t.eq("summary fail", summary.fail as JsonValue, 0);
      t.ok("last line is present", readLastLine(log).length > 0);
    });

    t.step("test log records failing event flow", () => {
      const log = asDynamicTestLog(create_test_log());

      failLogEvents(log);

      const summary = readLogSummary(log);
      const failures = readLogFailures(log);

      t.eq("summary suites", summary.suites as JsonValue, 1);
      t.eq("summary cases", summary.cases as JsonValue, 1);
      t.eq("summary pass", summary.pass as JsonValue, 0);
      t.eq("summary fail", summary.fail as JsonValue, 1);
      t.eq("failure count", failures.length as JsonValue, 1);
    });

  });
}