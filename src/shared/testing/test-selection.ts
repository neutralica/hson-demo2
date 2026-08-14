import type { TestCollection, TestDescriptor, TestSubject } from "./test-contracts";

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
    && (selection.suite === undefined || descriptor.suiteId === selection.suite)
    && (selection.test === undefined || descriptor.id === selection.test)
  )));
}
