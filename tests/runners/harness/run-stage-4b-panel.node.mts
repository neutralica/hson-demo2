import assert from "node:assert/strict";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";

const registry = make_local_node_livehost_executor_registry();
const availability = await resolve_external_library_launchers();
const discovery = make_test_executor_discovery(registry, availability.targets);
const suites = discovery.catalog.suites;
const tests = discovery.catalog.tests;
const choices = hosted_test_panel_primary_choices(tests, suites);

assert.deepEqual(choices.map((choice) => choice.key), [
  "all",
  "subject:transform",
  "subject:livetree",
  "subject:livemap",
  "subject:livehost",
  "subject:reflect",
  "collection:unit",
  "collection:dev",
]);
assert.equal(choices.some((choice) => choice.key.toLowerCase().includes("library")), false);

for (const choice of choices) {
  const ids = hosted_test_panel_selected_ids(tests, choice.selection, suites);
  assert.equal(ids.length > 0, true);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(choice.count > 0, true);
}

const reflect = choices.find((choice) => choice.key === "subject:reflect");
assert.ok(reflect);
const reflectIds = hosted_test_panel_selected_ids(tests, reflect.selection, suites);
assert.equal(reflectIds.every((id) => {
  const test = tests.find((candidate) => candidate.id === id);
  const suite = suites.find((candidate) => candidate.id === id);
  return (test ?? suite)?.subject === "reflect";
}), true);

const all = hosted_test_panel_selected_ids(tests, { kind: "all" }, suites);
const unit = hosted_test_panel_selected_ids(tests, { kind: "collection", collection: "unit" }, suites);
const dev = hosted_test_panel_selected_ids(tests, { kind: "collection", collection: "dev" }, suites);
const overlap = unit.filter((id) => dev.includes(id));
assert.equal(new Set([...unit, ...dev]).size, unit.length + dev.length - overlap.length);
assert.equal(new Set(all).size, all.length);

const firstSuite = hosted_test_panel_suite_choices(tests, suites)[0];
assert.ok(firstSuite?.selection.kind === "suite");
const testChoices = hosted_test_panel_test_choices(tests, firstSuite.selection.suite, suites);
assert.equal(new Set(testChoices.map((choice) => choice.key)).size, testChoices.length);

console.log(JSON.stringify({ certificate: "stage-4b-panel", selectors: choices.map((choice) => choice.label), all: all.length, unit: unit.length, dev: dev.length, overlap: overlap.length, reflect: reflectIds.length }));
