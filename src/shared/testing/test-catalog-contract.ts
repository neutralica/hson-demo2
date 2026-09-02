import type { TestDescriptor, TestSuiteDescriptor } from "./test-contracts";
import { format_test_case_id, validate_test_suite_id } from "./test-identity";

export type TestCatalog = Readonly<{
  suites: readonly TestSuiteDescriptor[];
  tests: readonly TestDescriptor[];
}>;

function validate_catalog(catalog: TestCatalog): void {
  const suites = new Map<string, TestSuiteDescriptor>();
  for (const descriptor of catalog.suites) {
    validate_test_suite_id(descriptor.id);
    if (suites.has(descriptor.id)) throw new Error(`Duplicate canonical suite ID: ${descriptor.id}`);
    if (!Number.isSafeInteger(descriptor.order) || descriptor.order < 0) {
      throw new Error(`Invalid canonical suite order for ${descriptor.id}.`);
    }
    if (new Set(descriptor.requirements).size !== descriptor.requirements.length) {
      throw new Error(`Duplicate capability requirement on ${descriptor.id}.`);
    }
    if (new Set(descriptor.collections).size !== descriptor.collections.length) {
      throw new Error(`Duplicate test collection on ${descriptor.id}.`);
    }
    suites.set(descriptor.id, descriptor);
  }
  const tests = new Set<string>();
  for (const descriptor of catalog.tests) {
    if (descriptor.id !== format_test_case_id(descriptor.suiteId, descriptor.caseId)) {
      throw new Error(`Canonical test ID does not match suiteId and caseId: ${descriptor.id}`);
    }
    if (tests.has(descriptor.id)) throw new Error(`Duplicate canonical test ID: ${descriptor.id}`);
    tests.add(descriptor.id);
    if (new Set(descriptor.requirements).size !== descriptor.requirements.length) {
      throw new Error(`Duplicate capability requirement on ${descriptor.id}.`);
    }
    if (new Set(descriptor.collections).size !== descriptor.collections.length) {
      throw new Error(`Duplicate test collection on ${descriptor.id}.`);
    }
    const shape = suites.get(descriptor.suiteId)?.executionShape;
    if (shape !== "cases" && shape !== "browser-journeys") {
      throw new Error(`Canonical case ${descriptor.id} has no case-based suite descriptor.`);
    }
  }
}

function canonical_descriptor(descriptor: TestDescriptor): string {
  return JSON.stringify({
    id: descriptor.id,
    suiteId: descriptor.suiteId,
    caseId: descriptor.caseId,
    title: descriptor.title,
    subject: descriptor.subject,
    requirements: [...descriptor.requirements].sort(),
    collections: [...descriptor.collections].sort(),
    provenance: descriptor.provenance,
    suiteOrdinal: descriptor.suiteOrdinal,
    caseOrdinal: descriptor.caseOrdinal,
  });
}

function canonical_suite_descriptor(descriptor: TestSuiteDescriptor): string {
  return JSON.stringify({
    id: descriptor.id,
    title: descriptor.title,
    subject: descriptor.subject,
    collections: [...descriptor.collections].sort(),
    provenance: descriptor.provenance,
    order: descriptor.order,
    requirements: [...descriptor.requirements].sort(),
    executionShape: descriptor.executionShape,
    sourceRef: descriptor.sourceRef ?? null,
  });
}

/** FNV-1a 32-bit over sorted canonical descriptor records. */
export function test_catalog_version(catalog: TestCatalog): string {
  validate_catalog(catalog);
  const canonical = [
    ...catalog.suites.map((descriptor) => `suite:${canonical_suite_descriptor(descriptor)}`),
    ...catalog.tests.map((descriptor) => `case:${canonical_descriptor(descriptor)}`),
  ].sort().join("\n");
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32-${hash.toString(16).padStart(8, "0")}`;
}
