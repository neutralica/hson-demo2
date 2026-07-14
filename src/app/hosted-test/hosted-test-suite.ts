import type { RunOptions, RunResult, TestEvent } from "../demos/test/tests.types";

export const HOSTED_TEST_SUITE_IDS = ["livemap/replay", "livehost/all", "node/all"] as const;

export type HostedTestSuiteId = typeof HOSTED_TEST_SUITE_IDS[number];

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

export function is_hosted_test_suite_id(value: unknown): value is HostedTestSuiteId {
  return typeof value === "string" && (HOSTED_TEST_SUITE_IDS as readonly string[]).includes(value);
}

export function make_hosted_test_suite_registry(
  descriptors: readonly HostedTestSuiteDescriptor[],
): HostedTestSuiteRegistry {
  const byId = new Map<HostedTestSuiteId, HostedTestSuiteDescriptor>();
  for (const descriptor of descriptors) {
    if (byId.has(descriptor.id)) throw new Error(`Duplicate hosted-test suite descriptor: ${descriptor.id}`);
    byId.set(descriptor.id, Object.freeze({ ...descriptor }));
  }
  for (const id of HOSTED_TEST_SUITE_IDS) {
    if (!byId.has(id)) throw new Error(`Missing hosted-test suite descriptor: ${id}`);
  }
  if (byId.size !== HOSTED_TEST_SUITE_IDS.length) throw new Error("Hosted-test registry contains unsupported descriptors.");
  const list = Object.freeze(HOSTED_TEST_SUITE_IDS.map((id) => byId.get(id)!));
  return Object.freeze({
    list: () => list,
    get(id: HostedTestSuiteId) {
      const descriptor = byId.get(id);
      if (descriptor === undefined) throw new Error(`Unknown hosted-test suite: ${id}`);
      return descriptor;
    },
  });
}
