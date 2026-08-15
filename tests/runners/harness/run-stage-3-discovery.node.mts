import assert from "node:assert/strict";
import { decode_test_executor_discovery } from "../../../src/shared/testing/test-discovery-contract";
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
assert.equal(decode_test_executor_discovery(withRemovedField).ok, false);

console.log(JSON.stringify({
  certificate: "stage-3-discovery",
  node: { executor: node.executor.id, cases: node.catalog.tests.length, suites: node.catalog.suites.length, opaque: opaque.length, fingerprint: node.catalogVersion },
  worker: { executor: worker.executor.id, cases: worker.catalog.tests.length, suites: worker.catalog.suites.length, opaque: 0, fingerprint: worker.catalogVersion },
}));
