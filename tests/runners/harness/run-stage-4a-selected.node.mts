import assert from "node:assert/strict";
import { decode_run_selected_tests_request } from "../../../src/shared/testing/test-run-contract";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { run_selected_test_ids } from "../../harness/core/run-selected-test-suites";
import { make_cloudflare_locus_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import { resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";

const nodeRegistry = make_local_node_locus_executor_registry();
const workerRegistry = make_cloudflare_locus_executor_registry();
const availability = await resolve_external_library_launchers();
const node = make_test_executor_discovery(nodeRegistry, availability.targets);
const worker = make_test_executor_discovery(workerRegistry);
const sharedId = worker.catalog.tests.find((descriptor) => nodeRegistry.get(descriptor.id) !== undefined)?.id;
assert.ok(sharedId);

const decoded = decode_run_selected_tests_request({ selectionIds: [sharedId, sharedId] });
assert.equal(decoded.ok, true);
assert.deepEqual(decoded.ok ? decoded.value.selectionIds : [], [sharedId]);
assert.equal(decode_run_selected_tests_request({ testIds: [sharedId] }).ok, false);
assert.equal(decode_run_selected_tests_request({ selectionIds: [] }).ok, false);
assert.equal(decode_run_selected_tests_request({ selectionIds: ["category/livehost"] }).ok, true);

const nodePlan = make_test_run_plan({
  runId: "stage4a-node",
  protocolVersion: node.protocolVersion,
  catalogVersion: node.catalogVersion,
  executorId: node.executor.id,
  catalog: node.catalog,
  selectedIds: [sharedId],
});
const workerPlan = make_test_run_plan({
  runId: "stage4a-worker",
  protocolVersion: worker.protocolVersion,
  catalogVersion: worker.catalogVersion,
  executorId: worker.executor.id,
  catalog: worker.catalog,
  selectedIds: [sharedId],
});
assert.deepEqual(nodePlan.selectionIds, [sharedId]);
assert.deepEqual(workerPlan.selectionIds, [sharedId]);
assert.equal(nodePlan.suites[0]?.cases[0]?.id, sharedId);
assert.equal(workerPlan.suites[0]?.cases[0]?.id, sharedId);

const [nodeResult, workerResult] = await Promise.all([
  run_selected_test_ids(nodeRegistry, nodePlan.selectionIds, () => undefined),
  run_selected_test_ids(workerRegistry, workerPlan.selectionIds, () => undefined),
]);
assert.equal(nodeResult.ok, true);
assert.equal(workerResult.ok, true);
assert.equal(nodeResult.summary.cases, 1);
assert.equal(workerResult.summary.cases, 1);

const opaqueId = node.catalog.suites.find((suite) => suite.executionShape === "opaque-aggregate")?.id;
assert.ok(opaqueId);
const opaquePlan = make_test_run_plan({ ...nodePlan, runId: "stage4a-opaque", catalog: node.catalog, selectedIds: [opaqueId] });
assert.equal(opaquePlan.suites[0]?.id, opaqueId);
assert.equal(opaquePlan.suites[0]?.cases.length, 0);
assert.equal(typeof opaquePlan.suites[0]?.sourceRef, "string");

assert.throws(() => make_test_run_plan({ ...nodePlan, runId: "stage4a-invalid", catalog: node.catalog, selectedIds: ["livehost/missing::case"] }));
assert.throws(() => make_test_run_plan({ ...nodePlan, runId: "stage4a-retired-route", catalog: node.catalog, selectedIds: ["category/livehost"] }));

console.log(JSON.stringify({ certificate: "stage-4a-selected", selectionId: sharedId, node: nodeResult.summary, worker: workerResult.summary, opaqueId }));
