/** @deprecated Patch 6 compatibility codec. Generic canonical commits are the production wire format. */
import type { LiveMapCommit, LiveMapOp } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type {
  HostedTestReportCommitEnvelope,
  HostedTestReportCommitSequenceExpected,
  HostedTestReportWireOp,
  HostedTestRunId,
  HostedTestWireJsonValue,
  HostedTestWireUndefined,
  HostedTestWireValue,
} from "./hosted-test-report-wire.types";
import { is_hosted_test_run_target, type HostedTestRunTarget } from "./hosted-test-suite";

export const HOSTED_TEST_REPORT_COMMIT_EVENT = "hosted-test-report-commit";

export class HostedTestReportCommitDecodeError extends Error {
  readonly code = "HOSTED_TEST_REPORT_COMMIT_DECODE_FAILED";

  constructor(readonly path: string, reason: string) {
    super(`Invalid hosted test report commit at ${path}: ${reason}`);
    this.name = "HostedTestReportCommitDecodeError";
  }
}

function invalid(path: string, reason: string): never {
  throw new HostedTestReportCommitDecodeError(path, reason);
}

function is_record(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact_keys(value: Readonly<Record<string, unknown>>, expected: readonly string[], path: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    invalid(path, `expected exactly ${wanted.join(", ")}`);
  }
}

function clone_json(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(path, "number must be finite");
    return value;
  }
  if (Array.isArray(value)) {
    const clone = value.map((item, index) => clone_json(item, `${path}[${index}]`));
    Object.freeze(clone);
    return clone;
  }
  if (is_record(value)) {
    const clone: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) clone[key] = clone_json(child, `${path}.${key}`);
    Object.freeze(clone);
    return clone;
  }
  return invalid(path, "value is not JSON");
}

function clone_path(value: unknown, path: string): LivePath {
  if (!Array.isArray(value)) return invalid(path, "path must be an array");
  const clone = value.map((part, index) => {
    if (typeof part === "string") return part;
    if (typeof part === "number" && Number.isInteger(part) && part >= 0) return part;
    return invalid(`${path}[${index}]`, "path segment must be a string or non-negative integer");
  });
  return Object.freeze(clone);
}

function encode_value(value: JsonValue | undefined): HostedTestWireValue {
  if (value === undefined) return Object.freeze({ kind: "undefined" });
  return Object.freeze({ kind: "value", value: clone_json(value, "value") });
}

function encode_json_value(value: JsonValue): HostedTestWireJsonValue {
  return Object.freeze({ kind: "value", value: clone_json(value, "value") });
}

function encode_undefined(): HostedTestWireUndefined {
  return Object.freeze({ kind: "undefined" });
}

function decode_value(value: unknown, path: string): JsonValue | undefined {
  if (!is_record(value)) return invalid(path, "encoded value must be an object");
  if (value.kind === "undefined") {
    exact_keys(value, ["kind"], path);
    return undefined;
  }
  if (value.kind === "value") {
    exact_keys(value, ["kind", "value"], path);
    return clone_json(value.value, `${path}.value`);
  }
  return invalid(`${path}.kind`, "expected undefined or value");
}

function encode_op(op: LiveMapOp): HostedTestReportWireOp {
  const path = clone_path(op.path, "op.path");
  if (op.kind === "splice") {
    const removed = op.removed.map((value, index) => clone_json(value, `op.removed[${index}]`));
    const inserted = op.inserted.map((value, index) => clone_json(value, `op.inserted[${index}]`));
    Object.freeze(removed);
    Object.freeze(inserted);
    return Object.freeze({
      kind: "splice",
      path,
      start: op.start,
      removed,
      inserted,
      prev: encode_json_value(op.prev),
      next: encode_json_value(op.next),
    });
  }
  if (op.kind === "delete") {
    return Object.freeze({
      kind: "delete",
      path,
      prev: encode_value(op.prev),
      next: encode_undefined(),
    });
  }
  if (op.next === undefined) invalid(`op.next`, `${op.kind} next must be a JSON value`);
  return Object.freeze({
    kind: op.kind,
    path,
    prev: encode_value(op.prev),
    next: encode_json_value(op.next),
  });
}

