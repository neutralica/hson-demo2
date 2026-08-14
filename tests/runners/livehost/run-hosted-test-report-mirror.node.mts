import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import {
  decode_hosted_test_report_initial,
  encode_hosted_test_report_initial,
} from "../../harness/reporting/hosted/hosted-test-report-initial";
import type { HostedTestReportInitialEnvelope } from "../../harness/reporting/hosted/hosted-test-report-initial.types";
import {
  make_hosted_test_report_mirror,
  HostedTestReportMirrorError,
  HostedTestReportMirrorLifecycleError,
} from "../../harness/reporting/hosted/hosted-test-report-mirror";
import type { HostedTestReportMirror, HostedTestReportMirrorFailureCode } from "../../harness/reporting/hosted/hosted-test-report-mirror.types";
import {
  decode_hosted_test_report_commit_envelope,
  encode_hosted_test_report_commit,
} from "../../harness/reporting/hosted/hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "../../harness/reporting/hosted/hosted-test-report-wire.types";

function expect_mirror(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report mirror: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_mirror(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
}

function expect_failure(mirror: HostedTestReportMirror, apply: () => void, code: HostedTestReportMirrorFailureCode): void {
  const before = mirror.capture();
  try {
    apply();
  } catch (error) {
    expect_mirror(error instanceof HostedTestReportMirrorError && error.failure.code === code, `${code} throws a mirror error`);
    expect_mirror(mirror.status === "failed" && mirror.failure?.code === code, `${code} is retained as mirror failure`);
    expect_mirror(mirror.rev === before.rev, `${code} preserves revision`);
    equal(mirror.capture().value, before.value, `${code} preserves report value`);
    return;
  }
  throw new Error(`hosted report mirror: expected ${code}`);
}

function fresh(initial: HostedTestReportInitialEnvelope): HostedTestReportMirror {
  return make_hosted_test_report_mirror(initial);
}

const source = make_hosted_test_report(() => 10, undefined, "livemap/replay", { caseBatchSize: 1 });
const initial = encode_hosted_test_report_initial("mirror-run", "livemap/replay", source.map.capture());
source.reduce({ t: "suite_begin", suite: "livemap/replay" });
const startCommit = source.commits()[0];
expect_mirror(startCommit !== undefined, "source start commit exists");
const start = encode_hosted_test_report_commit("mirror-run", "livemap/replay", startCommit);
source.reduce({ t: "case_end", suite: "livemap/replay", caseId: "mirror-case", name: "mirror case", status: "pass", ms: 1 });
const caseCommit = source.commits()[1];
expect_mirror(caseCommit !== undefined, "source case commit exists");
const completedCase = encode_hosted_test_report_commit("mirror-run", "livemap/replay", caseCommit);

const observed = fresh(initial);
const observedRevisions: number[] = [];
const observedCaptures: ReturnType<HostedTestReportMirror["capture"]>[] = [];
const stopObserved = observed.subscribe((capture) => {
  observedRevisions.push(capture.rev);
  observedCaptures.push(capture);
});
observed.apply(start);
observed.apply(completedCase);
expect_mirror(observedRevisions.join(",") === "0,1,2", "subscription emits current state and once per successful commit");
expect_mirror(observedRevisions.every((rev, index) => index === 0 || rev > observedRevisions[index - 1]!), "subscription revisions increase monotonically");
const firstObserved = observedCaptures[0];
expect_mirror(firstObserved !== undefined, "subscription exposes revision-0 construction capture");
(firstObserved.value as unknown as { run: { status: string } }).run.status = "failed";
expect_mirror(observed.capture().value.run.status === "running", "subscription capture is detached from mirror state");
stopObserved();
stopObserved();
observed.dispose();
expect_mirror(observed.status === "disposed", "subscription owner mirror disposes cleanly");

const mutableInitial = JSON.parse(JSON.stringify(initial)) as HostedTestReportInitialEnvelope;
const mirror = fresh(mutableInitial);
expect_mirror(mirror.runId === "mirror-run" && mirror.suite === "livemap/replay", "mirror retains correlation identity");
expect_mirror(mirror.status === "active" && mirror.failure === undefined && mirror.rev === initial.rev, "mirror begins active at initial revision");
equal(mirror.capture().value, initial.value, "mirror begins with decoded initial report state");
(mutableInitial as unknown as { value: { run: { status: string } } }).value.run.status = "passed";
expect_mirror(mirror.capture().value.run.status === "idle", "mirror detaches from source initial envelope");

const parsedCommit = JSON.parse(JSON.stringify(start)) as unknown;
const detachedStart = decode_hosted_test_report_commit_envelope(parsedCommit);
mirror.apply(detachedStart);
expect_mirror(mirror.rev === 1 && mirror.capture().value.run.status === "running", "valid commit replays through the real map");
if (typeof parsedCommit === "object" && parsedCommit !== null && "runId" in parsedCommit) {
  (parsedCommit as { runId: string }).runId = "changed";
}
expect_mirror(mirror.runId === "mirror-run" && mirror.rev === 1, "source commit mutation cannot alter mirror state");

const runMismatch = fresh(initial);
expect_failure(runMismatch, () => runMismatch.apply({ ...start, runId: "other-run" }), "RUN_MISMATCH");
const stableFailure = runMismatch.failure;
try {
  runMismatch.apply(start);
} catch (error) {
  expect_mirror(error instanceof HostedTestReportMirrorLifecycleError && error.status === "failed", "post-failure commit rejects at lifecycle precedence");
}
expect_mirror(runMismatch.failure === stableFailure, "first failure record remains stable");

const suiteMismatch = fresh(initial);
expect_failure(
  suiteMismatch,
  () => suiteMismatch.apply({ ...start, suite: "other" } as unknown as HostedTestReportCommitEnvelope),
  "SUITE_MISMATCH",
);

const future = fresh(initial);
expect_failure(future, () => future.apply({ ...start, prevRev: 2, rev: 3 }), "REVISION_MISMATCH");

const duplicate = fresh(initial);
duplicate.apply(start);
expect_failure(duplicate, () => duplicate.apply(start), "REVISION_MISMATCH");

const old = fresh(initial);
old.apply(start);
old.apply(completedCase);
expect_failure(old, () => old.apply(start), "REVISION_MISMATCH");

const outOfOrder = fresh(initial);
expect_failure(outOfOrder, () => outOfOrder.apply({ ...start, prevRev: 3, rev: 4 }), "REVISION_MISMATCH");

const conflict = fresh(initial);
let conflictNotifications = 0;
conflict.subscribe(() => {
  conflictNotifications += 1;
});
const conflictEnvelope = decode_hosted_test_report_commit_envelope({
  ...start,
  ops: start.ops.map((op, index) => index === 0 ? { ...op, prev: { kind: "value", value: "passed" } } : op),
});
expect_failure(conflict, () => conflict.apply(conflictEnvelope), "REPLAY_FAILED");
expect_mirror(conflictNotifications === 1, "failed commit emits no subscription notification");
try {
  conflict.apply(start);
} catch {}
expect_mirror(conflictNotifications === 1, "failed mirror rejects later commits without notification");

const schemaFailure = fresh(initial);
const schemaEnvelope = decode_hosted_test_report_commit_envelope({
  ...start,
  ops: start.ops.map((op) => op.path.join("/") === "run/status"
    ? { ...op, next: { kind: "value", value: "not-a-report-status" } }
    : op),
});
expect_failure(schemaFailure, () => schemaFailure.apply(schemaEnvelope), "REPLAY_FAILED");

const disposed = fresh(initial);
let disposedNotifications = 0;
const stopDisposed = disposed.subscribe(() => {
  disposedNotifications += 1;
});
const disposedCapture = disposed.capture();
stopDisposed();
stopDisposed();
disposed.dispose();
disposed.dispose();
expect_mirror(disposed.status === "disposed" && disposed.failure === undefined, "disposal is idempotent without inventing a failure");
try {
  disposed.apply(start);
} catch (error) {
  expect_mirror(error instanceof HostedTestReportMirrorLifecycleError && error.status === "disposed", "disposed mirror rejects commits first");
}
equal(disposed.capture(), disposedCapture, "disposed mirror remains inspectable");
expect_mirror(disposedNotifications === 1, "disposed subscription receives no later delivery");

const ownerDisposed = fresh(initial);
let ownerDisposedNotifications = 0;
ownerDisposed.subscribe(() => {
  ownerDisposedNotifications += 1;
});
ownerDisposed.dispose();
try {
  ownerDisposed.apply(start);
} catch {}
expect_mirror(ownerDisposedNotifications === 1, "mirror disposal clears active subscriptions and prevents later delivery");

source.dispose();
expect_mirror(typeof window === "undefined" && typeof document === "undefined", "mirror remains Node-safe");
console.log("hosted test report mirror: ok");
