import { run_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { selected_test_suites } from "../../harness/core/test-selected-run";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_cloudflare_locus_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";
import { all_jsdom_hosted_test_suites } from "../../harness/runtimes/dom/jsdom-hosted-test-suites";
import { all_jsdom_hosted_canvas_suites } from "../../harness/runtimes/dom/canvas/jsdom-hosted-canvas-suites";
import { CANONICAL_TEST_SUBJECT_ORDER } from "../../../src/shared/testing/test-contracts";

function expect_stage5a(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 5A corpus: ${message}`);
}

const node = make_local_node_locus_executor_registry();
const worker = make_cloudflare_locus_executor_registry();
const primary = hosted_test_panel_primary_choices(node.catalog.tests);
const primaryKeys = primary.map((choice) => choice.key);
const executorSubjectKeys = CANONICAL_TEST_SUBJECT_ORDER
  .filter((subject) => node.catalog.tests.some((descriptor) => descriptor.subject === subject))
  .map((subject) => `subject:${subject}`);
expect_stage5a(
  primaryKeys.join("|")
    === ["all", ...executorSubjectKeys, "collection:unit", "collection:dev"].join("|"),
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
const locusIds = idsFor("subject:livehost");
const unitIds = idsFor("collection:unit");
const devIds = idsFor("collection:dev");
expect_stage5a(allIds.length === node.catalog.tests.length, "All resolves to the complete active catalog");
for (const [subject, ids] of [
  ["transform", transformIds],
  ["livemap", liveMapIds],
  ["livetree", liveTreeIds],
  ["livehost", locusIds],
] as const) {
  const registered = node.catalog.tests.filter((descriptor) => descriptor.subject === subject);
  expect_stage5a(
    ids.length === registered.length
      && ids.every((id) => registered.some((descriptor) => descriptor.id === id)),
    `${subject} selection exactly projects its registered canonical cases`,
  );
}
const registeredUnitIds = node.catalog.tests
  .filter((descriptor) => descriptor.collections.includes("unit"))
  .map((descriptor) => descriptor.id);
const registeredDevIds = node.catalog.tests
  .filter((descriptor) => descriptor.collections.includes("dev"))
  .map((descriptor) => descriptor.id);
expect_stage5a(
  unitIds.length === registeredUnitIds.length
    && unitIds.every((id) => allIds.includes(id)),
  "Unit exactly projects collection membership without replacing semantic subjects",
);
expect_stage5a(
  devIds.length === registeredDevIds.length
    && devIds.every((id) => allIds.includes(id)),
  "Dev exactly projects collection membership without replacing semantic subjects",
);
expect_stage5a(new Set(unitIds).size === unitIds.length && new Set(devIds).size === devIds.length, "collection projections are duplicate-free");

const targetedSuites = hosted_test_panel_suite_choices(node.catalog.tests);
const replaySuite = targetedSuites.find((choice) => choice.key === "suite:livemap/replay");
const replayCases = hosted_test_panel_test_choices(node.catalog.tests, "livemap/replay");
const registeredReplayCases = node.catalog.tests.filter((descriptor) => descriptor.suiteId === "livemap/replay");
expect_stage5a(
  replaySuite?.count === registeredReplayCases.length
    && replayCases.length === registeredReplayCases.length
    && replayCases.every((choice) => registeredReplayCases.some((descriptor) => descriptor.id === choice.key.slice("test:".length)))
    && hosted_test_panel_selected_ids(node.catalog.tests, replayCases[0]!.selection).length === 1,
  "targeted suite and exact-test selections derive from current canonical identities",
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
  `expanded all-discovered Node execution passes with original suite grouping (observed ${JSON.stringify({ ok: result.ok, cases: result.summary.cases, suites: result.summary.suites, failed: result.summary.fail, failures: result.summary.failures.map((failure) => `${failure.suite}::${failure.caseId ?? failure.name}`) })})`,
);

const domPending = all_jsdom_hosted_test_suites();
const canvasPending = all_jsdom_hosted_canvas_suites();
expect_stage5a(
  domPending.every((suite) => suite.cases.every((testCase) => node.get(`${suite.suite}::${testCase.caseId}`) !== undefined))
    && new Set(domPending.map((suite) => suite.suite)).size === domPending.length,
  "synthetic-DOM inventory remains explicit, unique, and canonically registered",
);
expect_stage5a(
  new Set(canvasPending.map((suite) => suite.suite)).size === canvasPending.length
    && canvasPending.every((suite) => suite.cases.every((testCase) => node.get(`${suite.suite}::${testCase.caseId}`) !== undefined)),
  "deterministic canvas inventory remains explicit and canonically registered",
);

console.log(JSON.stringify({
  certificate: "stage5a-corpus",
  node: { tests: node.catalog.tests.length, suites: selectedSuites.length, passed: result.summary.pass },
  worker: { tests: worker.catalog.tests.length, suites: new Set(worker.catalog.tests.map((test) => test.suiteId)).size },
  taxonomy: Object.fromEntries(primary.map((choice) => [choice.key, choice.count])),
  executionContexts: {
    syntheticDom: { suites: domPending.length, cases: domPending.reduce((total, suite) => total + suite.cases.length, 0) },
    canvas: { suites: canvasPending.length, cases: canvasPending.reduce((total, suite) => total + suite.cases.length, 0) },
  },
}));