function decode_op(value: unknown, index: number): LiveMapOp {
  const base = `ops[${index}]`;
  if (!is_record(value)) return invalid(base, "operation must be an object");
  const kind = value.kind;
  if (kind !== "set" && kind !== "delete" && kind !== "replace" && kind !== "splice") {
    return invalid(`${base}.kind`, "unsupported operation kind");
  }
  const path = clone_path(value.path, `${base}.path`);
  exact_keys(
    value,
    kind === "splice"
      ? ["kind", "path", "start", "removed", "inserted", "prev", "next"]
      : ["kind", "path", "prev", "next"],
    base,
  );

  if (kind === "splice") {
    if (!Number.isInteger(value.start) || (value.start as number) < 0) {
      return invalid(`${base}.start`, "splice start must be a non-negative integer");
    }
    if (!Array.isArray(value.removed)) return invalid(`${base}.removed`, "splice removed must be an array");
    if (!Array.isArray(value.inserted)) return invalid(`${base}.inserted`, "splice inserted must be an array");
  }

  const prev = decode_value(value.prev, `${base}.prev`);
  const next = decode_value(value.next, `${base}.next`);

  if (kind === "delete") {
    if (next !== undefined) return invalid(`${base}.next`, "delete next must encode undefined");
    return Object.freeze({ kind, path, prev, next: undefined });
  }
  if (kind === "set" || kind === "replace") {
    if (next === undefined) return invalid(`${base}.next`, `${kind} next must encode a JSON value`);
    return Object.freeze({ kind, path, prev, next });
  }
  if (!Array.isArray(prev)) return invalid(`${base}.prev`, "splice prev must encode an array");
  if (!Array.isArray(next)) return invalid(`${base}.next`, "splice next must encode an array");
  const removedInput = value.removed as unknown[];
  const insertedInput = value.inserted as unknown[];
  const removed = removedInput.map((item, itemIndex) => clone_json(item, `${base}.removed[${itemIndex}]`));
  const inserted = insertedInput.map((item, itemIndex) => clone_json(item, `${base}.inserted[${itemIndex}]`));
  Object.freeze(removed);
  Object.freeze(inserted);
  return Object.freeze({ kind, path, start: value.start as number, removed, inserted, prev, next });
}

function must_run_id(value: unknown, path: string): HostedTestRunId {
  if (typeof value !== "string" || value.length === 0) return invalid(path, "runId must be a non-empty string");
  return value;
}

function must_revision(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) return invalid(path, "revision must be a non-negative integer");
  return value as number;
}

export function encode_hosted_test_report_commit(
  runId: HostedTestRunId,
  suite: HostedTestRunTarget,
  commit: LiveMapCommit,
): HostedTestReportCommitEnvelope {
  must_run_id(runId, "runId");
  if (!is_hosted_test_run_target(suite)) invalid("suite", "suite is not a recognized hosted-test run target");
  const prevRev = must_revision(commit.prevRev, "prevRev");
  const rev = must_revision(commit.rev, "rev");
  if (rev !== prevRev + 1) invalid("rev", "rev must equal prevRev + 1");
  if (!commit.changed || commit.ops.length === 0) invalid("ops", "commit must contain changed operations");
  const ops = commit.ops.map(encode_op);
  Object.freeze(ops);
  return Object.freeze({ type: "hosted-test-report-commit", runId, suite, prevRev, rev, ops });
}

export function decode_hosted_test_report_commit_envelope(input: unknown): HostedTestReportCommitEnvelope {
  if (!is_record(input)) return invalid("envelope", "envelope must be an object");
  exact_keys(input, ["type", "runId", "suite", "prevRev", "rev", "ops"], "envelope");
  if (input.type !== "hosted-test-report-commit") invalid("type", "unexpected envelope type");
  const runId = must_run_id(input.runId, "runId");
  if (!is_hosted_test_run_target(input.suite)) invalid("suite", "suite is not a recognized hosted-test run target");
  const prevRev = must_revision(input.prevRev, "prevRev");
  const rev = must_revision(input.rev, "rev");
  if (rev !== prevRev + 1) invalid("rev", "rev must equal prevRev + 1");
  if (!Array.isArray(input.ops) || input.ops.length === 0) invalid("ops", "ops must be a non-empty array");
  const ops = input.ops.map((value, index) => encode_op(decode_op(value, index)));
  Object.freeze(ops);
  return Object.freeze({
    type: "hosted-test-report-commit",
    runId,
    suite: input.suite,
    prevRev,
    rev,
    ops,
  });
}

export function decode_hosted_test_report_commit(input: unknown): LiveMapCommit {
  const envelope = decode_hosted_test_report_commit_envelope(input);
  const ops = envelope.ops.map(decode_op);
  Object.freeze(ops);
  return Object.freeze({ changed: true, prevRev: envelope.prevRev, rev: envelope.rev, ops });
}

export function validate_hosted_test_report_commit_sequence(
  envelopes: readonly HostedTestReportCommitEnvelope[],
  expected: HostedTestReportCommitSequenceExpected,
): void {
  must_run_id(expected.runId, "expected.runId");
  const expectedStart = must_revision(expected.prevRev, "expected.prevRev");
  if (envelopes.length === 0) invalid("sequence", "sequence must contain at least one commit");
  let previous = expectedStart;
  for (let index = 0; index < envelopes.length; index += 1) {
    const envelope = envelopes[index];
    if (envelope === undefined) invalid(`sequence[${index}]`, "commit is missing");
    if (envelope.runId !== expected.runId) invalid(`sequence[${index}].runId`, "runId does not match sequence");
    if (envelope.suite !== expected.suite) invalid(`sequence[${index}].suite`, "suite does not match sequence");
    if (envelope.prevRev !== previous) invalid(`sequence[${index}].prevRev`, `expected revision ${previous}`);
    if (envelope.rev !== envelope.prevRev + 1) invalid(`sequence[${index}].rev`, "rev must equal prevRev + 1");
    previous = envelope.rev;
  }
}
