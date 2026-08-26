import assert from "node:assert/strict";
import type { LoopReport } from "hson-live/diagnostics";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import type { HostedTestCaseDiagnostic } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import type { HostedTestReport, HostedTestSuiteRunReport } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { hosted_test_projection_footer, hosted_test_projection_summary } from "../../../src/app/demos/tests/panel/hosted-test-report-summary";
import { hosted_test_running_readout, make_hosted_test_chronology } from "../../../src/app/demos/tests/panel/hosted-test-presentation";
import { make_hosted_test_stopwatch } from "../../../src/app/demos/tests/panel/hosted-test-stopwatch";
import { render_hosted_case_diagnostic_html, serialize_hosted_case_diagnostic } from "../../../src/app/demos/tests/panel/hosted-test-report-view";
import { make_initial_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import type { CaseKey, HsonTestApi } from "../../harness/core/test-contracts";
import { make_transform_test_suite } from "../../suites/transform/make-transform-suite";

let checks = 0;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type MutableReport = Mutable<HostedTestReport> & {
  run: Mutable<HostedTestReport["run"]>;
  suiteRuns: Array<Mutable<HostedTestSuiteRunReport>>;
};
function certify(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  checks += 1;
}

const plan: TestRunPlan = Object.freeze({
  runId: "presentation-cleanup",
  protocolVersion: 3,
  catalogVersion: "presentation-cleanup",
  executorId: "node",
  selectionIds: Object.freeze(["transform/canonical::a", "transform/canonical::b", "transform/opaque", "transform/cert", "browser/demo::journey"]),
  suites: Object.freeze([
    Object.freeze({ id: "transform/canonical", title: "Friendly Transform title", subject: "transform", collections: Object.freeze([]), provenance: "hson-demo2", order: 0, executionShape: "cases", cases: Object.freeze([
      Object.freeze({ id: "transform/canonical::a", caseId: "a", title: "a", order: 0 }),
      Object.freeze({ id: "transform/canonical::b", caseId: "b", title: "b", order: 1 }),
    ]) }),
    Object.freeze({ id: "transform/opaque", title: "Opaque", subject: "transform", collections: Object.freeze([]), provenance: "hson-live", order: 1, executionShape: "opaque-aggregate", sourceRef: "hson-live:opaque", cases: Object.freeze([]) }),
    Object.freeze({ id: "transform/cert", title: "Certification", subject: "transform", collections: Object.freeze([]), provenance: "hson-demo2", order: 2, executionShape: "certification-aggregate", sourceRef: "node-command:cert", declaredChecks: 1, cases: Object.freeze([]) }),
    Object.freeze({ id: "browser/demo", title: "Browser", subject: "livehost", collections: Object.freeze([]), provenance: "hson-demo2", order: 3, executionShape: "browser-journeys", cases: Object.freeze([
      Object.freeze({ id: "browser/demo::journey", caseId: "journey", title: "journey", order: 0 }),
    ]) }),
  ]),
});
const report = structuredClone(make_initial_hosted_test_report(plan, 100)) as MutableReport;
Object.assign(report.suiteRuns[0]!.counts, { total: 2, executed: 2, passed: 1, failed: 1 });
Object.assign(report.suiteRuns[1]!.counts, { declared: 5, total: 5, executed: 5, passed: 3, failed: 2 });
Object.assign(report.suiteRuns[2]!.counts, { declared: 1, executed: 1, passed: 1 });
Object.assign(report.suiteRuns[3]!.counts, { total: 1, executed: 1, passed: 1 });
const summary = hosted_test_projection_summary(report);
const footer = hosted_test_projection_footer(summary, null);
certify(summary.tests.total === 8, "presentable tests combine canonical cases, opaque checks, and browser journeys without relabeling certifications as tests");
certify(summary.tests.passed === 5, "presentable passed tests combine canonical cases, opaque checks, and browser journeys truthfully");
certify(summary.tests.failed === 3, "failed tests combine underlying failure counts without changing them");
certify(summary.canonical.total === 2 && summary.launchers.observedChecks === 5 && summary.browser.total === 1 && summary.certifications.total === 1, "underlying case/check/browser/certification counts remain distinct");
certify(footer.map((entry) => entry.label).join("|") === "suites|tests|passed|failed|elapsed", "normal summary is five sparse values with passed and no suite-failed KPI");
certify(footer.at(-1)?.value === "—", "queued summary makes no elapsed claim");

const cleanChronology = make_hosted_test_chronology();
cleanChronology.begin();
const queuedLines = cleanChronology.ingest(report);
certify(queuedLines.join("|") === "queued", "clean Logger emits one queued line");
const runningReport = structuredClone(report) as MutableReport;
runningReport.run.status = "running";
runningReport.run.startedAt = 100;
runningReport.suiteRuns[0]!.status = "running";
runningReport.suiteRuns[0]!.lastSequence = 2;
certify(cleanChronology.ingest(runningReport).length === 0 && hosted_test_running_readout(runningReport) === "running · 1/4 · transform/canonical", "clean Logger projects one replaceable running context outside accumulated chronology");
const advancedRunningReport = structuredClone(runningReport) as MutableReport;
advancedRunningReport.suiteRuns[0]!.status = "pass";
advancedRunningReport.suiteRuns[1]!.status = "running";
advancedRunningReport.suiteRuns[1]!.lastSequence = 8;
const advancedAuthorityBefore = JSON.stringify(advancedRunningReport);
certify(hosted_test_running_readout(advancedRunningReport) === "running · 2/4 · transform/opaque", "live running context advances beyond the first suite without accumulated rows");
certify(JSON.stringify(advancedRunningReport) === advancedAuthorityBefore, "live running projection creates no synthetic report mutation");
const passedReport = structuredClone(runningReport) as MutableReport;
passedReport.run.status = "passed";
passedReport.run.completedAt = 125;
passedReport.run.timing = { runnerMs: 25, hostMs: 30 };
for (let index = 0; index < passedReport.suiteRuns.length; index += 1) passedReport.suiteRuns[index]!.status = "pass";
const passedLines = cleanChronology.ingest(passedReport);
certify(passedLines.join("|") === "passed · 25.0 ms", "clean Logger emits only final passed elapsed, without successful count spam");

const failureChronology = make_hosted_test_chronology();
failureChronology.begin();
failureChronology.ingest(report);
const failedReport = structuredClone(runningReport) as MutableReport;
failedReport.run.status = "failed";
failedReport.run.completedAt = 140;
failedReport.run.timing = { runnerMs: 40, hostMs: 45 };
failedReport.suiteRuns[0]!.status = "fail";
failedReport.suiteRuns[0]!.lastSequence = 9;
failedReport.suiteRuns[0]!.errors = [{ kind: "infrastructure", executorId: "node", message: "worker vanished", stack: null, expected: null, actual: null }];
failedReport.suiteRuns[0]!.evidence = [{ id: "stdout", sequence: 8, timestamp: 130, executorId: "node", kind: "stdout", name: "stdout", content: "meaningful failure output", truncated: false, knownBytes: 25, reference: null, mediaType: null }];
const failureLines = failureChronology.ingest(failedReport).join("\n");
certify(failureLines.includes("fail transform/canonical") && failureLines.includes("infrastructure transform/canonical — worker vanished"), "failure and infrastructure chronology remain visible");
certify(failureLines.includes("stdout transform/canonical — meaningful failure output"), "exceptional failed stdout remains visible");

const cancelledChronology = make_hosted_test_chronology();
cancelledChronology.begin();
cancelledChronology.ingest(report);
const cancelledReport = structuredClone(runningReport) as MutableReport;
cancelledReport.run.status = "cancelled";
cancelledReport.run.completedAt = 135;
cancelledReport.run.timing = { runnerMs: 35, hostMs: 38 };
cancelledReport.suiteRuns[0]!.status = "cancelled";
cancelledReport.suiteRuns[0]!.lastSequence = 7;
const cancelledLines = cancelledChronology.ingest(cancelledReport).join("\n");
certify(cancelledLines.includes("cancelled transform/canonical") && cancelledLines.includes("cancelled · 35.0 ms"), "suite and terminal cancellation remain visible in sparse chronology");

let now = 1_000;
let scheduled: (() => void) | undefined;
let cancelledTimers = 0;
const rendered: Array<number | null> = [];
const stopwatch = make_hosted_test_stopwatch({
  now: () => now,
  render: (elapsed) => rendered.push(elapsed),
  schedule(callback) { scheduled = callback; return "timer"; },
  cancel() { cancelledTimers += 1; scheduled = undefined; },
});
const timerReport = structuredClone(report);
const authorityBefore = JSON.stringify(timerReport);
stopwatch.update(timerReport.run);
certify(rendered.at(-1) === null && !stopwatch.active(), "queued stopwatch renders no elapsed claim and owns no timer");
const running = { ...timerReport.run, status: "running" as const, startedAt: 900 };
stopwatch.update(running);
certify(rendered.at(-1) === 100 && stopwatch.active(), "running stopwatch renders elapsed locally and schedules ticking");
now = 1_250;
scheduled?.();
certify(rendered.at(-1) === 350, "running elapsed advances without report traffic");
stopwatch.update({ ...running, status: "passed", completedAt: 1_200, timing: { runnerMs: 300, hostMs: 310 } });
certify(rendered.at(-1) === 300 && !stopwatch.active() && cancelledTimers === 1, "terminal stopwatch freezes authoritative duration and cancels its timer");
certify(JSON.stringify(timerReport) === authorityBefore, "visual ticking does not mutate report state");
stopwatch.dispose();
certify(!stopwatch.active(), "stopwatch disposal leaves no timer");

const circuitCalls: Array<Readonly<{ capture?: boolean; entry?: unknown; times?: unknown }>> = [];
const artifactReport = (capture: boolean): LoopReport => ({
  ok: true,
  entry: "hson",
  dir: "cw",
  times: 3,
  failures: [],
  trace: [{ ok: true, step: "authored→hson" }, { ok: true, step: "hson→json→html" }],
  artifacts: capture ? [
    { lap: 0, fmt: "hson", label: "authored input", text: "  \n", node: "{\n  \"$_content\": [\"  \\n\"]\n}" },
    { lap: 1, fmt: "json", label: "canonical JSON", text: "{\"$_content\":[\"  \\n\"]}", node: "{\n  \"$_content\": [\"  \\n\"]\n}" },
    { lap: 1, fmt: "html", label: "projected HTML", text: "<main>  \n</main>", node: null },
  ] : [],
} as LoopReport);
const api = {
  _circuit_test(_value: unknown, options: Readonly<{ capture?: boolean; entry?: unknown; times?: unknown }>) {
    circuitCalls.push(options);
    return artifactReport(options.capture === true);
  },
} as unknown as HsonTestApi;
const captures = new Map<CaseKey, () => Promise<LoopReport>>();
const transformSuite = make_transform_test_suite(api, { whitespace: { exact: "  \n" } }, "transform/inspection-proof", captures, "hson");
const originalResult = await transformSuite.cases[0]!.run();
certify(circuitCalls[0]?.capture === false && captures.size === 1, "authoritative Transform execution does not capture the detailed artifact set");
const caseKey = "transform/inspection-proof::whitespace.exact" as CaseKey;
const reproduced = await captures.get(caseKey)!();
certify(circuitCalls[1]?.capture === true && circuitCalls[1]?.entry === circuitCalls[0]?.entry && circuitCalls[1]?.times === circuitCalls[0]?.times, "eligible case reproduction uses the actual tested route with capture enabled");
certify((reproduced.artifacts ?? []).map((artifact) => artifact.label).join("|") === "authored input|canonical JSON|projected HTML", "reproduction preserves actual artifact phase order");
certify((reproduced.artifacts ?? [])[0]?.node !== undefined, "reproduction retains corresponding HsonNode evidence");
certify((originalResult as { metaPatch?: unknown }).metaPatch !== undefined, "inspection reproduction remains separate from the authoritative case result");

const diagnostic: HostedTestCaseDiagnostic = Object.freeze({
  type: "transform", runId: "original", suite: "canonical/selected", caseKey, caseSuite: "transform/inspection-proof", caseId: "whitespace.exact", name: "whitespace.exact",
  status: "pass", ms: 1, error: null, assertions: Object.freeze([]), values: Object.freeze([{ label: "input", value: "  \n" }]),
  artifacts: Object.freeze((reproduced.artifacts ?? []).map((artifact) => Object.freeze({ lap: artifact.lap, label: artifact.label ?? "artifact", format: artifact.fmt, text: artifact.text, node: artifact.node }))),
  trace: Object.freeze((reproduced.trace ?? []).map((step) => Object.freeze({ ok: step.ok, step: step.step, error: step.error ?? null }))),
});
const copied = serialize_hosted_case_diagnostic(diagnostic);
const viewed = render_hosted_case_diagnostic_html(diagnostic);
certify(copied.indexOf("authored input") < copied.indexOf("canonical JSON") && copied.indexOf("canonical JSON") < copied.indexOf("projected HTML"), "Copy exposes the same complete ordered circuit");
certify(viewed.indexOf("authored input") < viewed.indexOf("canonical JSON") && viewed.indexOf("canonical JSON") < viewed.indexOf("projected HTML"), "View exposes the same complete ordered circuit");
certify(copied.includes("  \n") && viewed.includes("  \n") && viewed.includes("canonical HsonNode"), "whitespace text and node toggles survive Copy/View presentation");
const originalResultBeforeFailedInspection = JSON.stringify(originalResult);
captures.set(caseKey, async () => { throw new Error("inspection reproduction failed"); });
await assert.rejects(captures.get(caseKey)!(), /inspection reproduction failed/);
certify(JSON.stringify(originalResult) === originalResultBeforeFailedInspection, "reproduction failure surfaces separately without changing the authoritative result");

console.log(JSON.stringify({ certificate: "test-presentation-cleanup", checks, reproducedArtifacts: diagnostic.artifacts.length }));
