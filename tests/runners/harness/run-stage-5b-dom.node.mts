import type { TestCase, TestEvent, TestSuite } from "../../harness/core/test-contracts";
import type { HostedTestSelectedRunResult } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import { hosted_test_report_cases, type HostedTestReportState } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
  hosted_test_panel_suite_choices,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { TestExecutorDescriptor } from "../../../src/shared/testing/test-executor-contract";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_cloudflare_livehost_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import { create_hosted_test_application } from "../../harness/hosted/hosted-test-application";
import {
  run_fresh_node_selected_test_ids,
  run_node_selected_test_ids,
} from "../../harness/runtimes/node/run-node-selected-test-suites";
import { selected_test_suites } from "../../harness/core/test-selected-run";
import { HOSTED_DOM_GLOBAL_NAMES } from "../../harness/runtimes/dom/hosted-dom-runtime";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";
import { CANVAS_DETERMINISTIC_SUITE_IDS } from "../../harness/hosted/canonical-synthetic-dom-test-suites";

function expect_stage5b(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 5B DOM: ${message}`);
}

const node = make_local_node_livehost_executor_registry();
const worker = make_cloudflare_livehost_executor_registry();
const canvasSuiteIds = new Set<string>(CANVAS_DETERMINISTIC_SUITE_IDS);
const domDescriptors = node.catalog.tests.filter((descriptor) => (
  descriptor.requirements.includes("synthetic-dom") && !canvasSuiteIds.has(descriptor.suiteId)
));
expect_stage5b(
  node.executor.capabilities.provides.includes("synthetic-dom")
    && !worker.executor.capabilities.provides.includes("synthetic-dom"),
  "only Node advertises the installed synthetic-DOM capability",
);
expect_stage5b(domDescriptors.length === 955, "all 955 canonical non-Canvas synthetic-DOM cases are registered");
expect_stage5b(new Set(domDescriptors.map((descriptor) => descriptor.suiteId)).size === 78, "all 78 canonical non-Canvas synthetic-DOM suites are registered");
expect_stage5b(
  domDescriptors.every((descriptor) => (
    descriptor.suiteId.startsWith("transform/") ? descriptor.subject === "transform"
      : descriptor.suiteId.startsWith("livemap/") ? descriptor.subject === "livemap"
        : descriptor.suiteId.startsWith("livetree/") || descriptor.suiteId.startsWith("livetree-")
          ? descriptor.subject === "livetree"
          : false
  ))
    && ["transform", "livemap", "livetree"].every(
      (subject) => domDescriptors.some((descriptor) => descriptor.subject === subject),
    ),
  "DOM suite metadata derives Transform, LiveMap, and LiveTree domains from canonical suite identity",
);
expect_stage5b(
  domDescriptors.every((descriptor) => node.get(descriptor.id)?.testCase.name === descriptor.title),
  "DOM descriptors retain their original executable TestCase objects",
);
expect_stage5b(
  domDescriptors.every((descriptor) => worker.get(descriptor.id) === undefined),
  "Worker discovery excludes every synthetic-DOM registration",
);
let invalidConfigurationRejected = false;
try {
  create_hosted_test_application(make_hosted_test_suite_registry([]), {
    discovery: make_test_executor_discovery(node),
    executorRegistry: node,
  });
} catch (error) {
  invalidConfigurationRejected = error instanceof Error
    && error.message.includes("HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID")
    && error.message.includes("synthetic-dom");
}
expect_stage5b(invalidConfigurationRejected, "synthetic-DOM capability without an execution adapter fails during construction");

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
  makeRunId: () => `stage-5b-${++runNumber}`,
  report: { caseBatchSize: 16 },
});

async function selected(ids: readonly string[]): Promise<Readonly<{
  result: HostedTestSelectedRunResult;
  report: HostedTestReportState;
}>> {
  const response = await application.coordinator.dispatch_action({
    type: "action",
    id: `stage-5b-action-${runNumber + 1}`,
    clientId: "stage-5b",
    requestId: `stage-5b-request-${runNumber + 1}`,
    name: "tests.runSelected",
    payload: { testIds: [...ids] },
  });
  expect_stage5b(
    response.type === "ack",
    `selected request is acknowledged: ${JSON.stringify(response)}`,
  );
  const result = response.result as unknown as HostedTestSelectedRunResult;
  const reportHostId = result.reportHostId;
  expect_stage5b(typeof reportHostId === "string", "selected request returns a report host ID");
  const reportHost = application.store.get(reportHostId);
  expect_stage5b(reportHost !== undefined, "selected request retains its canonical report");
  return Object.freeze({
    result,
    report: reportHost.map.capture().value as HostedTestReportState,
  });
}

const transform = domDescriptors.find((descriptor) => descriptor.subject === "transform");
expect_stage5b(transform !== undefined, "representative Transform descriptor exists");
const exact = await selected([transform.id]);
expect_stage5b(
  exact.result.ok
    && exact.result.summary.cases === 1
    && hosted_test_report_cases(exact.report)[0]?.key === transform.id,
  "one exact synthetic-DOM ID executes through tests.runSelected",
);

const transformSuiteIds = domDescriptors
  .filter((descriptor) => descriptor.suiteId === transform.suiteId)
  .map((descriptor) => descriptor.id);
const completeSuite = await selected(transformSuiteIds);
expect_stage5b(
  completeSuite.result.ok
    && completeSuite.result.summary.suites === 1
    && completeSuite.result.summary.cases === transformSuiteIds.length,
  "one complete DOM suite preserves original suite grouping",
);
const partialIds = transformSuiteIds.slice(0, 2);
const partial = await selected(partialIds);
expect_stage5b(
  partial.result.ok
    && partial.result.summary.cases === partialIds.length
    && hosted_test_report_cases(partial.report).map((testCase) => testCase.key).join("|") === [...partialIds].sort().join("|"),
  "partial-suite execution runs only requested original cases",
);

const ordinary = node.catalog.tests.find((descriptor) => !descriptor.requirements.includes("synthetic-dom"));
expect_stage5b(ordinary !== undefined, "representative ordinary descriptor exists");
const mixedIds = [ordinary.id, transform.id];
const mixed = await selected(mixedIds);
const mixedCanonicalOrder = selected_test_suites(node, mixedIds)
  .flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.caseId}`));
