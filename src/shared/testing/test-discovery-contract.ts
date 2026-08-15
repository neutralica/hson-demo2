import {
  TEST_SUBJECT_IDENTIFIERS,
  type TestCapability,
  type TestCollection,
  type TestDescriptor,
  type TestProvenance,
  type TestSubject,
  type TestSuiteDescriptor,
} from "./test-contracts";
import { test_catalog_version, type TestCatalog } from "./test-catalog-contract";
import type {
  TestExecutorDescriptor,
  TestExecutorKind,
  TestExecutorLocation,
} from "./test-executor-contract";
import { is_test_case_id, is_test_suite_id } from "./test-identity";

export const TEST_EXECUTOR_PROTOCOL_VERSION = 3;

export type TestExecutorDiscoveryRequest = Readonly<Record<string, never>>;

export type TestExecutorDiscovery = Readonly<{
  executor: TestExecutorDescriptor;
  protocolVersion: number;
  catalogVersion: string;
  catalog: TestCatalog;
}>;

export type TestDecodeResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

const CAPABILITIES: readonly TestCapability[] = Object.freeze([
  "javascript", "node", "process", "worker-threads", "synthetic-dom", "synthetic-canvas",
  "browser-dom", "browser", "chromium", "cloudflare-worker", "filesystem", "websocket",
  "network", "local-server", "compiler/typescript", "build-tooling", "dynamic-generated",
  "environment/secrets", "deployment-access",
]);
const SUBJECTS: readonly TestSubject[] = TEST_SUBJECT_IDENTIFIERS;
const COLLECTIONS: readonly TestCollection[] = Object.freeze(["unit", "dev"]);
const PROVENANCES: readonly TestProvenance[] = Object.freeze(["hson-demo2", "hson-live"]);
const EXECUTOR_KINDS: readonly TestExecutorKind[] = Object.freeze(["node", "cloudflare-worker", "browser"]);
const EXECUTOR_LOCATIONS: readonly TestExecutorLocation[] = Object.freeze(["hosted", "local"]);

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function contract_keys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = Object.freeze([]),
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function exact_keys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return contract_keys(value, keys) && Object.keys(value).length === keys.length;
}

function string_set<T extends string>(value: unknown, allowed: readonly T[]): readonly T[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && allowed.includes(item as T))) return undefined;
  if (new Set(value).size !== value.length) return undefined;
  return Object.freeze([...(value as T[])]);
}

function non_negative_integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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
  if (input === undefined || !contract_keys(input, [
    "id", "suiteId", "caseId", "title", "subject", "requirements", "collections", "provenance",
    "suiteOrdinal", "caseOrdinal",
  ], ["sourceRef"])) return undefined;
  const requirements = string_set(input.requirements, CAPABILITIES);
  const collections = string_set(input.collections, COLLECTIONS);
  if (!is_test_case_id(input.id) || !is_test_suite_id(input.suiteId)
    || typeof input.caseId !== "string" || input.id !== `${input.suiteId}::${input.caseId}`
    || typeof input.title !== "string" || !input.title
    || typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)
    || typeof input.provenance !== "string" || !PROVENANCES.includes(input.provenance as TestProvenance)
    || !non_negative_integer(input.suiteOrdinal) || !non_negative_integer(input.caseOrdinal)
    || (input.sourceRef !== undefined && typeof input.sourceRef !== "string")
    || requirements === undefined || collections === undefined) return undefined;
  return Object.freeze({
    id: input.id,
    suiteId: input.suiteId,
    caseId: input.caseId,
    title: input.title,
    subject: input.subject as TestSubject,
    requirements,
    collections,
    provenance: input.provenance as TestProvenance,
    suiteOrdinal: input.suiteOrdinal,
    caseOrdinal: input.caseOrdinal,
    ...(input.sourceRef === undefined ? {} : { sourceRef: input.sourceRef }),
  });
}

function decode_suite_descriptor(value: unknown): TestSuiteDescriptor | undefined {
  const input = record(value);
  if (input === undefined || !contract_keys(input, [
    "id", "title", "subject", "collections", "provenance", "order", "requirements", "executionShape",
  ], ["sourceRef", "declaredChecks"])) return undefined;
  const requirements = string_set(input.requirements, CAPABILITIES);
  const collections = string_set(input.collections, COLLECTIONS);
  if (!is_test_suite_id(input.id)
    || typeof input.title !== "string" || !input.title
    || typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)
    || typeof input.provenance !== "string" || !PROVENANCES.includes(input.provenance as TestProvenance)
    || !non_negative_integer(input.order)
    || (input.executionShape !== "cases"
      && input.executionShape !== "opaque-aggregate"
      && input.executionShape !== "certification-aggregate")
    || (input.sourceRef !== undefined && typeof input.sourceRef !== "string")
    || (input.declaredChecks !== undefined && (!non_negative_integer(input.declaredChecks) || input.declaredChecks < 1))
    || requirements === undefined || collections === undefined) return undefined;
  return Object.freeze({
    id: input.id,
    title: input.title,
    subject: input.subject as TestSubject,
    collections,
    provenance: input.provenance as TestProvenance,
    order: input.order,
    requirements,
    executionShape: input.executionShape,
    ...(input.sourceRef === undefined ? {} : { sourceRef: input.sourceRef }),
    ...(input.declaredChecks === undefined ? {} : { declaredChecks: input.declaredChecks }),
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
    || typeof input.supportsStreaming !== "boolean" || typeof input.supportsCancellation !== "boolean"
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

export function decode_test_executor_discovery(value: unknown): TestDecodeResult<TestExecutorDiscovery> {
  const input = record(value);
  if (input === undefined || !exact_keys(input, ["executor", "protocolVersion", "catalogVersion", "catalog"])) {
    return Object.freeze({ ok: false, issues: Object.freeze(["Invalid tests.discover result shape."]) });
  }
  const executor = decode_executor(input.executor);
  const catalogInput = record(input.catalog);
  const suites = catalogInput !== undefined && exact_keys(catalogInput, ["suites", "tests"])
    && Array.isArray(catalogInput.suites) ? catalogInput.suites.map(decode_suite_descriptor) : undefined;
  const tests = catalogInput !== undefined && Array.isArray(catalogInput.tests)
    ? catalogInput.tests.map(decode_descriptor) : undefined;
  if (executor === undefined || input.protocolVersion !== TEST_EXECUTOR_PROTOCOL_VERSION
    || typeof input.catalogVersion !== "string" || !input.catalogVersion
    || suites === undefined || suites.some((descriptor) => descriptor === undefined)
    || tests === undefined || tests.some((descriptor) => descriptor === undefined)) {
    return Object.freeze({ ok: false, issues: Object.freeze(["Invalid tests.discover result data."]) });
  }
  let catalog: TestCatalog;
  try {
    catalog = Object.freeze({
      suites: Object.freeze(suites as TestSuiteDescriptor[]),
      tests: Object.freeze(tests as TestDescriptor[]),
    });
    test_catalog_version(catalog);
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
    }),
  });
}
