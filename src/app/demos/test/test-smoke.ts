// test-smoke.ts

import { create_test_log, type TestLog } from "./test-logger";
import { run_test_suites } from "./test-runner";
import type { CaseKey, TestAssertRow, TestEvent, TestSuite } from "./tests.types";

type CaseEndEvent = Extract<TestEvent, { t: "case_end" }>;
type TestEventHandler = ((event: TestEvent) => void) & { clear?: () => void };

function expect_smoke(label: string, condition: unknown): asserts condition {
  if (!condition) throw new Error(`test-smoke: ${label}`);
}

function expect_eq<T>(label: string, got: T, want: T): void {
  if (!Object.is(got, want)) {
    throw new Error(`test-smoke: ${label}: got ${String(got)}, want ${String(want)}`);
  }
}

function has_own(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function case_key(suite: string, name: string): CaseKey {
  return `${suite}::${name}` as CaseKey;
}

function find_case_end(events: readonly TestEvent[], suite: string, name: string): CaseEndEvent {
  const event = events.find((candidate): candidate is CaseEndEvent => (
    candidate.t === "case_end" &&
    candidate.suite === suite &&
    candidate.name === name
  ));

  expect_smoke(`missing case_end for ${suite} :: ${name}`, event !== undefined);
  return event;
}

function expect_initial_log(label: string, log: TestLog, suite: string, name: string): void {
  const summary = log.getSummary();

  expect_eq(`${label} suites`, summary.suites, 0);
  expect_eq(`${label} cases`, summary.cases, 0);
  expect_eq(`${label} pass`, summary.pass, 0);
  expect_eq(`${label} fail`, summary.fail, 0);
  expect_eq(`${label} skip`, summary.skip, 0);
  expect_eq(`${label} failures`, summary.failures.length, 0);
  expect_eq(`${label} active suite`, log.getActiveSuite(), undefined);
  expect_eq(`${label} last line`, log.getLastLine(), "idle");
  expect_eq(`${label} suite list`, log.listSuites().length, 0);
  expect_eq(`${label} case list`, log.listCases(suite).length, 0);
  expect_eq(`${label} case lookup`, log.getCase(case_key(suite, name)), undefined);
}

function single_case_suite(
  suite: string,
  name: string,
  run: () => void | { assertRows?: readonly TestAssertRow[] },
): TestSuite {
  return {
    suite,
    cases: [
      {
        suite,
        name,
        run,
      },
    ],
  };
}

async function run_smoke_case(
  suite: string,
  name: string,
  assertRows: readonly TestAssertRow[],
): Promise<Readonly<{
  events: readonly TestEvent[];
  log: TestLog;
  caseEnd: CaseEndEvent;
}>> {
  const events: TestEvent[] = [];
  const log = create_test_log();

  await run_test_suites(
    [single_case_suite(suite, name, () => ({ assertRows }))],
    (event) => {
      events.push(event);
      log.onEvent(event);
    },
    { yieldEveryCases: 0, yieldBetweenSuites: false },
  );

  return {
    events,
    log,
    caseEnd: find_case_end(events, suite, name),
  };
}

function smoke_logger_clear_drops_case_state(): void {
  const suite = "test-smoke/logger-clear";
  const name = "clear drops case state";
  const log = create_test_log();

  expect_initial_log("initial logger", log, suite, name);

  log.onEvent({ t: "suite_begin", suite, totalPlanned: 1 });
  log.onEvent({ t: "case_begin", suite, name });
  log.onEvent({ t: "case_end", suite, name, status: "pass", ms: 1 });

  expect_smoke("logger should store case before clear", log.getCase(case_key(suite, name)) !== undefined);

  log.clear();
  expect_initial_log("cleared logger", log, suite, name);
}

async function smoke_runner_clears_logger_on_run_start(): Promise<void> {
  const suite = "test-smoke/runner-clear";
  const name = "runner clears before events";
  const events: TestEvent[] = [];
  let clearCalls = 0;
  let eventsSeenAtClear = -1;

  const onEvent: TestEventHandler = (event) => {
    events.push(event);
  };

  onEvent.clear = () => {
    clearCalls += 1;
    eventsSeenAtClear = events.length;
  };

  await run_test_suites(
    [single_case_suite(suite, name, () => undefined)],
    onEvent,
    { yieldEveryCases: 0, yieldBetweenSuites: false },
  );

  expect_eq("runner clear call count", clearCalls, 1);
  expect_eq("runner clear before event accumulation", eventsSeenAtClear, 0);
  expect_eq("runner first event", events[0]?.t, "suite_begin");
}

async function smoke_passing_case_drops_assert_rows(): Promise<void> {
  const suite = "test-smoke/passing-assert-rows";
  const name = "passing rows are not retained";
  const rows: readonly TestAssertRow[] = [
    { ok: true, label: "passing synthetic assertion" },
  ];

  const { log, caseEnd } = await run_smoke_case(suite, name, rows);
  const stored = log.getCase(case_key(suite, name));

  expect_eq("passing case_end status", caseEnd.status, "pass");
  expect_smoke("passing case_end should not carry assertRows", !has_own(caseEnd, "assertRows"));
  expect_smoke("passing stored case should exist", stored !== undefined);
  expect_smoke("passing stored case should not carry assertRows", stored !== undefined && !has_own(stored, "assertRows"));
}

async function smoke_failing_case_preserves_assert_rows(): Promise<void> {
  const suite = "test-smoke/failing-assert-rows";
  const name = "failing rows are retained";
  const rows: readonly TestAssertRow[] = [
    {
      ok: false,
      label: "failing synthetic assertion",
      actual: "got",
      expected: "want",
    },
  ];

  const { log, caseEnd } = await run_smoke_case(suite, name, rows);
  const stored = log.getCase(case_key(suite, name));

  expect_eq("failing case_end status", caseEnd.status, "fail");
  expect_eq("failing emitted assertRows length", caseEnd.assertRows?.length, 1);
  expect_eq("failing emitted assertRows label", caseEnd.assertRows?.[0]?.label, rows[0]?.label);
  expect_smoke("failing stored case should exist", stored !== undefined);
  expect_eq("failing stored assertRows length", stored?.assertRows?.length, 1);
  expect_eq("failing stored assertRows label", stored?.assertRows?.[0]?.label, rows[0]?.label);
}

export async function smoke_test_harness(): Promise<void> {
  smoke_logger_clear_drops_case_state();
  await smoke_runner_clears_logger_on_run_start();
  await smoke_passing_case_drops_assert_rows();
  await smoke_failing_case_preserves_assert_rows();
}
