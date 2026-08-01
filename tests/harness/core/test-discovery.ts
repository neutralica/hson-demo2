import {
  TEST_SUBJECT_IDENTIFIERS,
  type TestSubject,
} from "../app/demos/test/tests.types";
import type {
  TestCapability,
  TestCollection,
  TestDescriptor,
} from "../app/demos/test/tests.types";
import { make_test_catalog, test_catalog_version, type TestCatalog } from "./test-catalog";
import type {
  TestExecutorDescriptor,
  TestExecutorKind,
  TestExecutorLocation,
  TestExecutorRegistry,
} from "./test-executor";
import type { ExternalLibraryLauncherTarget } from "./external-library-launchers";

export const TEST_EXECUTOR_PROTOCOL_VERSION = 2;

export type TestExecutorDiscoveryRequest = Readonly<Record<string, never>>;

export type TestExecutorDiscovery = Readonly<{
  executor: TestExecutorDescriptor;
  protocolVersion: number;
  catalogVersion: string;
  catalog: TestCatalog;
  externalTargets: readonly ExternalLibraryLauncherTarget[];
}>;

export type TestDecodeResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

const CAPABILITIES: readonly TestCapability[] = Object.freeze([
  "javascript", "node", "synthetic-dom", "browser-dom", "worker", "filesystem", "websocket",
]);
const SUBJECTS: readonly TestSubject[] = TEST_SUBJECT_IDENTIFIERS;
const COLLECTIONS: readonly TestCollection[] = Object.freeze(["unit", "dev"]);
const EXECUTOR_KINDS: readonly TestExecutorKind[] = Object.freeze(["node", "cloudflare-worker", "browser"]);
const EXECUTOR_LOCATIONS: readonly TestExecutorLocation[] = Object.freeze(["hosted", "local"]);

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function exact_keys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function string_set<T extends string>(value: unknown, allowed: readonly T[]): readonly T[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && allowed.includes(item as T))) return undefined;
  if (new Set(value).size !== value.length) return undefined;
  return Object.freeze([...(value as T[])]);
}

function external_target_issue(
  value: unknown,
  index: number,
): string | undefined {
  const path = `externalTargets[${index}]`;
  const target = record(value);
  if (target === undefined) return `${path}: expected an object.`;
  if (!exact_keys(target, [
    "id", "launcherId", "subject", "displayName", "runtime", "executableChecks", "collections",
  ])) return `${path}: fields do not match the external-target contract.`;
  const runtimes = ["node", "node-synthetic-dom", "node-real-websocket", "node-real-websocket-process"] as const;
  if (typeof target.id !== "string" || !target.id.startsWith("library::")) {
    return `${path}.id: expected a library:: identifier.`;
  }
  if (typeof target.launcherId !== "string" || !target.launcherId) {
    return `${path}.launcherId: expected a non-empty string.`;
  }
  if (typeof target.subject !== "string" || !SUBJECTS.includes(target.subject as TestSubject)) {
    return `${path}.subject: unsupported test subject ${JSON.stringify(target.subject)}.`;
  }
  if (typeof target.displayName !== "string" || !target.displayName) {
    return `${path}.displayName: expected a non-empty string.`;
  }
  if (typeof target.runtime !== "string" || !runtimes.includes(target.runtime as typeof runtimes[number])) {
    return `${path}.runtime: unsupported launcher runtime ${JSON.stringify(target.runtime)}.`;
  }
  if (typeof target.executableChecks !== "number"
    || !Number.isInteger(target.executableChecks)
    || target.executableChecks < 1) {
    return `${path}.executableChecks: expected a positive integer.`;
  }
  if (!Array.isArray(target.collections) || !target.collections.every((entry) => typeof entry === "string")) {
    return `${path}.collections: expected an array of strings.`;
  }
  return undefined;
}

export function decode_test_executor_discovery_request(value: unknown): TestDecodeResult<TestExecutorDiscoveryRequest> {
  const input = record(value);
  if (input === undefined || Object.keys(input).length !== 0) {
    return Object.freeze({ ok: false, issues: Object.freeze(["tests.discover requires an explicit empty object payload."]) });
  }
  return Object.freeze({ ok: true, value: Object.freeze({}) });
}

function decode_descriptor(value: unknown): TestDescriptor | undefined {
  const input = record(value);
  if (input === undefined || !exact_keys(input, ["id", "suite", "name", "subject", "requirements", "collections"])) return undefined;
  const requirements = string_set(input.requirements, CAPABILITIES);
  const collections = string_set(input.collections, COLLECTIONS);
  if (typeof input.id !== "string" || !input.id
    || typeof input.suite !== "string" || !input.suite
    || typeof input.name !== "string" || !input.name
    || typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)
    || requirements === undefined || collections === undefined) return undefined;
  if (input.id !== `${input.suite}::${input.name}`) return undefined;
  return Object.freeze({
    id: input.id,
    suite: input.suite,
    name: input.name,
    subject: input.subject as TestSubject,
    requirements,
    collections,
  });
}

