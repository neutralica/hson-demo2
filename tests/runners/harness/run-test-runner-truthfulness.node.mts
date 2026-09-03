import assert from "node:assert/strict";
import { TestRecorder } from "../../harness/reporting/test-recorder";
import type { TestEvent, TestSuite } from "../../harness/core/test-contracts";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import {
  DEFAULT_TEST_CASE_TIMEOUT_MS,
  TEST_FAILURE_DETAIL_LIMIT,
  run_test_suites,
} from "../../harness/core/test-runner";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { TestExecutorDescriptor } from "../../../src/shared/testing/test-executor-contract";
import {
  selected_test_suites,
  SelectedTestDuplicateIdError,
  SelectedTestResolutionError,
} from "../../harness/core/test-selected-run";

const executor: TestExecutorDescriptor = Object.freeze({
  id: "runner-truthfulness",
  kind: "node",
  label: "Runner truthfulness fixture",
  location: "local",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node", "synthetic-dom"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
});

function suite(
  id: string,
  cases: TestSuite["cases"],
  options: Readonly<Pick<TestSuite, "setup" | "timeoutMs">> = {},
): TestSuite {
  return Object.freeze({
    suite: id,
    descriptor: Object.freeze({
      subject: "transform",
      collections: Object.freeze(["dev"] as const),
      requirements: Object.freeze(["javascript"] as const),
    }),
    ...options,
    cases: Object.freeze(cases),
  });
}

async function run(
  suites: readonly TestSuite[],
  options: Parameters<typeof run_test_suites>[2] = {},
): Promise<Readonly<{ result: Awaited<ReturnType<typeof run_test_suites>>; events: readonly TestEvent[] }>> {
  const events: TestEvent[] = [];
  const result = await run_test_suites(suites, (event) => events.push(event), {
    yieldEveryCases: 0,
    yieldBetweenSuites: false,
    ...options,
  });
  return Object.freeze({ result, events: Object.freeze(events) });
}

function terminal(events: readonly TestEvent[]): Extract<TestEvent, { t: "case_end" }>[] {
  return events.filter((event): event is Extract<TestEvent, { t: "case_end" }> => event.t === "case_end");
}

let checks = 0;
function check(name: string, body: () => void): void {
  body();
  checks += 1;
  process.stdout.write(`ok ${checks} - ${name}\n`);
}
async function check_async(name: string, body: () => Promise<void>): Promise<void> {
  await body();
  checks += 1;
  process.stdout.write(`ok ${checks} - ${name}\n`);
}

await check_async("synchronous pass produces one terminal result", async () => {
  const observed = await run([suite("runner/sync-pass", [
    Object.freeze({ suite: "runner/sync-pass", caseId: "pass", name: "pass", run() {} }),
  ])]);
  assert.equal(observed.result.ok, true);
  assert.equal(terminal(observed.events).length, 1);
});

await check_async("synchronous throw is a bounded failure", async () => {
  const hostile = "x".repeat(TEST_FAILURE_DETAIL_LIMIT * 2);
  const observed = await run([suite("runner/sync-throw", [
    Object.freeze({ suite: "runner/sync-throw", caseId: "throw", name: "throw", run() { throw new Error(hostile); } }),
  ])]);
  assert.equal(observed.result.ok, false);
  assert.match(observed.result.failures[0]?.err ?? "", /TEST_FAILURE_DETAIL_TRUNCATED/);
  assert.ok((observed.result.failures[0]?.err.length ?? Infinity) <= TEST_FAILURE_DETAIL_LIMIT);
});

await check_async("resolved promise is awaited", async () => {
  let settled = false;
  const observed = await run([suite("runner/resolve", [
    Object.freeze({
      suite: "runner/resolve",
      caseId: "resolve", name: "resolve",
      async run() { await Promise.resolve(); settled = true; },
    }),
  ])]);
  assert.equal(settled, true);
  assert.equal(observed.result.ok, true);
});

await check_async("rejected promise is reported", async () => {
  const observed = await run([suite("runner/reject", [
    Object.freeze({
      suite: "runner/reject",
      caseId: "reject", name: "reject",
      run: () => Promise.reject(new Error("returned rejection")),
    }),
  ])]);
  assert.equal(observed.result.ok, false);
  assert.match(observed.result.failures[0]?.err ?? "", /returned rejection/);
});

