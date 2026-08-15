import { CANONICAL_TEST_SUBJECT_ORDER, type TestSubject } from "../../../../shared/testing/test-contracts";
import type { TestCollection, TestDescriptor, TestSuiteDescriptor } from "../../../../shared/testing/test-contracts";
import { select_test_descriptors } from "../../../../shared/testing/test-selection";
import { compare_test_descriptors, compare_test_suites, test_presentation_rank } from "../../../../shared/testing/test-order";

export type HostedTestPanelSelection =
  | Readonly<{ kind: "all" }>
  | Readonly<{ kind: "subject"; subject: TestSubject }>
  | Readonly<{ kind: "collection"; collection: TestCollection }>
  | Readonly<{ kind: "suite"; suite: string }>
  | Readonly<{ kind: "test"; testId: string }>;

export type HostedTestPanelSelectionChoice = Readonly<{
  key: string;
  label: string;
  selection: HostedTestPanelSelection;
  count: number;
}>;

type PrimaryDefinition = Readonly<{
  key: string;
  label: string;
  selection: HostedTestPanelSelection;
}>;

const PRIMARY_DEFINITIONS: readonly PrimaryDefinition[] = Object.freeze([
  Object.freeze({ key: "all", label: "all", selection: Object.freeze({ kind: "all" }) }),
  ...CANONICAL_TEST_SUBJECT_ORDER.map((subject) => Object.freeze({
    key: `subject:${subject}`,
    label: subject === "livemap" ? "LiveMap"
      : subject === "livetree" ? "LiveTree"
        : subject === "livehost" ? "LiveHost"
          : subject[0]!.toUpperCase() + subject.slice(1),
    selection: Object.freeze({ kind: "subject" as const, subject }),
  })),
  Object.freeze({ key: "collection:unit", label: "Unit", selection: Object.freeze({ kind: "collection", collection: "unit" }) }),
  Object.freeze({ key: "collection:dev", label: "Dev", selection: Object.freeze({ kind: "collection", collection: "dev" }) }),
]);

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** User-visible projection only. Identities and report strings remain untouched. */
export function hosted_test_panel_display_label(value: string): string {
  return value.toLowerCase();
}

function canonical_for_selection(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
): readonly TestDescriptor[] {
  if (selection.kind === "all") return descriptors;
  if (selection.kind === "subject") return select_test_descriptors(descriptors, { subject: selection.subject });
  if (selection.kind === "collection") return select_test_descriptors(descriptors, { collection: selection.collection });
  if (selection.kind === "suite") return select_test_descriptors(descriptors, { suite: selection.suite });
  return select_test_descriptors(descriptors, { test: selection.testId });
}

function suite_matches(
  suite: TestSuiteDescriptor,
  selection: HostedTestPanelSelection,
): boolean {
  if (suite.executionShape === "certification-aggregate"
    && (selection.kind === "all" || selection.kind === "subject")) return false;
  return selection.kind === "all"
    || (selection.kind === "subject" && suite.subject === selection.subject)
    || (selection.kind === "collection" && suite.collections.includes(selection.collection))
    || (selection.kind === "suite" && suite.id === selection.suite)
    || (selection.kind === "test" && suite.id === selection.testId);
}

export function hosted_test_panel_selection_case_count(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
  suites: readonly TestSuiteDescriptor[] = Object.freeze([]),
): number {
  return canonical_for_selection(descriptors, selection).length
    + suites.filter((suite) => suite.executionShape !== "cases" && suite_matches(suite, selection))
      .reduce((total, suite) => total + (suite.declaredChecks ?? 0), 0);
}

export function hosted_test_panel_selected_ids(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
  suites: readonly TestSuiteDescriptor[] = Object.freeze([]),
): readonly string[] {
  const selected = canonical_for_selection(descriptors, selection);
  const opaque = suites.filter((suite) => suite.executionShape !== "cases" && suite_matches(suite, selection));
  const ordered = [
    ...selected.map((descriptor) => Object.freeze({
      id: descriptor.id,
      rank: test_presentation_rank(descriptor.subject, descriptor.collections),
      suiteOrder: descriptor.suiteOrdinal,
      caseOrder: descriptor.caseOrdinal,
    })),
    ...opaque.map((entry) => Object.freeze({
      id: entry.id,
      rank: test_presentation_rank(entry.subject, entry.collections),
      suiteOrder: entry.order,
      caseOrder: -1,
    })),
  ].sort((left, right) => left.rank - right.rank
    || left.suiteOrder - right.suiteOrder
    || left.caseOrder - right.caseOrder
    || compare(left.id, right.id));
  return Object.freeze([...new Set(ordered.map((entry) => entry.id))]);
}

