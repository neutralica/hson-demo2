import { run_test_suites } from "../../app/demos/test/test-runner";
import type { RunOptions, RunResult, TestEvent } from "../../app/demos/test/tests.types";
import { livemap_suite_replay } from "./replay-suite";

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
