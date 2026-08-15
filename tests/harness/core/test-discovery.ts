import { make_test_catalog } from "./test-catalog";
import type { TestExecutorRegistry } from "./test-executor";
import {
  external_launcher_suite_descriptor,
  type ExternalLibraryLauncherTarget,
} from "../../../src/shared/testing/external-launcher-contract";
import {
  TEST_EXECUTOR_PROTOCOL_VERSION,
  type TestExecutorDiscovery,
} from "../../../src/shared/testing/test-discovery-contract";
import { test_catalog_version } from "../../../src/shared/testing/test-catalog-contract";
import type { TestSuiteDescriptor } from "../../../src/shared/testing/test-contracts";

export function make_test_executor_discovery(
  registry: TestExecutorRegistry,
  launcherBindings: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
  additionalSuites: readonly TestSuiteDescriptor[] = Object.freeze([]),
): TestExecutorDiscovery {
  const catalog = make_test_catalog(
    registry.catalog.tests,
    [...registry.catalog.suites, ...launcherBindings.map(external_launcher_suite_descriptor), ...additionalSuites],
  );
  return Object.freeze({
    executor: Object.freeze({
      ...registry.executor,
      capabilities: Object.freeze({ provides: Object.freeze([...registry.executor.capabilities.provides]) }),
    }),
    protocolVersion: TEST_EXECUTOR_PROTOCOL_VERSION,
    catalogVersion: test_catalog_version(catalog),
    catalog,
  });
}
