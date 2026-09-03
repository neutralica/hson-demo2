import type { TestCatalog } from "../../../src/shared/testing/test-catalog-contract";
import type { TestCollection, TestExecutionShape, TestProvenance, TestSubject } from "../../../src/shared/testing/test-contracts";
import { is_test_case_id, is_test_suite_id } from "../../../src/shared/testing/test-identity";
import { compare_test_descriptors, compare_test_suites } from "../../../src/shared/testing/test-order";
import { SelectedTestResolutionError } from "./test-selected-run";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";

export type MakeTestRunPlanOptions = Readonly<{
  runId: string;
  protocolVersion: number;
  catalogVersion: string;
  executorId: string;
  catalog: TestCatalog;
  selectedIds: readonly string[];
  assignExecutor?: (suite: TestCatalog["suites"][number]) => string;
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
  const externalSuites = new Set<string>();
  for (const id of selected) {
    if (is_test_case_id(id)) {
      const descriptor = options.catalog.tests.find((candidate) => candidate.id === id);
      if (descriptor === undefined) throw new SelectedTestResolutionError(id, options.executorId);
      const cases = casesBySuite.get(descriptor.suiteId) ?? [];
      cases.push(descriptor);
      casesBySuite.set(descriptor.suiteId, cases);
      continue;
    }
    if (!is_test_suite_id(id)) throw new Error(`Malformed Test RunPlan selection identity: ${id}`);
    const suite = suiteById.get(id);
    if (suite === undefined || suite.executionShape === "browser-journeys"
      || (suite.executionShape === "cases" && suite.provenance !== "hson-live")) {
      throw new SelectedTestResolutionError(id, options.executorId);
    }
    externalSuites.add(id);
  }

  const selectedSuiteDescriptors = options.catalog.suites
    .filter((suite) => casesBySuite.has(suite.id) || externalSuites.has(suite.id))
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
      executorId: options.assignExecutor?.(suite) ?? options.executorId,
      ...(suite.sourceRef === undefined ? {} : { sourceRef: suite.sourceRef }),
      cases,
    });
  });
  Object.freeze(suites);
  const selectionIds = Object.freeze(suites.flatMap((suite) => (
    suite.provenance === "hson-live"
      ? [suite.id]
      : suite.cases.map((testCase) => testCase.id)
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
