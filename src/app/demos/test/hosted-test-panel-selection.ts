import type {
  TestCollection,
  TestDescriptor,
  TestSubject,
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
  Object.freeze({ key: "subject:transform", label: "Transform", selection: Object.freeze({ kind: "subject", subject: "transform" }) }),
  Object.freeze({ key: "subject:livemap", label: "LiveMap", selection: Object.freeze({ kind: "subject", subject: "livemap" }) }),
  Object.freeze({ key: "subject:reflect", label: "Reflect", selection: Object.freeze({ kind: "subject", subject: "reflect" }) }),
  Object.freeze({ key: "subject:livetree", label: "LiveTree", selection: Object.freeze({ kind: "subject", subject: "livetree" }) }),
  Object.freeze({ key: "subject:livehost", label: "LiveHost", selection: Object.freeze({ kind: "subject", subject: "livehost" }) }),
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

export function hosted_test_panel_external_category(
  target: ExternalLibraryLauncherTarget,
): "transform" | "livemap" | "reflect" | "livetree" | "livehost" | "dev" {
  if (target.launcherId === "core.canonical-hson-equality") return "transform";
  if (target.launcherId === "core.public-boundaries") return "dev";
  if (target.subject === "transform" || target.subject === "livemap" || target.subject === "reflect"
    || target.subject === "livetree" || target.subject === "livehost") return target.subject;
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
  ])].sort(compare));
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
  const suites = [...new Set(scopedDescriptors.map((descriptor) => descriptor.suite))].sort(compare);
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
  return Object.freeze([...canonical, ...external]);
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
