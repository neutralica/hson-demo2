import { run_test_suites } from "../../harness/core/test-runner";
import type { RunOptions, RunResult, TestEvent } from "../../harness/core/test-contracts";
import { livemap_suite_replay } from "../../suites/livemap/replay-suite";

export async function run_livemap_replay_suite(
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
): Promise<RunResult> {
  return run_test_suites(
    [livemap_suite_replay()],
    onEvent ?? (() => {}),
    options,
  );
}
