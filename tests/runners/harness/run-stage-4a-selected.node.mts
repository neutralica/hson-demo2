import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import type { HostedTestSelectedRunResult } from "../../harness/hosted/hosted-test-action.types";
import { create_hosted_test_livehost } from "../../harness/hosted/hosted-test-action";
import { run_selected_hosted_tests_action } from "../../harness/hosted/hosted-test-client-action";
import { hosted_test_report_cases, type HostedTestReportState } from "../../harness/reporting/hosted/hosted-test-report.types";
import { make_hosted_test_suite_registry } from "../../harness/hosted/hosted-test-suite";
import { create_hosted_test_application } from "../../harness/hosted/hosted-test-application";
import { run_livehost_all_suite } from "../../harness/hosted/registered-hosted-test-suites";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_executor_registry, type TestExecutorDescriptor } from "../../harness/core/test-executor";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import {
  run_fresh_node_selected_test_ids,
  run_node_selected_test_ids,
} from "../../harness/runtimes/node/run-node-selected-test-suites";
import {
  decode_run_selected_tests_request,
  selected_test_suites,
} from "../../harness/core/test-selected-run";

function expect_stage4(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 4A selected execution: ${message}`);
}

const nodeRegistry = make_local_node_livehost_executor_registry();
const legacyRegistry = make_hosted_test_suite_registry([
  Object.freeze({ id: "livehost/all", label: "livehost/all", run: run_livehost_all_suite }),
]);
let runNumber = 0;
const application = create_hosted_test_application(legacyRegistry, {
  discovery: make_test_executor_discovery(nodeRegistry),
  executorRegistry: nodeRegistry,
  runSelected: run_fresh_node_selected_test_ids,
  makeRunId: () => `stage-4a-${++runNumber}`,
  report: { caseBatchSize: 3 },
});
let actionNumber = 0;

async function run_selected(testIds: readonly string[]): Promise<Readonly<{
  result: HostedTestSelectedRunResult;
  report: HostedTestReportState;
}>> {
  actionNumber += 1;
  const response = await application.coordinator.dispatch_action({
    type: "action",
    id: `selected-${actionNumber}`,
    clientId: "stage-4a",
    requestId: `selected-request-${actionNumber}`,
    name: "tests.runSelected",
    payload: { testIds: [...testIds] },
  });
  expect_stage4(response.type === "ack", `selected action ${actionNumber} is acknowledged`);
  const result = response.result as unknown as HostedTestSelectedRunResult;
  expect_stage4(result.suite === "canonical/selected" && typeof result.reportHostId === "string", "selected action returns canonical report identity");
  const reportHost = application.store.get(result.reportHostId);
  expect_stage4(reportHost !== undefined, "selected action retains its existing streamed report host");
  const report = reportHost.map.capture().value as HostedTestReportState;
  return Object.freeze({ result, report });
}

expect_stage4(decode_run_selected_tests_request({ testIds: ["suite::case"] }).ok, "strict request accepts one canonical ID");
for (const malformed of [
  undefined,
  {},
  { testIds: [] },
  { testIds: [""] },
  { testIds: ["missing-separator"] },
  { testIds: ["suite::case", "suite::case"] },
  { testIds: ["suite::case"], extra: true },
] as const) {
  expect_stage4(!decode_run_selected_tests_request(malformed).ok, `strict request rejects ${JSON.stringify(malformed)?.slice(0, 80)}`);
}
const largerThanFormerFixedLimit = {
  testIds: Array.from({ length: 4097 }, (_, index) => `suite::case-${index}`),
};
expect_stage4(
  decode_run_selected_tests_request(largerThanFormerFixedLimit).ok,
  "request decoding relies on general payload limits rather than a fixed selected-test count",
);
let catalogSizeRejected = false;
try {
  selected_test_suites(nodeRegistry, [
    ...nodeRegistry.catalog.tests.map((descriptor) => descriptor.id),
    "unknown/suite::one beyond catalog",
  ]);
} catch (error) {
  catalogSizeRejected = error instanceof Error
    && error.message.includes("HOSTED_TEST_SELECTION_EXCEEDS_EXECUTOR_CATALOG")
    && error.message.includes(nodeRegistry.executor.id);
}
expect_stage4(catalogSizeRejected, "selection cardinality is validated against the active executor catalog");

const first = nodeRegistry.catalog.tests[0];
expect_stage4(first !== undefined, "Node registry contains a proof test");
const single = await run_selected([first.id]);
expect_stage4(single.result.ok && single.result.summary.cases === 1, "one exact shared test executes");
expect_stage4(hosted_test_report_cases(single.report).map((testCase) => testCase.key).join() === first.id, "single report preserves the stable test ID");
let helperPayload: unknown;
const helperResult = await run_selected_hosted_tests_action({
  async action(_name, payload) {
    helperPayload = payload;
    return { type: "ack", result: single.result };
  },
}, [first.id]);
expect_stage4(
  (helperPayload as { testIds?: readonly string[] }).testIds?.join() === first.id
    && helperResult.runId === single.result.runId,
  "the client helper sends exact IDs and decodes the canonical selected result",
);

const compatibilityHost = create_hosted_test_livehost(
  legacyRegistry,
  undefined,
  () => "stage-4a-compatibility",
  {},
  undefined,
  undefined,
  make_test_executor_discovery(nodeRegistry),
  nodeRegistry,
  run_node_selected_test_ids,
);
const compatibilityResponse = await compatibilityHost.dispatch_action({
  type: "action",
  id: "selected-compatibility",
  name: "tests.runSelected",
  payload: { testIds: [first.id] },
});
expect_stage4(
  compatibilityResponse.type === "ack"
    && (compatibilityResponse.result as unknown as HostedTestSelectedRunResult).summary.cases === 1,
  "the compatibility LiveHost action surface also executes exact canonical IDs",
);
compatibilityHost.dispose();

const sameSuiteDescriptors = nodeRegistry.catalog.tests.filter((descriptor) => descriptor.suite === first.suite).slice(0, 3);
expect_stage4(sameSuiteDescriptors.length === 3, "proof catalog contains three cases in one suite");
const sameSuite = await run_selected(sameSuiteDescriptors.map((descriptor) => descriptor.id).reverse());
const expectedSameSuiteOrder = sameSuiteDescriptors.map((descriptor) => descriptor.id).sort();
expect_stage4(sameSuite.result.summary.cases === 3 && sameSuite.result.summary.suites === 1, "several exact tests in one suite execute once");
expect_stage4(
  hosted_test_report_cases(sameSuite.report).map((testCase) => testCase.key).join("|")
    === expectedSameSuiteOrder.join("|"),
  "execution order follows canonical ID order rather than request order",
);

const secondSuiteDescriptor = nodeRegistry.catalog.tests.find((descriptor) => descriptor.suite !== first.suite);
expect_stage4(secondSuiteDescriptor !== undefined, "proof catalog contains another suite");
const crossSuiteDescriptors = [first, secondSuiteDescriptor];
const crossSuite = await run_selected(crossSuiteDescriptors.map((descriptor) => descriptor.id).reverse());
const expectedCrossSuiteOrder = crossSuiteDescriptors.map((descriptor) => descriptor.id).sort();
expect_stage4(crossSuite.result.summary.cases === 2 && crossSuite.result.summary.suites === 2, "cross-suite exact execution preserves original suite grouping");
expect_stage4(
  hosted_test_report_cases(crossSuite.report).map((testCase) => testCase.key).join("|")
    === expectedCrossSuiteOrder.join("|"),
  "cross-suite execution is stable in canonical ID order",
);

const nodeOnly = nodeRegistry.catalog.tests.find((descriptor) => descriptor.suite === "livehost/hosted-replay-action-in-memory");
expect_stage4(nodeOnly !== undefined, "Node registry exposes the migrated Node-only replay-action case");
const nodeOnlyRun = await run_selected([nodeOnly.id]);
expect_stage4(nodeOnlyRun.result.ok && nodeOnlyRun.result.summary.cases === 1, "Node-only replay-action test executes canonically");

const wholeNode = await run_selected(nodeRegistry.catalog.tests.map((descriptor) => descriptor.id));
expect_stage4(
  wholeNode.result.ok
    && wholeNode.result.summary.cases === nodeRegistry.catalog.tests.length
    && hosted_test_report_cases(wholeNode.report).length === nodeRegistry.catalog.tests.length,
  "the entire discovered Node catalog executes with descriptor/report parity",
);
expect_stage4(
  Object.keys(wholeNode.report.caseBatches).length > 1 && wholeNode.result.reportRev === application.store.get(wholeNode.result.reportHostId!)?.stream.headRev,
  "selected execution retains existing report batching and terminal revision behavior",
);

const unknownResponse = await application.coordinator.dispatch_action({
  type: "action",
  id: "selected-unknown",
  clientId: "stage-4a",
  requestId: "selected-unknown-request",
  name: "tests.runSelected",
  payload: { testIds: ["unknown/suite::unknown case"] },
});
expect_stage4(
  unknownResponse.type === "error"
    && unknownResponse.error.message.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR")
    && unknownResponse.error.message.includes(nodeRegistry.executor.id),
  "unknown IDs reject before report construction with executor-specific availability detail",
);
const duplicateResponse = await application.coordinator.dispatch_action({
  type: "action",
  id: "selected-duplicate",
  clientId: "stage-4a",
  requestId: "selected-duplicate-request",
  name: "tests.runSelected",
  payload: { testIds: [first.id, first.id] },
});
expect_stage4(
  duplicateResponse.type === "error" && duplicateResponse.error.code === "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
  "duplicate IDs use structured schema rejection",
);
const missingPayloadResponse = await application.coordinator.dispatch_action({
  type: "action",
  id: "selected-missing-payload",
  clientId: "stage-4a",
  requestId: "selected-missing-payload-request",
  name: "tests.runSelected",
} as never);
expect_stage4(
  missingPayloadResponse.type === "error" && missingPayloadResponse.error.code === "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
  "missing selected-run payload uses structured schema rejection",
);
const legacyResponse = await application.coordinator.dispatch_action({
  type: "action",
  id: "legacy-after-selected",
  clientId: "stage-4a",
  requestId: "legacy-after-selected-request",
  name: "tests.run",
  payload: { suite: "livehost/all" },
});
expect_stage4(legacyResponse.type === "ack", "legacy tests.run remains operational after selected execution");
application.dispose();

let executionCount = 0;
const diagnosticCase: TestCase = Object.freeze({
  suite: "proof/diagnostics",
  name: "failure detail",
  run() {
    executionCount += 1;
    throw new Error("selected diagnostic sentinel");
  },
});
const expectedCase: TestCase = Object.freeze({
  suite: "proof/diagnostics",
  name: "expected failure",
  expected: "fail",
  expectedError: Object.freeze({ includes: "expected sentinel" }),
  run() {
    executionCount += 1;
    throw new Error("expected sentinel");
  },
});
const diagnosticSuite: TestSuite = Object.freeze({
  suite: "proof/diagnostics",
  descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript"] as const) }),
  cases: Object.freeze([diagnosticCase, expectedCase]),
});
const proofExecutor = Object.freeze({
  id: "stage-4a-proof",
  kind: "node",
  label: "Stage 4A proof",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
}) satisfies TestExecutorDescriptor;
const proofRegistry = make_test_executor_registry(proofExecutor, [diagnosticSuite]);
const reversedProofRegistry = make_test_executor_registry(proofExecutor, [
  Object.freeze({ ...diagnosticSuite, cases: Object.freeze([...diagnosticSuite.cases].reverse()) }),
]);
const proofSuites = selected_test_suites(proofRegistry, proofRegistry.catalog.tests.map((descriptor) => descriptor.id));
const reversedProofSuites = selected_test_suites(
  reversedProofRegistry,
  [...reversedProofRegistry.catalog.tests].reverse().map((descriptor) => descriptor.id),
);
expect_stage4(
  proofSuites.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`)).join("|")
    === reversedProofSuites.flatMap((suite) => suite.cases.map((testCase) => `${testCase.suite}::${testCase.name}`)).join("|"),
  "the same ID set has stable order regardless of request and registry construction order",
);
const proofEvents: JsonValue[] = [];
const proofResult = await import("../../harness/core/test-runner").then(({ run_test_suites }) => run_test_suites(
  proofSuites,
  (event) => proofEvents.push(JSON.parse(JSON.stringify(event)) as JsonValue),
  { yieldEveryCases: 0, yieldBetweenSuites: false, includePassedDiagnostics: true },
));
expect_stage4(executionCount === 2, "every selected TestCase executes no more than once");
expect_stage4(
  !proofResult.ok
    && proofResult.summary.failures[0]?.err.includes("selected diagnostic sentinel")
    && proofResult.summary.failures[0]?.err.includes("run-stage-4a-selected.node.mts"),
  "selected execution preserves original failure message and stack detail",
);
expect_stage4(
  proofResult.summary.pass === 1
    && proofEvents.some((event) => typeof event === "object" && event !== null
      && (event as { expected?: unknown }).expected === "fail"),
  "selected execution preserves expected-failure runner behavior and events",
);

