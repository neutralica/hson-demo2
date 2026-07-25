import type { TestCapability, TestCase, TestCollection, TestDescriptor, TestSuite } from "../../app/demos/test/tests.types";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { create_hosted_test_application } from "../../hosted-test/hosted-test-application";
import { run_livehost_all_suite } from "../../hosted-test/registered-hosted-test-suites";
import { make_cloudflare_livehost_executor_registry } from "../../hosted-test/cloudflare/cloudflare-test-executor";
import { make_test_catalog, test_catalog_version } from "../../test-system/test-catalog";
import {
  decode_test_executor_discovery,
  decode_test_executor_discovery_request,
  make_test_executor_discovery,
  TEST_EXECUTOR_PROTOCOL_VERSION,
} from "../../test-system/test-discovery";
import {
  make_test_executor_registry,
  make_test_executor_registry_from_registrations,
  type ExecutableTestRegistration,
  type TestExecutorDescriptor,
} from "../../test-system/test-executor";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { run_fresh_node_selected_test_ids } from "../../hosted-test/run-node-selected-test-suites";

function expect_discovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 3 discovery: ${message}`);
}

const descriptor = (
  id: string,
  requirements: readonly TestCapability[] = Object.freeze(["javascript"] as const),
  collections: readonly TestCollection[] = Object.freeze([]),
): TestDescriptor => {
  const separator = id.indexOf("::");
  const suite = id.slice(0, separator);
  const name = id.slice(separator + 2);
  return Object.freeze({ id, suite, name, subject: "integration", requirements, collections });
};
const alpha = descriptor("proof/a::alpha");
const beta = descriptor("proof/b::beta");
const ordered = make_test_catalog([alpha, beta]);
const reversed = make_test_catalog([beta, alpha]);
expect_discovery(test_catalog_version(ordered) === test_catalog_version(reversed), "descriptor order does not affect the catalog fingerprint");
expect_discovery(test_catalog_version(ordered) === test_catalog_version(make_test_catalog([{ ...alpha }, { ...beta }])), "identical descriptor content has a stable fingerprint");
const reorderedRequirements = descriptor("proof/c::gamma", Object.freeze(["node", "javascript"] as const));
const canonicalRequirements = descriptor("proof/c::gamma", Object.freeze(["javascript", "node"] as const));
expect_discovery(test_catalog_version(make_test_catalog([reorderedRequirements])) === test_catalog_version(make_test_catalog([canonicalRequirements])), "set-like capability order does not affect the fingerprint");
const reorderedCollections = descriptor(
  "proof/d::delta",
  Object.freeze(["javascript"] as const),
  Object.freeze(["unit", "dev"] as const),
);
const canonicalCollections = descriptor(
  "proof/d::delta",
  Object.freeze(["javascript"] as const),
  Object.freeze(["dev", "unit"] as const),
);
expect_discovery(
  test_catalog_version(make_test_catalog([reorderedCollections]))
    === test_catalog_version(make_test_catalog([canonicalCollections])),
  "set-like collection order does not affect the fingerprint",
);
expect_discovery(test_catalog_version(ordered) !== test_catalog_version(make_test_catalog([alpha, descriptor("proof/b::beta", Object.freeze(["javascript", "node"] as const))])), "execution-relevant descriptor changes alter the fingerprint");
let duplicateVersionRejected = false;
try { test_catalog_version({ tests: Object.freeze([alpha, alpha]) }); } catch { duplicateVersionRejected = true; }
expect_discovery(duplicateVersionRejected, "duplicate IDs are rejected before versioning");

expect_discovery(decode_test_executor_discovery_request({}).ok, "an explicit empty discovery request decodes");
expect_discovery(!decode_test_executor_discovery_request(undefined).ok, "an absent discovery request is rejected");
expect_discovery(!decode_test_executor_discovery_request({ extra: true }).ok, "unknown discovery request fields are rejected");

const nodeRegistry = make_local_node_livehost_executor_registry();
const workerRegistry = make_cloudflare_livehost_executor_registry();
const nodeDiscovery = make_test_executor_discovery(nodeRegistry);
const workerDiscovery = make_test_executor_discovery(workerRegistry);
const decodedNode = decode_test_executor_discovery(JSON.parse(JSON.stringify(nodeDiscovery)));
const decodedWorker = decode_test_executor_discovery(JSON.parse(JSON.stringify(workerDiscovery)));
expect_discovery(decodedNode.ok && decodedWorker.ok, "Node and Worker discovery responses strictly decode after a JSON round trip");
expect_discovery(
  !decode_test_executor_discovery({ ...JSON.parse(JSON.stringify(nodeDiscovery)), catalogVersion: "fnv1a32-00000000" }).ok,
  "a discovery response with an inconsistent catalog version is rejected",
);
expect_discovery(nodeDiscovery.protocolVersion === TEST_EXECUTOR_PROTOCOL_VERSION, "discovery reports the controlled protocol version");
expect_discovery(nodeDiscovery.catalogVersion === test_catalog_version(nodeDiscovery.catalog), "Node catalog version matches returned descriptors");
expect_discovery(workerDiscovery.catalogVersion === test_catalog_version(workerDiscovery.catalog), "Worker catalog version matches returned descriptors");
expect_discovery(nodeRegistry.registrations.length === nodeDiscovery.catalog.tests.length && nodeDiscovery.catalog.tests.every((test) => nodeRegistry.get(test.id) !== undefined), "Node descriptors and registrations have exact parity");
expect_discovery(workerRegistry.registrations.length === workerDiscovery.catalog.tests.length && workerDiscovery.catalog.tests.every((test) => workerRegistry.get(test.id) !== undefined), "Worker descriptors and registrations have exact parity");
expect_discovery(
  nodeDiscovery.executor.capabilities.provides.join(",") === "javascript,node,synthetic-dom",
  "Node capabilities describe its installed portable and synthetic-DOM contexts",
);
expect_discovery(workerDiscovery.executor.capabilities.provides.join(",") === "javascript", "Worker capabilities remain conservative");

const nodeById = new Map(nodeDiscovery.catalog.tests.map((test) => [test.id, test]));
const shared = workerDiscovery.catalog.tests.filter((test) => nodeById.has(test.id));
expect_discovery(
  shared.length === workerDiscovery.catalog.tests.length,
  "every Worker-advertised portable case has identical Node descriptor identity",
);
for (const workerTest of shared) {
  const nodeTest = nodeById.get(workerTest.id);
  expect_discovery(nodeTest !== undefined && JSON.stringify(nodeTest) === JSON.stringify(workerTest), `shared descriptor ${workerTest.id} is identical`);
}

const proofCase: TestCase = Object.freeze({ suite: "proof/parity", name: "one", run: () => undefined });
const proofSuite: TestSuite = Object.freeze({
  suite: "proof/parity",
  descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript"] as const) }),
  cases: Object.freeze([proofCase]),
});
const proofExecutor = Object.freeze({
  id: "proof-executor", kind: "node", label: "Proof", location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true, supportsCancellation: false,
}) satisfies TestExecutorDescriptor;
const proofRegistry = make_test_executor_registry(proofExecutor, [proofSuite]);
const proofRegistration = proofRegistry.registrations[0];
if (proofRegistration === undefined) throw new Error("Stage 3 discovery: proof registration was not constructed");
const frozenRegistrations = (items: readonly ExecutableTestRegistration[]) => Object.freeze(items.map((item) => Object.freeze(item)));
const rejects = (run: () => unknown): boolean => { try { run(); return false; } catch { return true; } };
expect_discovery(rejects(() => make_test_executor_registry_from_registrations(proofExecutor, proofRegistry.catalog, Object.freeze([]))), "descriptors without registrations reject");
expect_discovery(rejects(() => make_test_executor_registry_from_registrations(proofExecutor, make_test_catalog([]), frozenRegistrations([proofRegistration]))), "registrations without descriptors reject");
expect_discovery(rejects(() => make_test_executor_registry_from_registrations(proofExecutor, proofRegistry.catalog, frozenRegistrations([proofRegistration, proofRegistration]))), "duplicate registration IDs reject");
expect_discovery(rejects(() => make_test_executor_registry_from_registrations({ ...proofExecutor }, proofRegistry.catalog, proofRegistry.registrations)), "mutable executor descriptors reject");
expect_discovery(
  rejects(() => make_test_executor_registry_from_registrations(proofExecutor, { tests: [proofRegistration.descriptor] }, proofRegistry.registrations)),
  "mutable catalog descriptor containers reject",
);
const duplicateDescriptorCatalog = Object.freeze({ tests: Object.freeze([proofRegistration.descriptor, proofRegistration.descriptor]) });
expect_discovery(
  rejects(() => make_test_executor_registry_from_registrations(proofExecutor, duplicateDescriptorCatalog, proofRegistry.registrations)),
  "duplicate catalog descriptor IDs reject",
);
const weakExecutor = Object.freeze({ ...proofExecutor, capabilities: Object.freeze({ provides: Object.freeze([]) }) });
expect_discovery(rejects(() => make_test_executor_registry_from_registrations(weakExecutor, proofRegistry.catalog, proofRegistry.registrations)), "insufficient executor capabilities reject");

const legacyRegistry = make_hosted_test_suite_registry([
  Object.freeze({ id: "livehost/all", label: "livehost/all", run: run_livehost_all_suite }),
]);
const application = create_hosted_test_application(legacyRegistry, {
  discovery: nodeDiscovery,
  executorRegistry: nodeRegistry,
  runSelected: run_fresh_node_selected_test_ids,
});
const discoveryResponse = await application.coordinator.dispatch_action({
  type: "action", id: "discover-1", clientId: "stage-3", requestId: "discover-request", name: "tests.discover", payload: {},
});
expect_discovery(discoveryResponse.type === "ack", "tests.discover is registered on the hosted application");
const actionDecoded = discoveryResponse.type === "ack" ? decode_test_executor_discovery(discoveryResponse.result) : undefined;
expect_discovery(actionDecoded?.ok === true && actionDecoded.value.executor.id === nodeDiscovery.executor.id, "tests.discover returns the executor-centered response");
const malformed = await application.coordinator.dispatch_action({
  type: "action", id: "discover-bad", clientId: "stage-3", requestId: "discover-bad-request", name: "tests.discover", payload: { extra: true },
} as never);
expect_discovery(malformed.type === "error" && malformed.error.code === "LIVEHOST_SCHEMA_INVALID_PAYLOAD", "malformed discovery uses structured schema rejection");
const runResponse = await application.coordinator.dispatch_action({
  type: "action", id: "run-after-discovery", clientId: "stage-3", requestId: "run-request", name: "tests.run", payload: { suite: "livehost/all" },
});
expect_discovery(runResponse.type === "ack", "legacy tests.run still works after discovery registration");
application.dispose();

const nodePayloadBytes = new TextEncoder().encode(JSON.stringify(nodeDiscovery)).byteLength;
const workerPayloadBytes = new TextEncoder().encode(JSON.stringify(workerDiscovery)).byteLength;
console.log(JSON.stringify({
  protocolVersion: TEST_EXECUTOR_PROTOCOL_VERSION,
  node: { id: nodeDiscovery.executor.id, tests: nodeDiscovery.catalog.tests.length, catalogVersion: nodeDiscovery.catalogVersion, payloadBytes: nodePayloadBytes },
  worker: { id: workerDiscovery.executor.id, tests: workerDiscovery.catalog.tests.length, catalogVersion: workerDiscovery.catalogVersion, payloadBytes: workerPayloadBytes },
  shared: shared.length,
}));
