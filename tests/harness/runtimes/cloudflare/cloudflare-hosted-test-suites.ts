import type { RunOptions, TestEvent, TestSuite } from "../../core/test-contracts";
import {
  HOSTED_TEST_SUITE_IDS,
  make_hosted_test_suite_registry,
  type HostedTestSuiteDescriptor,
  type HostedTestSuiteId,
} from "../../hosted/hosted-test-suite";
import { all_deterministic_transform_test_suites } from "../../hosted/deterministic-transform-test-suites";
import { run_test_suites } from "../../core/test-runner";
import { all_livehost_suites } from "../../../suites/livehost/suite-registry";
import { run_livemap_replay_suite } from "../../../runners/livemap/run-replay-suite";
import { all_unit_tests } from "../../../suites/unit/suite-registry";

const unsupported = new Set<HostedTestSuiteId>([
  "hosted/all",
  "node/all",
  "dom/core",
  "canvas/core",
  "category/livetree",
  "category/livemap",
  "category/reflect",
  "category/dev",
]);

function run_suites(
  suites: () => readonly TestSuite[],
): HostedTestSuiteDescriptor["run"] {
  return (onEvent: (event: TestEvent) => void = () => undefined, options: RunOptions = {}) =>
    run_test_suites(suites(), onEvent, options);
}

function descriptor(id: HostedTestSuiteId): HostedTestSuiteDescriptor {
  if (unsupported.has(id)) {
    return Object.freeze({
      id,
      label: id,
      async run() {
        throw new Error(`CLOUDFLARE_HOSTED_SUITE_UNAVAILABLE: ${id} requires the Node/jsdom hosted-test runtime and is not available in this Worker deployment slice.`);
      },
    });
  }
  if (id === "livemap/replay") return Object.freeze({ id, label: id, run: run_livemap_replay_suite });
  if (id === "livehost/all" || id === "category/livehost") {
    return Object.freeze({ id, label: id, run: run_suites(all_livehost_suites) });
  }
  if (id === "category/transform") {
    return Object.freeze({ id, label: id, run: run_suites(all_deterministic_transform_test_suites) });
  }
  if (id === "category/unit") return Object.freeze({ id, label: id, run: run_suites(all_unit_tests) });
  throw new Error(`Unhandled Cloudflare hosted-test suite ID: ${id}`);
}

export function make_cloudflare_hosted_test_suite_registry() {
  return make_hosted_test_suite_registry(HOSTED_TEST_SUITE_IDS.map(descriptor));
}
