import { hson } from "hson-live";
import type { HostedTestCaseReport, HostedTestReport } from "../../app/hosted-test/hosted-test-report.types";
import { HOSTED_TEST_SUITE_IDS, HOSTED_TEST_VISIBLE_SUITES } from "../../app/hosted-test/hosted-test-suite";
import { TEST_SURFACE_CATALOG, TEST_SURFACE_COMMAND_ENTRIES } from "../../app/hosted-test/test-surface-catalog";
import type { HostedTestPanelReportUpdate } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_hosted_test_case_list } from "../../app/demos/test/hosted-test-case-list";
import { make_hosted_test_live_inspector } from "../../app/demos/test/hosted-test-live-inspector";
import { make_hosted_test_inspector_source } from "../../app/demos/test/hosted-test-inspector-source";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";

let checks = 0;
function expect(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`hosted inspector parity: ${message}`);
}

function test_case(suite: string, name: string, status: HostedTestCaseReport["status"] = "pass"): HostedTestCaseReport {
  return Object.freeze({ key: `${suite}::${name}`, suite, name, status, ms: 2, err: status === "fail" ? `failure: ${name}` : null });
}

function update(runId: string, allCases: readonly HostedTestCaseReport[], newCases = allCases, terminal = false): HostedTestPanelReportUpdate {
  const report: HostedTestReport = Object.freeze({
    run: Object.freeze({ id: runId, suite: "livemap/replay", status: terminal ? (allCases.some((item) => item.status === "fail") ? "failed" : "passed") : "running", startedAt: 1, completedAt: terminal ? 2 : null, timing: terminal ? Object.freeze({ runnerMs: 8, hostMs: 9 }) : null }),
    summary: Object.freeze({ cases: allCases.length, pass: allCases.filter((item) => item.status === "pass").length, fail: allCases.filter((item) => item.status === "fail").length, skip: allCases.filter((item) => item.status === "skip").length }),
    caseBatches: Object.freeze({ "000001": Object.freeze([...allCases]) }),
    suites: Object.freeze([]), error: null,
  });
  return Object.freeze({ report, newCases: Object.freeze([...newCases]), newSuiteTimings: terminal ? Object.freeze([{ suite: "suite/a", ms: 8 }]) : Object.freeze([]), terminal });
}

