import { hson } from "hson-live";
import type { HostedTestCaseReport, HostedTestReport } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import type { HostedTestPanelReportUpdate } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestCaseList, type HostedTestFrameScheduler } from "../../../src/app/demos/tests/panel/hosted-test-case-list";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import {
  hosted_test_projection_footer,
  hosted_test_projection_summary,
} from "../../../src/app/demos/tests/panel/hosted-test-report-summary";
import {
  copy_hosted_case_report,
  hosted_external_launcher_log_projection,
  open_hosted_case_report,
  render_hosted_case_diagnostic_html,
  serialize_hosted_run_report,
} from "../../../src/app/demos/tests/panel/hosted-test-report-view";
import { make_hosted_test_case_inspector } from "../../harness/hosted/hosted-test-case-inspection";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { create_test_chips, TEST_SUMMARY_ENTRY_ORDER } from "../../../src/app/demos/tests/panel/test-helpers";
import { TEST_CHIP_ROWcss, TEST_CHIP_VALUEcss } from "../../../src/app/demos/tests/panel/tp.css";

function expect_projection(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted panel projection: ${message}`);
}

async function wait_for_projection(condition: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!condition() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 5));
  expect_projection(condition(), message);
}

function test_case(suite: string, name: string, status: HostedTestCaseReport["status"] = "pass", caseId = name): HostedTestCaseReport {
  return Object.freeze({ key: `${suite}::${caseId}`, suite, caseId, name, status, ms: 1, err: status === "fail" ? "expected" : null });
}

function external_result(
  id: string,
  executableChecks: number,
  status: "queued" | "running" | "pass" | "fail",
  ms = 1,
): HostedTestReport["externalResults"][string] {
  return Object.freeze({
    id,
    suite: id,
    name: id.split("/").at(-1) ?? id,
    subject: "livehost",
    runtime: "node",
    executableChecks,
    collections: Object.freeze(["library"]),
    status,
    ms,
    stdout: status === "pass" || status === "fail" ? "verbatim stdout\n" : "",
    stderr: status === "fail" ? "meaningful stderr\n" : "",
    exitCode: status === "pass" ? 0 : status === "fail" ? 1 : null,
    signal: null,
    timedOut: false,
    spawnError: null,
  });
}

function report(
  cases: number,
  pass: number,
  fail: number,
  terminal = false,
  externalResults: HostedTestReport["externalResults"] = Object.freeze({}),
  caseBatches: HostedTestReport["caseBatches"] = Object.freeze({}),
): HostedTestReport {
  return Object.freeze({
    run: Object.freeze({
      suite: "hosted/all",
      status: terminal ? "passed" : cases === 0 ? "idle" : "running",
      startedAt: cases === 0 ? null : 1,
      completedAt: terminal ? 2 : null,
      timing: terminal ? Object.freeze({ runnerMs: 1, hostMs: 2 }) : null,
      lastSequence: 0,
      lastEventSignature: "",
    }),
    summary: Object.freeze({ cases, pass, fail, skip: 0 }),
    plan: null,
    suiteRuns: Object.freeze([]),
    caseBatches,
    suites: Object.freeze([]),
    externalResults,
    error: null,
  });
}

function update(
  current: HostedTestReport,
  newCases: readonly HostedTestCaseReport[],
  newSuiteTimings: readonly Readonly<{ suite: string; ms: number }>[] = [],
  terminal = false,
): HostedTestPanelReportUpdate {
  return Object.freeze({ report: current, newCases: Object.freeze([...newCases]), newSuiteTimings: Object.freeze([...newSuiteTimings]), terminal });
}

const queuedFrames: Array<{ active: boolean; callback: () => void }> = [];
const scheduler: HostedTestFrameScheduler = {
  schedule(callback) {
    const frame = { active: true, callback };
    queuedFrames.push(frame);
    return () => { frame.active = false; };
  },
};
function flush_frames(): void {
  for (const frame of queuedFrames.splice(0)) if (frame.active) frame.callback();
}

const runtime = install_hosted_dom_runtime({ html: "<!doctype html><html><head></head><body></body></html>" });
const eventTargetPrototype = EventTarget.prototype;
const originalAddEventListener = eventTargetPrototype.addEventListener;
let projectionClickRegistrations = 0;
eventTargetPrototype.addEventListener = function addEventListener(
  this: EventTarget,
  type: string,
  callback: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean,
): void {
  if (type === "click" && this instanceof HTMLElement && this.classList.contains("hosted-case-list")) {
    projectionClickRegistrations += 1;
  }
  originalAddEventListener.call(this, type, callback, options);
} as typeof originalAddEventListener;

try {
  const host = hson.liveTree.queryBody().graft();
  const viewed: string[] = [];
  const copied: string[] = [];
  const projection = make_hosted_test_case_list(host, {
    async view(caseKey) { viewed.push(caseKey); },
    async copy(caseKey) { copied.push(caseKey); },
  }, scheduler);

  const alphaCases = [
    test_case("suite/alpha", "same title", "pass", "first"),
    test_case("suite/alpha", "same title", "pass", "second"),
  ];
  const betaCases = [test_case("suite/beta", "third")];
  projection.ingest(update(report(2, 2, 0), alphaCases));
  projection.ingest(update(report(3, 3, 0), betaCases));
  expect_projection(queuedFrames.filter((frame) => frame.active).length === 1, "multiple progressive updates coalesce to one frame");
  flush_frames();
  projection.ingest(update(report(3, 3, 0, true), [], [
    { suite: "suite/alpha", ms: 2 },
    { suite: "suite/beta", ms: 1 },
  ], true));

  const collapsed = projection.snapshot();
  expect_projection(collapsed.suites === 2 && collapsed.cases === 3 && collapsed.metrics.modelCaseRecords === 3, "compact cases enter the model exactly once");
  expect_projection(collapsed.expandedSuites.length === 0 && collapsed.metrics.visibleCaseRows === 0, "all suites are collapsed by default");
  expect_projection(runtime.document.querySelectorAll(".hosted-case-row").length === 0, "collapsed completion creates zero case-row DOM nodes");
  expect_projection(collapsed.metrics.suiteRowsCreated === 2 && collapsed.metrics.caseRowsCreated === 0, "completion creates only suite summary rows");
  expect_projection(collapsed.metrics.actionHandleEntries === 0 && collapsed.metrics.liveCaseTrees === 0, "collapsed suites retain no unmaterialized action handles or case LiveTrees");
  expect_projection(projection.action_handle(alphaCases[0]!.key, "view") === undefined, "collapsed canonical case identity has no presentation handle");
  expect_projection(
    collapsed.metrics.listenerRegistrations === 1 && projectionClickRegistrations === 1,
    `the entire projection owns one delegated click listener (metric ${collapsed.metrics.listenerRegistrations}, observed ${projectionClickRegistrations})`,
  );
  expect_projection(collapsed.metrics.cssSurfaceAccesses === 1, "only the projection root owns a CSS surface");
  expect_projection(collapsed.metrics.syntheticEvents === 0 && collapsed.metrics.fullCaseFlattens === 0, "projection has no synthetic event or full-flatten path");

  projection.set_expanded("suite/alpha", true);
  const expanded = projection.snapshot();
  expect_projection(expanded.metrics.visibleCaseRows === 2 && expanded.metrics.caseRowsCreated === 2, "expanding one suite creates exactly that suite's cases");
  expect_projection(expanded.metrics.actionHandleEntries === 4 && expanded.metrics.liveCaseTrees === 18, "expanded suite owns exactly two retained controls per materialized case row");
  const expandedNames = Array.from(runtime.document.querySelectorAll(".hosted-case-title"), (element) => element.textContent);
  expect_projection(expandedNames.join(",") === "same title,same title", "similarly titled cases retain canonical order without becoming action identity");
  expect_projection(projectionClickRegistrations === 1, "expansion registers no per-case click listeners");

  const viewButton = runtime.document.querySelector<HTMLElement>('[data-hosted-action="view"]');
  const copyButton = runtime.document.querySelector<HTMLElement>('[data-hosted-action="copy"]');
  const firstViewHandle = projection.action_handle(alphaCases[0]!.key, "view");
  const secondViewHandle = projection.action_handle(alphaCases[1]!.key, "view");
  expect_projection(viewButton !== null && copyButton !== null, "expanded rows expose direct view and copy controls");
  expect_projection(firstViewHandle?.dom.el() === viewButton, "delegated action identity resolves to the exact retained current LiveTree control");
  expect_projection(firstViewHandle !== secondViewHandle, "canonical case IDs distinguish controls for identically titled cases");
  viewButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  expect_projection(viewButton.hasAttribute("disabled") && viewButton.getAttribute("aria-busy") === "true", "in-flight retained action control sets semantic disabled and busy flags together");
  copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  runtime.document.querySelector<HTMLElement>(`[data-case-key="${alphaCases[1]!.key}"][data-hosted-action="view"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  await Promise.resolve();
  await Promise.resolve();
  expect_projection(viewed.join(",") === `${alphaCases[0]!.key},${alphaCases[1]!.key}` && copied.join(",") === alphaCases[0]!.key, "one delegated listener routes exact canonical case/action pairs");
  expect_projection(!viewButton.hasAttribute("disabled") && !viewButton.hasAttribute("aria-busy"), "settled action symmetrically clears semantic disabled and busy flags");

  projection.set_expanded("suite/alpha", false);
  const recollapsed = projection.snapshot();
  expect_projection(recollapsed.metrics.visibleCaseRows === 0 && recollapsed.expandedSuites.length === 0, "collapse clears visible row references");
  expect_projection(recollapsed.metrics.actionHandleEntries === 0 && recollapsed.metrics.liveCaseTrees === 0, "collapse releases all retained case-action handles and case LiveTrees");
  expect_projection(projection.action_handle(alphaCases[0]!.key, "view") === undefined, "collapsed presentation no longer resolves its disposed action control");
  expect_projection(runtime.document.querySelectorAll(".hosted-case-row").length === 0, "collapse removes the case projection from the DOM");

  projection.set_expanded("suite/alpha", true);
  const reexpandedNames = Array.from(runtime.document.querySelectorAll(".hosted-case-title"), (element) => element.textContent);
  const reexpandedViewHandle = projection.action_handle(alphaCases[0]!.key, "view");
  expect_projection(reexpandedNames.join(",") === "same title,same title" && projectionClickRegistrations === 1, "re-expansion preserves order without adding listeners");
  expect_projection(reexpandedViewHandle !== undefined && reexpandedViewHandle !== firstViewHandle, "re-expansion installs a current handle instead of resurrecting stale exact runtime identity");

  projection.dispose();
  expect_projection(projection.snapshot().metrics.listenerRegistrations === 0 && projection.snapshot().metrics.actionHandleEntries === 0, "disposal removes the delegated listener and all handle ownership");
  expect_projection(runtime.document.querySelector(".hosted-case-list") === null, "disposal removes the complete result projection");

  const replacement = make_hosted_test_case_list(host, { async view() {}, async copy() {} }, scheduler);
  replacement.ingest(update(report(1, 1, 0, true), [alphaCases[0]!], [{ suite: "suite/alpha", ms: 1 }], true));
  expect_projection(replacement.snapshot().cases === 1 && replacement.snapshot().metrics.visibleCaseRows === 0, "a rerun owns a fresh collapsed projection");
  replacement.set_expanded("suite/alpha", true);
  const replacementViewHandle = replacement.action_handle(alphaCases[0]!.key, "view");
  expect_projection(replacementViewHandle !== undefined && replacementViewHandle !== reexpandedViewHandle, "projection recovery/rebuild replaces exact runtime handles for the same semantic case ID");
  replacement.dispose();

  const portableCaseKey = "unit/test-harness::failed-assertion-row-fails-case-and-run";
  const circuitCaseKey = "livehost/circuit-worker-service::starts-exactly-one-persistent-worker";
  const inspectionRegistry = make_local_node_livehost_executor_registry();
  const inspect = make_hosted_test_case_inspector(inspectionRegistry);
  expect_projection(
    inspectionRegistry.get(portableCaseKey)?.descriptor.id === portableCaseKey
      && inspectionRegistry.get(circuitCaseKey)?.descriptor.id === circuitCaseKey,
    "portable and Node-owned circuit cases share canonical executor lookup IDs",
  );
  const inspectionCases = Object.freeze([
    test_case("unit/test-harness", "failed assertion row fails case and run", "pass", "failed-assertion-row-fails-case-and-run"),
    test_case("livehost/circuit-worker-service", "starts exactly one persistent worker", "pass", "starts-exactly-one-persistent-worker"),
  ]);
  const inspectionReport = report(2, 2, 0, true, Object.freeze({}), Object.freeze({
    "000001": inspectionCases,
  }));
  const viewedKeys: string[] = [];
  const copiedKeys: string[] = [];
  const renderedViews = new Map<string, string>();
  const copiedReports = new Map<string, string>();
  const diagnostics = new Map<string, ReturnType<typeof inspect>>();
  let openedViews = 0;
  Object.defineProperty(runtime.window, "open", {
    configurable: true,
    value: () => {
      openedViews += 1;
      return runtime.window;
    },
  });
  Object.defineProperty(runtime.window.navigator, "clipboard", {
    configurable: true,
    value: Object.freeze({
      async writeText(text: string) {
        copiedReports.set(text.split("\n", 1)[0] ?? "", text);
      },
    }),
  });
  const inspect_once = (caseKey: string) => {
    const existing = diagnostics.get(caseKey);
    if (existing !== undefined) return existing;
    const pending = inspect({ runId: "panel-inspection-run", suite: "canonical/selected", caseKey });
    diagnostics.set(caseKey, pending);
    return pending;
  };
  const inspectionActions = Object.freeze({
    async view(caseKey: string) {
      const diagnostic = await inspect_once(caseKey);
      viewedKeys.push(diagnostic.caseKey);
      renderedViews.set(diagnostic.caseKey, render_hosted_case_diagnostic_html(diagnostic));
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = ((callback: () => void) => {
        callback();
        return 0;
      }) as typeof globalThis.setTimeout;
      try { open_hosted_case_report(diagnostic); }
      finally { globalThis.setTimeout = originalSetTimeout; }
    },
    async copy(caseKey: string) {
      const diagnostic = await inspect_once(caseKey);
      await copy_hosted_case_report(diagnostic);
      copiedKeys.push(diagnostic.caseKey);
    },
  });
  const mount_inspection_projection = (): HostedTestCaseList => {
    const inspectionProjection = make_hosted_test_case_list(host, inspectionActions, scheduler);
    inspectionProjection.ingest(update(inspectionReport, inspectionCases, [
      { suite: "unit/test-harness", ms: 1 },
      { suite: "livehost/circuit-worker-service", ms: 1 },
    ], true));
    inspectionProjection.set_expanded("unit/test-harness", true);
    inspectionProjection.set_expanded("livehost/circuit-worker-service", true);
    return inspectionProjection;
  };
  const initialInspectionProjection = mount_inspection_projection();
  expect_projection(
    runtime.document.querySelectorAll('[data-hosted-action="view"]').length === 2
      && runtime.document.querySelectorAll('[data-hosted-action="copy"]').length === 2,
    "portable and Node-owned rows both expose inspection controls before remount",
  );
  initialInspectionProjection.dispose();

  const remountedInspectionProjection = mount_inspection_projection();
  expect_projection(
    remountedInspectionProjection.snapshot().metrics.listenerRegistrations === 1,
    "remounted panel owns one fresh delegated inspection listener",
  );
  for (const caseKey of [portableCaseKey, circuitCaseKey]) {
    const row = Array.from(runtime.document.querySelectorAll<HTMLElement>(".hosted-case-row"))
      .find((candidate) => candidate.getAttribute("data-case-key") === caseKey);
    const view = row?.querySelector<HTMLElement>('[data-hosted-action="view"]');
    const copy = row?.querySelector<HTMLElement>('[data-hosted-action="copy"]');
    expect_projection(
      view?.getAttribute("data-case-key") === caseKey && copy?.getAttribute("data-case-key") === caseKey,
      `remounted controls retain the intended case ID ${caseKey}`,
    );
    view.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    copy.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  }
  await wait_for_projection(
    () => viewedKeys.length === 2 && copiedKeys.length === 2,
    "both remounted view and copy paths settle",
  );
  for (const caseKey of [portableCaseKey, circuitCaseKey]) {
    const testCase = inspectionCases.find((candidate) => candidate.key === caseKey);
    const heading = testCase?.name ?? "";
    expect_projection(
      viewedKeys.includes(caseKey)
        && copiedKeys.includes(caseKey)
        && renderedViews.get(caseKey)?.includes(heading) === true
        && renderedViews.get(caseKey)?.includes(caseKey) === true
        && copiedReports.get(heading)?.includes(`id: ${caseKey}`) === true,
      `view and copy resolve and serialize the same intended case ${caseKey}`,
    );
  }
  expect_projection(openedViews === 2, "portable and Node-owned rows both open their rendered inspection view after remount");
  remountedInspectionProjection.dispose();

  const externalProjection = make_hosted_test_case_list(host, { async view() {}, async copy() {} }, scheduler);
  const passing = external_result("livehost/persistence", 16, "pass", 1010);
  const failing = external_result("livehost/protocol-document", 8, "fail", 946);
  const queuedPassing = external_result(passing.id, 16, "queued");
  const queuedFailing = external_result(failing.id, 8, "queued");
  externalProjection.ingest(update(report(0, 0, 0, false, Object.freeze({
    [queuedPassing.id]: queuedPassing,
    [queuedFailing.id]: queuedFailing,
  })), []));
  externalProjection.flush();
  const queuedSnapshot = externalProjection.snapshot();
  const externalRowsBefore = Array.from(runtime.document.querySelectorAll("[data-hosted-suite]"));
  expect_projection(
    queuedSnapshot.statusesBySuite[passing.id] === "queued"
      && queuedSnapshot.statusesBySuite[failing.id] === "queued"
      && externalRowsBefore.map((row) => row.getAttribute("data-hosted-suite")).join(",")
        === `${passing.id},${failing.id}`,
    "external rows exist in deterministic selection order before processes finish",
  );
  const runningPassing = external_result(passing.id, 16, "running");
  const runningFailing = external_result(failing.id, 8, "running");
  externalProjection.ingest(update(report(0, 0, 0, false, Object.freeze({
    [runningPassing.id]: runningPassing,
    [runningFailing.id]: runningFailing,
  })), []));
  externalProjection.flush();
  expect_projection(
    externalProjection.snapshot().statusesBySuite[passing.id] === "running"
      && Array.from(runtime.document.querySelectorAll("[data-hosted-suite]"))
        .every((row, index) => row === externalRowsBefore[index]),
    "queued rows transition to running in place without changing DOM identity",
  );
  externalProjection.ingest(update(report(1, 1, 0, false, Object.freeze({
    [passing.id]: passing,
    [runningFailing.id]: runningFailing,
  })), []));
  externalProjection.flush();
  expect_projection(
    externalProjection.snapshot().statusesBySuite[passing.id] === "pass"
      && externalProjection.snapshot().statusesBySuite[failing.id] === "running",
    "one launcher completion is projected before the complete selection settles",
  );
  const externalOnlyReport = report(2, 1, 1, true, Object.freeze({
    [passing.id]: passing,
    [failing.id]: failing,
  }));
  externalProjection.ingest(update(externalOnlyReport, [], [
    { suite: passing.suite, ms: passing.ms },
    { suite: failing.suite, ms: failing.ms },
  ], true));
  const externalSnapshot = externalProjection.snapshot();
  expect_projection(externalSnapshot.cases === 0 && externalSnapshot.launchers === 2, "external launchers do not enter canonical case totals");
  expect_projection(externalSnapshot.summariesBySuite[passing.id] === "16 checks · pass", "passing opaque suite displays its aggregate manifest check count");
  expect_projection(externalSnapshot.summariesBySuite[failing.id] === "8 checks · fail", "failing opaque suite displays its check count and process-authoritative status");
  externalProjection.set_expanded(passing.id, true);
  expect_projection(
    runtime.document.querySelector(`[data-hosted-suite="${passing.id}"]`) === externalRowsBefore[0]
      && runtime.document.querySelector(
        `[data-hosted-suite="${passing.id}"] + .hosted-case-block .hosted-evidence-content`,
      )?.textContent?.includes("verbatim stdout") === true,
    "passing raw stdout remains available behind the stable suite disclosure",
  );
  expect_projection(
    Array.from(runtime.document.querySelectorAll(".hosted-evidence-content"))
      .some((element) => element.textContent?.includes("meaningful stderr")),
    "failed launcher output remains visible beneath its failing suite",
  );
  const passingLog = hosted_external_launcher_log_projection(passing);
  const failingLog = hosted_external_launcher_log_projection(failing);
  expect_projection(
    passingLog.line.startsWith(`pass ${passing.id}`)
      && passingLog.failureDiagnostics.length === 0
      && !passingLog.line.includes("verbatim stdout"),
    "passing TAP stdout is not dumped into the ordinary concise log",
  );
  expect_projection(
    failingLog.line.startsWith(`fail ${failing.id}`)
      && failingLog.failureDiagnostics.join("\n").includes("meaningful stderr")
      && failingLog.failureDiagnostics.join("\n").includes("verbatim stdout"),
    "failing launcher output remains in visible failure diagnostics",
  );
  const externalSummary = hosted_test_projection_summary(externalOnlyReport);
  const externalFooter = hosted_test_projection_footer(externalSummary, 1956);
  expect_projection(
    externalFooter.map((entry) => entry.label).join("|")
      === "suites|suite fail|cases|case pass|case fail|checks|check pass|check fail|elapsed"
      && externalFooter.slice(0, 8).map((entry) => entry.value).join("|") === "2|1|0|0|0|24|16|unknown",
    "external-only footer keeps opaque checks distinct from canonical cases",
  );

  const mixedReport = report(
    1,
    1,
    0,
    true,
    Object.freeze({ [passing.id]: passing }),
    Object.freeze({ "000001": Object.freeze([test_case("suite/canonical", "ordinary")]) }),
  );
  const mixedSummary = hosted_test_projection_summary(mixedReport);
  const mixedFooter = hosted_test_projection_footer(mixedSummary, 10);
  expect_projection(
    mixedFooter.map((entry) => entry.label).join("|")
      === "suites|suite fail|cases|case pass|case fail|checks|check pass|check fail|elapsed"
      && mixedFooter.slice(0, 8).map((entry) => entry.value).join("|") === "2|0|1|1|0|16|16|0",
    "an all-green mixed summary preserves separate case and check universes",
  );
  const allGreenFooter = hosted_test_projection_footer(Object.freeze({
    suites: Object.freeze({ total: 30, pass: 30, fail: 0, cancelled: 0 }),
    canonical: Object.freeze({ total: 2103, pass: 2103, fail: 0, skip: 0, cancelled: 0 }),
    launchers: Object.freeze({ total: 28, pass: 28, fail: 0, declaredChecks: 502, passedChecks: 502, failedChecks: 0, cancelled: 0, cancelledChecks: 0 }),
  }), 10);
  expect_projection(
    allGreenFooter.slice(0, 8).map((entry) => `${entry.label}:${entry.value}`).join("|")
      === "suites:30|suite fail:0|cases:2103|case pass:2103|case fail:0|checks:502|check pass:502|check fail:0",
    "the complete successful mixed run does not fabricate a grand case/check equivalence",
  );
  const cancelledFooter = hosted_test_projection_footer(Object.freeze({
    suites: Object.freeze({ total: 2, pass: 0, fail: 0, cancelled: 2 }),
    canonical: Object.freeze({ total: 4, pass: 1, fail: 0, skip: 0, cancelled: 3 }),
    launchers: Object.freeze({ total: 1, pass: 0, fail: 0, declaredChecks: 16, passedChecks: 0, failedChecks: 0, cancelled: 1, cancelledChecks: 16 }),
  }), 10);
  expect_projection(
    cancelledFooter.map((entry) => `${entry.key}:${entry.value}`).join("|")
      === "suites:2|suite-fail:0|cases:4|case-pass:1|case-fail:0|case-cancel:3|checks:16|check-pass:0|check-fail:0|check-cancel:16|elapsed:10.0 ms",
    "cancellation appears as distinct case and opaque-check fields without changing ordinary wording",
  );
  expect_projection(
    externalSnapshot.summariesBySuite[passing.id]?.startsWith("16 checks · pass") === true
      && passing.id === "livehost/persistence",
    "external suite rows retain semantic identity while process evidence remains separate",
  );

  const failedMixedReport = report(
    2,
    1,
    1,
    true,
    Object.freeze({ [failing.id]: failing }),
    Object.freeze({ "000001": Object.freeze([test_case("suite/canonical", "ordinary")]) }),
  );
  const failedMixedFooter = hosted_test_projection_footer(
    hosted_test_projection_summary(failedMixedReport),
    10,
  );
  expect_projection(
    failedMixedFooter.map((entry) => entry.label).join("|") === "suites|suite fail|cases|case pass|case fail|checks|check pass|check fail|elapsed"
      && failedMixedFooter.find((entry) => entry.label === "suite fail")?.value === 1
      && failedMixedFooter.find((entry) => entry.label === "case pass")?.value === 1
      && failedMixedFooter.find((entry) => entry.label === "check fail")?.value === "unknown",
    "a failed external suite is identified without fabricating failed internal cases",
  );

  const canonicalFooter = hosted_test_projection_footer(hosted_test_projection_summary(
    report(1, 1, 0, true, Object.freeze({}), Object.freeze({
      "000001": Object.freeze([test_case("suite/canonical", "ordinary")]),
    })),
  ), 10);
  expect_projection(
    canonicalFooter.slice(0, 5).map((entry) => `${entry.label}:${entry.value}`).join("|")
      === "suites:1|suite fail:0|cases:1|passed:1|failed:0",
    "canonical-only and Worker-compatible summaries retain their ordinary counters",
  );

  const copiedMixed = await serialize_hosted_run_report(
    mixedReport,
    Object.freeze({
      runId: "projection-run",
      attemptId: "projection-run:attempt:1",
      suite: "canonical/selected",
      testIds: Object.freeze(["canonical-id", passing.id]),
      ok: true,
      summary: Object.freeze({
        suites: 2,
        cases: 2,
        pass: 2,
        fail: 0,
        skip: 0,
        msTotal: 10,
        failures: Object.freeze([]),
      }),
      timing: Object.freeze({ runnerMs: 10, hostMs: 10, roundTripMs: 10 }),
    }),
    async () => { throw new Error("passing report should not inspect diagnostics"); },
  );
  expect_projection(
    copiedMixed.includes("canonical cases: 1 passed")
      && copiedMixed.includes("opaque suites: 1/1 passed")
      && copiedMixed.includes(passing.id)
      && mixedReport.externalResults[passing.id]?.runtime === "node",
    "copied and raw reports preserve canonical versus external execution provenance",
  );

  const allLaunchers = Object.freeze(Object.fromEntries(Array.from({ length: 28 }, (_, index) => {
    const id = `transform/launcher-${index}`;
    return [id, external_result(id, index === 27 ? 502 - 27 : 1, "pass")];
  })));
  const allSummary = hosted_test_projection_summary(report(28, 28, 0, true, allLaunchers));
  expect_projection(
    allSummary.canonical.total === 0
      && allSummary.launchers.total === 28
      && allSummary.launchers.pass === 28
      && allSummary.launchers.declaredChecks === 502,
    "28-suite projection reports 28 passed opaque suites and 502 manifest checks without fabricated structured cases",
  );
  externalProjection.dispose();

  const chipHost = host.create.div();
  const chipDisplay = create_test_chips(chipHost);
  const chipNodes = Array.from(runtime.document.querySelectorAll("#test-chips .test-chip"));
  chipDisplay.renderEntries([
    { key: "cases", label: "cases", value: 9 },
    { key: "case-pass", label: "passed", value: 8 },
    { key: "case-fail", label: "failed", value: 1 },
    { key: "elapsed", label: "elapsed", value: "9 ms" },
  ]);
  const metricsAfterFirstChipUpdate = chipDisplay.metrics();
  chipDisplay.renderEntries(mixedFooter);
  const metricsAfterSecondChipUpdate = chipDisplay.metrics();
  chipDisplay.renderEntries(canonicalFooter);
  chipDisplay.renderEntries(mixedFooter);
  chipDisplay.renderEntries(mixedFooter);
  expect_projection(
    Array.from(runtime.document.querySelectorAll("#test-chips .test-chip"))
      .every((node, index) => node === chipNodes[index])
      && chipNodes.length === TEST_SUMMARY_ENTRY_ORDER.length
      && chipDisplay.metrics().layoutBuilds === 1,
    "summary DOM identity remains stable across legacy, mixed, and canonical report updates",
  );
  expect_projection(
    chipDisplay.metrics().valueUpdates > metricsAfterSecondChipUpdate.valueUpdates
      && metricsAfterSecondChipUpdate.valueUpdates > metricsAfterFirstChipUpdate.valueUpdates,
    "summary values update without throwing as the settled count universe changes",
  );
  expect_projection(
    chipNodes.every((node) => runtime.window.getComputedStyle(node as Element).display !== "none"),
    "all eleven keyed summary slots remain materialized across repeated report updates",
  );
  expect_projection(
    TEST_CHIP_ROWcss.gridTemplateColumns === "repeat(4, minmax(9ch, 1fr))"
      && TEST_CHIP_VALUEcss.fontVariantNumeric === "tabular-nums"
      && TEST_CHIP_VALUEcss.minWidth === "8ch",
    "summary geometry is fixed and uses stable tabular numeric widths",
  );
  chipHost.remove();

  console.log(JSON.stringify({
    collapsedSuiteRows: collapsed.metrics.suiteRowsCreated,
    collapsedCaseRows: collapsed.metrics.caseRowsCreated,
    delegatedListeners: collapsed.metrics.listenerRegistrations,
    collapsedLiveTrees: collapsed.metrics.liveTreesConstructed,
    cssSurfaces: collapsed.metrics.cssSurfaceAccesses,
    expandedCaseRows: expanded.metrics.visibleCaseRows,
  }));
} finally {
  eventTargetPrototype.addEventListener = originalAddEventListener;
  runtime.dispose();
}
