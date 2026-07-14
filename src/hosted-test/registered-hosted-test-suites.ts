import {
  make_hosted_test_suite_registry,
  type HostedTestSuiteDescriptor,
  type HostedTestSuiteRegistry,
} from "../app/hosted-test/hosted-test-suite";
import { run_test_suites } from "../app/demos/test/test-runner";
import type { RunOptions, RunResult, TestEvent } from "../app/demos/test/tests.types";
import { all_livehost_suites } from "../tests/livehost/all-livehost-suites";
import { run_livemap_replay_suite } from "../tests/livemap/run-replay-suite";
import { all_node_safe_hosted_test_suites } from "./node-safe-hosted-test-suites";

export async function run_livehost_all_suite(
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
): Promise<RunResult> {
  return run_test_suites(all_livehost_suites(), onEvent ?? (() => undefined), options);
}

export async function run_node_all_suite(
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
): Promise<RunResult> {
  return run_test_suites(all_node_safe_hosted_test_suites(), onEvent ?? (() => undefined), options);
}

export const REGISTERED_HOSTED_TEST_SUITES: readonly HostedTestSuiteDescriptor[] = Object.freeze([
  Object.freeze({
    id: "livemap/replay",
    label: "livemap/replay",
    run: run_livemap_replay_suite,
  }),
  Object.freeze({
    id: "livehost/all",
    label: "livehost/all",
    run: run_livehost_all_suite,
  }),
  Object.freeze({
    id: "node/all",
    label: "all Node-safe",
    run: run_node_all_suite,
  }),
]);

export function make_registered_hosted_test_suite_registry(): HostedTestSuiteRegistry {
  return make_hosted_test_suite_registry(REGISTERED_HOSTED_TEST_SUITES);
}
