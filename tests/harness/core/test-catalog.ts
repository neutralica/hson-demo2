import type { TestCase, TestSuite } from "./test-contracts";
import type { TestDescriptor, TestDescriptorMetadata, TestSuiteDescriptor } from "../../../src/shared/testing/test-contracts";
import type { TestCatalog } from "../../../src/shared/testing/test-catalog-contract";
import { format_test_case_id, validate_test_case_id, validate_test_suite_id } from "../../../src/shared/testing/test-identity";

function freeze_metadata(metadata: TestDescriptorMetadata): Readonly<{
  subject: TestDescriptor["subject"];
  requirements: TestDescriptor["requirements"];
  collections: TestDescriptor["collections"];
}> {
  return Object.freeze({
    subject: metadata.subject,
    requirements: Object.freeze([...metadata.requirements]),
    collections: Object.freeze([...(metadata.collections ?? [])]),
  });
}

export function test_id(suite: string, caseId: string): string {
  return format_test_case_id(suite, caseId);
}

export function resolve_test_descriptor(
  suite: TestSuite,
  testCase: TestCase,
  suiteOrdinal = 0,
  caseOrdinal = 0,
): TestDescriptor {
  const defaults = suite.descriptor;
  if (defaults === undefined) {
    throw new Error(`Test suite ${suite.suite} has no canonical descriptor metadata.`);
  }
  if (testCase.suite !== suite.suite) {
    throw new Error(`Test case suite mismatch: ${testCase.suite} is registered under ${suite.suite}.`);
  }
  validate_test_suite_id(suite.suite);
  validate_test_case_id(testCase.caseId);
  const metadata = freeze_metadata({
    subject: testCase.descriptor?.subject ?? defaults.subject,
    requirements: testCase.descriptor?.requirements ?? defaults.requirements,
    collections: testCase.descriptor?.collections ?? defaults.collections ?? Object.freeze([]),
  });
  return Object.freeze({
    id: test_id(suite.suite, testCase.caseId),
    suiteId: suite.suite,
    caseId: testCase.caseId,
    title: testCase.name,
    ...metadata,
    provenance: defaults.provenance ?? "hson-demo2",
    suiteOrdinal,
    caseOrdinal,
  });
}

export function make_test_catalog(
  descriptors: readonly TestDescriptor[],
  suiteDescriptors?: readonly TestSuiteDescriptor[],
): TestCatalog {
  const byId = new Map<string, TestDescriptor>();
  for (const descriptor of descriptors) {
    if (descriptor.id !== test_id(descriptor.suiteId, descriptor.caseId)) {
      throw new Error(`Canonical test ID does not match suiteId and caseId: ${descriptor.id}`);
    }
    if (new Set(descriptor.requirements).size !== descriptor.requirements.length) {
      throw new Error(`Duplicate capability requirement on ${descriptor.id}.`);
    }
    if (new Set(descriptor.collections).size !== descriptor.collections.length) {
      throw new Error(`Duplicate test collection on ${descriptor.id}.`);
    }
    const frozen = Object.freeze({
      ...descriptor,
      requirements: Object.freeze([...descriptor.requirements]),
      collections: Object.freeze([...descriptor.collections]),
    });
    if (byId.has(frozen.id)) throw new Error(`Duplicate canonical test ID: ${frozen.id}`);
    byId.set(frozen.id, frozen);
  }
  const tests = Object.freeze([...byId.values()]);
  const suites = suiteDescriptors ?? derive_suite_descriptors(tests);
  const suiteById = new Map<string, TestSuiteDescriptor>();
  for (const descriptor of suites) {
    validate_test_suite_id(descriptor.id);
    if (suiteById.has(descriptor.id)) throw new Error(`Duplicate canonical suite ID: ${descriptor.id}`);
    if (!Number.isSafeInteger(descriptor.order) || descriptor.order < 0) {
      throw new Error(`Invalid canonical suite order for ${descriptor.id}.`);
    }
    if (descriptor.executionShape === "opaque-aggregate"
      && (!Number.isSafeInteger(descriptor.declaredChecks) || (descriptor.declaredChecks ?? 0) < 1)) {
      throw new Error(`Opaque suite ${descriptor.id} requires a positive declaredChecks count.`);
    }
    suiteById.set(descriptor.id, Object.freeze({
      ...descriptor,
      requirements: Object.freeze([...descriptor.requirements]),
      collections: Object.freeze([...descriptor.collections]),
    }));
  }
  for (const descriptor of tests) {
    const suite = suiteById.get(descriptor.suiteId);
    if (suite === undefined || suite.executionShape !== "cases") {
      throw new Error(`Canonical case ${descriptor.id} has no case-based suite descriptor.`);
    }
  }
  return Object.freeze({ suites: Object.freeze([...suiteById.values()]), tests });
}

function derive_suite_descriptors(tests: readonly TestDescriptor[]): readonly TestSuiteDescriptor[] {
  const suites = new Map<string, TestSuiteDescriptor>();
  for (const test of tests) {
    const descriptor: TestSuiteDescriptor = Object.freeze({
      id: test.suiteId,
      title: test.suiteId,
      subject: test.subject,
      collections: test.collections,
      provenance: test.provenance,
      order: test.suiteOrdinal,
      requirements: test.requirements,
      executionShape: "cases",
    });
    suites.set(test.suiteId, suites.get(test.suiteId) ?? descriptor);
  }
  return Object.freeze([...suites.values()]);
}

export function find_test_descriptor(catalog: TestCatalog, id: string): TestDescriptor | undefined {
  return catalog.tests.find((descriptor) => descriptor.id === id);
}

export function catalog_from_test_suites(suites: readonly TestSuite[]): TestCatalog {
  const suiteDescriptors = suites.map((suite, suiteOrdinal): TestSuiteDescriptor => {
    const metadata = suite.descriptor;
    if (metadata === undefined) throw new Error(`Test suite ${suite.suite} has no canonical descriptor metadata.`);
    return Object.freeze({
      id: suite.suite,
      title: metadata.title ?? suite.suite,
      subject: metadata.subject,
      collections: Object.freeze([...(metadata.collections ?? [])]),
      provenance: metadata.provenance ?? "hson-demo2",
      order: metadata.order ?? suiteOrdinal,
      requirements: Object.freeze([...metadata.requirements]),
      executionShape: "cases",
    });
  });
  return make_test_catalog(
    suites.flatMap((suite, suiteOrdinal) => suite.cases.map((testCase, caseOrdinal) => (
      resolve_test_descriptor(suite, testCase, suite.descriptor?.order ?? suiteOrdinal, caseOrdinal)
    ))),
    suiteDescriptors,
  );
}
