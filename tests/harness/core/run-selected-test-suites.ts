import type { RunOptions, RunResult, TestEvent } from "./test-contracts";
import type { TestExecutorRegistry } from "./test-executor";
import { selected_test_suites } from "./test-selected-run";
import { run_test_suites } from "./test-runner";

export function run_selected_test_ids(
  registry: TestExecutorRegistry,
  testIds: readonly string[],
  onEvent: (event: TestEvent) => void,
  options: RunOptions = {},
): Promise<RunResult> {
  return run_test_suites(selected_test_suites(registry, testIds), onEvent, options);
}
