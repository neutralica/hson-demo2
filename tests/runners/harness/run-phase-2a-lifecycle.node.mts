import assert from "node:assert/strict";
import type { TestCatalog } from "../../../src/shared/testing/test-catalog-contract";
import { make_test_catalog } from "../../harness/core/test-catalog";
import { test_catalog_version } from "../../../src/shared/testing/test-catalog-contract";
import type { TestDescriptor, TestSuiteDescriptor } from "../../../src/shared/testing/test-contracts";
import type { TestEvent } from "../../harness/core/test-contracts";
import { TEST_ERROR_KINDS, TEST_LIFECYCLE_STATUSES, type TestLifecycleCounts, type TestLifecycleEvent } from "../../../src/shared/testing/test-lifecycle-contract";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { run_test_suites } from "../../harness/core/test-runner";
import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";

let checks = 0;
function certify(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  checks += 1;
}

function rejects(run: () => void, pattern: RegExp): boolean {
  try { run(); return false; }
  catch (error) { return pattern.test(error instanceof Error ? error.message : String(error)); }
}

function suite(
  id: string,
  order: number,
  executionShape: "cases" | "opaque-aggregate" = "cases",
  declaredChecks?: number,
): TestSuiteDescriptor {
  return Object.freeze({
    id,
    title: id,
    subject: id.startsWith("transform/") ? "transform" : id.startsWith("livetree/") ? "livetree" : "livemap",
    collections: Object.freeze([]),
    provenance: executionShape === "cases" ? "hson-demo2" : "hson-live",
    order,
    requirements: Object.freeze(["javascript"] as const),
    executionShape,
    ...(executionShape === "opaque-aggregate" ? {
      sourceRef: `hson-live:${id}`,
      ...(declaredChecks === undefined ? {} : { declaredChecks }),
    } : {}),
  });
}

function test_case(owner: TestSuiteDescriptor, caseId: string): TestDescriptor {
  return Object.freeze({
    id: `${owner.id}::${caseId}`,
    suiteId: owner.id,
    caseId,
    title: caseId,
    subject: owner.subject,
    requirements: owner.requirements,
    collections: owner.collections,
    provenance: owner.provenance,
    suiteOrdinal: owner.order,
    caseOrdinal: 0,
  });
}

function plan_for(runId: string, catalog: TestCatalog, selectedIds: readonly string[]) {
  return make_test_run_plan({
    runId,
    protocolVersion: 3,
    catalogVersion: test_catalog_version(catalog),
    executorId: "livehost-authority",
    catalog,
    selectedIds,
  });
}

certify(TEST_LIFECYCLE_STATUSES.join("|") === "queued|running|pass|fail|skip|unsupported|cancelled", "status vocabulary is exact");
certify(TEST_ERROR_KINDS.join("|") === "assertion|suite|infrastructure|protocol|timeout|cancelled", "error vocabulary is exact");

