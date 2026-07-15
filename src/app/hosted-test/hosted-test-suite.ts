import type { RunOptions, RunResult, TestEvent } from "../demos/test/tests.types";

export const HOSTED_TEST_SUITE_IDS = [
  "hosted/all",
  "livemap/replay",
  "livehost/all",
  "node/all",
  "dom/core",
  "canvas/core",
  "category/livetree",
  "category/livemap",
  "category/livehost",
  "category/transform",
  "category/unit",
  "category/dev",
] as const;

export type HostedTestSuiteId = typeof HOSTED_TEST_SUITE_IDS[number];

export const HOSTED_TEST_VISIBLE_SUITES = Object.freeze([
  Object.freeze({ id: "hosted/all", label: "All hosted" }),
  Object.freeze({ id: "category/livetree", label: "LiveTree" }),
  Object.freeze({ id: "category/livemap", label: "LiveMap" }),
  Object.freeze({ id: "category/livehost", label: "LiveHost" }),
  Object.freeze({ id: "category/transform", label: "Transform" }),
  Object.freeze({ id: "category/unit", label: "Unit" }),
  Object.freeze({ id: "category/dev", label: "Dev" }),
] as const satisfies readonly Readonly<{ id: HostedTestSuiteId; label: string }>[]);

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
