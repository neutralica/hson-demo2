import type { TestCatalog } from "./test-catalog-contract";
import type { TestExecutorDescriptor } from "./test-executor-contract";

export const TEST_EXECUTOR_PROTOCOL_VERSION = 3;

/** In-process executable discovery assembled from the owning suite registries. */
export type TestExecutorDiscovery = Readonly<{
  executor: TestExecutorDescriptor;
  protocolVersion: number;
  catalogVersion: string;
  catalog: TestCatalog;
}>;
