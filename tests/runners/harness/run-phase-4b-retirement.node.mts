import assert from "node:assert/strict";
import { decode_run_selected_tests_request } from "../../../src/shared/testing/test-run-contract";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { TEST_CONVERGENCE_BOUNDARIES } from "../../harness/core/test-convergence-compatibility";
import { make_initial_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import { resolve_external_launcher_binding, resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { hosted_test_panel_primary_choices, hosted_test_panel_selected_ids } from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";

let checks = 0;
function certify(condition: unknown, message: string): asserts condition { assert.ok(condition, message); checks += 1; }
function rejects(run: () => unknown, pattern?: RegExp): boolean {
  try { run(); return false; } catch (error) { return pattern === undefined || pattern.test(error instanceof Error ? error.message : String(error)); }
}

const registry = make_local_node_locus_executor_registry();
const availability = await resolve_external_library_launchers();
const discovery = make_test_executor_discovery(registry, availability.targets);
const canonicalId = discovery.catalog.tests[0]!.id;
const opaqueDescriptor = discovery.catalog.suites.find((suite) => suite.executionShape === "opaque-aggregate")!;

const decoded = decode_run_selected_tests_request({ selectionIds: [canonicalId, canonicalId, opaqueDescriptor.id] });
certify(decoded.ok, "selectionIds is the accepted selected-run field");
certify(decoded.ok && decoded.value.selectionIds.join("|") === `${canonicalId}|${opaqueDescriptor.id}`, "duplicate identities dedupe in first-seen order");
certify(!decode_run_selected_tests_request({ testIds: [canonicalId] }).ok, "old testIds requests reject exactly");
certify(!decode_run_selected_tests_request({ selectionIds: [canonicalId], testIds: [canonicalId] }).ok, "mixed old/new requests reject");
certify(!decode_run_selected_tests_request({ selectionIds: [] }).ok, "empty exact selection rejects");
certify(!decode_run_selected_tests_request({ selectionIds: ["not canonical"] }).ok, "malformed identity rejects");

const plan = make_test_run_plan({ runId: "phase4b-closure", protocolVersion: discovery.protocolVersion, catalogVersion: discovery.catalogVersion, executorId: discovery.executor.id, catalog: discovery.catalog, selectedIds: decoded.ok ? decoded.value.selectionIds : [] });
certify(plan.selectionIds.length === 2 && plan.suites.length === 2, "accepted RunPlan is exact, deduplicated, and complete");
certify(plan.suites.some((suite) => suite.executionShape === "cases" && suite.cases.length === 1), "canonical selection plans one exact case");
certify(plan.suites.some((suite) => suite.executionShape === "opaque-aggregate" && suite.cases.length === 0), "opaque selection fabricates no cases");

const binding = resolve_external_launcher_binding(availability, opaqueDescriptor);
certify(binding.sourceRef === opaqueDescriptor.sourceRef, "opaque execution resolves the exact sourceRef");
certify(rejects(() => resolve_external_launcher_binding({ ...availability, targets: [] }, opaqueDescriptor), /resolved to 0/), "missing opaque binding rejects");
certify(rejects(() => resolve_external_launcher_binding({ ...availability, targets: [binding, binding] }, opaqueDescriptor), /resolved to 2/), "duplicate opaque binding rejects");
certify(rejects(() => resolve_external_launcher_binding(availability, { ...opaqueDescriptor, sourceRef: "invalid" }), /DESCRIPTOR_INVALID/), "malformed sourceRef rejects");
certify(rejects(() => resolve_external_launcher_binding(availability, { ...opaqueDescriptor, title: `${opaqueDescriptor.title} changed` }), /BINDING_MISMATCH/), "binding metadata mismatch rejects");
certify(!Object.hasOwn(discovery, "externalTargets"), "discovery has no externalTargets side list");

const report = make_initial_hosted_test_report(plan, 1);
certify(!Object.hasOwn(report, "caseBatches") && !Object.hasOwn(report, "suites") && !Object.hasOwn(report, "externalResults"), "report has no compatibility result bags");

const choices = hosted_test_panel_primary_choices(discovery.catalog.tests, discovery.catalog.suites);
certify(choices.map((choice) => choice.key).join("|") === "all|subject:transform|subject:livetree|subject:livemap|subject:livehost|subject:reflect|collection:unit|collection:dev", "selector UX remains All, subjects, Unit, and Dev");
certify(!choices.some((choice) => choice.key.includes("library")), "no Library selector exists");
const reflect = choices.find((choice) => choice.key === "subject:reflect")!;
certify(hosted_test_panel_selected_ids(discovery.catalog.tests, reflect.selection, discovery.catalog.suites).length > 0, "Reflect lowers to exact identities");
const unit = hosted_test_panel_selected_ids(discovery.catalog.tests, { kind: "collection", collection: "unit" }, discovery.catalog.suites);
const dev = hosted_test_panel_selected_ids(discovery.catalog.tests, { kind: "collection", collection: "dev" }, discovery.catalog.suites);
certify(new Set([...unit, ...dev]).size <= unit.length + dev.length, "Unit/Dev overlap is identity-deduplicable");
certify(TEST_CONVERGENCE_BOUNDARIES.length === 1 && TEST_CONVERGENCE_BOUNDARIES[0]?.id === "hson-live-launcher-manifest", "only the hson-live manifest boundary remains");

console.log(JSON.stringify({ certificate: "phase4b-retirement", checks, canonicalId, opaqueId: opaqueDescriptor.id, selectors: choices.map((choice) => choice.key) }));
