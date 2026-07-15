import { hson } from "hson-live";
import type { LiveMapFeedEvent, LiveMapOp } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { RunResult, TestEvent } from "../../app/demos/test/tests.types";
import { create_hosted_test_livehost, type HostedTestRunResult } from "./hosted-replay-action";
import {
  HOSTED_TEST_REPORT_SCHEMA,
  make_hosted_test_report,
  type HostedTestReportController,
} from "./hosted-test-report";
import type { HostedTestReport, HostedTestReportCommit } from "./hosted-test-report.types";
import { hosted_test_report_cases } from "../../app/hosted-test/hosted-test-report.types";

function expect_report(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted test report: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_report(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
}

function has_undefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(has_undefined);
  if (typeof value === "object" && value !== null) return Object.values(value).some(has_undefined);
  return false;
}

function path_equal(left: LivePath, right: LivePath): boolean {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function find_op(commit: HostedTestReportCommit, path: LivePath): LiveMapOp | undefined {
  return commit.ops.find((op) => path_equal(op.path, path));
}

function must_commit(commit: HostedTestReportCommit | undefined, message: string): HostedTestReportCommit {
  expect_report(commit !== undefined, message);
  return commit;
}

function expect_contiguous(commits: readonly HostedTestReportCommit[], initialRev: number): void {
  let previous = initialRev;
  for (const commit of commits) {
    expect_report(commit.changed, `commit ${commit.rev} must be changed`);
    expect_report(commit.ops.length > 0, `commit ${commit.rev} must contain operations`);
    expect_report(commit.prevRev === previous, `commit ${commit.rev} must follow revision ${previous}`);
    expect_report(commit.rev === commit.prevRev + 1, `commit ${commit.rev} must advance exactly once`);
    previous = commit.rev;
  }
}

function replay_commits(
  initialValue: HostedTestReport,
  commits: readonly HostedTestReportCommit[],
): HostedTestReport {
  const value = structuredClone(initialValue) as unknown as JsonValue;
  const replay = hson.liveMap.fromJson(value).schema.use(HOSTED_TEST_REPORT_SCHEMA);
  for (const commit of commits) replay.replay({ prevRev: commit.prevRev, ops: commit.ops });
  return replay.capture().value as HostedTestReport;
}

const passEvent: TestEvent = {
  t: "case_end",
  suite: "livemap/replay",
  name: "round trips a commit",
  status: "pass",
  ms: 2.5,
};
const failEvent: TestEvent = {
  t: "case_end",
  suite: "livemap/replay",
  name: "rejects a stale revision",
  status: "fail",
  ms: Number.POSITIVE_INFINITY,
  err: "expected revision 2",
};
const passingResult: RunResult = {
  ok: true,
  summary: { suites: 1, cases: 1, pass: 1, fail: 0, skip: 0, msTotal: 4, failures: [] },
};

const times = [100, 200];
const report = make_hosted_test_report(() => times.shift() ?? 300, undefined, "livemap/replay", { caseBatchSize: 1 });
const initial = report.map.capture();
expect_report(initial.rev === 1, "JSON object construction has the expected initial revision");
equal(initial.value, {
  run: { suite: "livemap/replay", status: "idle", startedAt: null, completedAt: null, timing: null },
  summary: { cases: 0, pass: 0, fail: 0, skip: 0 },
  caseBatches: {},
  suites: [],
  error: null,
}, "initial shape");
expect_report(!has_undefined(initial.value), "initial state contains no undefined");
expect_report(JSON.parse(JSON.stringify(initial.value)).run.status === "idle", "initial state is JSON-safe");

const feedEvents: LiveMapFeedEvent[] = [];
report.map.feed([], (event) => feedEvents.push(event));
report.reduce({ t: "suite_begin", suite: "livemap/replay", totalPlanned: 2 });
expect_report(report.map.rev === 2, "start consumes one revision");
expect_report(report.map.snap(["run", "status"]) === "running", "start sets running");
expect_report(feedEvents.at(-1)?.commit.ops.length === 2, "start commit contains only changed semantic writes");
expect_report(report.commits().length === 1, "capture begins before start mutation");
const startCommit = must_commit(report.commits()[0], "start commit must exist");
expect_report(startCommit.prevRev === 1 && startCommit.rev === 2, "start capture begins at initial revision");
expect_report(find_op(startCommit, ["run", "status"])?.next === "running", "start commit records running status");
expect_report(find_op(startCommit, ["run", "startedAt"])?.next === 100, "start commit records start time");

report.reduce({ t: "case_begin", suite: "livemap/replay", name: "round trips a commit" });
expect_report(report.map.rev === 2, "ignored case_begin consumes no revision");
report.reduce(passEvent);
expect_report(Number(report.map.rev) === 3, "completed case consumes one revision");
expect_report(feedEvents.at(-1)?.commit.ops.length === 3, "case list and counters share one commit");
expect_report(report.map.snap(["summary", "pass"]) === 1, "pass counter increments");
expect_report(hosted_test_report_cases(report.map.capture().value).length === 1, "case is appended");

const unchanged = report.map.set(["summary", "pass"], 1);
expect_report(!unchanged.changed && Number(report.map.rev) === 3, "unchanged write consumes no revision or feed event");
expect_report(feedEvents.length === 2, "feed emits once per changed semantic batch");
expect_report(report.commits().length === 2, "internal capture ignores unchanged write");
const caseCommit = must_commit(report.commits()[1], "case commit must exist");
expect_report(caseCommit.ops.some((op) => op.kind === "set" && op.path[0] === "caseBatches"), "case commit includes one compact batch record");
expect_report(find_op(caseCommit, ["summary", "cases"])?.next === 1, "case commit increments completed cases");
expect_report(find_op(caseCommit, ["summary", "pass"])?.next === 1, "case commit increments exactly the pass counter");

report.complete(passingResult);
expect_report(Number(report.map.rev) === 4, "terminal update consumes one revision");
expect_report(report.map.snap(["run", "status"]) === "passed", "passing result is terminal passed");
expect_report(report.map.snap(["run", "completedAt"]) === 200, "terminal time is finite");
expect_report(feedEvents.at(-1)?.commit.ops.length === 3, "terminal commit contains completion, status, and timing");
expect_report(report.commits().length === 3, "normal terminal commit is captured");
const terminalCommit = must_commit(report.commits()[2], "terminal commit must exist");
expect_report(find_op(terminalCommit, ["run", "status"])?.next === "passed", "terminal commit records passed status");
expect_report(find_op(terminalCommit, ["run", "completedAt"])?.next === 200, "terminal commit records completion time");
expect_contiguous(report.commits(), initial.rev);
equal(replay_commits(initial.value, report.commits()), report.map.capture().value, "captured commits reconstruct final report");

const retainedStart = must_commit(report.commits()[0], "retained start commit must exist");
const exposed = report.commits();
let exposedMutationRejected = false;
try {
  (exposed as HostedTestReportCommit[]).push(terminalCommit);
} catch {
  exposedMutationRejected = true;
}
expect_report(exposedMutationRejected, "exposed commit snapshot is runtime read-only");
report.dispose();
report.dispose();
const disposedCount = report.commits().length;
report.map.set(["run", "status"], "running");
expect_report(report.commits().length === disposedCount, "idempotent disposal stops later capture");
expect_report(report.commits()[0] === retainedStart, "later report mutation does not rewrite retained history");
expect_report(Object.isFrozen(retainedStart) && Object.isFrozen(retainedStart.ops), "captured envelope and operations are frozen");
expect_report(retainedStart.ops.every((op) => Object.isFrozen(op) && Object.isFrozen(op.path)), "captured operations and paths are frozen");

const detached = make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: 1 });
detached.reduce({ t: "suite_begin", suite: "livemap/replay" });
const mutableEvent: Extract<TestEvent, { t: "case_end" }> = {
  t: "case_end",
  suite: "livemap/replay",
  name: "original name",
  status: "fail",
  ms: 1,
  err: "original error",
};
detached.reduce(mutableEvent);
mutableEvent.name = "mutated name";
mutableEvent.err = "mutated error";
const detachedCaseCommit = must_commit(detached.commits()[1], "detached case commit must exist");
const detachedSet = detachedCaseCommit.ops.find((op) => op.kind === "set" && op.path[0] === "caseBatches");
expect_report(detachedSet?.kind === "set", "detached case capture contains compact batch operation");
const insertedCase = (detachedSet.next as readonly Readonly<{ name?: unknown; err?: unknown }>[] | undefined)?.[0];
expect_report(insertedCase?.name === "original name" && insertedCase.err === "original error", "source event mutation cannot alter captured history");
expect_report(Object.isFrozen(insertedCase), "nested captured JSON values are frozen");

