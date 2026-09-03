import assert from "node:assert/strict";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { make_test_catalog, resolve_test_descriptor } from "../../harness/core/test-catalog";
import { executor_supports, make_test_executor_registry, select_executor } from "../../harness/core/test-executor";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { selected_test_suites } from "../../harness/core/test-selected-run";
import { discover_direct_report_executables, select_direct_report_executable_ids, select_direct_report_ids } from "../../harness/runtimes/node/direct-report-discovery";
import type { TestExecutorDescriptor } from "../../../src/shared/testing/test-executor-contract";

const firstCase: TestCase = Object.freeze({ suite: "ordinary/discovery", caseId: "first", name: "first", run: () => undefined });
const secondCase: TestCase = Object.freeze({
  suite: "ordinary/discovery", caseId: "second", name: "second",
  descriptor: Object.freeze({ requirements: Object.freeze(["javascript", "node"] as const) }), run: () => undefined,
});
const suite: TestSuite = Object.freeze({
  suite: "ordinary/discovery",
  descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript"] as const), collections: Object.freeze(["unit"] as const) }),
  cases: Object.freeze([firstCase, secondCase]),
});
const first = resolve_test_descriptor(suite, firstCase);
const second = resolve_test_descriptor(suite, secondCase);
assert.equal(first.subject, "integration");
assert.deepEqual(first.requirements, ["javascript"]);
assert.deepEqual(second.requirements, ["javascript", "node"]);
assert.throws(() => make_test_catalog([first, first]), /Duplicate canonical test ID/);
assert.throws(() => resolve_test_descriptor({ ...suite, suite: "Bad ID" }, firstCase), /suite mismatch|Invalid/);

const executor: TestExecutorDescriptor = Object.freeze({
  id: "ordinary-node", kind: "node", label: "ordinary node", location: "local",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }), supportsStreaming: true, supportsCancellation: true,
});
const javascriptOnly: TestExecutorDescriptor = Object.freeze({
  ...executor, id: "ordinary-js", capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
});
assert.equal(executor_supports(executor, second), true);
assert.equal(executor_supports(javascriptOnly, second), false);
assert.equal(select_executor(second, [javascriptOnly, executor]), executor);

const registry = make_test_executor_registry(executor, [suite]);
const selected = selected_test_suites(registry, [second.id, first.id]);
assert.deepEqual(selected[0]?.cases.map((entry) => entry.caseId), ["first", "second"]);
assert.throws(() => selected_test_suites(registry, [first.id, first.id]), /DUPLICATE_SELECTION/);
assert.deepEqual(selected_test_suites(registry, []), []);
assert.throws(() => selected_test_suites(registry, ["ordinary/discovery::missing"]), /UNAVAILABLE_ON_EXECUTOR/);

const plan = make_test_run_plan({ runId: "ordinary", protocolVersion: 1, catalogVersion: "fixture", executorId: executor.id, catalog: registry.catalog, selectedIds: [second.id, first.id] });
assert.deepEqual(plan.selectionIds, [first.id, second.id]);
assert.deepEqual(plan.suites[0]?.cases.map((entry) => entry.id), [first.id, second.id]);

const direct = await discover_direct_report_executables();
const executable = [...direct.catalog.tests.map((entry) => entry.id), ...direct.external.targets.map((entry) => entry.id)];
assert.equal(new Set(executable).size, executable.length, "direct executable discovery has unique logical IDs");
assert.equal(new Set(direct.external.targets.map((entry) => entry.sourceRef)).size, direct.external.targets.length, "external source metadata is uniquely bound");
const sample = direct.catalog.tests.slice(0, 2).map((entry) => entry.id);
assert.ok(sample.length === 2);
assert.deepEqual(select_direct_report_executable_ids(direct.catalog, [...sample].reverse()), sample);
assert.throws(() => select_direct_report_executable_ids(direct.catalog, [sample[0]!, sample[0]!]), /DUPLICATE_SELECTION/);
assert.deepEqual(select_direct_report_executable_ids(direct.catalog, []), []);
assert.throws(() => select_direct_report_executable_ids(direct.catalog, ["ordinary/missing::case"]), /UNKNOWN_SELECTION/);
assert.deepEqual(select_direct_report_ids(direct.catalog, { test: sample[0]! }), [sample[0]]);

console.log(JSON.stringify({ suite: "direct-selection-discovery", checks: 21 }));
