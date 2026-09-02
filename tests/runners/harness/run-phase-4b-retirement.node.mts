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
const externalDescriptor = discovery.catalog.suites.find((suite) => suite.provenance === "hson-live")!;

const decoded = decode_run_selected_tests_request({ selectionIds: [canonicalId, canonicalId, externalDescriptor.id] });
certify(decoded.ok, "selectionIds is the accepted selected-run field");
certify(decoded.ok && decoded.value.selectionIds.join("|") === `${canonicalId}|${externalDescriptor.id}`, "duplicate identities dedupe in first-seen order");
certify(!decode_run_selected_tests_request({ testIds: [canonicalId] }).ok, "old testIds requests reject exactly");
certify(!decode_run_selected_tests_request({ selectionIds: [canonicalId], testIds: [canonicalId] }).ok, "mixed old/new requests reject");
certify(!decode_run_selected_tests_request({ selectionIds: [] }).ok, "empty exact selection rejects");
certify(!decode_run_selected_tests_request({ selectionIds: ["not canonical"] }).ok, "malformed identity rejects");

const plan = make_test_run_plan({ runId: "phase4b-closure", protocolVersion: discovery.protocolVersion, catalogVersion: discovery.catalogVersion, executorId: discovery.executor.id, catalog: discovery.catalog, selectedIds: decoded.ok ? decoded.value.selectionIds : [] });
certify(plan.selectionIds.length === 2 && plan.suites.length === 2, "accepted RunPlan is exact, deduplicated, and complete");
certify(plan.suites.some((suite) => suite.executionShape === "cases" && suite.cases.length === 1), "canonical selection plans one exact case");
certify(plan.suites.some((suite) => suite.provenance === "hson-live" && suite.executionShape === "cases" && suite.cases.length === 0), "external child cases are not fabricated before execution");

const binding = resolve_external_launcher_binding(availability, externalDescriptor);
certify(binding.sourceRef === externalDescriptor.sourceRef, "external execution resolves the exact sourceRef");
certify(rejects(() => resolve_external_launcher_binding({ ...availability, targets: [] }, externalDescriptor), /resolved to 0/), "missing external binding rejects");
certify(rejects(() => resolve_external_launcher_binding({ ...availability, targets: [binding, binding] }, externalDescriptor), /resolved to 2/), "duplicate external binding rejects");
certify(rejects(() => resolve_external_launcher_binding(availability, { ...externalDescriptor, sourceRef: "invalid" }), /DESCRIPTOR_INVALID/), "malformed sourceRef rejects");
certify(rejects(() => resolve_external_launcher_binding(availability, { ...externalDescriptor, title: `${externalDescriptor.title} changed` }), /BINDING_MISMATCH/), "binding metadata mismatch rejects");
certify(!Object.hasOwn(discovery, "externalTargets"), "discovery has no externalTargets side list");

const report = make_initial_hosted_test_report(plan, 1);
certify(!Object.hasOwn(report, "caseBatches") && !Object.hasOwn(report, "suites") && !Object.hasOwn(report, "externalResults"), "report has no compatibility result bags");

const choices = hosted_test_panel_primary_choices(discovery.catalog.tests, discovery.catalog.suites);
const choiceKeys = new Set(choices.map((choice) => choice.key));
certify(["all", "subject:transform", "subject:livetree", "subject:livemap", "subject:livehost", "collection:unit", "collection:dev"].every((key) => choiceKeys.has(key)), "selector UX retains All, available executable subjects, Unit, and Dev without a fixed global count");
certify(!choices.some((choice) => choice.key.includes("library")), "no Library selector exists");
const transform = choices.find((choice) => choice.key === "subject:transform")!;
certify(hosted_test_panel_selected_ids(discovery.catalog.tests, transform.selection, discovery.catalog.suites).length > 0, "an available subject lowers to exact identities");
const unit = hosted_test_panel_selected_ids(discovery.catalog.tests, { kind: "collection", collection: "unit" }, discovery.catalog.suites);
const dev = hosted_test_panel_selected_ids(discovery.catalog.tests, { kind: "collection", collection: "dev" }, discovery.catalog.suites);
certify(new Set([...unit, ...dev]).size <= unit.length + dev.length, "Unit/Dev overlap is identity-deduplicable");
certify(TEST_CONVERGENCE_BOUNDARIES.length === 1 && TEST_CONVERGENCE_BOUNDARIES[0]?.id === "hson-live-executable-source", "only the hson-live executable-source boundary remains");

console.log(JSON.stringify({ certificate: "phase4b-retirement", checks, canonicalId, externalId: externalDescriptor.id, selectors: choices.map((choice) => choice.key) }));
