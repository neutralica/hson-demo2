/** @deprecated Patch 6 compatibility codec. Generic recovery snapshots initialize production reports. */
import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { HOSTED_TEST_REPORT_SCHEMA } from "./hosted-test-report";
import type { HostedTestReport } from "./hosted-test-report.types";
import type { HostedTestReportInitialEnvelope } from "./hosted-test-report-initial.types";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";
import { is_hosted_test_suite_id } from "./hosted-test-suite";
import type { HostedTestSuiteId } from "./hosted-test-suite";

export const HOSTED_TEST_REPORT_INITIAL_EVENT = "hosted-test-report-initial";

export class HostedTestReportInitialDecodeError extends Error {
  readonly code = "HOSTED_TEST_REPORT_INITIAL_DECODE_FAILED";

  constructor(readonly path: string, reason: string) {
    super(`Invalid hosted test report initial state at ${path}: ${reason}`);
    this.name = "HostedTestReportInitialDecodeError";
  }
}

function invalid(path: string, reason: string): never {
  throw new HostedTestReportInitialDecodeError(path, reason);
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
    const clone = value.map((child, index) => clone_json(child, `${path}[${index}]`));
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

function must_run_id(value: unknown): HostedTestRunId {
  if (typeof value !== "string" || value.length === 0) invalid("runId", "runId must be a non-empty string");
  return value;
}

function must_revision(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) invalid("rev", "revision must be a non-negative integer");
  return value as number;
}

function validate_initial_report(value: unknown): Readonly<{ value: HostedTestReport; rev: number }> {
  const json = clone_json(value, "value");
  let report: HostedTestReport;
  let rev: number;
  try {
    const capture = hson.liveMap.fromJson(json).schema.use(HOSTED_TEST_REPORT_SCHEMA).capture();
    report = capture.value;
    rev = capture.rev;
  } catch {
    return invalid("value", "report does not satisfy the hosted-test report schema");
  }
  if (
    report.run.status !== "idle"
    || report.run.startedAt !== null
    || report.run.completedAt !== null
    || report.summary.cases !== 0
    || report.summary.pass !== 0
    || report.summary.fail !== 0
    || report.summary.skip !== 0
    || Object.keys(report.caseBatches).length !== 0
    || report.error !== null
  ) {
    return invalid("value", "report must be the unmutated initial hosted-test state");
  }
  return Object.freeze({ value: clone_json(report, "value") as unknown as HostedTestReport, rev });
}

export function encode_hosted_test_report_initial(
  runId: HostedTestRunId,
  suite: HostedTestSuiteId,
  capture: Readonly<{ rev: number; value: HostedTestReport }>,
): HostedTestReportInitialEnvelope {
  const validRunId = must_run_id(runId);
  if (!is_hosted_test_suite_id(suite)) invalid("suite", "suite is not registered for hosted execution");
  const rev = must_revision(capture.rev);
  const validated = validate_initial_report(capture.value);
  if (validated.value.run.suite !== suite) invalid("value.run.suite", "report suite must match envelope suite");
  if (rev !== validated.rev) invalid("rev", `revision must equal the initial map revision ${validated.rev}`);
  const value = validated.value;
  return Object.freeze({ type: "hosted-test-report-initial", runId: validRunId, suite, rev, value });
}

export function decode_hosted_test_report_initial(input: unknown): HostedTestReportInitialEnvelope {
  if (!is_record(input)) return invalid("envelope", "envelope must be an object");
  exact_keys(input, ["type", "runId", "suite", "rev", "value"], "envelope");
  if (input.type !== "hosted-test-report-initial") invalid("type", "unexpected envelope type");
  const runId = must_run_id(input.runId);
  if (!is_hosted_test_suite_id(input.suite)) invalid("suite", "suite is not registered for hosted execution");
  const rev = must_revision(input.rev);
  const validated = validate_initial_report(input.value);
  if (validated.value.run.suite !== input.suite) invalid("value.run.suite", "report suite must match envelope suite");
  if (rev !== validated.rev) invalid("rev", `revision must equal the initial map revision ${validated.rev}`);
  const value = validated.value;
  return Object.freeze({ type: "hosted-test-report-initial", runId, suite: input.suite, rev, value });
}