// Canonical TestSuite/TestCase adapter and the removed callback-attached clear protocol.
const canonicalSuite = suite("transform/canonical-adapter", 0);
const canonicalCase = test_case(canonicalSuite, "passes");
const canonicalCatalog = make_test_catalog([canonicalCase], [canonicalSuite]);
const canonicalPlan = plan_for("phase2a-canonical", canonicalCatalog, [canonicalCase.id]);
let now = 10;
const canonicalReport = make_hosted_test_report(() => now++, undefined, { runPlan: canonicalPlan });
const canonicalInitial = canonicalReport.map.snap();
certify(canonicalInitial.suiteRuns[0]?.status === "queued" && canonicalInitial.suiteRuns[0].cases[0]?.status === "queued", "RunPlan seeds suite and case queued");
certify(canonicalInitial.suiteRuns[0]?.counts.declared === 1 && canonicalInitial.suiteRuns[0].counts.executed === 0, "canonical queued counts are declared but unexecuted");
const originalQueuedAt = canonicalInitial.suiteRuns[0]?.cases[0]?.queuedAt;
let hiddenClearCalls = 0;
const onCanonicalEvent = Object.assign(
  (event: TestEvent) => canonicalReport.reduce(event),
  { clear: () => { hiddenClearCalls += 1; } },
);
const canonicalResult = await run_test_suites([{
  suite: canonicalSuite.id,
  descriptor: { subject: "transform", requirements: ["javascript"] },
  cases: [{ suite: canonicalSuite.id, caseId: canonicalCase.caseId, name: canonicalCase.title, run() {} }],
}], onCanonicalEvent, { yieldEveryCases: 0, yieldBetweenSuites: false });
canonicalReport.complete(canonicalResult);
const canonicalFinal = canonicalReport.map.snap().suiteRuns[0]!;
certify(hiddenClearCalls === 0, "core execution never invokes a callback-attached clear property");
certify(canonicalFinal.status === "pass" && canonicalFinal.cases[0]?.status === "pass", "canonical adapter maps start/finish into normalized pass state");
certify(canonicalFinal.queuedAt < canonicalFinal.startedAt! && canonicalFinal.startedAt! <= canonicalFinal.completedAt!, "suite timestamps retain queued/start/completion chronology");
certify(canonicalFinal.cases[0]?.queuedAt === originalQueuedAt, "queued evidence remains durable throughout execution");
certify(canonicalFinal.counts.executed === 1 && canonicalFinal.counts.passed === 1 && canonicalFinal.counts.failed === 0, "canonical counts derive from cases");
certify(canonicalFinal.executorIds.join() === "livehost-authority" && canonicalFinal.cases[0]?.executorId === "livehost-authority", "executor assignment is evidence, not test identity");

