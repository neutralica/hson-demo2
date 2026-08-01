import type { TestEvent, TestSubject } from "../../harness/core/test-contracts";
import { run_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { find_test_descriptor } from "../../harness/core/test-catalog";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { normalize_test_event } from "../../harness/core/test-run-events";
import { select_test_descriptors, type TestSelection } from "../../harness/core/test-selection";

function usage(): never {
  throw new Error("Usage: test:canonical-node [--subject <subject>] [--suite <suite-id>] [--test <suite-id::test-name>]");
}

function selection_from_args(args: readonly string[]): TestSelection {
  const selection: { subject?: TestSubject; suite?: string; test?: string } = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (value === undefined) usage();
    if (flag === "--subject") selection.subject = value as TestSubject;
    else if (flag === "--suite") selection.suite = value;
    else if (flag === "--test") selection.test = value;
    else usage();
  }
  return selection;
}

const registry = make_local_node_livehost_executor_registry();
const selection = selection_from_args(process.argv.slice(2));
const selected = select_test_descriptors(registry.catalog.tests, selection);
if (selected.length === 0) throw new Error("Canonical test selection matched no tests.");
const descriptors = registry.catalog;
const events: TestEvent[] = [];
const result = await run_node_selected_test_ids(registry, selected.map((descriptor) => descriptor.id), (event) => {
  events.push(event);
  const normalized = normalize_test_event(event, (suite, name) => find_test_descriptor(descriptors, `${suite}::${name}`));
  if (normalized.type === "test-finished" && normalized.status === "fail") {
    console.error(`FAIL ${normalized.test.id}\n${normalized.error ?? "failed assertion"}`);
  }
}, { yieldEveryCases: 0, yieldBetweenSuites: false });

console.log(JSON.stringify({
  executor: registry.executor.id,
  selected: selected.length,
  suites: result.summary.suites,
  passed: result.summary.pass,
  failed: result.summary.fail,
  skipped: result.summary.skip,
  events: events.length,
}));
if (!result.ok) process.exitCode = 1;
