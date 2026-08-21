import type { TestExecutorDescriptor } from "../../../../src/shared/testing/test-executor-contract";
import type { TestExecutorRegistry } from "../../core/test-executor";
import { make_test_executor_registry } from "../../core/test-executor";
import { all_canonical_portable_test_suites } from "../../hosted/canonical-portable-test-suites";
import { all_canonical_synthetic_dom_test_suites } from "../../hosted/canonical-synthetic-dom-test-suites";
import { node_application_host_suite } from "../../../suites/livehost/node-application-host-suite";
import { circuit_worker_service_suite } from "../../../suites/livehost/circuit-worker-service-suite";
import { circuit_locus_integration_suite } from "../../../suites/livehost/circuit-livehost-integration-suite";
import { circuit_worker_parity_suite } from "../../../suites/livehost/circuit-worker-parity-suite";
import { phase3b_process_cancellation_suite } from "../../../suites/livehost/phase3b-process-cancellation-suite";
import { phase3b_panel_cancellation_suite } from "../../../suites/livehost/phase3b-panel-cancellation-suite";
import { hosted_test_lifecycle_suite } from "../../../suites/livehost/hosted-test-lifecycle-suite";
import { all_browser_locus_test_suites } from "./browser/browser-test-suites";

export const LOCAL_NODE_LOCUS_EXECUTOR = Object.freeze({
  id: "local-node-livehost",
  kind: "node",
  label: "Local Node Locus",
  location: "hosted",
  capabilities: Object.freeze({
    provides: Object.freeze([
      "javascript",
      "node",
      "process",
      "worker-threads",
      "synthetic-dom",
      "synthetic-canvas",
      "filesystem",
      "websocket",
      "network",
      "local-server",
      "compiler/typescript",
      "build-tooling",
      "dynamic-generated",
    ] as const),
  }),
  supportsStreaming: true,
  supportsCancellation: true,
}) satisfies TestExecutorDescriptor;

export function make_local_node_locus_executor_registry(): TestExecutorRegistry {
  return make_test_executor_registry(LOCAL_NODE_LOCUS_EXECUTOR, [
    ...all_canonical_portable_test_suites(),
    ...all_canonical_synthetic_dom_test_suites(),
    node_application_host_suite(),
    hosted_test_lifecycle_suite(),
    circuit_worker_service_suite(),
    circuit_locus_integration_suite(),
    circuit_worker_parity_suite(),
    phase3b_process_cancellation_suite(),
    phase3b_panel_cancellation_suite(),
  ]);
}

export const NODE_LOCUS_MOTHERSHIP_EXECUTOR = Object.freeze({
  ...LOCAL_NODE_LOCUS_EXECUTOR,
  id: "node-livehost-mothership",
  label: "Node Locus Mothership",
  capabilities: Object.freeze({ provides: Object.freeze([
    ...LOCAL_NODE_LOCUS_EXECUTOR.capabilities.provides,
    "browser-dom",
    "browser-raster",
    "browser",
    "chromium",
  ] as const) }),
}) satisfies TestExecutorDescriptor;

export function make_node_locus_mothership_executor_registry(): TestExecutorRegistry {
  return make_test_executor_registry(NODE_LOCUS_MOTHERSHIP_EXECUTOR, [
    ...all_canonical_portable_test_suites(),
    ...all_canonical_synthetic_dom_test_suites(),
    node_application_host_suite(),
    hosted_test_lifecycle_suite(),
    circuit_worker_service_suite(),
    circuit_locus_integration_suite(),
    circuit_worker_parity_suite(),
    phase3b_process_cancellation_suite(),
    phase3b_panel_cancellation_suite(),
    ...all_browser_locus_test_suites(),
  ]);
}
