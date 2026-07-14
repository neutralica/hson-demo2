import {
  make_hosted_test_suite_registry,
  type HostedTestSuiteDescriptor,
  type HostedTestSuiteRegistry,
} from "../app/hosted-test/hosted-test-suite";
import { run_test_suites } from "./test-runner";
import type { RunOptions, RunResult, TestEvent } from "../app/demos/test/tests.types";
import { all_livehost_suites } from "../tests/livehost/all-livehost-suites";
import { run_livemap_replay_suite } from "../tests/livemap/run-replay-suite";
import { all_node_safe_hosted_test_suites } from "./node-safe-hosted-test-suites";
import { run_jsdom_hosted_test_suites } from "./dom/jsdom-hosted-test-suites";
import { run_jsdom_hosted_canvas_suites } from "./dom/canvas/jsdom-hosted-canvas-suites";
import { with_hosted_node_globals } from "./dom/hosted-dom-mutex";
import { run_hosted_all_test_suites } from "./hosted-all-test-suites";

export async function run_livehost_all_suite(
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
): Promise<RunResult> {
  return with_hosted_node_globals(() => run_test_suites(all_livehost_suites(), onEvent ?? (() => undefined), options));
}

export async function run_node_all_suite(
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
): Promise<RunResult> {
  return with_hosted_node_globals(() => {
    if (typeof window !== "undefined" || typeof document !== "undefined") {
      throw new Error("node/all must execute in a Node host without browser globals.");
    }
    return run_test_suites(all_node_safe_hosted_test_suites(), onEvent ?? (() => undefined), options);
  });
}

export const REGISTERED_HOSTED_TEST_SUITES: readonly HostedTestSuiteDescriptor[] = Object.freeze([
  Object.freeze({
    id: "hosted/all",
    label: "all hosted",
    run: run_hosted_all_test_suites,
  }),
  Object.freeze({
    id: "livemap/replay",
    label: "livemap/replay",
    run: (onEvent?: (event: TestEvent) => void, options?: RunOptions) =>
      with_hosted_node_globals(() => run_livemap_replay_suite(onEvent, options)),
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
  Object.freeze({
    id: "dom/core",
    label: "DOM core",
    run: run_jsdom_hosted_test_suites,
  }),
  Object.freeze({
    id: "canvas/core",
    label: "Canvas core",
    run: run_jsdom_hosted_canvas_suites,
  }),
]);

export function make_registered_hosted_test_suite_registry(): HostedTestSuiteRegistry {
  return make_hosted_test_suite_registry(REGISTERED_HOSTED_TEST_SUITES);
}
