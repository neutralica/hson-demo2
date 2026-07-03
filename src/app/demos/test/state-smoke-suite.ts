import {  smoke_store_facade, smoke_store_schema_impl } from "../../state/smoke-tests/smoke-test-1";
import { smoke_log_schema, smoke_state_graph_projection, smoke_demo_state_graph_projection } from "../../state/smoke-tests/smoke-test-2";
import  { StateSmokeError } from "../../state/smoke-tests/state-smoke-runner";
import type { StateSmokeResult, StateSmokeRow } from "../../state/state.types";
import type { TestAssertRow, RunCaseRet, TestCase, TestSuite } from "./tests.types";

type StateSmokeEntry = Readonly<{
  label: string;
  run: () => StateSmokeResult;
}>;

type TestErrorWithRows = Error & {
  assertRows?: readonly TestAssertRow[];
  metaPatch?: Record<string, string>;
};

const STATE_SMOKE_ENTRIES: readonly StateSmokeEntry[] = [
  { label: "store facade", run: smoke_store_facade },
  { label: "demo store schema", run: smoke_store_schema_impl },
  { label: "log store", run: smoke_log_schema },
  { label: "graph projection", run: smoke_state_graph_projection },
  { label: "demo state graph", run: smoke_demo_state_graph_projection },
];

function smokeValueToString(value: unknown): string {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stateSmokeRowToAssertRow(row: StateSmokeRow): TestAssertRow {
  const actual = row.actual !== undefined
    ? smokeValueToString(row.actual)
    : row.detail;
  const expected = row.expected !== undefined
    ? smokeValueToString(row.expected)
    : undefined;

  return {
    ok: row.ok,
    label: row.label,
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected } : {}),
  };
}

function stateSmokeRowsToAssertRows(rows: readonly StateSmokeRow[]): readonly TestAssertRow[] {
  return rows.map(stateSmokeRowToAssertRow);
}

function makeMetaPatch(
  label: string,
  status: "pass" | "fail",
  steps: readonly string[],
  rows: readonly StateSmokeRow[],
): Record<string, string> {
  const failCount = rows.filter((row) => !row.ok).length;

  return {
    kind: "state smoke",
    label,
    status,
    steps: String(steps.length),
    rows: String(rows.length),
    failures: String(failCount),
  };
}

function throwSmokeAsTestError(label: string, err: StateSmokeError): never {
  const out = new Error(err.message) as TestErrorWithRows;

  out.name = err.name;
  if (err.stack !== undefined) out.stack = err.stack;
  out.assertRows = stateSmokeRowsToAssertRows(err.rows);
  out.metaPatch = makeMetaPatch(label, "fail", err.steps, err.rows);

  throw out;
}

function runSmokeAsTestCase(entry: StateSmokeEntry): RunCaseRet {
  try {
    const result = entry.run();

    return {
      assertRows: stateSmokeRowsToAssertRows(result.rows),
      metaPatch: makeMetaPatch(entry.label, "pass", result.steps, result.rows),
    };
  } catch (err) {
    if (err instanceof StateSmokeError) {
      throwSmokeAsTestError(entry.label, err);
    }

    throw err;
  }
}

function makeStateSmokeCase(entry: StateSmokeEntry): TestCase {
  return {
    suite: "state/smoke",
    name: entry.label,
    run: () => runSmokeAsTestCase(entry),
  };
}

export function make_state_smoke_suite(): TestSuite {
  return {
    suite: "state/smoke",
    cases: STATE_SMOKE_ENTRIES.map(makeStateSmokeCase),
  };
}