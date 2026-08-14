import type { TestSuite } from "./test-contracts";
import { compare_test_descriptors } from "../../../src/shared/testing/test-order";
import { is_test_case_id, is_test_suite_id } from "../../../src/shared/testing/test-identity";
import type { TestExecutorRegistry } from "./test-executor";

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
    .sort(compare_test_descriptors);

  for (const descriptor of descriptors) {
    if (!requested.has(descriptor.id)) continue;
    const registration = registry.get(descriptor.id);
    if (registration === undefined
      || registration.descriptor.id !== descriptor.id
      || registration.descriptor.subject !== descriptor.subject
      || registration.descriptor.requirements.join("\u0000") !== descriptor.requirements.join("\u0000")
      || registration.descriptor.collections.join("\u0000") !== descriptor.collections.join("\u0000")
      || registration.testCase.suite !== descriptor.suiteId
      || registration.testCase.caseId !== descriptor.caseId
      || registration.testCase.name !== descriptor.title) {
      throw new Error(`Executor ${registry.executor.id} registration identity changed for ${descriptor.id}.`);
    }
    let cases = casesBySuite.get(descriptor.suiteId);
    if (cases === undefined) {
      cases = [];
      casesBySuite.set(descriptor.suiteId, cases);
      suiteOrder.push(descriptor.suiteId);
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
      const registration = first === undefined ? undefined : registry.get(`${suite}::${first.caseId}`);
      if (registration === undefined) throw new Error(`Executor ${registry.executor.id} lost suite metadata for ${suite}.`);
      return Object.freeze({
        subject: registration.descriptor.subject,
        requirements: registration.descriptor.requirements,
        collections: registration.descriptor.collections,
      });
    })(),
    ...(() => {
      const first = casesBySuite.get(suite)?.[0];
      const registration = first === undefined ? undefined : registry.get(`${suite}::${first.caseId}`);
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
