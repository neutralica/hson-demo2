import type { TestCollection, TestDescriptor, TestSubject } from "./test-contracts";

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

export function compare_test_visitor_order(left: string, right: string): number {
  const leftRank = VISITOR_CATEGORY_ORDER.indexOf(visitor_category(left) as typeof VISITOR_CATEGORY_ORDER[number]);
  const rightRank = VISITOR_CATEGORY_ORDER.indexOf(visitor_category(right) as typeof VISITOR_CATEGORY_ORDER[number]);
  const normalizedLeftRank = leftRank < 0 ? VISITOR_CATEGORY_ORDER.length : leftRank;
  const normalizedRightRank = rightRank < 0 ? VISITOR_CATEGORY_ORDER.length : rightRank;
  return normalizedLeftRank - normalizedRightRank || (left < right ? -1 : left > right ? 1 : 0);
}

export type TestSelection = Readonly<{
  subject?: TestSubject;
  collection?: TestCollection;
  suite?: string;
  test?: string;
}>;

export function select_test_descriptors(
  descriptors: readonly TestDescriptor[],
  selection: TestSelection,
): readonly TestDescriptor[] {
  return Object.freeze(descriptors.filter((descriptor) => (
    (selection.subject === undefined || descriptor.subject === selection.subject)
    && (selection.collection === undefined || descriptor.collections.includes(selection.collection))
    && (selection.suite === undefined || descriptor.suite === selection.suite)
    && (selection.test === undefined || descriptor.id === selection.test)
  )));
}
