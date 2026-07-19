import { hson } from "hson-live";
import type { LiveMapCommit, LiveMapOp } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { create_hosted_test_livehost, type HostedTestRunResult } from "./hosted-replay-action";
import { HOSTED_TEST_REPORT_SCHEMA, type HostedTestReportController } from "./hosted-test-report";
import {
  decode_hosted_test_report_commit,
  encode_hosted_test_report_commit,
  HostedTestReportCommitDecodeError,
  validate_hosted_test_report_commit_sequence,
} from "./hosted-test-report-wire";
import type { HostedTestReportCommitEnvelope } from "./hosted-test-report-wire.types";

function expect_wire(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted test report wire: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_wire(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
}

function commit(prevRev: number, op: LiveMapOp): LiveMapCommit {
  return { changed: true, prevRev, rev: prevRev + 1, ops: [op] };
}

function round_trip(source: LiveMapCommit): LiveMapCommit {
  const envelope = encode_hosted_test_report_commit("wire-test-run", "livemap/replay", source);
  return decode_hosted_test_report_commit(JSON.parse(JSON.stringify(envelope)) as unknown);
}

function expect_decode_error(input: unknown, path: string, reason: string): void {
  let caught: unknown;
  try {
    decode_hosted_test_report_commit(input);
  } catch (error) {
    caught = error;
  }
  expect_wire(caught instanceof HostedTestReportCommitDecodeError, `${path} must throw the dedicated decode error`);
  expect_wire(caught.code === "HOSTED_TEST_REPORT_COMMIT_DECODE_FAILED", `${path} must use the stable error code`);
  expect_wire(caught.path === path, `${path} must use deterministic error path, got ${caught.path}`);
  expect_wire(caught.message.includes(reason), `${path} must report ${reason}`);
}

function expect_sequence_error(
  envelopes: readonly HostedTestReportCommitEnvelope[],
  path: string,
): void {
  let caught: unknown;
  try {
    validate_hosted_test_report_commit_sequence(envelopes, {
      runId: "sequence-run",
      suite: "livemap/replay",
      prevRev: 1,
    });
  } catch (error) {
    caught = error;
  }
  expect_wire(caught instanceof HostedTestReportCommitDecodeError && caught.path === path, `sequence must reject at ${path}`);
}

function must_envelope(
  envelope: HostedTestReportCommitEnvelope | undefined,
  message: string,
): HostedTestReportCommitEnvelope {
  expect_wire(envelope !== undefined, message);
  return envelope;
}

const setWithMissingPrev = commit(1, {
  kind: "set",
  path: ["new"],
  prev: undefined,
  next: { nested: [1, null, { ok: true }] },
});
const setRoundTrip = round_trip(setWithMissingPrev);
equal(setRoundTrip, setWithMissingPrev, "set operation and nested JSON round-trip");
expect_wire(setRoundTrip.ops[0]?.prev === undefined, "missing prior value remains undefined");
expect_wire((setRoundTrip.ops[0]?.next as { nested?: unknown[] }).nested?.[1] === null, "null remains a normal value distinct from undefined");

const deleteCommit = commit(2, {
  kind: "delete",
  path: ["old"],
  prev: { value: 3 },
  next: undefined,
});
const deleteEnvelope = encode_hosted_test_report_commit("wire-test-run", "livemap/replay", deleteCommit);
equal(deleteEnvelope.ops[0]?.next, { kind: "undefined" }, "delete next uses explicit undefined tag");
expect_wire(round_trip(deleteCommit).ops[0]?.next === undefined, "delete next decodes to explicit undefined");

const replaceCommit = commit(3, {
  kind: "replace",
  path: ["value"],
  prev: null,
  next: 4.5,
});
equal(round_trip(replaceCommit), replaceCommit, "replace and finite number round-trip");

const spliceCommit = commit(4, {
  kind: "splice",
  path: ["items"],
  start: 1,
  removed: [{ removed: [1, 2] }],
  inserted: [{ inserted: { label: "new" } }, null],
  prev: ["a", { removed: [1, 2] }],
  next: ["a", { inserted: { label: "new" } }, null],
});
equal(round_trip(spliceCommit), spliceCommit, "splice removed, inserted, prev, and next round-trip");

const mutableNext: JsonValue = { nested: [1, { label: "original" }] };
const mutableCommit = commit(5, { kind: "set", path: ["mutable"], prev: undefined, next: mutableNext });
const detachedEnvelope = encode_hosted_test_report_commit("wire-test-run", "livemap/replay", mutableCommit);
(mutableNext as { nested: Array<number | { label: string }> }).nested[1] = { label: "changed" };
expect_wire(JSON.stringify(detachedEnvelope).includes("original"), "encoded envelope is detached from local commit values");

const parsed = JSON.parse(JSON.stringify(detachedEnvelope)) as {
  ops: Array<{ path: Array<string | number>; next: { kind: string; value: { nested: unknown[] } } }>;
};
const detachedDecoded = decode_hosted_test_report_commit(parsed);
parsed.ops[0]?.path.push("changed");
parsed.ops[0]?.next.value.nested.push("changed");
expect_wire(detachedDecoded.ops[0]?.path.length === 1, "decoded path is detached from parsed input");
const decodedNested = (detachedDecoded.ops[0]?.next as { nested?: unknown[] } | undefined)?.nested;
expect_wire(decodedNested?.length === 2, "decoded values are detached from parsed input");
expect_wire(
  Object.isFrozen(detachedEnvelope)
    && Object.isFrozen(detachedEnvelope.ops)
    && Object.isFrozen(detachedEnvelope.ops[0]?.path)
    && Object.isFrozen(detachedDecoded)
    && Object.isFrozen(detachedDecoded.ops)
    && Object.isFrozen(detachedDecoded.ops[0]?.next),
  "encoded and decoded structures follow deep-freeze conventions",
);

const validObject = JSON.parse(JSON.stringify(deleteEnvelope)) as Record<string, unknown>;
expect_decode_error(null, "envelope", "envelope must be an object");
expect_decode_error({ ...validObject, extra: true }, "envelope", "expected exactly");
expect_decode_error({ ...validObject, rev: 9 }, "rev", "prevRev + 1");
expect_decode_error({ ...validObject, ops: [] }, "ops", "non-empty");
expect_decode_error({ ...validObject, ops: [{ kind: "move", path: [], prev: { kind: "undefined" }, next: { kind: "undefined" } }] }, "ops[0].kind", "unsupported");
expect_decode_error({ ...validObject, ops: [{ kind: "delete", path: [-1], prev: { kind: "value", value: 1 }, next: { kind: "undefined" } }] }, "ops[0].path[0]", "path segment");
expect_decode_error({ ...validObject, ops: [{ kind: "delete", path: [], prev: { kind: "value" }, next: { kind: "undefined" } }] }, "ops[0].prev", "expected exactly");
expect_decode_error({ ...validObject, ops: [{ kind: "delete", path: [], prev: { kind: "wat" }, next: { kind: "undefined" } }] }, "ops[0].prev.kind", "expected undefined or value");
expect_decode_error({ ...validObject, ops: [{ kind: "delete", path: [], prev: { kind: "value", value: Number.NaN }, next: { kind: "undefined" } }] }, "ops[0].prev.value", "finite");
expect_decode_error({ ...validObject, ops: [{ kind: "set", path: [], prev: { kind: "undefined" } }] }, "ops[0]", "expected exactly");
expect_decode_error({ ...validObject, ops: [{ kind: "splice", path: [], start: -1, removed: [], inserted: [], prev: { kind: "value", value: [] }, next: { kind: "value", value: [] } }] }, "ops[0].start", "non-negative integer");

const sequence = [1, 2, 3].map((prevRev) => encode_hosted_test_report_commit(
  "sequence-run",
  "livemap/replay",
  commit(prevRev, { kind: "set", path: ["n"], prev: prevRev, next: prevRev + 1 }),
));
validate_hosted_test_report_commit_sequence(sequence, { runId: "sequence-run", suite: "livemap/replay", prevRev: 1 });
const sequence0 = must_envelope(sequence[0], "sequence commit 0 must exist");
const sequence1 = must_envelope(sequence[1], "sequence commit 1 must exist");
const sequence2 = must_envelope(sequence[2], "sequence commit 2 must exist");
expect_sequence_error([{ ...sequence0, runId: "other-run" }, sequence1, sequence2], "sequence[0].runId");
expect_sequence_error([sequence0, sequence2], "sequence[1].prevRev");
expect_sequence_error([sequence0, sequence0], "sequence[1].prevRev");
expect_sequence_error([sequence1, sequence0], "sequence[0].prevRev");
expect_sequence_error([], "sequence");

let realRun: HostedTestReportController | undefined;
let initial: ReturnType<HostedTestReportController["map"]["capture"]> | undefined;
const response = await create_hosted_test_livehost(undefined, (run) => {
  realRun = run;
  initial = run.map.capture();
}).dispatch_action({
  type: "action",
  id: "hosted-report-wire-real-run",
  name: "tests.run",
  payload: { suite: "livemap/replay" },
});
expect_wire(response.type === "ack", "real hosted action still acknowledges normally");
expect_wire(response.type === "ack" && Object.keys(response.result as object).sort().join(",") === "ok,runId,suite,summary,timing", "action result includes authoritative host timing");
expect_wire(realRun !== undefined && initial !== undefined, "real run inspection captures initial and terminal state");
const envelopes = realRun.commits().map((local) =>
  encode_hosted_test_report_commit("real-replay-run", "livemap/replay", local)
);
expect_wire(envelopes.length === 4, "real run produces four batched transport envelopes");
expect_wire(envelopes[0]?.prevRev === 0 && envelopes[0].rev === 1, "real envelope range begins 0 to 1");
expect_wire(envelopes.at(-1)?.prevRev === 3 && envelopes.at(-1)?.rev === 4, "real envelope range ends 3 to 4");
validate_hosted_test_report_commit_sequence(envelopes, {
  runId: "real-replay-run",
  suite: "livemap/replay",
  prevRev: initial.rev,
});
const decoded = envelopes.map((envelope) =>
  decode_hosted_test_report_commit(JSON.parse(JSON.stringify(envelope)) as unknown)
);
const initialJson = structuredClone(initial.value) as unknown as JsonValue;
const replay = hson.liveMap.fromJson(initialJson).schema.use(HOSTED_TEST_REPORT_SCHEMA);
for (const decodedCommit of decoded) replay.replay({ prevRev: decodedCommit.prevRev, ops: decodedCommit.ops });
equal(replay.capture().value, realRun.map.capture().value, "stringify, parse, decode, and replay reconstruct authoritative final report");
expect_wire(replay.rev === 4, "decoded transport replay reaches revision 4");
expect_wire(realRun.map.snap(["run", "status"]) === "passed", "authoritative real report remains passed");
expect_wire(realRun.map.snap(["summary", "cases"]) === 45, "authoritative real report retains 45 cases");
expect_wire(response.type === "ack" && (response.result as unknown as HostedTestRunResult).summary.cases === 45, "existing action result remains unchanged");
expect_wire(typeof window === "undefined" && typeof document === "undefined", "wire codec and replay remain Node-safe");

console.log("hosted test report wire: ok");
