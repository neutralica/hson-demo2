import {
  CANONICAL_TEST_SUBJECT_ORDER,
  type TestSubject,
} from "../../../../../tests/harness/core/test-contracts";
import type {
  TestCollection,
  TestDescriptor,
} from "../../../../../tests/harness/core/test-contracts";
import { select_test_descriptors } from "../../../../../tests/harness/core/test-selection";
import { compare_test_descriptors, compare_test_suites, test_presentation_rank } from "../../../../../tests/harness/core/test-order";
import { external_launcher_suite_descriptor, type ExternalLibraryLauncherTarget } from "../../../../../tests/harness/core/external-launcher-contract";

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

export type ExternalLibraryPanelCategory = TestSubject;

export type ExternalLibraryPanelProjectionRule = Readonly<{
  launcherId: string;
  primarySubject: ExternalLibraryLauncherTarget["subject"];
  projectedCategory: ExternalLibraryPanelCategory;
  rationale: string;
}>;

/** Pre-epoch placeholder: Phase 1 has no cross-subject projection aliases. */
export const EXTERNAL_LIBRARY_PANEL_PROJECTION_RULES:
readonly ExternalLibraryPanelProjectionRule[] = Object.freeze([]);

export function hosted_test_panel_external_category(
  target: ExternalLibraryLauncherTarget,
): ExternalLibraryPanelCategory {
  return target.subject;
}

function external_matches(
  target: ExternalLibraryLauncherTarget,
  selection: HostedTestPanelSelection,
): boolean {
  return selection.kind === "all"
    || (selection.kind === "subject" && target.subject === selection.subject)
    || (selection.kind === "collection" && target.collections.includes(selection.collection))
    || (selection.kind === "suite" && target.id === selection.suite)
    || (selection.kind === "test" && target.id === selection.testId);
}

export function hosted_test_panel_selection_case_count(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
): number {
  return canonical_for_selection(descriptors, selection).length
    + externalTargets.filter((target) => external_matches(target, selection))
      .reduce((total, target) => total + target.executableChecks, 0);
}

export function hosted_test_panel_selected_ids(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
): readonly string[] {
  const selected = canonical_for_selection(descriptors, selection);
  const external = externalTargets.filter((target) => external_matches(target, selection));
  const ordered = [
    ...selected.map((descriptor) => Object.freeze({
      id: descriptor.id,
      rank: test_presentation_rank(descriptor.subject, descriptor.collections),
      suiteOrder: descriptor.suiteOrdinal,
      caseOrder: descriptor.caseOrdinal,
    })),
    ...external.map((entry) => Object.freeze({
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
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
): readonly HostedTestPanelSelectionChoice[] {
  return Object.freeze(PRIMARY_DEFINITIONS.flatMap((definition) => {
    const count = hosted_test_panel_selection_case_count(descriptors, definition.selection, externalTargets);
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
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
  primarySelection?: HostedTestPanelSelection,
): readonly HostedTestPanelSelectionChoice[] {
  if (primarySelection?.kind === "all") return Object.freeze([]);
  const scopedDescriptors = primarySelection === undefined
    ? descriptors
    : canonical_for_selection(descriptors, primarySelection);
  const scopedExternalTargets = primarySelection === undefined
    ? externalTargets
    : externalTargets.filter((target) => external_matches(target, primarySelection));
  const suites = [...new Set(scopedDescriptors.map((descriptor) => descriptor.suiteId))]
    .sort((left, right) => compare_test_descriptors(
      scopedDescriptors.find((descriptor) => descriptor.suiteId === left)!,
      scopedDescriptors.find((descriptor) => descriptor.suiteId === right)!,
    ));
  const canonical = suites.map((suite) => {
    const selection = Object.freeze({ kind: "suite" as const, suite });
    const count = hosted_test_panel_selection_case_count(descriptors, selection);
    return Object.freeze({
      key: `suite:${suite}`,
      label: `${suite} (${count})`,
      selection,
      count,
    });
  });
  const external = scopedExternalTargets.map((target) => Object.freeze({
    key: `suite:${target.id}`,
    label: `${target.displayName} (${target.executableChecks})`,
    selection: Object.freeze({ kind: "suite" as const, suite: target.id }),
    count: target.executableChecks,
  }));
  const suiteDescriptors = new Map([
    ...scopedDescriptors.map((descriptor) => [descriptor.suiteId, {
      id: descriptor.suiteId,
      subject: descriptor.subject,
      collections: descriptor.collections,
      order: descriptor.suiteOrdinal,
    }] as const),
    ...scopedExternalTargets.map((target) => [target.id, external_launcher_suite_descriptor(target)] as const),
  ]);
  return Object.freeze([...canonical, ...external].sort((left, right) => compare_test_suites(
    suiteDescriptors.get(left.selection.kind === "suite" ? left.selection.suite : left.key)!,
    suiteDescriptors.get(right.selection.kind === "suite" ? right.selection.suite : right.key)!,
  )));
}

export function hosted_test_panel_test_choices(
  descriptors: readonly TestDescriptor[],
  suite: string,
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
): readonly HostedTestPanelSelectionChoice[] {
  const external = externalTargets.find((target) => target.id === suite);
  if (external !== undefined) return Object.freeze([]);
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
