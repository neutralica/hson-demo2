import assert from "node:assert/strict";
import { hson } from "hson-live";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import type { HostedTestPanelReportUpdate } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_hosted_test_case_list } from "../../../src/app/demos/tests/panel/hosted-test-case-list";
import {
  HOSTED_TEST_PRESENTATION_GROUP_ORDER,
  classify_hosted_test_stderr,
  hosted_test_running_readout,
  hosted_test_suite_presentation,
  make_hosted_test_chronology,
} from "../../../src/app/demos/tests/panel/hosted-test-presentation";
import { make_initial_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import type { HostedTestEvidence, HostedTestInfrastructureError, HostedTestReport, HostedTestSuiteRunReport } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";

let checks = 0;
function certify(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
  checks += 1;
}

const suiteSpecs = [
  ["transform/hson-tokenizer", "Hson tokenizer", "transform", [], "hson-live", "opaque-aggregate", 139],
  ["transform/demo", "Transform demo", "transform", [], "hson-demo2", "cases"],
  ["livetree/demo", "LiveTree demo", "livetree", [], "hson-demo2", "cases"],
  ["livemap/canonical-ownership", "Canonical ownership", "livemap", [], "hson-live", "cases"],
  ["livemap/demo", "LiveMap demo", "livemap", [], "hson-demo2", "cases"],
  ["livehost/demo", "Locus demo", "livehost", [], "hson-demo2", "cases"],
  ["reflect/demo", "Reflect demo", "reflect", [], "hson-demo2", "cases"],
  ["unit/demo", "Unit demo", "transform", ["unit"], "hson-demo2", "cases"],
  ["dev/demo", "Dev demo", "livehost", ["dev"], "hson-demo2", "cases"],
] as const;

const plan: TestRunPlan = Object.freeze({
  runId: "phase2b-presentation",
  protocolVersion: 3,
  catalogVersion: "phase2b",
  executorId: "livehost-authority",
  selectionIds: Object.freeze(suiteSpecs.map(([id, , , , , shape]) => shape === "opaque-aggregate" ? id : `${id}::case`)),
  suites: Object.freeze(suiteSpecs.map(([id, title, subject, collections, provenance, executionShape, declaredChecks], order) => Object.freeze({
    id,
    title,
    subject,
    collections: Object.freeze([...collections]),
    provenance,
    order,
    executionShape,
    ...(declaredChecks === undefined ? {} : { sourceRef: `hson-live:${id}`, declaredChecks }),
    cases: executionShape === "cases" ? Object.freeze([Object.freeze({ id: `${id}::case`, caseId: "case", title: `${title} case`, order: 0 })]) : Object.freeze([]),
  }))),
});

function clone_report(report: HostedTestReport): HostedTestReport {
  return structuredClone(report) as HostedTestReport;
}

function suite(report: HostedTestReport, id: string): HostedTestSuiteRunReport {
  const found = report.suiteRuns.find((entry) => entry.id === id);
  assert.ok(found, `missing suite ${id}`);
  return found;
}

function update(report: HostedTestReport, terminal = false): HostedTestPanelReportUpdate {
  return Object.freeze({ report, newCases: Object.freeze([]), newSuiteTimings: Object.freeze([]), terminal });
}

const queued = make_initial_hosted_test_report(plan, 10);
certify(HOSTED_TEST_PRESENTATION_GROUP_ORDER.join("|") === "transform|livetree|livemap|livehost|reflect|unit|dev", "semantic group order is exact and contains no Library group");
certify(hosted_test_suite_presentation(suite(queued, "transform/hson-tokenizer")).group === "transform", "hson-live Transform launcher groups with Transform");
certify(hosted_test_suite_presentation(suite(queued, "unit/demo")).group === "unit", "Unit collection projects as Unit without changing semantic identity");
certify(hosted_test_suite_presentation(suite(queued, "dev/demo")).group === "dev", "Dev collection projects as Dev without changing semantic identity");
certify(hosted_test_suite_presentation(suite(queued, "transform/hson-tokenizer")).summary === "139 checks · 0 pass · 0 fail", "opaque queued summary uses checks");
certify(hosted_test_suite_presentation(suite(queued, "transform/demo")).summary === "1 case · 0 pass · 0 fail · 0 skip", "case suite summary uses natural case grammar");

const runtime = install_hosted_dom_runtime({ html: "<!doctype html><html><head></head><body></body></html>" });
let failedReport: HostedTestReport | undefined;
try {
  const host = hson.liveTree.queryBody().graft();
  const inspector = make_hosted_test_case_list(host, { async view() {}, async copy() {} }, { schedule(callback) { callback(); return () => undefined; } });
  const shuffled = clone_report(queued) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
  shuffled.suiteRuns = [...shuffled.suiteRuns].reverse();
  inspector.ingest(update(shuffled));
  const initial = inspector.snapshot();
  certify(initial.groupOrder.join("|") === HOSTED_TEST_PRESENTATION_GROUP_ORDER.join("|"), "actual Inspector projection ignores shuffled discovery insertion and uses semantic group order");
  certify(initial.suiteOrder.join("|") === plan.suites.map((entry) => entry.id).join("|"), "all queued Inspector suites use frozen RunPlan order");
  certify(runtime.document.querySelector('[data-hosted-subject="transform"] [data-hosted-suite="transform/hson-tokenizer"]') !== null, "opaque Transform launcher renders inside the Transform group");
  certify(runtime.document.querySelector('[data-hosted-suite="transform/hson-tokenizer"] .hosted-suite-title')?.textContent === "transform/hson-tokenizer"
    && runtime.document.querySelector('[data-hosted-suite="transform/hson-tokenizer"] .hosted-suite-identity') === null,
  "canonical suite path stands alone without friendly-title duplication");
  certify(runtime.document.querySelector('[data-hosted-subject="library"]') === null, "actual Inspector DOM has no Library group");
  certify(runtime.document.querySelectorAll('[data-hosted-suite]').length === plan.suites.length, "all planned rows exist while queued");
  const rowBefore = runtime.document.querySelector('[data-hosted-suite="livemap/demo"]');
  const running = clone_report(queued) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
  const runningSuite = suite(running, "livemap/demo") as HostedTestSuiteRunReport & { status: "running"; startedAt: number; executorIds: string[]; lastSequence: number };
  runningSuite.status = "running";
  runningSuite.startedAt = 20;
  runningSuite.executorIds = ["node-01"];
  runningSuite.lastSequence = 2;
  inspector.ingest(update(running));
  certify(inspector.snapshot().statusesBySuite["livemap/demo"] === "running", "queued Inspector row transitions to running");
  certify(runtime.document.querySelector('[data-hosted-suite="livemap/demo"]') === rowBefore, "running transition preserves exact LiveTree/DOM row identity");

  const assertion: HostedTestInfrastructureError = Object.freeze({
    kind: "assertion", executorId: "node-01", message: "received the wrong graph", stack: "at graph.test.ts:9", expected: "Ada", actual: "Grace",
  });
  const failures: HostedTestInfrastructureError[] = [
    assertion,
    { kind: "suite", executorId: "node-01", message: "teardown failed", stack: null, expected: null, actual: null },
    { kind: "infrastructure", executorId: "browser-02", message: "browser launch failed", stack: "at launch", expected: null, actual: null },
    { kind: "protocol", executorId: "node-child-03", message: "completion record missing", stack: null, expected: null, actual: null },
    { kind: "timeout", executorId: "worker-04", message: "launcher exceeded 10 s", stack: null, expected: null, actual: null },
    { kind: "cancelled", executorId: "future-05", message: "acknowledged cancellation", stack: null, expected: null, actual: null },
  ];
  const evidence: HostedTestEvidence[] = [
    { id: "e1", sequence: 3, timestamp: 30, executorId: "node-child-03", kind: "stdout", name: "stdout", content: "human output\n", truncated: false, knownBytes: 13, reference: null, mediaType: null },
    { id: "e2", sequence: 4, timestamp: 31, executorId: "node-child-03", kind: "stderr", name: "stderr", content: "(node:1) ExperimentalWarning: loader\nmeaningful stderr\n", truncated: false, knownBytes: 50, reference: null, mediaType: null },
    { id: "e3", sequence: 5, timestamp: 32, executorId: "node-child-03", kind: "protocol_control", name: "test event", content: "{\"t\":\"terminal\",\"status\":\"fail\"}", truncated: false, knownBytes: null, reference: null, mediaType: "application/json" },
    { id: "e4", sequence: 6, timestamp: 33, executorId: "node-child-03", kind: "raw_process_output", name: "raw", content: "<HSON_TEST_EVENT>{...}", truncated: false, knownBytes: 40, reference: null, mediaType: null },
    { id: "e5", sequence: 7, timestamp: 34, executorId: "browser-02", kind: "artifact", name: "trace", content: "", truncated: false, knownBytes: null, reference: "artifact://trace-1", mediaType: "application/zip" },
  ];
  const failed = clone_report(running) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
  const failedSuite = suite(failed, "transform/hson-tokenizer") as HostedTestSuiteRunReport & {
    status: "fail"; startedAt: number; completedAt: number; durationMs: number; ms: number; errors: HostedTestInfrastructureError[]; evidence: HostedTestEvidence[]; executorIds: string[]; lastSequence: number;
  };
  failedSuite.status = "fail";
  failedSuite.startedAt = 21;
  failedSuite.completedAt = 40;
  failedSuite.durationMs = 19;
  failedSuite.ms = 19;
  failedSuite.errors = failures;
  failedSuite.evidence = evidence;
  failedSuite.executorIds = ["node-child-03", "browser-02"];
  failedSuite.lastSequence = 8;
  Object.assign(failedSuite.counts, { total: 139, executed: 139, passed: 138, failed: 1 });
  failedReport = failed;
  inspector.ingest(update(failed, true));
  const failedSnapshot = inspector.snapshot();
  certify(failedSnapshot.failureKindsBySuite[failedSuite.id]?.join("|") === "assertion|suite|infrastructure|protocol|timeout|cancelled", "Inspector exposes all normalized failure classes through one card model");
  certify(failedSnapshot.evidenceSectionsBySuite[failedSuite.id]?.join("|") === "stdout|stderr|warnings|protocol|artifacts|raw", "Inspector exposes one non-empty evidence hierarchy");
  certify(runtime.document.querySelectorAll(".hosted-failure-card").length === 6, "failed suite expands to six immediately understandable failure cards");
  certify(runtime.document.querySelector('[data-failure-kind="assertion"]')?.textContent?.includes("expected: Ada") === true && runtime.document.querySelector('[data-failure-kind="assertion"]')?.textContent?.includes("actual: Grace") === true, "assertion card exposes expected and actual");
  certify(runtime.document.querySelector('[data-failure-kind="infrastructure"]')?.textContent?.includes("browser-02") === true, "infrastructure card names executor context without changing test identity");
  certify(runtime.document.querySelector('[data-evidence-kind="stdout"]')?.textContent?.includes("HSON_TEST_EVENT") === false, "control sentinel is absent from ordinary stdout presentation");
  certify(runtime.document.querySelector('[data-evidence-kind="protocol"]')?.textContent?.includes("terminal") === true, "structured event remains available under protocol evidence");
  certify(runtime.document.querySelector('[data-evidence-kind="raw"]')?.textContent?.includes("HSON_TEST_EVENT") === true, "untouched control text remains available only in raw forensic evidence");
  certify(runtime.document.querySelector('[data-evidence-kind="artifacts"]')?.textContent?.includes("artifact://trace-1") === true, "generic artifact reference renders as truthful metadata");
  inspector.dispose();
} finally {
  runtime.dispose();
}

const largeCases = Object.freeze(Array.from({ length: 2_103 }, (_, order) => Object.freeze({
  id: `transform/large::case-${order}`,
  caseId: `case-${order}`,
  title: `large case ${order}`,
  order,
})));
const largePlan: TestRunPlan = Object.freeze({
  runId: "phase2b-large-presentation",
  protocolVersion: 3,
  catalogVersion: "phase2b-large",
  executorId: "livehost-authority",
  selectionIds: Object.freeze([
    ...largeCases.map((testCase) => testCase.id),
    ...Array.from({ length: 29 }, (_, index) => `transform/opaque-${index + 1}`),
  ]),
  suites: Object.freeze([
    Object.freeze({
      id: "transform/large",
      title: "Large canonical suite",
      subject: "transform",
      collections: Object.freeze([]),
      provenance: "hson-demo2",
      order: 0,
      executionShape: "cases",
      cases: largeCases,
    }),
    ...Array.from({ length: 29 }, (_, index) => Object.freeze({
      id: `transform/opaque-${index + 1}`,
      title: `Opaque suite ${index + 1}`,
      subject: "transform" as const,
      collections: Object.freeze([]),
      provenance: "hson-live",
      order: index + 1,
      executionShape: "opaque-aggregate" as const,
      sourceRef: `hson-live:transform/opaque-${index + 1}`,
      declaredChecks: index === 0 ? 474 : 1,
      cases: Object.freeze([]),
    })),
  ]),
});
const largeReport = make_initial_hosted_test_report(largePlan, 100);
const largeRuntime = install_hosted_dom_runtime({ html: "<!doctype html><html><head></head><body></body></html>" });
try {
  const largeHost = hson.liveTree.queryBody().graft();
  const largeInspector = make_hosted_test_case_list(largeHost, { async view() {}, async copy() {} }, {
    schedule(callback) { callback(); return () => undefined; },
  });
  largeInspector.ingest(update(largeReport));
  const largeSnapshot = largeInspector.snapshot();
  certify(largeSnapshot.suites === 30 && largeSnapshot.cases === 2_103 && largeSnapshot.launchers === 29, "representative mixed projection retains 30 suites, 2,103 canonical cases, and 29 opaque suites");
  certify(largeReport.suiteRuns.filter((entry) => entry.executionShape === "opaque-aggregate").reduce((total, entry) => total + entry.counts.declared, 0) === 502, "representative opaque count universe contains 502 checks");
  certify(largeSnapshot.metrics.caseRowsCreated === 0 && largeSnapshot.metrics.visibleCaseRows === 0 && largeRuntime.document.querySelectorAll(".hosted-case-row").length === 0, "2,103 queued canonical cases remain lazy while collapsed");
  certify(largeSnapshot.metrics.actionHandleEntries === 0 && largeSnapshot.metrics.liveCaseTrees === 0, "collapsed large projection owns no hidden case-action handles or case LiveTrees");
  certify(largeSnapshot.metrics.suiteRowsCreated === 30 && largeSnapshot.metrics.listenerRegistrations === 1 && largeSnapshot.metrics.liveTreesConstructed === 214, "large Inspector materializes only stable suite/group rows with one delegated listener");
  largeInspector.set_expanded("transform/large", true);
  const largeExpanded = largeInspector.snapshot();
  certify(largeExpanded.metrics.visibleCaseRows === 2_103 && largeExpanded.metrics.actionHandleEntries === 4_206 && largeExpanded.metrics.listenerRegistrations === 1, "expanding one large suite materializes only that suite's rows and two controls per canonical case");
  largeInspector.set_expanded("transform/large", false);
  const largeRecollapsed = largeInspector.snapshot();
  certify(largeRecollapsed.metrics.visibleCaseRows === 0 && largeRecollapsed.metrics.actionHandleEntries === 0 && largeRecollapsed.metrics.liveCaseTrees === 0, "collapsing the large suite releases all case presentation ownership");
  const largeChronology = make_hosted_test_chronology();
  largeChronology.begin();
  certify(largeChronology.ingest(largeReport).length === 1 && largeRuntime.document.querySelectorAll(".hosted-suite-details").length === 0, "large clean Logger remains run-bounded and evidence panels remain unmaterialized");
  largeInspector.dispose();
} finally {
  largeRuntime.dispose();
}

const classified = classify_hosted_test_stderr("(node:7) [DEP0180] DeprecationWarning: old\nmeaningful failure\n");
certify(classified.warnings.length === 1 && classified.stderr === "meaningful failure", "known runtime warning is classified without suppressing ordinary stderr");

const chronology = make_hosted_test_chronology();
chronology.begin(false);
const queueLines = chronology.ingest(queued);
certify(queueLines.length === 1 && queueLines[0] === "queued", "Logger collapses routine queued suite chatter to one run line");
const concurrent = clone_report(queued) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
Object.assign(concurrent.run, { status: "running", startedAt: 1 });
const transformRunning = suite(concurrent, "transform/demo") as HostedTestSuiteRunReport & { status: "running"; lastSequence: number };
const liveTreeRunning = suite(concurrent, "livetree/demo") as HostedTestSuiteRunReport & { status: "running"; lastSequence: number };
transformRunning.status = "running";
transformRunning.lastSequence = 12;
liveTreeRunning.status = "running";
liveTreeRunning.lastSequence = 11;
const startLines = chronology.ingest(concurrent);
certify(startLines.length === 0 && hosted_test_running_readout(concurrent) === "running · 2/9 · transform/demo", "Logger keeps current progress in one replaceable live readout rather than chronology rows");
const terminal = clone_report(concurrent) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
const transformTerminal = suite(terminal, "transform/demo") as HostedTestSuiteRunReport & { status: "pass"; durationMs: number; ms: number; lastSequence: number };
const liveTreeTerminal = suite(terminal, "livetree/demo") as HostedTestSuiteRunReport & { status: "fail"; durationMs: number; ms: number; lastSequence: number };
transformTerminal.status = "pass";
transformTerminal.durationMs = 9;
transformTerminal.ms = 9;
transformTerminal.lastSequence = 15;
Object.assign(transformTerminal.counts, { executed: 1, passed: 1 });
liveTreeTerminal.status = "fail";
liveTreeTerminal.durationMs = 8;
liveTreeTerminal.ms = 8;
liveTreeTerminal.lastSequence = 14;
Object.assign(liveTreeTerminal.counts, { executed: 1, failed: 1 });
const terminalLines = chronology.ingest(terminal);
certify(terminalLines.length === 1 && terminalLines[0]?.startsWith("fail livetree/demo"), "Logger suppresses ordinary successful suite completion while retaining failure chronology");
certify(!terminalLines.join("\n").includes(hosted_test_suite_presentation(transformTerminal).summary), "Logger omits routine successful count summaries retained by the Inspector");
const authorityBeforeClear = JSON.stringify(terminal);
chronology.clearPresentation();
certify(chronology.ingest(terminal).length === 0 && JSON.stringify(terminal) === authorityBeforeClear, "explicit Logger Clear neither replays nor mutates report authority");

const recoveredChronology = make_hosted_test_chronology();
assert.ok(failedReport);
const failed = failedReport;
recoveredChronology.begin(true);
const recoveredLines = recoveredChronology.ingest(failed);
certify(recoveredLines[0]?.startsWith("recovered ") === true && recoveredLines.some((line) => line.startsWith("state transform/hson-tokenizer — fail")), "recovery Logger labels authoritative snapshot state rather than invented chronology");
certify(recoveredLines.every((line) => !line.startsWith("stdout") && !line.startsWith("running")), "recovery does not fabricate pre-recovery output or start chronology");
const postRecovery = clone_report(failed) as HostedTestReport & { suiteRuns: HostedTestSuiteRunReport[] };
const postSuite = suite(postRecovery, "transform/hson-tokenizer") as HostedTestSuiteRunReport & { evidence: HostedTestEvidence[] };
postSuite.evidence.push({ id: "e9", sequence: 20, timestamp: 50, executorId: "node-child-03", kind: "stdout", name: "stdout", content: "post-recovery output", truncated: false, knownBytes: 20, reference: null, mediaType: null });
certify(recoveredChronology.ingest(postRecovery).join("\n").includes("post-recovery output"), "Logger appends genuinely post-recovery evidence");

const visibleText = [
  ...queueLines,
  ...startLines,
  ...terminalLines,
  ...failed.suiteRuns.map((entry) => hosted_test_suite_presentation(entry).metadata.join(" ")),
].join("\n");
certify(!visibleText.includes("library::") && !visibleText.includes("Library"), "visible presentation contains no stale Library identity or principal group");
certify(visibleText.includes("transform/hson-tokenizer") && visibleText.includes("executor: node-child-03"), "canonical slash identity and executor metadata coexist without conflation");

console.log(JSON.stringify({ certificate: "phase2b-presentation", suite: "phase2b-presentation", checks, groups: HOSTED_TEST_PRESENTATION_GROUP_ORDER, suites: plan.suites.length }));
