/** Canonical, runtime-independent test-harness surface. */
export { run_test_suites } from "./core/test-runner";
export { select_test_descriptors } from "./core/test-selection";
export { make_test_executor_discovery } from "./core/test-discovery";
export { make_test_executor_registry, make_test_executor_registry_from_registrations } from "./core/test-executor";
export { run_selected_test_ids } from "./core/run-selected-test-suites";

export type {
  RunOptions,
  RunResult,
  TestCase,
  TestDescriptor,
  TestEvent,
  TestSuite,
  TestSummary,
} from "./core/test-contracts";
export type { TestSelection } from "./core/test-selection";
export type { TestExecutorDiscovery } from "./core/test-discovery";
export type { TestExecutorRegistry } from "./core/test-executor";
export type { ExternalLibraryLauncherTarget } from "./core/external-launcher-contract";