const failed = make_hosted_test_report(() => Number.NaN);
failed.reduce({ t: "suite_begin", suite: "livemap/replay" });
failed.reduce(failEvent);
failed.complete({
  ok: false,
  summary: {
    suites: 1,
    cases: 1,
    pass: 0,
    fail: 1,
    skip: 0,
    msTotal: 1,
    failures: [{ suite: "livemap/replay", name: "rejects a stale revision", err: "expected revision 2", ms: 1 }],
  },
});
expect_report(failed.map.snap(["run", "status"]) === "failed", "normal assertion failure is terminal failed");
expect_report(failed.map.snap(["summary", "fail"]) === 1, "fail counter increments");
expect_report(hosted_test_report_cases(failed.map.capture().value)[0]?.ms === 0, "non-finite case timing is normalized");
expect_report(failed.map.snap(["run", "completedAt"]) === 0, "non-finite terminal timing is normalized");
expect_report(failed.map.snap(["error"]) === null, "normal assertion failure is not infrastructure error");

const errored = make_hosted_test_report(() => 10);
errored.reduce({ t: "suite_begin", suite: "livemap/replay" });
errored.failInfrastructure(new Error("runner exploded"));
expect_report(errored.map.snap(["run", "status"]) === "error", "infrastructure exception is terminal error");
equal(errored.map.snap(["error"]), { message: "runner exploded" }, "infrastructure error is normalized");
expect_report(errored.commits().length === 2, "infrastructure terminal commit follows earlier start commit");
expect_report(find_op(must_commit(errored.commits()[1], "error commit must exist"), ["run", "status"])?.next === "error", "infrastructure terminal commit records error status");

