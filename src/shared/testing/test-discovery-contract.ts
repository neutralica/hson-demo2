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

const MAX_DISCOVERY_ISSUES = 32;

const CAPABILITIES: readonly TestCapability[] = Object.freeze([
  "javascript", "node", "process", "worker-threads", "synthetic-dom", "synthetic-canvas",
  "browser-dom", "browser-raster", "browser", "chromium", "cloudflare-worker", "filesystem", "websocket",
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

function add_issue(issues: string[], path: string, reason: string): void {
  if (issues.length < MAX_DISCOVERY_ISSUES) issues.push(`${path}: ${reason}`);
}

function contract_key_issues(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: string[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) add_issue(issues, `${path}.${key}`, "missing required field");
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add_issue(issues, `${path}.${key}`, "unexpected field");
  }
}

function invalid_result(summary: string, issues: readonly string[]): TestDecodeResult<never> {
  return Object.freeze({ ok: false, issues: Object.freeze([summary, ...issues]) });
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

function decode_descriptor(value: unknown, path: string, issues: string[]): TestDescriptor | undefined {
  const input = record(value);
  if (input === undefined) {
    add_issue(issues, path, "expected test descriptor object");
    return undefined;
  }
  contract_key_issues(input, [
    "id", "suiteId", "caseId", "title", "subject", "requirements", "collections", "provenance",
    "suiteOrdinal", "caseOrdinal",
  ], ["sourceRef"], path, issues);
  const requirements = string_set(input.requirements, CAPABILITIES);
  const collections = string_set(input.collections, COLLECTIONS);
  const before = issues.length;
  if (!is_test_case_id(input.id)) add_issue(issues, `${path}.id`, "expected canonical test case ID");
  if (!is_test_suite_id(input.suiteId)) add_issue(issues, `${path}.suiteId`, "expected canonical test suite ID");
  if (typeof input.caseId !== "string") add_issue(issues, `${path}.caseId`, "expected string");
  if (typeof input.id === "string" && typeof input.suiteId === "string" && typeof input.caseId === "string"
    && input.id !== `${input.suiteId}::${input.caseId}`) {
    add_issue(issues, `${path}.id`, "must equal suiteId + '::' + caseId");
  }
  if (typeof input.title !== "string" || !input.title) add_issue(issues, `${path}.title`, "expected non-empty string");
  if (typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)) {
    add_issue(issues, `${path}.subject`, "expected registered test subject identifier");
  }
  if (typeof input.provenance !== "string" || !PROVENANCES.includes(input.provenance as TestProvenance)) {
    add_issue(issues, `${path}.provenance`, "expected supported provenance");
  }
  if (!non_negative_integer(input.suiteOrdinal)) add_issue(issues, `${path}.suiteOrdinal`, "expected non-negative safe integer");
  if (!non_negative_integer(input.caseOrdinal)) add_issue(issues, `${path}.caseOrdinal`, "expected non-negative safe integer");
  if (input.sourceRef !== undefined && typeof input.sourceRef !== "string") add_issue(issues, `${path}.sourceRef`, "expected string when present");
  if (requirements === undefined) add_issue(issues, `${path}.requirements`, "expected unique supported capability strings");
  if (collections === undefined) add_issue(issues, `${path}.collections`, "expected unique supported collection strings");
  if (issues.length !== before || !is_test_case_id(input.id) || !is_test_suite_id(input.suiteId)
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

function decode_suite_descriptor(value: unknown, path: string, issues: string[]): TestSuiteDescriptor | undefined {
  const input = record(value);
  if (input === undefined) {
    add_issue(issues, path, "expected test suite descriptor object");
    return undefined;
  }
  contract_key_issues(input, [
    "id", "title", "subject", "collections", "provenance", "order", "requirements", "executionShape",
  ], ["sourceRef"], path, issues);
  const requirements = string_set(input.requirements, CAPABILITIES);
  const collections = string_set(input.collections, COLLECTIONS);
  const before = issues.length;
  if (!is_test_suite_id(input.id)) add_issue(issues, `${path}.id`, "expected canonical test suite ID");
  if (typeof input.title !== "string" || !input.title) add_issue(issues, `${path}.title`, "expected non-empty string");
  if (typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)) {
    add_issue(issues, `${path}.subject`, "expected registered test subject identifier");
  }
  if (typeof input.provenance !== "string" || !PROVENANCES.includes(input.provenance as TestProvenance)) {
    add_issue(issues, `${path}.provenance`, "expected supported provenance");
  }
  if (!non_negative_integer(input.order)) add_issue(issues, `${path}.order`, "expected non-negative safe integer");
  if (input.executionShape !== "cases" && input.executionShape !== "browser-journeys"
    && input.executionShape !== "opaque-aggregate") {
    add_issue(issues, `${path}.executionShape`, "expected supported execution shape");
  }
  if (input.sourceRef !== undefined && typeof input.sourceRef !== "string") add_issue(issues, `${path}.sourceRef`, "expected string when present");
  if (requirements === undefined) add_issue(issues, `${path}.requirements`, "expected unique supported capability strings");
  if (collections === undefined) add_issue(issues, `${path}.collections`, "expected unique supported collection strings");
  if (issues.length !== before || !is_test_suite_id(input.id)
    || typeof input.title !== "string" || !input.title
    || typeof input.subject !== "string" || !SUBJECTS.includes(input.subject as TestSubject)
    || typeof input.provenance !== "string" || !PROVENANCES.includes(input.provenance as TestProvenance)
    || !non_negative_integer(input.order)
    || (input.executionShape !== "cases" && input.executionShape !== "browser-journeys"
      && input.executionShape !== "opaque-aggregate")
    || (input.sourceRef !== undefined && typeof input.sourceRef !== "string")
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
  });
}

function decode_executor(value: unknown, path: string, issues: string[]): TestExecutorDescriptor | undefined {
  const input = record(value);
  if (input === undefined) {
    add_issue(issues, path, "expected executor descriptor object");
    return undefined;
  }
  contract_key_issues(input, [
    "id", "kind", "label", "location", "capabilities", "supportsStreaming", "supportsCancellation",
  ], [], path, issues);
  const capabilities = record(input.capabilities);
  if (capabilities !== undefined) contract_key_issues(capabilities, ["provides"], [], `${path}.capabilities`, issues);
  const provides = capabilities === undefined ? undefined : string_set(capabilities.provides, CAPABILITIES);
  const before = issues.length;
  if (typeof input.id !== "string" || !input.id) add_issue(issues, `${path}.id`, "expected non-empty string");
  if (typeof input.kind !== "string" || !EXECUTOR_KINDS.includes(input.kind as TestExecutorKind)) {
    add_issue(issues, `${path}.kind`, "expected supported executor kind");
  }
  if (typeof input.label !== "string" || !input.label) add_issue(issues, `${path}.label`, "expected non-empty string");
  if (typeof input.location !== "string" || !EXECUTOR_LOCATIONS.includes(input.location as TestExecutorLocation)) {
    add_issue(issues, `${path}.location`, "expected supported executor location");
  }
  if (typeof input.supportsStreaming !== "boolean") add_issue(issues, `${path}.supportsStreaming`, "expected boolean");
  if (typeof input.supportsCancellation !== "boolean") add_issue(issues, `${path}.supportsCancellation`, "expected boolean");
  if (capabilities === undefined) add_issue(issues, `${path}.capabilities`, "expected capabilities object");
  else if (provides === undefined) add_issue(issues, `${path}.capabilities.provides`, "expected unique supported capability strings");
  if (issues.length !== before || typeof input.id !== "string" || !input.id
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
  if (input === undefined) {
    return invalid_result("Invalid tests.discover result shape.", Object.freeze(["$: expected object"]));
  }
  const shapeIssues: string[] = [];
  contract_key_issues(input, ["executor", "protocolVersion", "catalogVersion", "catalog"], [], "$", shapeIssues);
  const executorShape = record(input.executor);
  if (executorShape !== undefined) {
    contract_key_issues(executorShape, [
      "id", "kind", "label", "location", "capabilities", "supportsStreaming", "supportsCancellation",
    ], [], "$.executor", shapeIssues);
  }
  const catalogShape = record(input.catalog);
  if (catalogShape !== undefined) contract_key_issues(catalogShape, ["suites", "tests"], [], "$.catalog", shapeIssues);
  if (shapeIssues.length > 0) {
    return invalid_result("Invalid tests.discover result shape.", shapeIssues);
  }
  const dataIssues: string[] = [];
  const executor = decode_executor(input.executor, "$.executor", dataIssues);
  const catalogInput = record(input.catalog);
  if (catalogInput === undefined) add_issue(dataIssues, "$.catalog", "expected catalog object");
  else contract_key_issues(catalogInput, ["suites", "tests"], [], "$.catalog", dataIssues);
  const suites = catalogInput !== undefined && Array.isArray(catalogInput.suites)
    ? catalogInput.suites.map((descriptor, index) => decode_suite_descriptor(descriptor, `$.catalog.suites[${index}]`, dataIssues))
    : undefined;
  const tests = catalogInput !== undefined && Array.isArray(catalogInput.tests)
    ? catalogInput.tests.map((descriptor, index) => decode_descriptor(descriptor, `$.catalog.tests[${index}]`, dataIssues)) : undefined;
  if (input.protocolVersion !== TEST_EXECUTOR_PROTOCOL_VERSION) {
    add_issue(dataIssues, "$.protocolVersion", `expected TestExecutorDiscovery protocol version ${TEST_EXECUTOR_PROTOCOL_VERSION}`);
  }
  if (typeof input.catalogVersion !== "string" || !input.catalogVersion) add_issue(dataIssues, "$.catalogVersion", "expected non-empty string");
  if (catalogInput !== undefined && !Array.isArray(catalogInput.suites)) add_issue(dataIssues, "$.catalog.suites", "expected array");
  if (catalogInput !== undefined && !Array.isArray(catalogInput.tests)) add_issue(dataIssues, "$.catalog.tests", "expected array");
  if (executor === undefined || suites === undefined || suites.some((descriptor) => descriptor === undefined)
    || tests === undefined || tests.some((descriptor) => descriptor === undefined) || dataIssues.length > 0) {
    return invalid_result("Invalid tests.discover result data.", dataIssues);
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
    return invalid_result(
      "tests.discover catalog version does not match its descriptors.",
      Object.freeze(["$.catalogVersion: fingerprint does not match $.catalog descriptors"]),
    );
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
