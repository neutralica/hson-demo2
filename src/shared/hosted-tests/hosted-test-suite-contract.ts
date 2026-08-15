/** The sole production report identity for an authoritative exact selection. */
export const HOSTED_TEST_SELECTED_RUN_TARGET = "canonical/selected" as const;
export type HostedTestRunTarget = typeof HOSTED_TEST_SELECTED_RUN_TARGET;

export function is_hosted_test_run_target(value: unknown): value is HostedTestRunTarget {
  return value === HOSTED_TEST_SELECTED_RUN_TARGET;
}