await check_async("never-settling promise times out", async () => {
  const observed = await run([suite("runner/timeout", [
    Object.freeze({
      suite: "runner/timeout",
      caseId: "never", name: "never",
      timeoutMs: 20,
      run: () => new Promise<void>(() => undefined),
    }),
  ])]);
  assert.equal(observed.result.ok, false);
  assert.match(observed.result.failures[0]?.err ?? "", /\[TEST_CASE_TIMEOUT\].*20ms/);
});

await check_async("late resolve cannot replace the timeout terminal", async () => {
  let resolveLate = (): void => undefined;
  const events: TestEvent[] = [];
  const result = await run_test_suites([suite("runner/late-resolve", [
    Object.freeze({
      suite: "runner/late-resolve",
      caseId: "late", name: "late",
      timeoutMs: 20,
      run: () => new Promise<void>((resolve) => { resolveLate = resolve; }),
    }),
  ])], (event) => events.push(event), { yieldEveryCases: 0, yieldBetweenSuites: false });
  resolveLate();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(result.ok, false);
  assert.equal(terminal(events).length, 1);
  assert.equal(terminal(events)[0]?.status, "fail");
});

await check_async("late rejection is handled and cannot duplicate completion", async () => {
  let rejectLate = (_error: Error): void => undefined;
  let unhandled = 0;
  const observe = (): void => { unhandled += 1; };
  process.on("unhandledRejection", observe);
  try {
    const events: TestEvent[] = [];
    const result = await run_test_suites([suite("runner/late-reject", [
      Object.freeze({
        suite: "runner/late-reject",
        caseId: "late", name: "late",
        timeoutMs: 20,
        run: () => new Promise<void>((_resolve, reject) => { rejectLate = reject; }),
      }),
    ])], (event) => events.push(event), { yieldEveryCases: 0, yieldBetweenSuites: false });
    rejectLate(new Error("late rejection"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(result.ok, false);
    assert.equal(terminal(events).length, 1);
    assert.equal(unhandled, 0);
  } finally {
    process.removeListener("unhandledRejection", observe);
  }
});

await check_async("a case following timeout still executes", async () => {
  let followed = false;
  const observed = await run([suite("runner/timeout-followed", [
    Object.freeze({
      suite: "runner/timeout-followed",
      caseId: "timeout", name: "timeout",
      timeoutMs: 20,
      run: () => new Promise<void>(() => undefined),
    }),
    Object.freeze({
      suite: "runner/timeout-followed",
      caseId: "followed", name: "followed",
      run() { followed = true; },
    }),
  ])]);
  assert.equal(followed, true);
  assert.deepEqual(terminal(observed.events).map((event) => event.status), ["fail", "pass"]);
});

await check_async("suite setup failure explicitly fails every selected case", async () => {
  let caseRuns = 0;
  const observed = await run([suite("runner/setup", [
    Object.freeze({ suite: "runner/setup", caseId: "one", name: "one", run() { caseRuns += 1; } }),
    Object.freeze({ suite: "runner/setup", caseId: "two", name: "two", run() { caseRuns += 1; } }),
  ], { setup() { throw new Error("setup broke"); } })]);
  assert.equal(caseRuns, 0);
  assert.deepEqual(terminal(observed.events).map((event) => event.status), ["fail", "fail"]);
  assert.ok(terminal(observed.events).every((event) => event.err?.includes("TEST_SUITE_SETUP_FAILED")));
});

await check_async("cleanup failure replaces a would-be pass", async () => {
  const observed = await run([suite("runner/cleanup-fail", [
    Object.freeze({
      suite: "runner/cleanup-fail",
      caseId: "cleanup", name: "cleanup",
      run() {},
      cleanup() { throw new Error("cleanup broke"); },
    }),
    Object.freeze({
      suite: "runner/cleanup-fail",
      caseId: "expected-failure-still-exposes-cleanup", name: "expected failure still exposes cleanup",
      expected: "fail",
      run() { throw new Error("expected body failure"); },
      cleanup() { throw new Error("cleanup also broke"); },
    }),
  ])]);
  assert.equal(observed.result.ok, false);
  assert.equal(observed.result.totals.fail, 2);
  assert.ok(observed.result.failures.every((failure) => failure.err.includes("TEST_CASE_CLEANUP_FAILED")));
});

await check_async("cleanup runs after timeout", async () => {
  let cleaned = false;
  const observed = await run([suite("runner/cleanup-timeout", [
    Object.freeze({
      suite: "runner/cleanup-timeout",
      caseId: "cleanup", name: "cleanup",
      timeoutMs: 20,
      run: () => new Promise<void>(() => undefined),
      cleanup() { cleaned = true; },
    }),
  ])]);
  assert.equal(cleaned, true);
  assert.match(observed.result.failures[0]?.err ?? "", /TEST_CASE_TIMEOUT/);
});

await check_async("invalid timeout values reject before execution", async () => {
  for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    let ran = false;
    await assert.rejects(
      run_test_suites([suite("runner/invalid-timeout", [
        Object.freeze({ suite: "runner/invalid-timeout", caseId: "invalid-timeout", name: String(timeoutMs), timeoutMs, run() { ran = true; } }),
      ])], () => undefined),
      /TEST_RUNNER_INVALID_TIMEOUT/,
    );
    assert.equal(ran, false);
  }
  await assert.rejects(
    run_test_suites([suite("runner/invalid-run-timeout", [
      Object.freeze({ suite: "runner/invalid-run-timeout", caseId: "case", name: "case", run() {} }),
    ])], () => undefined, { caseTimeoutMs: Number.POSITIVE_INFINITY }),
    /TEST_RUNNER_INVALID_TIMEOUT/,
  );
  assert.equal(DEFAULT_TEST_CASE_TIMEOUT_MS, 30_000);
});

await check_async("exact selection retains original identity and suite setup", async () => {
  let setupRuns = 0;
  const original = suite("runner/selection", [
    Object.freeze({ suite: "runner/selection", caseId: "a", name: "a", run() {} }),
    Object.freeze({ suite: "runner/selection", caseId: "b", name: "b", run() {} }),
  ], { setup() { setupRuns += 1; } });
  const registry = make_test_executor_registry(executor, [original]);
  const selected = selected_test_suites(registry, ["runner/selection::b"]);
  const observed = await run(selected);
  assert.deepEqual(terminal(observed.events).map((event) => `${event.suite}::${event.caseId}`), ["runner/selection::b"]);
  assert.equal(setupRuns, 1);
});

check("unknown selection fails explicitly", () => {
  const registry = make_test_executor_registry(executor, [suite("runner/unknown", [
    Object.freeze({ suite: "runner/unknown", caseId: "known", name: "known", run() {} }),
  ])]);
  assert.throws(
    () => selected_test_suites(registry, ["runner/unknown::missing"]),
    (error) => error instanceof SelectedTestResolutionError,
  );
});

check("duplicate direct selection rejects before execution", () => {
  let executions = 0;
  const registry = make_test_executor_registry(executor, [suite("runner/duplicate", [
    Object.freeze({ suite: "runner/duplicate", caseId: "only", name: "only", run() { executions += 1; } }),
  ])]);
  assert.throws(
    () => selected_test_suites(registry, ["runner/duplicate::only", "runner/duplicate::only"]),
    (error) => error instanceof SelectedTestDuplicateIdError,
  );
  assert.equal(executions, 0);
});

await check_async("streamed and terminal counts reconcile", async () => {
  const observed = await run([suite("runner/reconcile", [
    Object.freeze({ suite: "runner/reconcile", caseId: "pass", name: "pass", run() {} }),
    Object.freeze({ suite: "runner/reconcile", caseId: "fail", name: "fail", run() { throw new Error("no"); } }),
  ])]);
  const ends = terminal(observed.events);
  assert.equal(ends.length, observed.result.totals.cases);
  assert.equal(ends.filter((event) => event.status === "pass").length, observed.result.totals.pass);
  assert.equal(ends.filter((event) => event.status === "fail").length, observed.result.totals.fail);
});

await check_async("abort during active work settles after cleanup as cancellation", async () => {
  const abort = new AbortController();
  let cleaned = false;
  const running = run([suite("runner/abort", [
    Object.freeze({
      suite: "runner/abort",
      caseId: "active", name: "active",
      run: () => new Promise<void>(() => undefined),
      cleanup() { cleaned = true; },
    }),
  ])], { signal: abort.signal });
  setTimeout(() => abort.abort(), 20);
  const observed = await running;
  assert.equal(cleaned, true);
  assert.equal(observed.result.ok, false);
  assert.equal(observed.result.cancelled, true);
  assert.equal(observed.result.failures.length, 0);
  assert.equal(observed.events.some((event) => event.t === "case_cancelled" && event.caseId === "active"), true);
});

await check_async("synthetic DOM globals restore after a failed case", async () => {
  const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, "document");
  const originalDocument = globalThis.document;
  await with_hosted_dom_runtime(async () => {
    const observed = await run([suite("runner/dom-cleanup", [
      Object.freeze({
        suite: "runner/dom-cleanup",
        caseId: "fails", name: "fails",
        run() {
          assert.ok(globalThis.document);
          globalThis.document.body.innerHTML = "<main>temporary</main>";
          throw new Error("DOM failure");
        },
      }),
    ])]);
    assert.equal(observed.result.ok, false);
  });
  assert.equal(Object.prototype.hasOwnProperty.call(globalThis, "document"), hadDocument);
  assert.equal(globalThis.document, originalDocument);
});

