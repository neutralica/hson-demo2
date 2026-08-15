import { strict as assert } from "node:assert";
import { hson_live_test_launchers } from "hson-live/test-launchers";
import {
  external_library_launcher_metrics,
  reset_external_library_launcher_metrics,
  resolve_external_library_launchers,
} from "../../harness/runtimes/node/external-library-launchers";
import {
  node_selected_verification_metrics,
  run_node_selected_verifications,
} from "../../harness/runtimes/node/run-node-selected-verifications";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import {
  hosted_test_projection_footer,
  hosted_test_projection_summary,
} from "../../../src/app/demos/tests/panel/hosted-test-report-summary";
import type { TestEvent } from "../../harness/core/test-contracts";
import { TEST_SURFACE_CATALOG } from "../../harness/hosted/test-surface-catalog";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { make_test_run_plan } from "../../harness/core/test-run-plan";

const registry = make_local_node_livehost_executor_registry();
const availability = await resolve_external_library_launchers();
const discovery = make_test_executor_discovery(registry, availability.targets);
const canonicalCaseCount = registry.catalog.tests.length;
const manifestExternalCheckCount = hson_live_test_launchers.reduce(
  (total, launcher) => total + launcher.executableChecks,
  0,
);
const manifestedLauncherIds = hson_live_test_launchers.map((launcher) => launcher.id);
const inclusiveCatalogLaunchers = TEST_SURFACE_CATALOG.filter(
  (entry) => entry.externalLauncher?.inclusiveEligible === true,
);
assert.deepEqual(
  availability.targets.map((target) => target.launcherId),
  manifestedLauncherIds,
  "inclusive availability must resolve every manifested launcher exactly once in manifest order",
);
assert.deepEqual(
  inclusiveCatalogLaunchers.map((entry) => entry.externalLauncher!.launcherId).sort(),
  [...manifestedLauncherIds].sort(),
  "inclusive catalog eligibility must name exactly the manifested launchers",
);
assert.equal(
  availability.targets.reduce((total, target) => total + target.executableChecks, 0),
  manifestExternalCheckCount,
  "inclusive discovered external checks must equal the manifested check total",
);

const selectedIds = Object.freeze([
  ...registry.catalog.tests.map((test) => test.id),
  ...availability.targets.map((target) => target.id),
]);
const runPlan = make_test_run_plan({
  runId: "inclusive-library-verification",
  protocolVersion: discovery.protocolVersion,
  catalogVersion: discovery.catalogVersion,
  executorId: discovery.executor.id,
  catalog: discovery.catalog,
  selectedIds,
});
const plannedExternalIds = runPlan.suites
  .filter((suite) => suite.executionShape === "opaque-aggregate")
  .map((suite) => suite.id);
const report = make_hosted_test_report(Date.now, undefined, { runPlan });
const events: TestEvent[] = [];
let canonicalActive = false;
let externalActive = false;
let firstSuiteCompletionSawBothPhases = false;
let sawSuiteCompletion = false;
let canonicalCases = 0;
const queuedExternalIds: string[] = [];
const completedExternalIds: string[] = [];

reset_external_library_launcher_metrics();
const result = await run_node_selected_verifications(
  registry,
  discovery.catalog,
  availability,
  selectedIds,
  (event) => {
    events.push(event);
    if (event.t === "case_begin") canonicalActive = true;
    if (event.t === "case_end") canonicalCases += 1;
    if (event.t === "external_state" && event.status === "queued") queuedExternalIds.push(event.id);
    if (event.t === "external_state" && event.status === "running") externalActive = true;
    if (event.t === "external_end") completedExternalIds.push(event.id);
    if (event.t === "suite_end" && !sawSuiteCompletion) {
      sawSuiteCompletion = true;
      firstSuiteCompletionSawBothPhases = canonicalActive && externalActive;
    }
    report.reduce(event);
  },
  { yieldEveryCases: 0, yieldBetweenSuites: false },
);
const timing = node_selected_verification_metrics();
report.complete(result, { runnerMs: timing.overlappedTotalMs, hostMs: timing.overlappedTotalMs });
const captured = report.map.capture().value;
const projection = hosted_test_projection_summary(captured);
const footer = hosted_test_projection_footer(projection, timing.overlappedTotalMs);
const processMetrics = external_library_launcher_metrics();

