import { hson } from "hson-live";
import type { HostedTestCaseReport, HostedTestReport } from "../../app/hosted-test/hosted-test-report.types";
import type { HostedTestPanelReportUpdate } from "../../app/demos/test/hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestFrameScheduler } from "../../app/demos/test/hosted-test-case-list";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";

function expect_projection(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted panel projection: ${message}`);
}

function test_case(suite: string, name: string, status: HostedTestCaseReport["status"] = "pass"): HostedTestCaseReport {
  return Object.freeze({ key: `${suite}::${name}`, suite, name, status, ms: 1, err: status === "fail" ? "expected" : null });
}

function report(cases: number, pass: number, fail: number, terminal = false): HostedTestReport {
  return Object.freeze({
    run: Object.freeze({
      suite: "hosted/all",
      status: terminal ? "passed" : cases === 0 ? "idle" : "running",
      startedAt: cases === 0 ? null : 1,
      completedAt: terminal ? 2 : null,
      timing: terminal ? Object.freeze({ runnerMs: 1, hostMs: 2 }) : null,
    }),
    summary: Object.freeze({ cases, pass, fail, skip: 0 }),
    caseBatches: Object.freeze({}),
    suites: Object.freeze([]),
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

  const alphaCases = [test_case("suite/alpha", "first"), test_case("suite/alpha", "second")];
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
  expect_projection(
    collapsed.metrics.listenerRegistrations === 1 && projectionClickRegistrations === 1,
    `the entire projection owns one delegated click listener (metric ${collapsed.metrics.listenerRegistrations}, observed ${projectionClickRegistrations})`,
  );
  expect_projection(collapsed.metrics.cssSurfaceAccesses === 1, "only the projection root owns a CSS surface");
  expect_projection(collapsed.metrics.syntheticEvents === 0 && collapsed.metrics.fullCaseFlattens === 0, "projection has no synthetic event or full-flatten path");

  projection.set_expanded("suite/alpha", true);
  const expanded = projection.snapshot();
  expect_projection(expanded.metrics.visibleCaseRows === 2 && expanded.metrics.caseRowsCreated === 2, "expanding one suite creates exactly that suite's cases");
  const expandedNames = Array.from(runtime.document.querySelectorAll(".hosted-case-name"), (element) => element.textContent);
  expect_projection(expandedNames.join(",") === "first,second", "expanded cases retain canonical order");
  expect_projection(projectionClickRegistrations === 1, "expansion registers no per-case click listeners");

  const viewButton = runtime.document.querySelector<HTMLElement>('[data-hosted-action="view"]');
  const copyButton = runtime.document.querySelector<HTMLElement>('[data-hosted-action="copy"]');
  expect_projection(viewButton !== null && copyButton !== null, "expanded rows expose direct view and copy controls");
  viewButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  await Promise.resolve();
  await Promise.resolve();
  expect_projection(viewed.join(",") === alphaCases[0]?.key && copied.join(",") === alphaCases[0]?.key, "one delegated listener routes both case actions");

  projection.set_expanded("suite/alpha", false);
  const recollapsed = projection.snapshot();
  expect_projection(recollapsed.metrics.visibleCaseRows === 0 && recollapsed.expandedSuites.length === 0, "collapse clears visible row references");
  expect_projection(runtime.document.querySelectorAll(".hosted-case-row").length === 0, "collapse removes the case projection from the DOM");

  projection.set_expanded("suite/alpha", true);
  const reexpandedNames = Array.from(runtime.document.querySelectorAll(".hosted-case-name"), (element) => element.textContent);
  expect_projection(reexpandedNames.join(",") === "first,second" && projectionClickRegistrations === 1, "re-expansion preserves order without adding listeners");

  projection.dispose();
  expect_projection(projection.snapshot().metrics.listenerRegistrations === 0, "disposal removes the delegated listener");
  expect_projection(runtime.document.querySelector(".hosted-case-list") === null, "disposal removes the complete result projection");

  const replacement = make_hosted_test_case_list(host, { async view() {}, async copy() {} }, scheduler);
  replacement.ingest(update(report(1, 1, 0, true), [test_case("suite/new", "fresh")], [{ suite: "suite/new", ms: 1 }], true));
  expect_projection(replacement.snapshot().cases === 1 && replacement.snapshot().metrics.visibleCaseRows === 0, "a rerun owns a fresh collapsed projection");
  replacement.dispose();

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
