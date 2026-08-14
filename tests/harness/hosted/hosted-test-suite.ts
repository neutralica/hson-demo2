import type { RunOptions, RunResult, TestEvent } from "../core/test-contracts";
import type { HostedTestSuiteId } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";

export type HostedTestSuiteRunner = (
  onEvent?: (event: TestEvent) => void,
  options?: RunOptions,
) => Promise<RunResult>;

export type HostedTestSuiteDescriptor = Readonly<{
  id: HostedTestSuiteId;
  label: string;
  run: HostedTestSuiteRunner;
}>;

export type HostedTestSuiteRegistry = Readonly<{
  list(): readonly HostedTestSuiteDescriptor[];
  get(id: HostedTestSuiteId): HostedTestSuiteDescriptor;
}>;

export function make_hosted_test_suite_registry(
  descriptors: readonly HostedTestSuiteDescriptor[],
): HostedTestSuiteRegistry {
  const byId = new Map<HostedTestSuiteId, HostedTestSuiteDescriptor>();
  for (const descriptor of descriptors) {
    if (byId.has(descriptor.id)) throw new Error(`Duplicate hosted-test suite descriptor: ${descriptor.id}`);
    byId.set(descriptor.id, Object.freeze({ ...descriptor }));
  }
  const list = Object.freeze([...byId.values()]);
  return Object.freeze({
    list: () => list,
    get(id: HostedTestSuiteId) {
      const descriptor = byId.get(id);
      if (descriptor === undefined) throw new Error(`Unknown hosted-test suite: ${id}`);
      return descriptor;
    },
  });
}