const failedExternalEvents = events.filter(
  (event): event is Extract<TestEvent, { readonly t: "external_end" }> =>
    event.t === "external_end" && event.status === "fail",
);
const failedCanonicalEvents = events.filter(
  (event): event is Extract<TestEvent, { readonly t: "case_end" }> =>
    event.t === "case_end" && event.status === "fail",
);
assert.equal(
  result.ok,
  true,
  [
    ...failedCanonicalEvents.map((event) => `${event.suite}::${event.caseId}: ${event.err ?? "failed"}`),
    ...failedExternalEvents.map((event) => `${event.id}: ${event.stderr}`),
  ].join("\n"),
);
assert.equal(canonicalCases, canonicalCaseCount);
assert.equal(completedExternalIds.length, availability.targets.length);
assert.deepEqual(
  [...queuedExternalIds].sort(),
  [...plannedExternalIds].sort(),
  "external queue identities exactly match the authoritative RunPlan; chronological queue evidence retains executor order",
);
assert.deepEqual(
  captured.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate").map((suite) => suite.id),
  plannedExternalIds,
  "normalized report order follows the authoritative RunPlan",
);
assert.equal(firstSuiteCompletionSawBothPhases, true, "both phases become active before either suite completes");
assert.ok(
  events.findIndex((event) => event.t === "external_end") < events.length - 1,
  "an external completion is reported before the combined run completes",
);
assert.equal(footer.find((entry) => entry.key === "cases")?.value, canonicalCaseCount);
assert.equal(footer.find((entry) => entry.key === "case-pass")?.value, canonicalCaseCount);
assert.equal(footer.find((entry) => entry.key === "case-fail")?.value, 0);
assert.equal(footer.find((entry) => entry.key === "checks")?.value, manifestExternalCheckCount);
assert.equal(footer.find((entry) => entry.key === "check-pass")?.value, manifestExternalCheckCount);
assert.equal(footer.find((entry) => entry.key === "check-fail")?.value, 0);
assert.ok(!footer.some((entry) => entry.label === "passed" || entry.label === "failed"), "mixed totals never collapse cases and opaque checks into one universe");
assert.equal(projection.canonical.total, canonicalCaseCount);
assert.equal(projection.launchers.total, availability.targets.length);
const projectedLauncherIssues = availability.targets.flatMap((target) => {
  const projected = captured.suiteRuns.find((suite) => suite.id === target.id);
  if (projected === undefined) {
    return [`launcher: ${target.launcherId}; declared checks: ${target.executableChecks}; projected checks: missing`];
  }
  return projected.declaredChecks === target.executableChecks
    ? []
    : [`launcher: ${target.launcherId}; declared checks: ${target.executableChecks}; projected checks: ${projected.declaredChecks}`];
});
const unexpectedProjectedIds = captured.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate").map((suite) => suite.id).filter(
  (id) => !availability.targets.some((target) => target.id === id),
);
assert.deepEqual(
  [...projectedLauncherIssues, ...unexpectedProjectedIds.map((id) => `unexpected projected launcher: ${id}`)],
  [],
  "every inclusive launcher must contribute its manifested checks exactly once",
);
assert.equal(
  projection.launchers.declaredChecks,
  manifestExternalCheckCount,
  "projected external checks must equal the manifested and inclusive external total",
);
assert.equal(processMetrics.activeChildren, 0);
assert.equal(processMetrics.directLauncherStarts, availability.targets.length);
assert.equal(processMetrics.packageScriptStarts, 0);
assert.ok(timing.overlappedTotalMs >= timing.canonicalPhaseMs);
assert.ok(timing.overlappedTotalMs >= timing.externalPhaseMs);

console.log(JSON.stringify({
  canonicalPhaseElapsedMs: timing.canonicalPhaseMs,
  externalPhaseElapsedMs: timing.externalPhaseMs,
  overlappedTotalElapsedMs: timing.overlappedTotalMs,
  maximumOrdinaryLauncherConcurrency: timing.maximumOrdinaryLauncherConcurrency,
  maximumSpecialLaneConcurrency: timing.maximumSpecialLauncherConcurrency,
  directLauncherCount: processMetrics.directLauncherStarts,
  packageScriptFallbackCount: processMetrics.packageScriptStarts,
  totalCases: projection.canonical.total + projection.launchers.declaredChecks,
  passedCases: projection.canonical.pass + projection.launchers.passedChecks,
  failedCanonicalCases: projection.canonical.fail,
  failedExternalSuites: projection.launchers.fail,
}));

report.dispose();