const runtime = install_hosted_dom_runtime();
try {
  const host = hson.liveTree.queryBody().graft();
  const legacy = make_hosted_test_case_list(host.create.div(), { async view() {}, async copy() {} }, { schedule(callback) { callback(); return () => {}; } });
  const live = make_hosted_test_live_inspector(host.create.div());
  const cases = [test_case("suite/a", "one"), test_case("suite/a", "two", "fail"), test_case("suite/b", "three", "skip")];

  for (let index = 0; index < cases.length; index += 1) {
    const progressive = update("run-1", cases.slice(0, index + 1), [cases[index]!]);
    legacy.ingest(progressive);
    expect(live.ingest(progressive), "progressive update is accepted");
    expect(legacy.snapshot().cases === live.snapshot().cases, `legacy and inspector totals agree after update ${index + 1}`);
    expect(legacy.snapshot().suites === live.snapshot().suites, `legacy and inspector suite totals agree after update ${index + 1}`);
    const summary = live.snapshot().value.suites.flatMap((suite) => suite.cases);
    expect(new Set(summary.map((item) => item.key)).size === summary.length, `every case key is unique after update ${index + 1}`);
    expect(summary.filter((item) => item.status === "pass").length === progressive.report.summary.pass
      && summary.filter((item) => item.status === "fail").length === progressive.report.summary.fail
      && summary.filter((item) => item.status === "skip").length === progressive.report.summary.skip,
    `pass, fail and skip counts agree after update ${index + 1}`);
  }
  const terminal = update("run-1", cases, [], true);
  legacy.ingest(terminal);
  live.ingest(terminal);
  expect(live.snapshot().value.run.status === "failed" && live.snapshot().value.run.timing?.runnerMs === 8, "terminal status and timing remain equivalent");

  live.inspector.expand(["suites", 0, "cases"]);
  live.selectCase(cases[1]!.key);
  const selectedQuid = live.inspector.selection?.viewQuid;
  const unrelated = test_case("suite/b", "four");
  live.ingest(update("run-1", [...cases, unrelated], [unrelated]));
  expect(live.inspector.debugMappings().some((item) => item.path.join("/") === "suites/0/cases/0"), "expanded suite remains materialized after an unrelated commit");
  expect(live.inspector.selection?.viewQuid === selectedQuid && live.inspector.selection?.path.join("/") === "suites/0/cases/1", "selected case survives an unrelated batch");
  expect(runtime.document.body.textContent?.includes("failure: two") === true, "selected failed case exposes its failure detail");

  const beforeDuplicate = live.snapshot().cases;
  live.ingest(update("run-1", cases, [cases[0]!]));
  expect(live.snapshot().cases === beforeDuplicate && live.snapshot().duplicateCaseUpdates === 1, "reconnected duplicate batches do not duplicate cases");
  expect(!live.ingest(update("stale-run", [test_case("suite/a", "stale")])) && live.snapshot().cases === beforeDuplicate, "stale run identity cannot enter the active projection");

  live.reset("livemap/replay");
  expect(live.snapshot().cases === 0 && live.snapshot().value.run.id === null, "fresh run reset replaces prior state");
  live.ingest(update("run-2", cases, cases, true));
  expect(live.snapshot().cases === cases.length, "explicit recovery materializes equivalent retained results");
  live.dispose();
  expect(!live.ingest(update("run-2", [...cases, unrelated], [unrelated])) && live.snapshot().disposed, "disposal blocks later updates");
  legacy.dispose();

  const largeHost = host.create.div();
  const large = make_hosted_test_live_inspector(largeHost);
  const largeCases = Array.from({ length: 1_000 }, (_, index) => test_case("suite/large", `case-${index}`));
  large.ingest(update("large-run", largeCases));
  expect(large.snapshot().cases === 1_000, "large suite retains all authoritative case records");
  expect(large.inspector.diagnostics().totalBranchCount < 100, "collapsed large suite does not eagerly materialize case branches");
  large.dispose();

  const source = make_hosted_test_inspector_source();
  source.ingest(update("source-run", cases, cases, true));
  const recoveredValue = JSON.stringify(source.snapshot().value);
  source.reset("livemap/replay");
  source.ingest(update("recovery-run", cases, cases, true));
  expect(JSON.stringify(source.snapshot().value.suites) === JSON.stringify(JSON.parse(recoveredValue).suites), "recovery and progressive ingestion produce equivalent suite values");
  source.dispose();

  expect(HOSTED_TEST_VISIBLE_SUITES.map((entry) => entry.label).join(",") === "all,transform,livetree,livemap,livehost,unit,dev", "selector contains only the seven intended lower-case choices");
  expect(HOSTED_TEST_VISIBLE_SUITES.every((entry) => HOSTED_TEST_SUITE_IDS.includes(entry.id)), "visible selector values remain canonical suite IDs");
  expect(TEST_SURFACE_COMMAND_ENTRIES.every((entry) => !HOSTED_TEST_VISIBLE_SUITES.some((suite) => suite.label.includes(entry.runner))), "command catalog entries are absent from selector choices");
  expect(TEST_SURFACE_COMMAND_ENTRIES.length > 0 && TEST_SURFACE_CATALOG.length >= 71, "command-only certifications remain in the catalog");
  const catalogSuiteIds = new Set(TEST_SURFACE_CATALOG.flatMap((entry) => entry.hostedSuiteId === undefined ? [] : [entry.hostedSuiteId]));
  expect(HOSTED_TEST_SUITE_IDS.every((id) => catalogSuiteIds.has(id)), "all twelve executable suite IDs remain catalogued behind all or category aggregation");

  console.log(JSON.stringify({ checks, selectorChoices: HOSTED_TEST_VISIBLE_SUITES.length, largeCases: 1_000 }));
} finally {
  runtime.dispose();
}