function decode_executor(value: unknown): TestExecutorDescriptor | undefined {
  const input = record(value);
  if (input === undefined || !exact_keys(input, [
    "id", "kind", "label", "location", "capabilities", "supportsStreaming", "supportsCancellation",
  ])) return undefined;
  const capabilities = record(input.capabilities);
  const provides = capabilities !== undefined && exact_keys(capabilities, ["provides"])
    ? string_set(capabilities.provides, CAPABILITIES)
    : undefined;
  if (typeof input.id !== "string" || !input.id
    || typeof input.kind !== "string" || !EXECUTOR_KINDS.includes(input.kind as TestExecutorKind)
    || typeof input.label !== "string" || !input.label
    || typeof input.location !== "string" || !EXECUTOR_LOCATIONS.includes(input.location as TestExecutorLocation)
    || typeof input.supportsStreaming !== "boolean"
    || typeof input.supportsCancellation !== "boolean"
    || provides === undefined) return undefined;
  return Object.freeze({
    id: input.id,
    kind: input.kind as TestExecutorKind,
    label: input.label,
    location: input.location as TestExecutorLocation,
    capabilities: Object.freeze({ provides }),
    supportsStreaming: input.supportsStreaming,
    supportsCancellation: input.supportsCancellation,
  });
}

export function make_test_executor_discovery(
  registry: TestExecutorRegistry,
  externalTargets: readonly ExternalLibraryLauncherTarget[] = Object.freeze([]),
): TestExecutorDiscovery {
  const catalog = make_test_catalog(registry.catalog.tests);
  return Object.freeze({
    executor: Object.freeze({
      ...registry.executor,
      capabilities: Object.freeze({ provides: Object.freeze([...registry.executor.capabilities.provides]) }),
    }),
    protocolVersion: TEST_EXECUTOR_PROTOCOL_VERSION,
    catalogVersion: test_catalog_version(catalog),
    catalog,
    externalTargets: Object.freeze([...externalTargets]),
  });
}

export function decode_test_executor_discovery(value: unknown): TestDecodeResult<TestExecutorDiscovery> {
  const input = record(value);
  if (input === undefined || !exact_keys(input, ["executor", "protocolVersion", "catalogVersion", "catalog", "externalTargets"])) {
    return Object.freeze({ ok: false, issues: Object.freeze(["Invalid tests.discover result shape."]) });
  }
  const executor = decode_executor(input.executor);
  const catalogInput = record(input.catalog);
  const rawTests = catalogInput !== undefined && exact_keys(catalogInput, ["tests"]) && Array.isArray(catalogInput.tests)
    ? catalogInput.tests
    : undefined;
  const descriptors = rawTests?.map(decode_descriptor);
  const externalTargetIssues = Array.isArray(input.externalTargets)
    ? input.externalTargets.flatMap((value, index) => {
      const issue = external_target_issue(value, index);
      return issue === undefined ? [] : [issue];
    })
    : ["externalTargets: expected an array."];
  const externalTargets = externalTargetIssues.length === 0 && Array.isArray(input.externalTargets)
    ? input.externalTargets.map((value) => {
    const target = record(value);
    if (target === undefined) return undefined;
    const runtimes = ["node", "node-synthetic-dom", "node-real-websocket", "node-real-websocket-process"] as const;
    const collections = Array.isArray(target.collections)
      && target.collections.every((entry) => typeof entry === "string")
      ? target.collections
      : undefined;
    if (typeof target.id !== "string"
      || typeof target.launcherId !== "string"
      || typeof target.subject !== "string" || !SUBJECTS.includes(target.subject as TestSubject)
      || typeof target.displayName !== "string"
      || typeof target.runtime !== "string" || !runtimes.includes(target.runtime as typeof runtimes[number])
      || typeof target.executableChecks !== "number"
      || collections === undefined) return undefined;
    return Object.freeze({
      id: target.id,
      launcherId: target.launcherId,
      subject: target.subject as TestSubject,
      displayName: target.displayName,
      runtime: target.runtime as typeof runtimes[number],
      executableChecks: target.executableChecks,
      collections: Object.freeze([...collections] as string[]),
    });
  }) : undefined;
  if (externalTargetIssues.length > 0) {
    return Object.freeze({ ok: false, issues: Object.freeze(externalTargetIssues) });
  }
  if (executor === undefined
    || input.protocolVersion !== TEST_EXECUTOR_PROTOCOL_VERSION
    || typeof input.catalogVersion !== "string" || !input.catalogVersion
    || descriptors === undefined || descriptors.some((descriptor) => descriptor === undefined)
    || externalTargets === undefined || externalTargets.some((target) => target === undefined)) {
    return Object.freeze({ ok: false, issues: Object.freeze(["Invalid tests.discover result data."]) });
  }
  let catalog: TestCatalog;
  try {
    catalog = make_test_catalog(descriptors as TestDescriptor[]);
  } catch (error) {
    return Object.freeze({ ok: false, issues: Object.freeze([error instanceof Error ? error.message : String(error)]) });
  }
  const expectedVersion = test_catalog_version(catalog);
  if (input.catalogVersion !== expectedVersion) {
    return Object.freeze({ ok: false, issues: Object.freeze(["tests.discover catalog version does not match its descriptors."]) });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      executor,
      protocolVersion: TEST_EXECUTOR_PROTOCOL_VERSION,
      catalogVersion: expectedVersion,
      catalog,
      externalTargets: Object.freeze(externalTargets as ExternalLibraryLauncherTarget[]),
    }),
  });
}
