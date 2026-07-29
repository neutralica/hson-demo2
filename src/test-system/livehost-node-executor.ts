import type { TestExecutorDescriptor, TestExecutorRegistry } from "./test-executor";
import { make_test_executor_registry } from "./test-executor";
import { all_canonical_portable_test_suites } from "../hosted-test/canonical-portable-test-suites";
import { all_canonical_synthetic_dom_test_suites } from "../hosted-test/canonical-synthetic-dom-test-suites";
import { hosted_replay_action_in_memory_suite } from "../tests/livehost-tests/hosted-replay-action-in-memory-suite";
import { node_application_host_suite } from "../tests/livehost-tests/node-application-host-suite";

export const LOCAL_NODE_LIVEHOST_EXECUTOR = Object.freeze({
  id: "local-node-livehost",
  kind: "node",
  label: "Local Node LiveHost",
  location: "hosted",
  capabilities: Object.freeze({
    provides: Object.freeze(["javascript", "node", "synthetic-dom"] as const),
  }),
  supportsStreaming: true,
  supportsCancellation: false,
}) satisfies TestExecutorDescriptor;

export function make_local_node_livehost_executor_registry(): TestExecutorRegistry {
  return make_test_executor_registry(LOCAL_NODE_LIVEHOST_EXECUTOR, [
    ...all_canonical_portable_test_suites(),
    ...all_canonical_synthetic_dom_test_suites(),
    hosted_replay_action_in_memory_suite(),
    node_application_host_suite(),
  ]);
}
