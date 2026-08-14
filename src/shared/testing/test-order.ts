import {
  CANONICAL_TEST_COLLECTION_ORDER,
  CANONICAL_TEST_SUBJECT_ORDER,
  type TestCollection,
  type TestDescriptor,
  type TestSuiteDescriptor,
  type TestSubject,
} from "./test-contracts";

type OrderedDescriptor = Pick<TestSuiteDescriptor, "id" | "subject" | "collections" | "order">;

function collection_rank(collections: readonly TestCollection[]): number | undefined {
  for (let index = 0; index < CANONICAL_TEST_COLLECTION_ORDER.length; index += 1) {
    if (collections.includes(CANONICAL_TEST_COLLECTION_ORDER[index]!)) return index;
  }
  return undefined;
}

export function test_presentation_rank(
  subject: TestSubject,
  collections: readonly TestCollection[],
): number {
  const subjectRank = CANONICAL_TEST_SUBJECT_ORDER.indexOf(
    subject as typeof CANONICAL_TEST_SUBJECT_ORDER[number],
  );
  if (subjectRank >= 0) return subjectRank;
  const collection = collection_rank(collections);
  return collection === undefined
    ? CANONICAL_TEST_SUBJECT_ORDER.length + CANONICAL_TEST_COLLECTION_ORDER.length
    : CANONICAL_TEST_SUBJECT_ORDER.length + collection;
}

export function compare_test_suites(left: OrderedDescriptor, right: OrderedDescriptor): number {
  return test_presentation_rank(left.subject, left.collections)
    - test_presentation_rank(right.subject, right.collections)
    || left.order - right.order
    || left.id.localeCompare(right.id);
}

export function compare_test_descriptors(left: TestDescriptor, right: TestDescriptor): number {
  return test_presentation_rank(left.subject, left.collections)
    - test_presentation_rank(right.subject, right.collections)
    || left.suiteOrdinal - right.suiteOrdinal
    || left.caseOrdinal - right.caseOrdinal
    || left.id.localeCompare(right.id);
}
