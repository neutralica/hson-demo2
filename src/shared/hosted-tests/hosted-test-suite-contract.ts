import {
  CANONICAL_TEST_COLLECTION_ORDER,
  CANONICAL_TEST_SUBJECT_ORDER,
} from "../testing/test-contracts";

export const HOSTED_TEST_SUITE_IDS = [
  "hosted/all",
  "livemap/replay",
  "livehost/all",
  "node/all",
  "dom/core",
  "canvas/core",
  "category/transform",
  "category/livemap",
  "category/livetree",
  "category/livehost",
  "category/reflect",
  "category/unit",
  "category/dev",
] as const;

export type HostedTestSuiteId = typeof HOSTED_TEST_SUITE_IDS[number];

/** Report identity for an exact canonical test-ID selection. It is not a legacy suite route. */
export const HOSTED_TEST_SELECTED_RUN_TARGET = "canonical/selected" as const;
export type HostedTestRunTarget = HostedTestSuiteId | typeof HOSTED_TEST_SELECTED_RUN_TARGET;

export const HOSTED_TEST_VISIBLE_SUITES = Object.freeze([
  Object.freeze({ id: "hosted/all", label: "all" }),
  ...CANONICAL_TEST_SUBJECT_ORDER.map((subject) => Object.freeze({
    id: `category/${subject}` as HostedTestSuiteId,
    label: subject,
  })),
  ...CANONICAL_TEST_COLLECTION_ORDER.map((collection) => Object.freeze({
    id: `category/${collection}` as HostedTestSuiteId,
    label: collection,
  })),
] as const satisfies readonly Readonly<{ id: HostedTestSuiteId; label: string }>[]);

export function is_hosted_test_suite_id(value: unknown): value is HostedTestSuiteId {
  return typeof value === "string" && (HOSTED_TEST_SUITE_IDS as readonly string[]).includes(value);
}

export function is_hosted_test_run_target(value: unknown): value is HostedTestRunTarget {
  return value === HOSTED_TEST_SELECTED_RUN_TARGET || is_hosted_test_suite_id(value);
}
