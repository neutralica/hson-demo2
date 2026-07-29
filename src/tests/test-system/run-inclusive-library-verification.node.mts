import { strict as assert } from "node:assert";
import {
  external_library_launcher_metrics,
  reset_external_library_launcher_metrics,
  resolve_external_library_launchers,
} from "../../test-system/external-library-launchers";
import {
  node_selected_verification_metrics,
  run_node_selected_verifications,
} from "../../hosted-test/run-node-selected-verifications";
import { make_local_node_livehost_executor_registry } from "../../test-system/livehost-node-executor";
import { make_hosted_test_report } from "../../app/hosted-test/hosted-test-report";
import {
  hosted_test_projection_footer,
  hosted_test_projection_summary,
} from "../../app/demos/test/hosted-test-report-summary";
import type { TestEvent } from "../../app/demos/test/tests.types";

const registry = make_local_node_livehost_executor_registry();
const availability = await resolve_external_library_launchers();
assert.equal(registry.catalog.tests.length, 2085);
assert.equal(availability.targets.length, 34);
assert.equal(availability.targets.reduce((total, target) => total + target.executableChecks, 0), 597);

const selectedIds = Object.freeze([
  ...registry.catalog.tests.map((test) => test.id),
  ...availability.targets.map((target) => target.id),
]);
const report = make_hosted_test_report(Date.now, undefined, "canonical/selected");
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

assert.equal(result.ok, true);
assert.equal(canonicalCases, 2085);
assert.equal(completedExternalIds.length, 34);
assert.deepEqual(queuedExternalIds, availability.targets.map((target) => target.id));
assert.deepEqual(Object.keys(captured.externalResults), availability.targets.map((target) => target.id));
assert.equal(firstSuiteCompletionSawBothPhases, true, "both phases become active before either suite completes");
assert.ok(
  events.findIndex((event) => event.t === "external_end") < events.length - 1,
  "an external completion is reported before the combined run completes",
);
assert.deepEqual(
  footer.slice(0, 3).map((entry) => `${entry.label}:${entry.value}`),
  ["cases:2682", "passed:2682", "failed:0"],
);
assert.equal(projection.canonical.total, 2085);
assert.equal(projection.launchers.total, 34);
assert.equal(projection.launchers.declaredChecks, 597);
assert.equal(processMetrics.activeChildren, 0);
assert.equal(processMetrics.directLauncherStarts, 34);
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
