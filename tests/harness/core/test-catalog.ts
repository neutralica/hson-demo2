import type {
  TestCase,
  TestDescriptor,
  TestDescriptorMetadata,
  TestSuite,
} from "./test-contracts";

export type TestCatalog = Readonly<{
  tests: readonly TestDescriptor[];
}>;

function freeze_metadata(metadata: TestDescriptorMetadata): Readonly<{
  subject: TestDescriptor["subject"];
  requirements: TestDescriptor["requirements"];
  collections: TestDescriptor["collections"];
}> {
  return Object.freeze({
    subject: metadata.subject,
    requirements: Object.freeze([...metadata.requirements]),
    collections: Object.freeze([...(metadata.collections ?? [])]),
  });
}

export function test_id(suite: string, name: string): string {
  return `${suite}::${name}`;
}

export function resolve_test_descriptor(suite: TestSuite, testCase: TestCase): TestDescriptor {
  const defaults = suite.descriptor;
  if (defaults === undefined) {
    throw new Error(`Test suite ${suite.suite} has no canonical descriptor metadata.`);
  }
  if (testCase.suite !== suite.suite) {
    throw new Error(`Test case suite mismatch: ${testCase.suite} is registered under ${suite.suite}.`);
  }
  const metadata = freeze_metadata({
    subject: testCase.descriptor?.subject ?? defaults.subject,
    requirements: testCase.descriptor?.requirements ?? defaults.requirements,
    collections: testCase.descriptor?.collections ?? defaults.collections ?? Object.freeze([]),
  });
  return Object.freeze({
    id: test_id(suite.suite, testCase.name),
    suite: suite.suite,
    name: testCase.name,
    ...metadata,
  });
}

export function make_test_catalog(descriptors: readonly TestDescriptor[]): TestCatalog {
  const byId = new Map<string, TestDescriptor>();
  for (const descriptor of descriptors) {
    if (descriptor.id !== test_id(descriptor.suite, descriptor.name)) {
      throw new Error(`Canonical test ID does not match suite and name: ${descriptor.id}`);
    }
    if (new Set(descriptor.requirements).size !== descriptor.requirements.length) {
      throw new Error(`Duplicate capability requirement on ${descriptor.id}.`);
    }
    if (new Set(descriptor.collections).size !== descriptor.collections.length) {
      throw new Error(`Duplicate test collection on ${descriptor.id}.`);
    }
    const frozen = Object.freeze({
      ...descriptor,
      requirements: Object.freeze([...descriptor.requirements]),
      collections: Object.freeze([...descriptor.collections]),
    });
    if (byId.has(frozen.id)) throw new Error(`Duplicate canonical test ID: ${frozen.id}`);
    byId.set(frozen.id, frozen);
  }
  const tests = Object.freeze([...byId.values()]);
  return Object.freeze({ tests });
}

export function find_test_descriptor(catalog: TestCatalog, id: string): TestDescriptor | undefined {
  return catalog.tests.find((descriptor) => descriptor.id === id);
}

function canonical_descriptor(descriptor: TestDescriptor): string {
  return JSON.stringify({
    id: descriptor.id,
    suite: descriptor.suite,
    name: descriptor.name,
    subject: descriptor.subject,
    requirements: [...descriptor.requirements].sort(),
    collections: [...descriptor.collections].sort(),
  });
}

/** FNV-1a 32-bit over sorted canonical descriptor records. */
export function test_catalog_version(catalog: TestCatalog): string {
  const validated = make_test_catalog(catalog.tests);
  const canonical = validated.tests.map(canonical_descriptor).sort().join("\n");
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32-${hash.toString(16).padStart(8, "0")}`;
}

export function catalog_from_test_suites(suites: readonly TestSuite[]): TestCatalog {
  return make_test_catalog(suites.flatMap((suite) => suite.cases.map((testCase) => (
    resolve_test_descriptor(suite, testCase)
  ))));
}