check("recorder rejects duplicate or incomplete terminal accounting", () => {
  const recorder = new TestRecorder();
  recorder.ingest({ t: "case_begin", suite: "runner/recorder", caseId: "case", name: "case" });
  assert.throws(
    () => recorder.ingest({ t: "case_begin", suite: "runner/recorder", caseId: "case", name: "case" }),
    /TEST_RECORDER_DUPLICATE_CASE_BEGIN/,
  );
  assert.throws(() => recorder.result(), /TEST_RECORDER_INCOMPLETE_CASES/);
  recorder.ingest({ t: "case_end", suite: "runner/recorder", caseId: "case", name: "case", status: "pass", ms: 1 });
  assert.throws(
    () => recorder.ingest({ t: "case_end", suite: "runner/recorder", caseId: "case", name: "case", status: "pass", ms: 1 }),
    /TEST_RECORDER_CASE_END_WITHOUT_BEGIN/,
  );
});

check("recorder preserves all six terminal statuses", () => {
  const recorder = new TestRecorder();
  for (const status of ["pass", "fail", "skip", "unsupported", "error"] as const) {
    recorder.ingest({ t: "case_begin", suite: "runner/statuses", caseId: status, name: status });
    recorder.ingest({ t: "case_end", suite: "runner/statuses", caseId: status, name: status, status, ms: 1 });
  }
  recorder.ingest({ t: "case_begin", suite: "runner/statuses", caseId: "cancelled", name: "cancelled" });
  recorder.ingest({ t: "case_cancelled", suite: "runner/statuses", caseId: "cancelled", name: "cancelled", ms: 1 });
  const recorded = recorder.result();
  assert.deepEqual(recorded.totals, {
    suites: 0,
    cases: 6,
    pass: 1,
    fail: 1,
    skip: 1,
    unsupported: 1,
    cancelled: 1,
    error: 1,
  });
});

await check_async("report-stream failure rejects after case cleanup rather than returning green", async () => {
  let cleaned = false;
  await assert.rejects(
    run_test_suites([suite("runner/report-stream", [
      Object.freeze({
        suite: "runner/report-stream",
        caseId: "case", name: "case",
        run() {},
        cleanup() { cleaned = true; },
      }),
    ])], (event) => {
      if (event.t === "case_end") throw new Error("report stream failed");
    }, { yieldEveryCases: 0, yieldBetweenSuites: false }),
    /report stream failed/,
  );
  assert.equal(cleaned, true);
});

assert.equal(checks, 21);
process.stdout.write(`1..${checks}\n`);
