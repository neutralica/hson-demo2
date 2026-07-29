import type { TestCapability, TestCase, TestDescriptor, TestSuite } from "../app/demos/test/tests.types";
import { catalog_from_test_suites, type TestCatalog } from "./test-catalog";

export type TestExecutorCapabilities = Readonly<{
  provides: readonly TestCapability[];
}>;

export type TestExecutorKind = "node" | "cloudflare-worker" | "browser";
export type TestExecutorLocation = "hosted" | "local";

export type TestExecutorDescriptor = Readonly<{
  id: string;
  kind: TestExecutorKind;
  label: string;
  location: TestExecutorLocation;
  capabilities: TestExecutorCapabilities;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
}>;

export type ExecutableTestRegistration = Readonly<{
  descriptor: TestDescriptor;
  testCase: TestCase;
  suiteSetup?: TestSuite["setup"];
  suiteTimeoutMs?: number;
}>;

export type TestExecutorRegistry = Readonly<{
  executor: TestExecutorDescriptor;
  catalog: TestCatalog;
  registrations: readonly ExecutableTestRegistration[];
  get(id: string): ExecutableTestRegistration | undefined;
}>;

export function executor_supports(
  executor: TestExecutorDescriptor,
  descriptor: TestDescriptor,
): boolean {
  const provided = new Set<TestCapability>(executor.capabilities.provides);
  return descriptor.requirements.every((requirement) => provided.has(requirement));
}

export function make_test_executor_registry(
  executor: TestExecutorDescriptor,
  suites: readonly TestSuite[],
): TestExecutorRegistry {
  const catalog = catalog_from_test_suites(suites);
  const cases = new Map<string, TestCase>();
  const suiteById = new Map(suites.map((suite) => [suite.suite, suite]));
  for (const suite of suites) {
    for (const testCase of suite.cases) {
      const id = `${suite.suite}::${testCase.name}`;
      if (cases.has(id)) throw new Error(`Duplicate executable registration ID: ${id}`);
      cases.set(id, testCase);
    }
  }
  const registrations: readonly ExecutableTestRegistration[] = Object.freeze(catalog.tests.map((descriptor) => {
    const testCase = cases.get(descriptor.id);
    if (testCase === undefined) throw new Error(`Missing executable registration for ${descriptor.id}`);
    const suite = suiteById.get(descriptor.suite);
    if (suite === undefined) throw new Error(`Missing executable suite for ${descriptor.id}`);
    return Object.freeze({
      descriptor,
      testCase,
      ...(suite.setup === undefined ? {} : { suiteSetup: suite.setup }),
      ...(suite.timeoutMs === undefined ? {} : { suiteTimeoutMs: suite.timeoutMs }),
    });
  }));
  return make_test_executor_registry_from_registrations(executor, catalog, registrations);
}

function same_descriptor(left: TestDescriptor, right: TestDescriptor): boolean {
  return left.id === right.id
    && left.suite === right.suite
    && left.name === right.name
    && left.subject === right.subject
    && left.requirements.length === right.requirements.length
    && left.requirements.every((requirement, index) => requirement === right.requirements[index])
    && left.collections.length === right.collections.length
    && left.collections.every((collection, index) => collection === right.collections[index]);
}

export function make_test_executor_registry_from_registrations(
  executor: TestExecutorDescriptor,
  catalog: TestCatalog,
  registrations: readonly ExecutableTestRegistration[],
): TestExecutorRegistry {
  if (!Object.isFrozen(executor) || !Object.isFrozen(executor.capabilities)
    || !Object.isFrozen(executor.capabilities.provides)) {
    throw new Error(`Executor ${executor.id} descriptor and capability data must be frozen.`);
  }
  if (!Object.isFrozen(catalog) || !Object.isFrozen(catalog.tests)
    || catalog.tests.some((descriptor) => !Object.isFrozen(descriptor)
      || !Object.isFrozen(descriptor.requirements)
      || !Object.isFrozen(descriptor.collections))) {
    throw new Error(`Executor ${executor.id} catalog descriptor data must be frozen.`);
  }
  if (!Object.isFrozen(registrations) || registrations.some((registration) => !Object.isFrozen(registration))) {
    throw new Error(`Executor ${executor.id} executable registrations must be frozen.`);
  }
  const descriptors = new Map<string, TestDescriptor>();
  for (const descriptor of catalog.tests) {
    if (descriptors.has(descriptor.id)) throw new Error(`Duplicate canonical test ID: ${descriptor.id}`);
    descriptors.set(descriptor.id, descriptor);
  }
  const byId = new Map<string, ExecutableTestRegistration>();
  const suiteExecution = new Map<string, Readonly<{ setup?: TestSuite["setup"]; timeoutMs?: number }>>();
  for (const registration of registrations) {
    const id = registration.descriptor.id;
    if (byId.has(id)) throw new Error(`Duplicate executable registration ID: ${id}`);
    const descriptor = descriptors.get(id);
    if (descriptor === undefined) throw new Error(`Executable registration ${id} has no catalog descriptor.`);
    if (!same_descriptor(descriptor, registration.descriptor)) {
      throw new Error(`Executable registration ${id} does not match its catalog descriptor.`);
    }
    if (registration.testCase.suite !== descriptor.suite || registration.testCase.name !== descriptor.name) {
      throw new Error(`Executable registration ${id} does not match its TestCase identity.`);
    }
    if (!executor_supports(executor, descriptor)) {
      throw new Error(`Executor ${executor.id} lacks capabilities required by ${id}.`);
    }
    const existingSuite = suiteExecution.get(descriptor.suite);
    if (existingSuite !== undefined
      && (existingSuite.setup !== registration.suiteSetup
        || existingSuite.timeoutMs !== registration.suiteTimeoutMs)) {
      throw new Error(`Executable registrations for suite ${descriptor.suite} disagree on suite execution configuration.`);
    }
    suiteExecution.set(descriptor.suite, Object.freeze({
      ...(registration.suiteSetup === undefined ? {} : { setup: registration.suiteSetup }),
      ...(registration.suiteTimeoutMs === undefined ? {} : { timeoutMs: registration.suiteTimeoutMs }),
    }));
    byId.set(id, registration);
  }
  for (const id of descriptors.keys()) {
    if (!byId.has(id)) throw new Error(`Catalog descriptor ${id} has no executable registration.`);
  }
  return Object.freeze({ executor, catalog, registrations, get: (id: string) => byId.get(id) });
}

export function select_executor(
  descriptor: TestDescriptor,
  executors: readonly TestExecutorDescriptor[],
): TestExecutorDescriptor | undefined {
  return executors.find((executor) => executor_supports(executor, descriptor));
}
