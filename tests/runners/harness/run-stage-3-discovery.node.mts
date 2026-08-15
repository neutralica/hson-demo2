import assert from "node:assert/strict";
import { decode_test_executor_discovery } from "../../../src/shared/testing/test-discovery-contract";
import {
  decode_hosted_test_discovery_response,
  hosted_test_client_failure_diagnostic,
} from "../../../src/shared/hosted-tests/hosted-test-client-action";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_cloudflare_livehost_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import {
  resolve_external_launcher_binding,
  resolve_external_library_launchers,
} from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";

const availability = await resolve_external_library_launchers();
const node = make_test_executor_discovery(make_local_node_livehost_executor_registry(), availability.targets);
const worker = make_test_executor_discovery(make_cloudflare_livehost_executor_registry());

assert.equal(decode_test_executor_discovery(JSON.parse(JSON.stringify(node))).ok, true);
assert.equal(decode_test_executor_discovery(JSON.parse(JSON.stringify(worker))).ok, true);
assert.equal(Object.hasOwn(node, "externalTargets"), false);
assert.equal(Object.hasOwn(worker, "externalTargets"), false);

const opaque = node.catalog.suites.filter((suite) => suite.executionShape === "opaque-aggregate");
assert.equal(opaque.length, availability.targets.length);
assert.equal(worker.catalog.suites.some((suite) => suite.executionShape === "opaque-aggregate"), false);
assert.equal(worker.catalog.suites.every((suite) => suite.provenance === "hson-demo2"), true);
assert.equal(node.catalog.suites.some((suite) => suite.provenance === "hson-live"), true);
assert.notEqual(node.catalogVersion, worker.catalogVersion);

for (const descriptor of opaque) {
  const binding = resolve_external_launcher_binding(availability, descriptor);
  assert.equal(binding.id, descriptor.id);
  assert.equal(descriptor.sourceRef, `hson-live:${binding.launcherId}`);
  assert.equal(descriptor.declaredChecks, binding.executableChecks);
}

const withRemovedField = { ...JSON.parse(JSON.stringify(node)), externalTargets: [] };
const shapeFailure = decode_test_executor_discovery(withRemovedField);
assert.equal(shapeFailure.ok, false);
assert.ok(!shapeFailure.ok && shapeFailure.issues.includes("$.externalTargets: unexpected field"));

const legacySecret = "deployment-secret-must-not-appear";
const legacyResult = {
  ...JSON.parse(JSON.stringify(node)),
  protocolVersion: 2,
  externalTargets: [{ token: legacySecret }],
  catalog: { tests: [{ name: legacySecret, suite: "legacy" }] },
};
const legacyValidation = decode_test_executor_discovery(legacyResult);
assert.equal(legacyValidation.ok, false);
assert.ok(!legacyValidation.ok && legacyValidation.issues.includes("$.externalTargets: unexpected field"));
assert.ok(!legacyValidation.ok && legacyValidation.issues.includes("$.catalog.suites: missing required field"));

let clientFailure: unknown;
try { decode_hosted_test_discovery_response({ type: "ack", result: legacyResult }); }
catch (cause) { clientFailure = cause; }
assert.equal(clientFailure instanceof Error ? clientFailure.message : undefined, "Invalid tests.discover result shape.");
const diagnostic = hosted_test_client_failure_diagnostic(clientFailure);
assert.equal(diagnostic?.operation, "tests.discover");
assert.equal(diagnostic?.expectedContract, "TestExecutorDiscovery v3");
assert.equal(diagnostic?.received.protocolVersion, 2);
assert.deepEqual(diagnostic?.received.catalog?.keys, ["tests"]);
assert.equal(diagnostic?.received.catalog?.tests?.length, 1);
assert.equal(diagnostic?.received.externalTargets?.length, 1);
assert.ok(diagnostic?.issues.includes("$.catalog.suites: missing required field"));
assert.equal(JSON.stringify(diagnostic).includes(legacySecret), false);

console.log(JSON.stringify({
  certificate: "stage-3-discovery",
  node: { executor: node.executor.id, cases: node.catalog.tests.length, suites: node.catalog.suites.length, opaque: opaque.length, fingerprint: node.catalogVersion },
  worker: { executor: worker.executor.id, cases: worker.catalog.tests.length, suites: worker.catalog.suites.length, opaque: 0, fingerprint: worker.catalogVersion },
}));
