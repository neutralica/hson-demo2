import type { TestCase } from "../../app/demos/test/tests.types";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../app/demos/test/hosted-test-panel-selection";
import { hosted_test_report_cases, type HostedTestReportState } from "../../app/hosted-test/hosted-test-report.types";
import type { HostedTestSelectedRunResult } from "../../app/hosted-test/hosted-test-action.types";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import {
  CANVAS_BROWSER_RASTER_CASE_IDS,
  CANVAS_DETERMINISTIC_SUITE_IDS,
} from "../../hosted-test/canonical-synthetic-dom-test-suites";
import { make_cloudflare_livehost_executor_registry } from "../../hosted-test/cloudflare/cloudflare-test-executor";
import { HOSTED_CANVAS_MIGRATION_CASES } from "../../hosted-test/dom/hosted-dom-migration-inventory";
import { create_hosted_test_application } from "../../hosted-test/hosted-test-application";
import {
  run_fresh_node_selected_test_ids,
  run_node_selected_test_ids,
} from "../../hosted-test/run-node-selected-test-suites";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { make_test_executor_discovery } from "../../test-system/test-discovery";
import { make_test_executor_registry, type TestExecutorDescriptor } from "../../test-system/test-executor";

function expect_closeout(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 5C closeout: ${message}`);
}

const node = make_local_node_livehost_executor_registry();
const worker = make_cloudflare_livehost_executor_registry();
const canvasSuiteIds = new Set<string>(CANVAS_DETERMINISTIC_SUITE_IDS);
const canvasDescriptors = node.catalog.tests.filter((descriptor) => canvasSuiteIds.has(descriptor.suite));
const canvasSource = HOSTED_CANVAS_MIGRATION_CASES.filter((entry) => !entry.duplicateDeclaration);
const migratedSource = canvasSource.filter((entry) => entry.status.startsWith("MIGRATED_"));
const rasterSource = canvasSource.filter((entry) => entry.status === "DEFERRED_PIXEL_OUTPUT");

expect_closeout(
  canvasDescriptors.length === 62
    && new Set(canvasDescriptors.map((descriptor) => descriptor.suite)).size === 6
    && migratedSource.length === 62,
  "all 62 truthful deterministic canvas cases from six original suite factories are registered",
);
expect_closeout(
  rasterSource.length === 4
    && rasterSource.map((entry) => `${entry.suite}::${entry.name}`).join("|")
      === CANVAS_BROWSER_RASTER_CASE_IDS.join("|"),
  "all genuine raster-readback cases remain explicitly outside canonical discovery",
);
expect_closeout(
  canvasDescriptors.every((descriptor) => (
    descriptor.subject === "livetree"
    && descriptor.requirements.join("|") === "javascript|node|synthetic-dom"
    && node.get(descriptor.id)?.testCase.name === descriptor.name
    && worker.get(descriptor.id) === undefined
  )),
  "canvas descriptors preserve LiveTree identity, original TestCases, and Node-only availability",
);
expect_closeout(
  node.registrations.length === node.catalog.tests.length
    && new Set(node.registrations.map((registration) => registration.descriptor.id)).size === node.registrations.length,
  "final Node descriptor and executable sets have exact unique parity",
);

let firstContext: CanvasRenderingContext2D | undefined;
const isolationSuiteId = "proof/canvas-isolation";
const isolationCases: readonly TestCase[] = Object.freeze([
  Object.freeze({
    suite: isolationSuiteId,
    name: "canvas recorder accepts state and commands",
    run() {
      const canvas = document.createElement("canvas");
      document.body.append(canvas);
      const context = canvas.getContext("2d");
      expect_closeout(context !== null, "hosted canvas supplies a 2D context");
      firstContext = context;
      context.lineWidth = 7;
      context.fillRect(1, 2, 3, 4);
    },
  }),
  Object.freeze({
    suite: isolationSuiteId,
    name: "canvas state is reset at the next case boundary",
    run() {
      const canvas = document.querySelector("canvas");
      expect_closeout(canvas instanceof HTMLCanvasElement, "the fixture canvas remains available within its suite");
      const context = canvas.getContext("2d");
      expect_closeout(context !== null && context !== firstContext && context.lineWidth === 1, "case reset replaces recorder state");
    },
  }),
]);
const isolationExecutor = Object.freeze({
  id: "stage-5c-isolation-node",
  kind: "node",
  label: "Stage 5C isolation Node",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node", "synthetic-dom"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
}) satisfies TestExecutorDescriptor;
const isolationRegistry = make_test_executor_registry(isolationExecutor, Object.freeze([
  Object.freeze({
    suite: isolationSuiteId,
    descriptor: Object.freeze({
      subject: "livetree",
      requirements: Object.freeze(["javascript", "node", "synthetic-dom"] as const),
      collections: Object.freeze([]),
    }),
    cases: isolationCases,
  }),
]));
const isolationResult = await run_node_selected_test_ids(
  isolationRegistry,
  isolationRegistry.catalog.tests.map((descriptor) => descriptor.id),
);
expect_closeout(isolationResult.ok && isolationResult.summary.pass === 2, "canvas recorder state resets between cases");
expect_closeout(
  typeof document === "undefined" && typeof HTMLCanvasElement === "undefined",
  "DOM and canvas globals are restored after canvas execution",
);

let runNumber = 0;
let normalizedEvents = 0;
const application = create_hosted_test_application(make_hosted_test_suite_registry([]), {
  discovery: make_test_executor_discovery(node),
  executorRegistry: node,
  runSelected: (registry, ids, onEvent, options) => run_fresh_node_selected_test_ids(
    registry,
    ids,
    (event) => {
      normalizedEvents += 1;
      onEvent?.(event);
    },
    options,
  ),
  makeRunId: () => `stage-5c-${++runNumber}`,
  report: { caseBatchSize: 16 },
});

async function selected(ids: readonly string[]): Promise<Readonly<{
  result: HostedTestSelectedRunResult;
  report: HostedTestReportState;
}>> {
  const response = await application.coordinator.dispatch_action({
    type: "action",
    id: `stage-5c-action-${runNumber + 1}`,
    clientId: "stage-5c",
    requestId: `stage-5c-request-${runNumber + 1}`,
    name: "tests.runSelected",
    payload: { testIds: [...ids] },
  });
  expect_closeout(response.type === "ack", `selected run is acknowledged: ${JSON.stringify(response)}`);
  const result = response.result as unknown as HostedTestSelectedRunResult;
  expect_closeout(typeof result.reportHostId === "string", "selected run returns its report host ID");
  const reportHost = application.store.get(result.reportHostId);
  expect_closeout(reportHost !== undefined, "selected run retains its streamed report");
  return Object.freeze({ result, report: reportHost.map.capture().value as HostedTestReportState });
}

const primary = hosted_test_panel_primary_choices(node.catalog.tests);
const categoryCounts: Record<string, number> = {};
let all: Awaited<ReturnType<typeof selected>> | undefined;
let allNormalizedEvents = 0;
for (const choice of primary) {
  const ids = hosted_test_panel_selected_ids(node.catalog.tests, choice.selection);
  const beforeEvents = normalizedEvents;
  const run = await selected(ids);
  expect_closeout(run.result.ok && run.result.summary.cases === choice.count, `${choice.key} executes its exact advertised count`);
  categoryCounts[choice.key] = run.result.summary.cases;
  if (choice.selection.kind === "all") {
    all = run;
    allNormalizedEvents = normalizedEvents - beforeEvents;
  }
}
expect_closeout(all !== undefined, "primary taxonomy includes All discovered tests");

const suiteChoices = hosted_test_panel_suite_choices(node.catalog.tests);
const canvasSuiteChoice = suiteChoices.find((choice) => choice.key === "suite:livetree/canvas");
expect_closeout(canvasSuiteChoice !== undefined, "advanced suite projection includes a registered canvas suite");
const canvasCaseChoices = hosted_test_panel_test_choices(node.catalog.tests, "livetree/canvas");
expect_closeout(
  canvasCaseChoices.length === canvasSuiteChoice.count
    && canvasCaseChoices.every((choice) => choice.selection.kind === "test" && choice.count === 1),
  "advanced case projection contains only exact cases from its selected suite",
);
const entireCanvasIds = hosted_test_panel_selected_ids(node.catalog.tests, canvasSuiteChoice.selection);
const exactCanvasIds = hosted_test_panel_selected_ids(node.catalog.tests, canvasCaseChoices[0]!.selection);
expect_closeout(entireCanvasIds.length === 10 && exactCanvasIds.length === 1, "entire-suite and exact-case projections resolve canonical IDs");

const ordinary = node.catalog.tests.find((descriptor) => !descriptor.requirements.includes("synthetic-dom"));
const dom = node.catalog.tests.find((descriptor) => (
  descriptor.requirements.includes("synthetic-dom") && !canvasSuiteIds.has(descriptor.suite)
));
const canvas = canvasDescriptors[0];
expect_closeout(ordinary !== undefined && dom !== undefined && canvas !== undefined, "all three internal execution classes are represented");
const targetedSelections = [
  node.catalog.tests.filter((descriptor) => descriptor.suite === ordinary.suite).map((descriptor) => descriptor.id),
  [ordinary.id],
  node.catalog.tests.filter((descriptor) => descriptor.suite === dom.suite).map((descriptor) => descriptor.id),
  [dom.id],
  entireCanvasIds,
  exactCanvasIds,
  [ordinary.id, dom.id, canvas.id],
] as const;
const targetedRuns = [];
for (const ids of targetedSelections) targetedRuns.push(await selected(ids));
expect_closeout(targetedRuns.every((run) => run.result.ok), "ordinary, DOM, canvas, exact, suite, and mixed selections all pass");

const allCases = hosted_test_report_cases(all.report);
expect_closeout(
  all.result.ok
    && all.result.summary.cases === node.catalog.tests.length
    && allCases.length === node.catalog.tests.length,
  "the final discovered Node catalog executes through one canonical selected run",
);

application.dispose();
console.log(JSON.stringify({
  canvas: {
    suites: new Set(canvasDescriptors.map((descriptor) => descriptor.suite)).size,
    deterministicCases: canvasDescriptors.length,
    rasterDeferredCases: rasterSource.length,
    classification: Object.fromEntries(
      [...new Set(HOSTED_CANVAS_MIGRATION_CASES.map((entry) => entry.status))]
        .map((status) => [status, HOSTED_CANVAS_MIGRATION_CASES.filter((entry) => entry.status === status).length]),
    ),
  },
  node: {
    tests: node.catalog.tests.length,
    suites: all.result.summary.suites,
    passed: all.result.summary.pass,
    failed: all.result.summary.fail,
    skipped: all.result.summary.skip,
    reportBatches: Object.keys(all.report.caseBatches).length,
    normalizedEvents: allNormalizedEvents,
    runnerMs: all.result.timing.runnerMs,
    hostMs: all.result.timing.hostMs,
  },
  worker: { tests: worker.catalog.tests.length },
  categories: categoryCounts,
  targeted: {
    ordinarySuite: targetedRuns[0]!.result.summary.cases,
    ordinaryCase: targetedRuns[1]!.result.summary.cases,
    domSuite: targetedRuns[2]!.result.summary.cases,
    domCase: targetedRuns[3]!.result.summary.cases,
    canvasSuite: targetedRuns[4]!.result.summary.cases,
    canvasCase: targetedRuns[5]!.result.summary.cases,
    mixed: targetedRuns[6]!.result.summary.cases,
  },
  isolation: { cases: isolationResult.summary.cases, globalsRestored: typeof document === "undefined" },
}));
