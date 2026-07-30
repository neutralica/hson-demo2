import { run_node_selected_test_ids } from "../../hosted-test/run-node-selected-test-suites";
import { selected_test_suites } from "../../test-system/test-selected-run";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { make_cloudflare_livehost_executor_registry } from "../../hosted-test/cloudflare/cloudflare-test-executor";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../app/demos/test/hosted-test-panel-selection";
import { all_jsdom_hosted_test_suites } from "../../hosted-test/dom/jsdom-hosted-test-suites";
import { all_jsdom_hosted_canvas_suites } from "../../hosted-test/dom/canvas/jsdom-hosted-canvas-suites";

function expect_stage5a(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 5A corpus: ${message}`);
}

const node = make_local_node_livehost_executor_registry();
const worker = make_cloudflare_livehost_executor_registry();
const primary = hosted_test_panel_primary_choices(node.catalog.tests);
const primaryKeys = primary.map((choice) => choice.key);
expect_stage5a(
  primaryKeys.join("|")
    === "all|subject:transform|subject:livetree|subject:livemap|subject:livehost|collection:unit|collection:dev",
  "the primary taxonomy remains curated as executor categories expand",
);
expect_stage5a(
  primary.every((choice) => choice.selection.kind !== "suite" && choice.selection.kind !== "test"),
  "suite and exact-test entries remain outside the primary selector",
);

const idsFor = (key: string): readonly string[] => {
  const choice = primary.find((candidate) => candidate.key === key);
  if (choice === undefined) throw new Error(`Missing primary choice: ${key}`);
  return hosted_test_panel_selected_ids(node.catalog.tests, choice.selection);
};
const allIds = idsFor("all");
const transformIds = idsFor("subject:transform");
const liveMapIds = idsFor("subject:livemap");
const liveTreeIds = idsFor("subject:livetree");
const liveHostIds = idsFor("subject:livehost");
const unitIds = idsFor("collection:unit");
const devIds = idsFor("collection:dev");
expect_stage5a(allIds.length === node.catalog.tests.length, "All resolves to the complete active catalog");
expect_stage5a(transformIds.length > 0, "Transform appears when the executor advertises it");
expect_stage5a(liveMapIds.length >= 802, "LiveMap retains the portable LiveMap corpus");
expect_stage5a(liveTreeIds.length >= 101, "LiveTree retains the unit CSS/LiveTree corpus");
expect_stage5a(liveHostIds.length === 185, "LiveHost includes factory suites and the Node proof launcher");
expect_stage5a(unitIds.length === 101 && unitIds.every((id) => liveTreeIds.includes(id)), "Unit overlaps LiveTree without duplicate IDs");
expect_stage5a(
  devIds.length === 32 && devIds.every((id) => liveMapIds.includes(id) || liveTreeIds.includes(id)),
  "Dev overlaps LiveMap and LiveTree without duplicate IDs",
);
expect_stage5a(new Set(unitIds).size === unitIds.length && new Set(devIds).size === devIds.length, "collection projections are duplicate-free");

const targetedSuites = hosted_test_panel_suite_choices(node.catalog.tests);
const replaySuite = targetedSuites.find((choice) => choice.key === "suite:livemap/replay");
expect_stage5a(replaySuite?.count === 45, "targeted suite selection resolves exact canonical IDs");
const replayCases = hosted_test_panel_test_choices(node.catalog.tests, "livemap/replay");
expect_stage5a(
  replayCases.length === 45
    && hosted_test_panel_selected_ids(node.catalog.tests, replayCases[0]!.selection).length === 1,
  "targeted exact-test selection remains available outside the primary taxonomy",
);

expect_stage5a(
  node.registrations.length === node.catalog.tests.length
    && worker.registrations.length === worker.catalog.tests.length,
  "descriptor and executable registration sets have exact parity",
);
expect_stage5a(
  new Set(node.registrations.map((registration) => registration.descriptor.id)).size === node.registrations.length,
  "legacy aggregate routes do not duplicate canonical registrations",
);
const nodeById = new Map(node.catalog.tests.map((descriptor) => [descriptor.id, descriptor]));
expect_stage5a(
  worker.catalog.tests.every((descriptor) => JSON.stringify(nodeById.get(descriptor.id)) === JSON.stringify(descriptor)),
  "shared Node and Worker descriptor identities remain equal",
);

const selectedSuites = selected_test_suites(node, allIds);
const result = await run_node_selected_test_ids(node, allIds, () => undefined, {
  yieldEveryCases: 16,
  yieldBetweenSuites: true,
});
expect_stage5a(
  result.ok
    && result.summary.cases === node.catalog.tests.length
    && result.summary.suites === selectedSuites.length,
  "expanded all-discovered Node execution passes with original suite grouping",
);

const domPending = all_jsdom_hosted_test_suites();
const canvasPending = all_jsdom_hosted_canvas_suites();
expect_stage5a(
  domPending.length === 78 && domPending.reduce((total, suite) => total + suite.cases.length, 0) === 957,
  "pending synthetic-DOM inventory remains explicit",
);
expect_stage5a(
  canvasPending.length === 6
    && canvasPending.reduce((total, suite) => total + suite.cases.length, 0) === 62
    && canvasPending.every((suite) => suite.cases.every((testCase) => node.get(`${suite.suite}::${testCase.name}`) !== undefined)),
  "deterministic canvas inventory remains explicit and canonically registered",
);

console.log(JSON.stringify({
  node: { tests: node.catalog.tests.length, suites: selectedSuites.length, passed: result.summary.pass },
  worker: { tests: worker.catalog.tests.length, suites: new Set(worker.catalog.tests.map((test) => test.suite)).size },
  taxonomy: Object.fromEntries(primary.map((choice) => [choice.key, choice.count])),
  executionContexts: {
    syntheticDom: { suites: domPending.length, cases: domPending.reduce((total, suite) => total + suite.cases.length, 0) },
    canvas: { suites: canvasPending.length, cases: canvasPending.reduce((total, suite) => total + suite.cases.length, 0) },
  },
}));