const proofApplication = create_hosted_test_application(make_hosted_test_suite_registry([]), {
  executorRegistry: proofRegistry,
  discovery: make_test_executor_discovery(proofRegistry),
  makeRunId: () => "stage-4a-diagnostic",
});
const proofHostedResponse = await proofApplication.coordinator.dispatch_action({
  type: "action",
  id: "selected-diagnostic",
  clientId: "stage-4a-diagnostic",
  requestId: "selected-diagnostic-request",
  name: "tests.runSelected",
  payload: { testIds: proofRegistry.catalog.tests.map((descriptor) => descriptor.id) },
});
expect_stage4(proofHostedResponse.type === "ack", "diagnostic selected run reaches the hosted report path");
const proofHostedResult = proofHostedResponse.result as unknown as HostedTestSelectedRunResult;
const proofReportHost = proofApplication.store.get(proofHostedResult.reportHostId!);
expect_stage4(proofReportHost !== undefined, "diagnostic selected run has an authoritative report host");
const proofReport = proofReportHost.map.capture().value as HostedTestReportState;
const hostedDiagnosticFailure = hosted_test_report_cases(proofReport).find((testCase) => testCase.status === "fail");
expect_stage4(
  proofHostedResult.summary.fail === 1
    && proofHostedResult.summary.pass === 1
    && hostedDiagnosticFailure?.err?.includes("selected diagnostic sentinel")
    && hostedDiagnosticFailure.err.includes("run-stage-4a-selected.node.mts"),
  "hosted selected reports preserve failures, stacks, and expected-failure behavior",
);
proofApplication.dispose();

console.log(JSON.stringify({
  node: {
    executor: nodeRegistry.executor.id,
    discovered: nodeRegistry.catalog.tests.length,
    selectedCases: wholeNode.result.summary.cases,
    selectedSuites: wholeNode.result.summary.suites,
    reportBatches: Object.keys(wholeNode.report.caseBatches).length,
  },
  ordering: "canonical-test-id",
  selectionLimit: "active-executor-catalog-size",
}));