expect_stage5b(
  mixed.result.ok
    && hosted_test_report_cases(mixed.report).map((testCase) => testCase.key).join("|")
      === mixedCanonicalOrder.join("|"),
  "mixed ordinary and DOM selection preserves deterministic canonical order in one report",
);

const primary = hosted_test_panel_primary_choices(node.catalog.tests);
const transformChoice = primary.find((choice) => choice.key === "subject:transform");
const registeredTransformCount = node.catalog.tests.filter(
  (descriptor) => descriptor.subject === "transform",
).length;
expect_stage5b(
  transformChoice?.count === registeredTransformCount
    && hosted_test_panel_selected_ids(node.catalog.tests, transformChoice.selection).length === registeredTransformCount,
  "panel projects Transform once with its unique descriptor count",
);
expect_stage5b(
  primary.every((choice) => choice.selection.kind !== "suite" && choice.selection.kind !== "test")
    && hosted_test_panel_suite_choices(node.catalog.tests).some((choice) => choice.key === `suite:${transform.suiteId}`),
  "primary taxonomy remains curated while advanced suites include Transform",
);
const categoryExecutionCounts: Record<string, number> = {};
for (const choice of primary.filter((candidate) => candidate.selection.kind !== "all")) {
  const ids = hosted_test_panel_selected_ids(node.catalog.tests, choice.selection);
  const categoryRun = await selected(ids);
  expect_stage5b(
    categoryRun.result.ok && categoryRun.result.summary.cases === choice.count,
    `${choice.key} executes its advertised unique count`,
  );
  categoryExecutionCounts[choice.key] = categoryRun.result.summary.cases;
}

const beforeGlobals = new Map(HOSTED_DOM_GLOBAL_NAMES.map((name) => [
  name,
  Object.getOwnPropertyDescriptor(globalThis, name),
]));
let setupFailed = false;
try {
  await with_hosted_dom_runtime(() => undefined, {
    beforeInstallGlobal(name) {
      if (name === "Element") throw new Error("intentional DOM setup failure");
    },
  });
} catch (error) {
  setupFailed = error instanceof Error && error.message.includes("intentional DOM setup failure");
}
expect_stage5b(setupFailed, "DOM setup failure remains observable");
for (const name of HOSTED_DOM_GLOBAL_NAMES) {
  expect_stage5b(
    Object.getOwnPropertyDescriptor(globalThis, name)?.value === beforeGlobals.get(name)?.value
      && Object.getOwnPropertyDescriptor(globalThis, name)?.get === beforeGlobals.get(name)?.get,
    `DOM setup failure restores global ${name}`,
  );
}