// One authority accepts heterogeneous executor events while preserving RunPlan order.
const remoteSuite = suite("livetree/remote", 0);
const remoteCase = test_case(remoteSuite, "skips");
const opaqueSuite = suite("livemap/opaque", 0, "opaque-aggregate");
const mixedCatalog = make_test_catalog([canonicalCase, remoteCase], [opaqueSuite, remoteSuite, canonicalSuite]);
const mixedPlan = plan_for("phase2a-heterogeneous", mixedCatalog, [canonicalCase.id, remoteCase.id, opaqueSuite.id]);
const mixedReport = make_hosted_test_report(() => 0, undefined, { runPlan: mixedPlan });
const initialOrder = mixedReport.map.snap().suiteRuns.map((entry) => entry.id).join("|");
let sequence = 0;
type Unsequenced<T> = T extends TestLifecycleEvent ? Omit<T, "runId" | "sequence" | "timestamp"> : never;
const event = (value: Unsequenced<TestLifecycleEvent>): TestLifecycleEvent => ({
  ...value,
  runId: mixedPlan.runId,
  sequence: ++sequence,
  timestamp: 100 + sequence,
}) as unknown as TestLifecycleEvent;
mixedReport.reduceLifecycle(event({ t: "suite_started", executorId: "node-01", suiteId: canonicalSuite.id }));
mixedReport.reduceLifecycle(event({ t: "case_started", executorId: "node-01", suiteId: canonicalSuite.id, caseId: canonicalCase.caseId }));
mixedReport.reduceLifecycle(event({ t: "output", executorId: "node-01", suiteId: canonicalSuite.id, caseId: canonicalCase.caseId, stream: "runtime_warning", text: "warning evidence" }));
certify(mixedReport.map.snap().suiteRuns.find((entry) => entry.id === canonicalSuite.id)?.status === "running", "output evidence does not change lifecycle status");
mixedReport.reduceLifecycle(event({ t: "case_finished", executorId: "node-01", suiteId: canonicalSuite.id, caseId: canonicalCase.caseId, status: "pass", durationMs: 2 }));
mixedReport.reduceLifecycle(event({ t: "suite_finished", executorId: "node-01", suiteId: canonicalSuite.id, status: "pass", durationMs: 3 }));
mixedReport.reduceLifecycle(event({ t: "suite_started", executorId: "worker-07", suiteId: remoteSuite.id }));
mixedReport.reduceLifecycle(event({ t: "case_finished", executorId: "worker-07", suiteId: remoteSuite.id, caseId: remoteCase.caseId, status: "skip", durationMs: 0 }));
mixedReport.reduceLifecycle(event({ t: "suite_finished", executorId: "worker-07", suiteId: remoteSuite.id, status: "skip", durationMs: 1 }));
mixedReport.reduceLifecycle(event({ t: "suite_started", executorId: "node-child-02", suiteId: opaqueSuite.id }));
mixedReport.reduceLifecycle(event({ t: "output", executorId: "node-child-02", suiteId: opaqueSuite.id, stream: "stdout", text: "ordinary output\n" }));
mixedReport.reduceLifecycle(event({ t: "artifact", executorId: "node-child-02", suiteId: opaqueSuite.id, kind: "protocol_control", name: "completion", content: "{\"executed\":5}" }));
const opaqueCounts: TestLifecycleCounts = { declared: 5, total: 5, executed: 5, passed: 5, failed: 0, skipped: 0, unsupported: 0, cancelled: 0 };
const opaqueTerminal = event({ t: "suite_finished", executorId: "node-child-02", suiteId: opaqueSuite.id, status: "pass", durationMs: 4, counts: opaqueCounts }) as Extract<TestLifecycleEvent, { t: "suite_finished" }>;
mixedReport.reduceLifecycle(opaqueTerminal);
mixedReport.reduceLifecycle(event({ t: "run_finished", executorId: "livehost-authority", status: "pass", durationMs: 8 }));
const mixedFinal = mixedReport.map.snap();
certify(mixedFinal.suiteRuns.map((entry) => entry.id).join("|") === initialOrder, "hostile lifecycle timing never reorders RunPlan positions");
certify(mixedFinal.suiteRuns.find((entry) => entry.id === remoteSuite.id)?.cases[0]?.status === "skip", "skip is terminal and non-failing");
certify(mixedFinal.suiteRuns.find((entry) => entry.id === opaqueSuite.id)?.cases.length === 0, "opaque launchers never fabricate cases");
certify(mixedFinal.suiteRuns.find((entry) => entry.id === opaqueSuite.id)?.counts.passed === 5, "opaque aggregate counts remain check counts");
certify(mixedFinal.suiteRuns.map((entry) => entry.executorIds.join()).join("|").includes("node-01") && mixedFinal.suiteRuns.some((entry) => entry.executorIds.includes("worker-07")), "one report retains heterogeneous executor evidence");
certify(mixedFinal.suiteRuns.find((entry) => entry.id === canonicalSuite.id)?.evidence[0]?.executorId === "node-01", "output evidence names its execution context");
mixedReport.reduceLifecycle(opaqueTerminal);
certify(mixedReport.map.snap().run.lastSequence === sequence, "exact event replay is idempotent");
certify(rejects(() => mixedReport.reduceLifecycle({ ...opaqueTerminal, status: "fail" }), /SEQUENCE_CONTRADICTION/), "same-sequence contradictory replay rejects");
certify(rejects(() => mixedReport.reduceLifecycle(event({ t: "suite_started", executorId: "node-child-02", suiteId: opaqueSuite.id })), /TERMINAL_REOPEN/), "terminal suite cannot reopen");
const recoveredMap = mixedReport.map;
mixedReport.dispose();
const recoveredReport = make_hosted_test_report(() => 0, undefined, {
  runPlan: mixedPlan,
  map: recoveredMap,
});
const recoverySequence = recoveredMap.snap().run.lastSequence + 1;
recoveredReport.reduceLifecycle({
  t: "output", runId: mixedPlan.runId, executorId: "node-01", sequence: recoverySequence, timestamp: 999,
  suiteId: canonicalSuite.id, stream: "stdout", text: "post-reconnect evidence",
});
const recoveredFinal = recoveredMap.snap();
certify(recoveredFinal.suiteRuns.map((entry) => entry.id).join("|") === initialOrder && recoveredFinal.suiteRuns.every((entry) => entry.status !== "queued" && entry.status !== "running"), "recovered report preserves normalized terminal state and RunPlan order");
certify(recoveredFinal.suiteRuns.find((entry) => entry.id === canonicalSuite.id)?.evidence.at(-1)?.content === "post-reconnect evidence", "recovered authority continues incremental evidence ingestion without raw-output reconstruction");
recoveredReport.dispose();

