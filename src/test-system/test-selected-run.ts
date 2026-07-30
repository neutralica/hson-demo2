import type { TestSuite } from "../app/demos/test/tests.types";
import { compare_hosted_test_visitor_order } from "../app/demos/test/hosted-test-panel-selection";
import type { TestExecutorRegistry } from "./test-executor";

/**
 * LiveHost's JsonValue action constraint spells JSON arrays as mutable arrays.
 * The decoder freezes this array before the action can observe it.
 */
export type RunSelectedTestsRequest = Readonly<{
  testIds: string[];
}>;

export type RunSelectedTestsDecodeResult =
  | Readonly<{ ok: true; value: RunSelectedTestsRequest }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

export class SelectedTestResolutionError extends Error {
  readonly code = "HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR";

  constructor(readonly testId: string, readonly executorId: string) {
    super(`[HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR] Test "${testId}" is not exposed by executor "${executorId}".`);
    this.name = "SelectedTestResolutionError";
  }
}

export class SelectedTestSelectionSizeError extends Error {
  readonly code = "HOSTED_TEST_SELECTION_EXCEEDS_EXECUTOR_CATALOG";

  constructor(
    readonly selectedCount: number,
    readonly catalogSize: number,
    readonly executorId: string,
  ) {
    super(
      `[HOSTED_TEST_SELECTION_EXCEEDS_EXECUTOR_CATALOG] Selection contains ${selectedCount} IDs,`
      + ` but executor "${executorId}" exposes only ${catalogSize} tests.`,
    );
    this.name = "SelectedTestSelectionSizeError";
  }
}

export class SelectedTestDuplicateIdError extends Error {
  readonly code = "HOSTED_TEST_DUPLICATE_SELECTION";

  constructor(readonly testId: string) {
    super(`[HOSTED_TEST_DUPLICATE_SELECTION] Selection contains duplicate test ID "${testId}".`);
    this.name = "SelectedTestDuplicateIdError";
  }
}

function is_record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function is_canonical_test_id(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const separator = value.indexOf("::");
  if (separator <= 0 || separator >= value.length - 2) return false;
  const suite = value.slice(0, separator);
  const name = value.slice(separator + 2);
  return suite.trim() === suite
    && name.trim() === name
    && !suite.includes("::")
    && !/[\u0000-\u001f\u007f]/.test(suite)
    && !/[\u0000-\u001f\u007f]/.test(name);
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
        issues: Object.freeze([`tests.runSelected testIds[${index}] must be a canonical suite::case ID.`]),
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

/**
 * Resolves requested IDs in canonical ID order, independent of request and
 * registry construction order, then groups their original TestCase objects.
 */
export function selected_test_suites(
  registry: TestExecutorRegistry,
  requestedTestIds: readonly string[],
): readonly TestSuite[] {
  const uniqueRequested = new Set(requestedTestIds);
  if (uniqueRequested.size !== requestedTestIds.length) {
    const seen = new Set<string>();
    const duplicate = requestedTestIds.find((testId) => {
      if (seen.has(testId)) return true;
      seen.add(testId);
      return false;
    });
    throw new SelectedTestDuplicateIdError(duplicate ?? "unknown");
  }
  if (requestedTestIds.length > registry.catalog.tests.length) {
    throw new SelectedTestSelectionSizeError(
      requestedTestIds.length,
      registry.catalog.tests.length,
      registry.executor.id,
    );
  }
  const requested = new Set(requestedTestIds);
  const found = new Set<string>();
  const suiteOrder: string[] = [];
  const casesBySuite = new Map<string, TestSuite["cases"][number][]>();
  const descriptors = registry.catalog.tests
    .filter((descriptor) => requested.has(descriptor.id))
    .sort((left, right) => compare_hosted_test_visitor_order(left.id, right.id));

  for (const descriptor of descriptors) {
    if (!requested.has(descriptor.id)) continue;
    const registration = registry.get(descriptor.id);
    if (registration === undefined
      || registration.descriptor.id !== descriptor.id
      || registration.descriptor.subject !== descriptor.subject
      || registration.descriptor.requirements.join("\u0000") !== descriptor.requirements.join("\u0000")
      || registration.descriptor.collections.join("\u0000") !== descriptor.collections.join("\u0000")
      || registration.testCase.suite !== descriptor.suite
      || registration.testCase.name !== descriptor.name) {
      throw new Error(`Executor ${registry.executor.id} registration identity changed for ${descriptor.id}.`);
    }
    let cases = casesBySuite.get(descriptor.suite);
    if (cases === undefined) {
      cases = [];
      casesBySuite.set(descriptor.suite, cases);
      suiteOrder.push(descriptor.suite);
    }
    cases.push(registration.testCase);
    found.add(descriptor.id);
  }

  for (const testId of requestedTestIds) {
    if (!found.has(testId)) throw new SelectedTestResolutionError(testId, registry.executor.id);
  }

  const frozenSuites = suiteOrder.map((suite) => Object.freeze({
    suite,
    descriptor: (() => {
      const first = casesBySuite.get(suite)?.[0];
      const registration = first === undefined ? undefined : registry.get(`${suite}::${first.name}`);
      if (registration === undefined) throw new Error(`Executor ${registry.executor.id} lost suite metadata for ${suite}.`);
      return Object.freeze({
        subject: registration.descriptor.subject,
        requirements: registration.descriptor.requirements,
        collections: registration.descriptor.collections,
      });
    })(),
    ...(() => {
      const first = casesBySuite.get(suite)?.[0];
      const registration = first === undefined ? undefined : registry.get(`${suite}::${first.name}`);
      if (registration === undefined) throw new Error(`Executor ${registry.executor.id} lost suite execution configuration for ${suite}.`);
      return {
        ...(registration.suiteSetup === undefined ? {} : { setup: registration.suiteSetup }),
        ...(registration.suiteTimeoutMs === undefined ? {} : { timeoutMs: registration.suiteTimeoutMs }),
      };
    })(),
    cases: Object.freeze([...(casesBySuite.get(suite) ?? [])]),
  }));
  Object.freeze(frozenSuites);
  return frozenSuites;
}
