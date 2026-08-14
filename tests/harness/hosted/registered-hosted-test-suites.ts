import {
  make_hosted_test_suite_registry,
  type HostedTestSuiteDescriptor,
  type HostedTestSuiteRegistry,
} from "./hosted-test-suite";
import { run_test_suites } from "../core/test-runner";
import type { RunOptions, RunResult, TestEvent } from "../core/test-contracts";
import { all_livehost_suites } from "../../suites/livehost/suite-registry";
import { run_livemap_replay_suite } from "../../runners/livemap/run-replay-suite";
import { all_node_safe_hosted_test_suites } from "./node-safe-hosted-test-suites";
import { run_jsdom_hosted_test_suites } from "../runtimes/dom/jsdom-hosted-test-suites";
import { run_jsdom_hosted_canvas_suites } from "../runtimes/dom/canvas/jsdom-hosted-canvas-suites";
import { with_hosted_node_globals } from "../runtimes/dom/hosted-dom-mutex";
import { run_hosted_all_test_suites, run_hosted_test_category, type HostedTestCategory } from "./hosted-all-test-suites";
import { CANONICAL_TEST_COLLECTION_ORDER, CANONICAL_TEST_SUBJECT_ORDER } from "../core/test-order";

const category_descriptor = (category: HostedTestCategory, label: string): HostedTestSuiteDescriptor => Object.freeze({
  id: `category/${category}` as HostedTestSuiteDescriptor["id"],
  label,
  run: (onEvent, options) => run_hosted_test_category(category, onEvent, options),
});

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
  ...CANONICAL_TEST_SUBJECT_ORDER.map((subject) => category_descriptor(subject, subject)),
  ...CANONICAL_TEST_COLLECTION_ORDER.map((collection) => category_descriptor(collection, collection)),
]);

export function make_registered_hosted_test_suite_registry(): HostedTestSuiteRegistry {
  return make_hosted_test_suite_registry(REGISTERED_HOSTED_TEST_SUITES);
}
