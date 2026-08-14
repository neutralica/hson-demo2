import type {
  TestCatalog,
} from "./test-catalog";
import type {
  TestCollection,
  TestExecutionShape,
  TestProvenance,
  TestSubject,
} from "./test-contracts";
import { is_test_case_id, is_test_suite_id } from "./test-identity";
import { compare_test_descriptors, compare_test_suites } from "./test-order";

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

export type MakeTestRunPlanOptions = Readonly<{
  runId: string;
  protocolVersion: number;
  catalogVersion: string;
  executorId: string;
  catalog: TestCatalog;
  selectedIds: readonly string[];
}>;

export function make_test_run_plan(options: MakeTestRunPlanOptions): TestRunPlan {
  if (!options.runId) throw new Error("Test RunPlan requires a non-empty runId.");
  if (!Number.isSafeInteger(options.protocolVersion) || options.protocolVersion < 1) {
    throw new Error("Test RunPlan requires a positive protocolVersion.");
  }
  if (!options.catalogVersion || !options.executorId) throw new Error("Test RunPlan requires catalog and executor identity.");
  if (options.selectedIds.length === 0) throw new Error("Test RunPlan requires at least one selected identity.");
  const selected = new Set(options.selectedIds);
  if (selected.size !== options.selectedIds.length) throw new Error("Test RunPlan selection identities must be unique.");

  const suiteById = new Map(options.catalog.suites.map((descriptor) => [descriptor.id, descriptor]));
  const casesBySuite = new Map<string, typeof options.catalog.tests[number][]>();
  const opaqueSuites = new Set<string>();
  for (const id of selected) {
    if (is_test_case_id(id)) {
      const descriptor = options.catalog.tests.find((candidate) => candidate.id === id);
      if (descriptor === undefined) throw new Error(`Test RunPlan selection is unavailable: ${id}`);
      const cases = casesBySuite.get(descriptor.suiteId) ?? [];
      cases.push(descriptor);
      casesBySuite.set(descriptor.suiteId, cases);
      continue;
    }
    if (!is_test_suite_id(id)) throw new Error(`Malformed Test RunPlan selection identity: ${id}`);
    const suite = suiteById.get(id);
    if (suite === undefined || suite.executionShape !== "opaque-aggregate") {
      throw new Error(`Test RunPlan opaque suite selection is unavailable: ${id}`);
    }
    opaqueSuites.add(id);
  }

  const selectedSuiteDescriptors = options.catalog.suites
    .filter((suite) => casesBySuite.has(suite.id) || opaqueSuites.has(suite.id))
    .sort(compare_test_suites);
  const suites = selectedSuiteDescriptors.map((suite, order) => {
    const cases = (casesBySuite.get(suite.id) ?? []).sort(compare_test_descriptors)
      .map((descriptor, caseOrder) => Object.freeze({
        id: descriptor.id,
        caseId: descriptor.caseId,
        title: descriptor.title,
        order: caseOrder,
      }));
    Object.freeze(cases);
    return Object.freeze({
      id: suite.id,
      title: suite.title,
      subject: suite.subject,
      collections: Object.freeze([...suite.collections]),
      provenance: suite.provenance,
      order,
      executionShape: suite.executionShape,
      ...(suite.sourceRef === undefined ? {} : { sourceRef: suite.sourceRef }),
      ...(suite.declaredChecks === undefined ? {} : { declaredChecks: suite.declaredChecks }),
      cases,
    });
  });
  Object.freeze(suites);
  const selectionIds = Object.freeze(suites.flatMap((suite) => (
    suite.executionShape === "opaque-aggregate" ? [suite.id] : suite.cases.map((testCase) => testCase.id)
  )));
  return Object.freeze({
    runId: options.runId,
    protocolVersion: options.protocolVersion,
    catalogVersion: options.catalogVersion,
    executorId: options.executorId,
    selectionIds,
    suites,
  });
}
