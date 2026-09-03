/** Canonical, runtime-independent test-harness surface. */
export { run_test_suites } from "./core/test-runner";
export { select_test_descriptors } from "../../src/shared/testing/test-selection";
export { make_test_executor_discovery } from "./core/test-discovery";
export { make_test_executor_registry, make_test_executor_registry_from_registrations } from "./core/test-executor";
export { run_selected_test_ids } from "./core/run-selected-test-suites";

export type {
  RunOptions,
  RunResult,
  TestCase,
  TestEvent,
  TestSuite,
} from "./core/test-contracts";
export type { TestDescriptor } from "../../src/shared/testing/test-contracts";
export type { ReportTotals, TerminalStatus } from "../../src/shared/testing/test-run-contract";
export type { TestSelection } from "../../src/shared/testing/test-selection";
export type { TestExecutorDiscovery } from "../../src/shared/testing/test-discovery-contract";
export type { TestExecutorRegistry } from "./core/test-executor";
export type { ExternalLibraryLauncherTarget } from "../../src/shared/testing/external-launcher-contract";
