import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import { encode_hosted_test_report_commit } from "../../harness/reporting/hosted/hosted-test-report-wire";
import type { RunResult, TestEvent } from "../../harness/core/test-contracts";
import { hosted_test_report_cases } from "../../harness/reporting/hosted/hosted-test-report.types";

function expect_batch(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report batching: ${message}`);
}

const passingResult = (cases: number, pass = cases, fail = 0, skip = 0): RunResult => ({
  ok: fail === 0,
  summary: { suites: 1, cases, pass, fail, skip, msTotal: cases, failures: [] },
});
const begin: TestEvent = { t: "suite_begin", suite: "batch/test", totalPlanned: 4 };
const end = (caseId: string, status: "pass" | "fail" | "skip" = "pass"): TestEvent => ({
  t: "case_end", suite: "batch/test", caseId, name: caseId, status, ms: 1, ...(status === "fail" ? { err: "expected" } : {}),
});
const suiteEnd: TestEvent = { t: "suite_end", suite: "batch/test", ms: 4 };

let emitted = 0;
const report = make_hosted_test_report(() => 1, (commit) => {
  encode_hosted_test_report_commit("batch-run", "livemap/replay", commit);
  emitted += 1;
}, "livemap/replay", { caseBatchSize: 3 });
report.reduce(begin);
expect_batch(report.commits().length === 1, "suite start emits one commit");
report.reduce(end("one", "pass"));
report.reduce(end("two", "fail"));
expect_batch(report.commits().length === 3 && hosted_test_report_cases(report.map.capture().value).length === 0, "normalized case state streams while the legacy completion batch remains private");
report.reduce(end("three", "skip"));
expect_batch(report.commits().length === 4, "reaching batch size folds the legacy projection into the normalized case commit");
const firstBatch = report.map.capture().value;
expect_batch(hosted_test_report_cases(firstBatch).map((item) => item.name).join(",") === "one,two,three", "batch preserves source order");
expect_batch(firstBatch.summary.cases === 3 && firstBatch.summary.pass === 1 && firstBatch.summary.fail === 1 && firstBatch.summary.skip === 1, "case append and all counters update atomically");
const caseCommit = report.commits()[3];
expect_batch(caseCommit?.ops.some((op) => op.kind === "set" && op.path[0] === "caseBatches") && caseCommit.ops.length >= 4, "one semantic batch contains a compact case-batch record and related counters");
report.reduce(end("four"));
report.reduce(suiteEnd);
expect_batch(report.commits().length === 7 && hosted_test_report_cases(report.map.capture().value).length === 4, "suite end flushes a partial projection and records terminal lifecycle");
report.complete(passingResult(4, 2, 1, 1));
expect_batch(report.commits().length === 8 && emitted === 8, "local capture and transport observer remain one-for-one through terminal state");
expect_batch(new Set(hosted_test_report_cases(report.map.capture().value).map((item) => item.key)).size === 4, "no case is duplicated");
report.dispose();

const completionFlush = make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: 8 });
completionFlush.reduce(begin);
completionFlush.reduce(end("pending"));
completionFlush.complete(passingResult(1));
expect_batch(hosted_test_report_cases(completionFlush.map.capture().value).length === 1 && completionFlush.commits().length === 4, "terminal completion flushes a partial projection before its terminal commit");
completionFlush.dispose();

const infrastructureFlush = make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: 8 });
infrastructureFlush.reduce(begin);
infrastructureFlush.reduce(end("completed-before-error"));
infrastructureFlush.failInfrastructure(new Error("synthetic"));
expect_batch(hosted_test_report_cases(infrastructureFlush.map.capture().value).length === 1 && infrastructureFlush.map.capture().value.run.status === "error", "infrastructure failure preserves completed pending cases before terminal error");
expect_batch(infrastructureFlush.commits().length === 5, "error path emits normalized case, pending projection, classified error, and terminal commits");
infrastructureFlush.dispose();

const disposeFlush = make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: 8 });
disposeFlush.reduce(begin);
disposeFlush.reduce(end("dispose-pending"));
disposeFlush.dispose();
expect_batch(hosted_test_report_cases(disposeFlush.map.capture().value).length === 1, "disposal flushes pending completed cases before detaching feed observation");

const batchOne = make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: 1 });
batchOne.reduce(begin);
batchOne.reduce(end("a"));
batchOne.reduce(end("b"));
batchOne.complete(passingResult(2));
expect_batch(batchOne.commits().length === 4 && batchOne.map.rev === 4, "batch size one reproduces one case per commit");
batchOne.dispose();

for (const invalid of [0, -1, 1.5, Number.NaN]) {
  let rejected = false;
  try { make_hosted_test_report(() => 1, undefined, "livemap/replay", { caseBatchSize: invalid }); }
  catch { rejected = true; }
  expect_batch(rejected, `invalid batch size ${String(invalid)} rejects clearly`);
}

let observerThrows = true;
const observerFailure = make_hosted_test_report(() => 1, (commit) => {
  if (observerThrows && commit.ops.some((op) => op.path[0] === "caseBatches")) throw new Error("observer failed after commit");
}, "livemap/replay", { caseBatchSize: 1 });
observerFailure.reduce(begin);
try { observerFailure.reduce(end("committed-once")); } catch {}
observerThrows = false;
observerFailure.failInfrastructure(new Error("terminal"));
expect_batch(hosted_test_report_cases(observerFailure.map.capture().value).length === 1, "a post-commit observer error cannot cause the committed pending batch to be duplicated");
observerFailure.dispose();

const mutationFailure = make_hosted_test_report(() => 1, undefined, "livemap/replay", {
  mutate: async () => { throw new Error("authority mutation rejected"); },
});
mutationFailure.reduce(begin);
await new Promise<void>((resolve) => setImmediate(resolve));
let mutationFailureObserved = false;
try { await mutationFailure.settle(); }
catch (error) { mutationFailureObserved = error instanceof Error && error.message === "authority mutation rejected"; }
expect_batch(mutationFailureObserved, "a mutation rejection remains observable even when it settles before report.settle");
mutationFailure.dispose();

console.log("hosted report batching: ok");
