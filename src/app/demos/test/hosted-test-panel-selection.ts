import type {
  TestCollection,
  TestDescriptor,
  TestSubject,
} from "./tests.types";
import { select_test_descriptors } from "../../../test-system/test-selection";

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
  Object.freeze({ key: "all", label: "All discovered tests", selection: Object.freeze({ kind: "all" }) }),
  Object.freeze({ key: "subject:transform", label: "Transform", selection: Object.freeze({ kind: "subject", subject: "transform" }) }),
  Object.freeze({ key: "subject:livemap", label: "LiveMap", selection: Object.freeze({ kind: "subject", subject: "livemap" }) }),
  Object.freeze({ key: "subject:livetree", label: "LiveTree", selection: Object.freeze({ kind: "subject", subject: "livetree" }) }),
  Object.freeze({ key: "subject:livehost", label: "LiveHost", selection: Object.freeze({ kind: "subject", subject: "livehost" }) }),
  Object.freeze({ key: "collection:unit", label: "Unit", selection: Object.freeze({ kind: "collection", collection: "unit" }) }),
  Object.freeze({ key: "collection:dev", label: "Dev", selection: Object.freeze({ kind: "collection", collection: "dev" }) }),
]);

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function hosted_test_panel_selected_ids(
  descriptors: readonly TestDescriptor[],
  selection: HostedTestPanelSelection,
): readonly string[] {
  const selected = selection.kind === "all"
    ? descriptors
    : selection.kind === "subject"
      ? select_test_descriptors(descriptors, { subject: selection.subject })
      : selection.kind === "collection"
        ? select_test_descriptors(descriptors, { collection: selection.collection })
        : selection.kind === "suite"
          ? select_test_descriptors(descriptors, { suite: selection.suite })
          : select_test_descriptors(descriptors, { test: selection.testId });
  return Object.freeze([...new Set(selected.map((descriptor) => descriptor.id))].sort(compare));
}

export function hosted_test_panel_primary_choices(
  descriptors: readonly TestDescriptor[],
): readonly HostedTestPanelSelectionChoice[] {
  return Object.freeze(PRIMARY_DEFINITIONS.flatMap((definition) => {
    const count = hosted_test_panel_selected_ids(descriptors, definition.selection).length;
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
): readonly HostedTestPanelSelectionChoice[] {
  const suites = [...new Set(descriptors.map((descriptor) => descriptor.suite))].sort(compare);
  return Object.freeze(suites.map((suite) => {
    const selection = Object.freeze({ kind: "suite" as const, suite });
    const count = hosted_test_panel_selected_ids(descriptors, selection).length;
    return Object.freeze({
      key: `suite:${suite}`,
      label: `${suite} (${count})`,
      selection,
      count,
    });
  }));
}

export function hosted_test_panel_test_choices(
  descriptors: readonly TestDescriptor[],
  suite: string,
): readonly HostedTestPanelSelectionChoice[] {
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
