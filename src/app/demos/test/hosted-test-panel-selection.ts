import {
  CANONICAL_TEST_SUBJECT_ORDER,
  type TestSubject,
} from "./tests.types";
import type {
  TestCollection,
  TestDescriptor,
} from "./tests.types";
import { select_test_descriptors } from "../../../test-system/test-selection";
import type { ExternalLibraryLauncherTarget } from "../../../test-system/external-library-launchers";

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

const VISITOR_CATEGORY_ORDER = Object.freeze([
  "transform",
  "livetree",
  "livemap",
  "livehost",
  "library",
  "unit",
] as const);

function visitor_category(value: string): string {
  return value.startsWith("library::") ? "library" : value.split("/", 1)[0] ?? value;
}

export function compare_hosted_test_visitor_order(left: string, right: string): number {
  const leftRank = VISITOR_CATEGORY_ORDER.indexOf(visitor_category(left) as typeof VISITOR_CATEGORY_ORDER[number]);
  const rightRank = VISITOR_CATEGORY_ORDER.indexOf(visitor_category(right) as typeof VISITOR_CATEGORY_ORDER[number]);
  const normalizedLeftRank = leftRank < 0 ? VISITOR_CATEGORY_ORDER.length : leftRank;
  const normalizedRightRank = rightRank < 0 ? VISITOR_CATEGORY_ORDER.length : rightRank;
  return normalizedLeftRank - normalizedRightRank || compare(left, right);
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

export type ExternalLibraryPanelCategory =
  | typeof CANONICAL_TEST_SUBJECT_ORDER[number]
  | "dev";

export type ExternalLibraryPanelProjectionRule = Readonly<{
  launcherId: string;
  primarySubject: ExternalLibraryLauncherTarget["subject"];
  projectedCategory: ExternalLibraryPanelCategory;
  rationale: string;
}>;

/**
 * Explicit cross-subject views. These affect panel selection only; complete
 * external and inclusive totals continue to count each launcher target once.
 */
export const EXTERNAL_LIBRARY_PANEL_PROJECTION_RULES:
readonly ExternalLibraryPanelProjectionRule[] = Object.freeze([
  Object.freeze({
    launcherId: "core.canonical-hson-equality",
    primarySubject: "integration",
    projectedCategory: "transform",
    rationale: "Canonical equality verifies graph equivalence used by Transform results.",
  }),
  Object.freeze({
    launcherId: "core.public-boundaries",
    primarySubject: "integration",
    projectedCategory: "dev",
    rationale: "Public package-boundary checks belong to the developer-facing collection view.",
  }),
]);

export function hosted_test_panel_external_category(
  target: ExternalLibraryLauncherTarget,
): ExternalLibraryPanelCategory {
  const rule = EXTERNAL_LIBRARY_PANEL_PROJECTION_RULES.find(
    (candidate) => candidate.launcherId === target.launcherId,
  );
  if (rule !== undefined) {
    if (rule.primarySubject !== target.subject) {
      throw new Error(
        `External panel projection subject mismatch for ${target.launcherId}: `
        + `rule declares ${rule.primarySubject}, target declares ${target.subject}`,
      );
    }
    return rule.projectedCategory;
  }
  if (CANONICAL_TEST_SUBJECT_ORDER.includes(
    target.subject as typeof CANONICAL_TEST_SUBJECT_ORDER[number],
  )) {
    return target.subject as typeof CANONICAL_TEST_SUBJECT_ORDER[number];
  }
  throw new Error(`External library target has no panel category projection: ${target.launcherId}`);
}

function external_matches(
  target: ExternalLibraryLauncherTarget,
  selection: HostedTestPanelSelection,
): boolean {
  const category = hosted_test_panel_external_category(target);
  return selection.kind === "all"
    || (selection.kind === "subject" && category === selection.subject)
    || (selection.kind === "collection" && category === selection.collection)
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
  return Object.freeze([...new Set([
    ...selected.map((descriptor) => descriptor.id),
    ...external.map((entry) => entry.id),
  ])].sort(compare_hosted_test_visitor_order));
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
  const suites = [...new Set(scopedDescriptors.map((descriptor) => descriptor.suite))]
    .sort(compare_hosted_test_visitor_order);
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
    label: `library · ${target.displayName} (${target.executableChecks})`,
    selection: Object.freeze({ kind: "suite" as const, suite: target.id }),
    count: target.executableChecks,
  }));
  return Object.freeze([...canonical, ...external].sort((left, right) =>
    compare_hosted_test_visitor_order(
      left.selection.kind === "suite" ? left.selection.suite : left.key,
      right.selection.kind === "suite" ? right.selection.suite : right.key,
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
      .filter((descriptor) => descriptor.suite === suite)
      .sort((left, right) => compare(left.id, right.id))
      .map((descriptor) => Object.freeze({
        key: `test:${descriptor.id}`,
        label: descriptor.name,
        selection: Object.freeze({ kind: "test" as const, testId: descriptor.id }),
        count: 1,
      })),
  );
}