export function hosted_test_panel_primary_choices(
  descriptors: readonly TestDescriptor[],
  suites: readonly TestSuiteDescriptor[] = Object.freeze([]),
): readonly HostedTestPanelSelectionChoice[] {
  return Object.freeze(PRIMARY_DEFINITIONS.flatMap((definition) => {
    const count = hosted_test_panel_selection_case_count(descriptors, definition.selection, suites);
    if (definition.selection.kind !== "all" && count === 0) return [];
    return [Object.freeze({
      ...definition,
      label: `${definition.label} (${count})`,
      count,
    })];
  }));
}

export function hosted_test_panel_suite_choices(
  descriptors: readonly TestDescriptor[],
  suiteDescriptors: readonly TestSuiteDescriptor[] = Object.freeze([]),
  primarySelection?: HostedTestPanelSelection,
): readonly HostedTestPanelSelectionChoice[] {
  if (primarySelection?.kind === "all") return Object.freeze([]);
  const scopedDescriptors = primarySelection === undefined
    ? descriptors
    : canonical_for_selection(descriptors, primarySelection);
  const scopedOpaqueSuites = suiteDescriptors.filter((suite) => suite.executionShape !== "cases")
    .filter((suite) => primarySelection === undefined || suite_matches(suite, primarySelection));
  const suites = [...new Set(scopedDescriptors.map((descriptor) => descriptor.suiteId))]
    .sort((left, right) => compare_test_descriptors(
      scopedDescriptors.find((descriptor) => descriptor.suiteId === left)!,
      scopedDescriptors.find((descriptor) => descriptor.suiteId === right)!,
    ));
  const canonical = suites.map((suite) => {
    const selection = Object.freeze({ kind: "suite" as const, suite });
    const count = hosted_test_panel_selection_case_count(descriptors, selection, suiteDescriptors);
    return Object.freeze({
      key: `suite:${suite}`,
      label: `${suite} (${count})`,
      selection,
      count,
    });
  });
  const opaque = scopedOpaqueSuites.map((suite) => Object.freeze({
    key: `suite:${suite.id}`,
    label: suite.executionShape === "certification-aggregate"
      ? `${suite.title} (1 certification)`
      : `${suite.title} (${suite.declaredChecks ?? 0})`,
    selection: Object.freeze({ kind: "suite" as const, suite: suite.id }),
    count: suite.declaredChecks ?? 0,
  }));
  const descriptorBySuite = new Map([
    ...scopedDescriptors.map((descriptor) => [descriptor.suiteId, {
      id: descriptor.suiteId,
      subject: descriptor.subject,
      collections: descriptor.collections,
      order: descriptor.suiteOrdinal,
    }] as const),
    ...scopedOpaqueSuites.map((suite) => [suite.id, suite] as const),
  ]);
  return Object.freeze([...canonical, ...opaque].sort((left, right) => compare_test_suites(
    descriptorBySuite.get(left.selection.kind === "suite" ? left.selection.suite : left.key)!,
    descriptorBySuite.get(right.selection.kind === "suite" ? right.selection.suite : right.key)!,
  )));
}

export function hosted_test_panel_test_choices(
  descriptors: readonly TestDescriptor[],
  suite: string,
  suiteDescriptors: readonly TestSuiteDescriptor[] = Object.freeze([]),
): readonly HostedTestPanelSelectionChoice[] {
  if (suiteDescriptors.some((descriptor) => descriptor.id === suite && descriptor.executionShape !== "cases")) return Object.freeze([]);
  return Object.freeze(
    descriptors
      .filter((descriptor) => descriptor.suiteId === suite)
      .sort(compare_test_descriptors)
      .map((descriptor) => Object.freeze({
        key: `test:${descriptor.id}`,
        label: descriptor.title,
        selection: Object.freeze({ kind: "test" as const, testId: descriptor.id }),
        count: 1,
      })),
  );
}