let activeDomRuns = 0;
let maximumDomRuns = 0;
const isolationSuite = "proof/synthetic-dom";
const domProbe: TestCase = Object.freeze({
  suite: isolationSuite,
  caseId: "dom-globals-exist-and-each-run-begins-empty", name: "DOM globals exist and each run begins empty",
  run: async () => {
    expect_stage5b(typeof window === "object" && typeof window.document === "object", "DOM globals exist during DOM execution");
    expect_stage5b(window.document.body.childNodes.length === 0, "document state does not leak between runs");
    window.document.body.textContent = "owned by current run";
    activeDomRuns += 1;
    maximumDomRuns = Math.max(maximumDomRuns, activeDomRuns);
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    activeDomRuns -= 1;
  },
});
const failingProbe: TestCase = Object.freeze({
  suite: isolationSuite,
  caseId: "intentional-failure-preserves-stack", name: "intentional failure preserves stack",
  run: () => { throw new Error("synthetic DOM diagnostic sentinel"); },
});
const ordinarySuite = "proof/ordinary-node";
const ordinaryProbe: TestCase = Object.freeze({
  suite: ordinarySuite,
  caseId: "ordinary-execution-observes-no-dom-globals", name: "ordinary execution observes no DOM globals",
  run: () => expect_stage5b(typeof document === "undefined" && typeof window === "undefined", "ordinary Node execution remains isolated"),
});
const fixtureSuites: readonly TestSuite[] = Object.freeze([
  Object.freeze({
    suite: ordinarySuite,
    descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript", "node"] as const) }),
    cases: Object.freeze([ordinaryProbe]),
  }),
  Object.freeze({
    suite: isolationSuite,
    descriptor: Object.freeze({
      subject: "livetree",
      requirements: Object.freeze(["javascript", "node", "synthetic-dom"] as const),
    }),
    cases: Object.freeze([domProbe, failingProbe]),
  }),
]);
const fixtureExecutor = Object.freeze({
  id: "stage-5b-fixture-node",
  kind: "node",
  label: "Stage 5B fixture Node",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node", "synthetic-dom"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
}) satisfies TestExecutorDescriptor;
const fixtureRegistry = make_test_executor_registry(fixtureExecutor, fixtureSuites);
const domProbeId = `${isolationSuite}::${domProbe.name}`;
await Promise.all([
  run_node_selected_test_ids(fixtureRegistry, [domProbeId]),
  run_node_selected_test_ids(fixtureRegistry, [domProbeId]),
]);
expect_stage5b(maximumDomRuns === 1, "DOM mutex serializes concurrent synthetic-DOM runs");
const failed = await run_node_selected_test_ids(fixtureRegistry, [`${isolationSuite}::${failingProbe.name}`]);
expect_stage5b(
  !failed.ok
    && failed.summary.failures[0]?.err.includes("synthetic DOM diagnostic sentinel") === true
    && failed.summary.failures[0]?.err.includes("Error:") === true,
  "assertion failure preserves diagnostic message and stack",
);
const ordinaryAfterFailure = await run_node_selected_test_ids(
  fixtureRegistry,
  [`${ordinarySuite}::${ordinaryProbe.name}`],
);
expect_stage5b(ordinaryAfterFailure.ok, "failed DOM execution releases the mutex and restores ordinary Node execution");
for (const name of HOSTED_DOM_GLOBAL_NAMES) {
  expect_stage5b(
    Object.getOwnPropertyDescriptor(globalThis, name)?.value === beforeGlobals.get(name)?.value
      && Object.getOwnPropertyDescriptor(globalThis, name)?.get === beforeGlobals.get(name)?.get,
    `completed DOM runs restore global ${name}`,
  );
}

normalizedEvents = 0;
const allIds = node.catalog.tests.map((descriptor) => descriptor.id);
const all = await selected(allIds);
const allCases = hosted_test_report_cases(all.report);
expect_stage5b(
  all.result.ok
    && all.result.summary.cases === node.catalog.tests.length
    && allCases.length === node.catalog.tests.length,
  `expanded all-discovered Node catalog passes through tests.runSelected (${JSON.stringify(all.result.summary.failures.slice(0, 3))})`,
);

application.dispose();
console.log(JSON.stringify({
  node: {
    tests: node.catalog.tests.length,
    suites: all.result.summary.suites,
    syntheticDom: domDescriptors.length,
  },
  worker: { tests: worker.catalog.tests.length },
  expandedAll: {
    cases: all.result.summary.cases,
    suites: all.result.summary.suites,
    passed: all.result.summary.pass,
    failed: all.result.summary.fail,
    skipped: all.result.summary.skip,
    reportBatches: Object.keys(all.report.caseBatches).length,
    normalizedEvents,
    runnerMs: all.result.timing.runnerMs,
    hostMs: all.result.timing.hostMs,
  },
  mixed: mixed.result.summary,
  partial: partial.result.summary,
  categories: categoryExecutionCounts,
  isolation: { maximumConcurrentDomRuns: maximumDomRuns, ordinaryAfterFailure: ordinaryAfterFailure.ok },
}));
