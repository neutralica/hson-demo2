import type { RunOptions, RunResult, TestEvent } from "../../app/demos/test/tests.types";
import {
  create_hosted_test_livehost as create_hosted_test_livehost_runtime,
  run_hosted_test_action,
  type HostedTestRunIdFactory,
} from "../../app/hosted-test/hosted-test-action";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import type { HostedTestReportController } from "../../app/hosted-test/hosted-test-report";
import type { HostedTestRunId } from "../../app/hosted-test/hosted-test-report-wire.types";
import { run_livehost_all_suite, run_node_all_suite } from "../../hosted-test/registered-hosted-test-suites";
import { run_jsdom_hosted_test_suites } from "../../hosted-test/dom/jsdom-hosted-test-suites";
import { run_livemap_replay_suite } from "../livemap/run-replay-suite";

export * from "../../app/hosted-test/hosted-test-action";

type ReplayRunner = (
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
) => Promise<RunResult>;

export function create_hosted_test_livehost(
  runReplay: ReplayRunner = run_livemap_replay_suite,
  inspectReport?: (report: HostedTestReportController, runId: HostedTestRunId) => void,
  makeRunId?: HostedTestRunIdFactory,
) {
  const registry = make_hosted_test_suite_registry([
    { id: "livemap/replay", label: "livemap/replay", run: runReplay },
    { id: "livehost/all", label: "livehost/all", run: run_livehost_all_suite },
    { id: "node/all", label: "all Node-safe", run: run_node_all_suite },
    { id: "dom/core", label: "DOM core", run: run_jsdom_hosted_test_suites },
  ]);
  return create_hosted_test_livehost_runtime(registry, inspectReport, makeRunId);
}

export function run_hosted_replay_action(
  client: Parameters<typeof run_hosted_test_action>[0],
) {
  return run_hosted_test_action(client, "livemap/replay");
}