// Opaque adapter: completion is control authority, raw output remains an artifact.
const opaquePlan = plan_for("phase2a-opaque", make_test_catalog([], [opaqueSuite]), [opaqueSuite.id]);
const opaqueReport = make_hosted_test_report(() => 50, undefined, { runPlan: opaquePlan });
const sharedExternal = {
  id: opaqueSuite.id, suite: opaqueSuite.id, name: opaqueSuite.title, subject: opaqueSuite.subject,
  runtime: "node", collections: Object.freeze([]),
};
opaqueReport.reduce({ t: "external_state", ...sharedExternal, status: "running" });
opaqueReport.reduce({
  t: "external_end", ...sharedExternal, status: "pass", ms: 5,
  stdout: "human\n<HSON_LIVE_TEST_COMPLETION>{\"version\":1}\n", ordinaryStdout: "human\n", stderr: "",
  exitCode: 0, signal: null, timedOut: false,
  completion: { version: 1, launcherId: "opaque", executed: 5, passed: 5, failed: 0 },
});
const opaqueFinal = opaqueReport.map.snap().suiteRuns[0]!;
certify(opaqueFinal.evidence.find((item) => item.kind === "stdout")?.content === "human\n", "completion control frame never enters ordinary stdout evidence");
certify(opaqueFinal.evidence.find((item) => item.kind === "raw_process_output")?.content.includes("HSON_LIVE_TEST_COMPLETION") === true, "untouched raw process output remains recoverable");
certify(opaqueFinal.evidence.some((item) => item.kind === "protocol_control"), "structured completion is retained as control evidence");
certify(opaqueFinal.status === "pass" && opaqueFinal.counts.passed === 5, "opaque completion is authoritative normalized suite state");

const protocolReport = make_hosted_test_report(() => 60, undefined, { runPlan: plan_for("phase2a-protocol", make_test_catalog([], [opaqueSuite]), [opaqueSuite.id]) });
protocolReport.reduce({ t: "external_state", ...sharedExternal, status: "running" });
protocolReport.reduce({
  t: "external_end", ...sharedExternal, status: "fail", ms: 1, stdout: "", ordinaryStdout: "", stderr: "raw stderr\n",
  exitCode: 0, signal: null, timedOut: false, completionError: "missing completion",
});
const protocolFinal = protocolReport.map.snap().suiteRuns[0]!;
certify(protocolFinal.errors.some((error) => error.kind === "protocol" && error.executorId === "livehost-authority"), "protocol failure is classified with executor context");
certify(protocolFinal.evidence.some((item) => item.kind === "stderr" && item.content === "raw stderr\n"), "protocol diagnostics retain stderr as normalized evidence");

const variableInventoryReport = make_hosted_test_report(() => 61, undefined, { runPlan: plan_for("phase2a-variable-inventory", make_test_catalog([], [opaqueSuite]), [opaqueSuite.id]) });
variableInventoryReport.reduce({ t: "external_state", ...sharedExternal, status: "running" });
variableInventoryReport.reduce({
  t: "external_end", ...sharedExternal, status: "pass", ms: 2, stdout: "", ordinaryStdout: "", stderr: "",
  exitCode: 0, signal: null, timedOut: false,
  completion: { version: 1, launcherId: "opaque", executed: 6, passed: 6, failed: 0 },
});
const variableInventoryFinal = variableInventoryReport.map.snap().suiteRuns[0]!;
certify(
  variableInventoryFinal.status === "pass"
    && variableInventoryFinal.declaredChecks === null
    && variableInventoryFinal.counts.total === 6
    && variableInventoryFinal.counts.passed === 6,
  "accepted completion inventory is observed without a separately declared count",
);

