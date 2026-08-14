import type {
  TestCollection,
  TestExecutionShape,
  TestProvenance,
  TestSubject,
} from "./test-contracts";
import { is_test_case_id, is_test_suite_id } from "./test-identity";

export type PlannedTestCase = Readonly<{
  id: string;
  caseId: string;
  title: string;
  order: number;
}>;

export type PlannedTestSuite = Readonly<{
  id: string;
  title: string;
  subject: TestSubject;
  collections: readonly TestCollection[];
  provenance: TestProvenance;
  order: number;
  executionShape: TestExecutionShape;
  sourceRef?: string;
  declaredChecks?: number;
  cases: readonly PlannedTestCase[];
}>;

export type TestRunPlan = Readonly<{
  runId: string;
  protocolVersion: number;
  catalogVersion: string;
  executorId: string;
  selectionIds: readonly string[];
  suites: readonly PlannedTestSuite[];
}>;

/** LiveHost's JSON action constraint spells wire arrays as mutable arrays. */
export type RunSelectedTestsRequest = Readonly<{
  testIds: string[];
}>;

export type RunSelectedTestsDecodeResult =
  | Readonly<{ ok: true; value: RunSelectedTestsRequest }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

function is_record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function is_canonical_test_id(value: unknown): value is string {
  return is_test_case_id(value) || is_test_suite_id(value);
}

export function decode_run_selected_tests_request(value: unknown): RunSelectedTestsDecodeResult {
  if (!is_record(value) || Object.keys(value).length !== 1 || !Array.isArray(value.testIds)) {
    return Object.freeze({ ok: false, issues: Object.freeze(["tests.runSelected requires exactly one testIds array."]) });
  }
  if (value.testIds.length === 0) {
    return Object.freeze({ ok: false, issues: Object.freeze(["tests.runSelected requires at least one test ID."]) });
  }
  const testIds: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.testIds.length; index += 1) {
    const testId = value.testIds[index];
    if (!is_canonical_test_id(testId)) {
      return Object.freeze({
        ok: false,
        issues: Object.freeze([`tests.runSelected testIds[${index}] must be a canonical case or opaque-suite ID.`]),
      });
    }
    if (seen.has(testId)) {
      return Object.freeze({
        ok: false,
        issues: Object.freeze([`tests.runSelected contains duplicate test ID "${testId}".`]),
      });
    }
    seen.add(testId);
    testIds.push(testId);
  }
  Object.freeze(testIds);
  return Object.freeze({ ok: true, value: Object.freeze({ testIds }) });
}