function reduce_sequence(): HostedTestReport {
  const target = make_hosted_test_report(() => 1);
  target.reduce({ t: "suite_begin", suite: "livemap/replay" });
  target.reduce(passEvent);
  target.complete(passingResult);
  return target.map.capture().value;
}
equal(reduce_sequence(), reduce_sequence(), "same events produce deterministic state");

let realRun: HostedTestReportController | undefined;
const response = await create_hosted_test_livehost(undefined, (run) => {
  realRun = run;
}).dispatch_action({
  type: "action",
  id: "hosted-report-real-run",
  name: "tests.run",
  payload: { suite: "livemap/replay" },
});
expect_report(response.type === "ack", "real hosted replay action resolves with ack");
expect_report(response.type === "ack" && typeof response.result === "object" && response.result !== null, "action result stays an object");
expect_report(response.type === "ack" && Object.keys(response.result as object).sort().join(",") === "ok,runId,suite,summary,timing", "action result includes authoritative host timing");
expect_report(realRun !== undefined, "host exposes the per-action report run through the inspection seam");
expect_report(realRun.map.snap(["run", "status"]) === "passed", "real replay report is terminal passed");
expect_report(realRun.map.snap(["summary", "cases"]) === 45, "real replay report contains 45 completed cases");
expect_report(realRun.map.snap(["summary", "fail"]) === 0, "real replay report has zero failures");
expect_report(
  response.type === "ack"
    && realRun.map.snap(["summary", "cases"]) === (response.result as unknown as HostedTestRunResult).summary.cases,
  "report summary agrees with action result",
);
expect_report(realRun.map.rev === 5, "real run revision is initial + start + two case batches + terminal");
const realCommits = realRun.commits();
expect_report(realCommits.length === 4, "real run captures start + two case batches + terminal");
expect_report(realCommits[0]?.prevRev === 1 && realCommits[0].rev === 2, "real capture starts at revisions 1 to 2");
expect_report(realCommits.at(-1)?.prevRev === 4 && realCommits.at(-1)?.rev === 5, "real capture ends at revisions 4 to 5");
expect_contiguous(realCommits, 1);
for (const commit of realCommits.slice(1, -1)) {
  expect_report(commit.ops.filter((op) => op.kind === "set" && op.path[0] === "caseBatches").length === 1, `case revision ${commit.rev} has one compact batch append`);
  expect_report(find_op(commit, ["summary", "cases"]) !== undefined, `case revision ${commit.rev} increments cases`);
  const statusCounters = ["pass", "fail", "skip"].filter((status) => find_op(commit, ["summary", status]) !== undefined);
  expect_report(statusCounters.length === 1, `case revision ${commit.rev} increments exactly one status counter`);
}
equal(replay_commits(initial.value, realCommits), realRun.map.capture().value, "real captured history reconstructs authoritative final report");
expect_report(!has_undefined(realRun.map.capture().value), "terminal real report contains no undefined");
const realDisposedCount = realRun.commits().length;
realRun.map.set(["run", "status"], "running");
expect_report(realRun.commits().length === realDisposedCount, "normal hosted path disposes capture after terminal commit");
expect_report(typeof document === "undefined" && typeof window === "undefined", "report path remains Node-safe");

let thrownRun: HostedTestReportController | undefined;
const thrownResponse = await create_hosted_test_livehost(async (onEvent) => {
  onEvent?.({ t: "suite_begin", suite: "livemap/replay" });
  throw new Error("hosted runner exploded");
}, (run) => {
  thrownRun = run;
}).dispatch_action({
  type: "action",
  id: "hosted-report-runner-throws",
  name: "tests.run",
  payload: { suite: "livemap/replay" },
});
expect_report(thrownResponse.type === "error", "hosted infrastructure exception preserves action-error semantics");
expect_report(thrownRun?.map.snap(["run", "status"]) === "error", "hosted infrastructure exception leaves a terminal error report");
equal(thrownRun?.map.snap(["error"]), { message: "hosted runner exploded" }, "hosted infrastructure error is durable");
expect_report(thrownRun?.commits().length === 2, "hosted infrastructure path captures start and terminal error");
const thrownCount = thrownRun?.commits().length;
thrownRun?.map.set(["run", "status"], "running");
expect_report(thrownRun?.commits().length === thrownCount, "hosted infrastructure path disposes capture before rejecting action");

console.log("hosted test report: ok");
