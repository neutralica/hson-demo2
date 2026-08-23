import type { RunOptions } from "../core/test-contracts";

// Half of a nominal 60 Hz frame: enough room for transport/recovery work while
// keeping runner batching intact. This is an execution budget, not a timeout.
export const HOSTED_TEST_EVENT_LOOP_BUDGET_MS = 8;

export const HOSTED_TEST_RUN_OPTIONS: RunOptions = Object.freeze({
  yieldAfterMs: HOSTED_TEST_EVENT_LOOP_BUDGET_MS,
  yieldBetweenSuites: false,
});

export const HOSTED_TEST_RICH_RUN_OPTIONS: RunOptions = Object.freeze({
  ...HOSTED_TEST_RUN_OPTIONS,
  richDiagnostics: true,
  includePassedDiagnostics: true,
});