const impossiblePlan = plan_for("phase2a-impossible", canonicalCatalog, [canonicalCase.id]);
const impossibleReport = make_hosted_test_report(() => 0, undefined, { runPlan: impossiblePlan });
certify(rejects(() => impossibleReport.reduceLifecycle({
  t: "case_finished", runId: impossiblePlan.runId, executorId: "node-01", sequence: 1, timestamp: 1,
  suiteId: canonicalSuite.id, caseId: canonicalCase.caseId, status: "pass", durationMs: 1,
}), /START_REQUIRED/), "case_finished before case_started rejects");

for (const [index, status] of (["unsupported", "cancelled"] as const).entries()) {
  const runId = `phase2a-${status}`;
  const terminalPlan = plan_for(runId, canonicalCatalog, [canonicalCase.id]);
  const terminalReport = make_hosted_test_report(() => 0, undefined, { runPlan: terminalPlan });
  terminalReport.reduceLifecycle({
    t: "case_finished", runId, executorId: "remote-model", sequence: 1, timestamp: 1,
    suiteId: canonicalSuite.id, caseId: canonicalCase.caseId, status, durationMs: 0,
  });
  terminalReport.reduceLifecycle({
    t: "suite_finished", runId, executorId: "remote-model", sequence: 2, timestamp: 2,
    suiteId: canonicalSuite.id, status, durationMs: 0,
  });
  const terminal = terminalReport.map.snap().suiteRuns[0]!;
  certify(
    terminal.status === status && terminal.cases[0]?.status === status && terminal.counts[status] === 1 && terminal.errors.length === 0,
    `${status} is modeled as a non-assertion terminal lifecycle state (${index + 1}/2)`,
  );
}

const timeoutRunId = "phase2a-timeout";
const timeoutPlan = plan_for(timeoutRunId, make_test_catalog([], [opaqueSuite]), [opaqueSuite.id]);
const timeoutReport = make_hosted_test_report(() => 70, undefined, { runPlan: timeoutPlan });
timeoutReport.reduce({ t: "external_state", ...sharedExternal, status: "running" });
timeoutReport.reduce({
  t: "external_end", ...sharedExternal, status: "fail", ms: 1000, stdout: "partial output", ordinaryStdout: "partial output", stderr: "",
  exitCode: null, signal: null, timedOut: true, completionError: "missing completion",
});
certify(timeoutReport.map.snap().suiteRuns[0]?.errors.some((error) => error.kind === "timeout") === true, "opaque timeout retains partial evidence and timeout classification");

const invalidCountsRunId = "phase2a-invalid-counts";
const invalidCountsPlan = plan_for(invalidCountsRunId, make_test_catalog([], [opaqueSuite]), [opaqueSuite.id]);
const invalidCountsReport = make_hosted_test_report(() => 0, undefined, { runPlan: invalidCountsPlan });
invalidCountsReport.reduceLifecycle({ t: "suite_started", runId: invalidCountsRunId, executorId: "node-child", sequence: 1, timestamp: 1, suiteId: opaqueSuite.id });
certify(rejects(() => invalidCountsReport.reduceLifecycle({
  t: "suite_finished", runId: invalidCountsRunId, executorId: "node-child", sequence: 2, timestamp: 2,
  suiteId: opaqueSuite.id, status: "pass", durationMs: 1,
  counts: { declared: 5, total: 6, executed: 6, passed: 6, failed: 0, skipped: 0, unsupported: 0, cancelled: 0 },
}), /COUNTS_CONTRADICTION/), "contradictory normalized count evidence rejects");

console.log(JSON.stringify({ certificate: "phase2a-lifecycle", suite: "phase2a-lifecycle", checks, order: initialOrder.split("|"), executors: ["node-01", "worker-07", "node-child-02"] }));
