import type { LiveTree } from "hson-live/livetree";
import type { HostedTestReport } from "../../../../shared/hosted-tests/hosted-test-report.types";
import type { HostedTestPanelReportUpdate } from "./hosted-test-panel-adapter";
import { format_hosted_test_duration } from "../../../../shared/hosted-tests/hosted-test-timing";
import { _fontSize } from "../../../core/consts/ui-consts";
import type { TestLifecycleCounts, TestLifecycleStatus } from "../../../../shared/testing/test-lifecycle-contract";
import {
  hosted_test_presentation_group_label,
  hosted_test_suite_presentation,
  type HostedTestPresentationGroup,
  type HostedTestSuitePresentation,
} from "./hosted-test-presentation";

export type HostedTestCaseActions = Readonly<{
  view(caseKey: string): Promise<void>;
  copy(caseKey: string): Promise<void>;
}>;

export type HostedTestCaseAction = keyof HostedTestCaseActions;

export type HostedTestPanelProjectionMetrics = Readonly<{
  suiteRowsCreated: number;
  caseRowsCreated: number;
  visibleCaseRows: number;
  liveCaseTrees: number;
  actionHandleEntries: number;
  listenerRegistrations: number;
  liveTreesConstructed: number;
  cssSurfaceAccesses: number;
  modelCaseRecords: number;
  syntheticEvents: 0;
  fullCaseFlattens: 0;
  renderPasses: number;
  expandedSuites: number;
}>;

export type HostedTestPanelProjectionSnapshot = Readonly<{
  suites: number;
  cases: number;
  launchers: number;
  summariesBySuite: Readonly<Record<string, string>>;
  statusesBySuite: Readonly<Record<string, string>>;
  groupOrder: readonly string[];
  suiteOrder: readonly string[];
  failureKindsBySuite: Readonly<Record<string, readonly string[]>>;
  evidenceSectionsBySuite: Readonly<Record<string, readonly string[]>>;
  expandedSuites: readonly string[];
  caseKeysBySuite: Readonly<Record<string, readonly string[]>>;
  metrics: HostedTestPanelProjectionMetrics;
}>;

export type HostedTestFrameScheduler = Readonly<{
  schedule(callback: () => void): () => void;
}>;

export type HostedTestCaseList = Readonly<{
  ingest(update: HostedTestPanelReportUpdate): void;
  suite_count(): number;
  set_expanded(suite: string, expanded: boolean): void;
  show_error(message: string): void;
  flush(): void;
  action_handle(caseKey: string, action: HostedTestCaseAction): LiveTree | undefined;
  snapshot(): HostedTestPanelProjectionSnapshot;
  dispose(): void;
}>;

type ProjectedCase = {
  key: string;
  suite: string;
  caseId: string;
  name: string;
  status: TestLifecycleStatus;
  ms: number | null;
  err: string | null;
  row?: LiveTree | undefined;
  statusView?: LiveTree | undefined;
  nameView?: LiveTree | undefined;
  durationView?: LiveTree | undefined;
};

type SuiteProjection = {
  suite: string;
  title: string;
  groupKey: HostedTestPresentationGroup;
  cases: ProjectedCase[];
  status: TestLifecycleStatus;
  executionShape: "cases" | "opaque-aggregate" | "certification-aggregate";
  declaredChecks: number | null;
  counts: TestLifecycleCounts | null;
  pass: number;
  fail: number;
  skip: number;
  ms: number | undefined;
  expanded: boolean;
  group: LiveTree;
  row: LiveTree;
  disclosure: LiveTree;
  summary: LiveTree;
  duration: LiveTree;
  caseHost: LiveTree | undefined;
  detailsHost: LiveTree | undefined;
  caseRowsHost: LiveTree | undefined;
  presentation: HostedTestSuitePresentation | undefined;
  detailsSignature: string;
  lastSequence: number;
};

type SubjectProjection = Readonly<{
  key: HostedTestPresentationGroup;
  group: LiveTree;
  suiteHost: LiveTree;
}>;

const PANEL_STYLES = Object.freeze({
  root: {
    width: "100%", height: "100%", overflow: "auto", fontFamily: "DM Mono, monospace", fontSize: _fontSize.wee,
  },
  suiteGroup: { borderBottom: "1px solid rgba(125,216,207,.18)" },
  subjectGroup: { borderBottom: "1px solid rgba(125,216,207,.26)" },
  subjectHeading: { padding: "9px 8px 5px", color: "#d7ff70", letterSpacing: ".08em", textTransform: "uppercase", fontSize: ".72rem" },
  suiteRow: {
    appearance: "none", width: "100%", display: "grid", gridTemplateColumns: "18px minmax(0,1fr) auto 72px", alignItems: "center", gap: "8px", padding: "7px 8px", border: "0", background: "transparent", color: "#7dd8cf", font: "inherit", textAlign: "left", cursor: "pointer",
  },
  suiteRowHover: { background: "rgba(125,216,207,.06)" },
  suiteRowFocus: { outline: "1px solid #d7ff70", outlineOffset: "-1px" },
  disclosure: { color: "#d7ff70", textAlign: "center" },
  suiteName: { minWidth: "0", display: "grid", gap: "1px" },
  suiteTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  identity: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#81948a", fontSize: ".68rem" },
  suiteSummary: { color: "#9bb3a6", whiteSpace: "nowrap" },
  suiteDuration: { color: "#89948d", textAlign: "right", whiteSpace: "nowrap" },
  suiteFailed: { color: "#ff8778" },
  caseBlock: { borderTop: "1px solid rgba(125,216,207,.12)" },
  caseRow: {
    display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 70px minmax(88px,auto)", alignItems: "center", gap: "7px", minHeight: "27px", padding: "3px 8px 3px 26px", borderBottom: "1px solid rgba(200,220,208,.09)", color: "#ddd9cd",
  },
  caseRowHover: { background: "rgba(215,255,112,.035)" },
  caseStatus: { color: "#c4b070" },
  casePass: { color: "#9ddf8b" },
  caseFail: { color: "#ff8778" },
  caseName: { minWidth: "0", display: "grid", gap: "1px", overflow: "hidden" },
  caseIdentity: { color: "#81948a", fontSize: ".66rem" },
  caseDuration: { textAlign: "right", color: "#89948d", whiteSpace: "nowrap" },
  caseActions: { display: "flex", justifyContent: "flex-end", gap: "5px", opacity: "0", pointerEvents: "none" },
  caseActionsVisible: { opacity: "1", pointerEvents: "auto" },
  caseAction: {
    appearance: "none", border: "1px solid rgba(200,220,208,.3)", background: "transparent", color: "#9bb3a6", cursor: "pointer", minHeight: "22px", padding: "2px 7px", font: "inherit",
  },
  caseActionHover: { color: "#d7ff70", borderColor: "#d7ff70", background: "rgba(215,255,112,.08)" },
  error: { color: "#ff8778", padding: "5px 8px", borderBottom: "1px solid rgba(255,135,120,.3)" },
  externalOutput: {
    margin: "0", padding: "8px 26px", borderTop: "1px solid rgba(125,216,207,.12)",
    color: "#b7c3bb", whiteSpace: "pre-wrap", overflowWrap: "anywhere",
  },
  suiteMeta: { padding: "7px 26px", color: "#91a39a", whiteSpace: "pre-wrap" },
  failureCard: { margin: "7px 26px", padding: "9px", border: "1px solid rgba(255,135,120,.45)", color: "#eaded4", background: "rgba(255,135,120,.05)", whiteSpace: "pre-wrap" },
  failureLabel: { color: "#ff8778", fontWeight: "700", letterSpacing: ".06em" },
  evidence: { margin: "5px 26px", color: "#aebbb3" },
  evidenceSummary: { cursor: "pointer", color: "#7dd8cf" },
  evidenceContent: { margin: "5px 0 8px", padding: "7px", maxHeight: "18rem", overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", borderLeft: "1px solid rgba(125,216,207,.25)" },
} as const);

function default_frame_scheduler(): HostedTestFrameScheduler {
  return {
    schedule(callback) {
      let active = true;
      if (typeof globalThis.requestAnimationFrame === "function") {
        const id = globalThis.requestAnimationFrame(() => {
          if (active) callback();
        });
        return () => {
          if (!active) return;
          active = false;
          globalThis.cancelAnimationFrame?.(id);
        };
      }
      const id = globalThis.setTimeout(() => {
        if (active) callback();
      }, 0);
      return () => {
        if (!active) return;
        active = false;
        globalThis.clearTimeout(id);
      };
    },
  };
}

function action_target(event: MouseEvent): Element | undefined {
  for (const target of event.composedPath()) {
    if (target instanceof Element && target.hasAttribute("data-hosted-action")) return target;
  }
  return undefined;
}

export function make_hosted_test_case_list(
  host: LiveTree,
  actions: HostedTestCaseActions,
  scheduler: HostedTestFrameScheduler = default_frame_scheduler(),
): HostedTestCaseList {
  const root = host.create.div().classlist.set("hosted-case-list");
  let liveTreesConstructed = 1;
  let suiteRowsCreated = 0;
  let caseRowsCreated = 0;
  let visibleCaseRows = 0;
  let liveCaseTrees = 0;
  let renderPasses = 0;
  let disposed = false;
  let generation = 0;
  let cancelFrame: (() => void) | undefined;
  const suites = new Map<string, SuiteProjection>();
  const subjectGroups = new Map<HostedTestPresentationGroup, SubjectProjection>();
  const caseRecords = new Map<string, ProjectedCase>();
  const actionHandles = new Map<string, LiveTree>();
  const dirtySuites = new Set<string>();

  const action_handle_key = (caseKey: string, action: HostedTestCaseAction): string => `${caseKey}\u0000${action}`;

  function retain_action_handle(caseKey: string, action: HostedTestCaseAction, handle: LiveTree): void {
    const key = action_handle_key(caseKey, action);
    if (actionHandles.has(key)) throw new Error(`Duplicate hosted case action handle: ${caseKey} (${action}).`);
    actionHandles.set(key, handle);
  }

  function release_case_action_handles(caseKey: string): void {
    actionHandles.delete(action_handle_key(caseKey, "view"));
    actionHandles.delete(action_handle_key(caseKey, "copy"));
  }

  const css = root.css;
  css.setMany(PANEL_STYLES.root);
  css.selector("& .hosted-suite-group").setMany(PANEL_STYLES.suiteGroup);
  css.selector("& .hosted-subject-group").setMany(PANEL_STYLES.subjectGroup);
  css.selector("& .hosted-subject-heading").setMany(PANEL_STYLES.subjectHeading);
  css.selector("& .hosted-suite-row").setMany(PANEL_STYLES.suiteRow);
  css.selector("& .hosted-suite-row:hover").setMany(PANEL_STYLES.suiteRowHover);
  css.selector("& .hosted-suite-row:focus-visible").setMany(PANEL_STYLES.suiteRowFocus);
  css.selector("& .hosted-suite-disclosure").setMany(PANEL_STYLES.disclosure);
  css.selector("& .hosted-suite-name").setMany(PANEL_STYLES.suiteName);
  css.selector("& .hosted-suite-title").setMany(PANEL_STYLES.suiteTitle);
  css.selector("& .hosted-suite-identity").setMany(PANEL_STYLES.identity);
  css.selector("& .hosted-suite-summary").setMany(PANEL_STYLES.suiteSummary);
  css.selector("& .hosted-suite-duration").setMany(PANEL_STYLES.suiteDuration);
  css.selector("& .hosted-suite-row.is-failed").setMany(PANEL_STYLES.suiteFailed);
  css.selector("& .hosted-case-block").setMany(PANEL_STYLES.caseBlock);
  css.selector("& .hosted-case-row").setMany(PANEL_STYLES.caseRow);
  css.selector("& .hosted-case-row:hover").setMany(PANEL_STYLES.caseRowHover);
  css.selector("& .hosted-case-status").setMany(PANEL_STYLES.caseStatus);
  css.selector("& .hosted-case-status.is-pass").setMany(PANEL_STYLES.casePass);
  css.selector("& .hosted-case-status.is-fail").setMany(PANEL_STYLES.caseFail);
  css.selector("& .hosted-case-name").setMany(PANEL_STYLES.caseName);
  css.selector("& .hosted-case-identity").setMany(PANEL_STYLES.caseIdentity);
  css.selector("& .hosted-case-duration").setMany(PANEL_STYLES.caseDuration);
  css.selector("& .hosted-case-actions").setMany(PANEL_STYLES.caseActions);
  css.selector("& .hosted-case-row:hover .hosted-case-actions").setMany(PANEL_STYLES.caseActionsVisible);
  css.selector("& .hosted-case-row:focus-within .hosted-case-actions").setMany(PANEL_STYLES.caseActionsVisible);
  css.selector("& .hosted-case-action").setMany(PANEL_STYLES.caseAction);
  css.selector("& .hosted-case-action:hover").setMany(PANEL_STYLES.caseActionHover);
  css.selector("& .hosted-case-action:focus-visible").setMany(PANEL_STYLES.caseActionHover);
  css.selector("& .hosted-case-error").setMany(PANEL_STYLES.error);
  css.selector("& .hosted-external-output").setMany(PANEL_STYLES.externalOutput);
  css.selector("& .hosted-suite-meta").setMany(PANEL_STYLES.suiteMeta);
  css.selector("& .hosted-failure-card").setMany(PANEL_STYLES.failureCard);
  css.selector("& .hosted-failure-label").setMany(PANEL_STYLES.failureLabel);
  css.selector("& .hosted-evidence-section").setMany(PANEL_STYLES.evidence);
  css.selector("& .hosted-evidence-summary").setMany(PANEL_STYLES.evidenceSummary);
  css.selector("& .hosted-evidence-content").setMany(PANEL_STYLES.evidenceContent);

  function ensure_subject(key: HostedTestPresentationGroup): SubjectProjection {
    const existing = subjectGroups.get(key);
    if (existing !== undefined) return existing;
    const group = root.create.div().classlist.set("hosted-subject-group").attrs.set("data-hosted-subject", key);
    group.create.div().classlist.set("hosted-subject-heading").text.set(hosted_test_presentation_group_label(key));
    const suiteHost = group.create.div().classlist.set("hosted-subject-suites");
    liveTreesConstructed += 3;
    const created = Object.freeze({ key, group, suiteHost });
    subjectGroups.set(key, created);
    return created;
  }

  function ensure_suite(suite: string, title: string, groupKey: HostedTestPresentationGroup): SuiteProjection {
    const existing = suites.get(suite);
    if (existing !== undefined) return existing;
    const subject = ensure_subject(groupKey);
    const group = subject.suiteHost.create.div().classlist.set("hosted-suite-group");
    const row = group.create.button().classlist.set("hosted-suite-row").attrs.setMany({
      type: "button",
      "data-hosted-action": "toggle-suite",
      "data-hosted-suite": suite,
      "aria-expanded": "false",
    });
    const disclosure = row.create.span().classlist.set("hosted-suite-disclosure").text.set("▸");
    const name = row.create.span().classlist.set("hosted-suite-name");
    name.create.span().classlist.set("hosted-suite-title").text.set(title);
    name.create.span().classlist.set("hosted-suite-identity").text.set(suite);
    const summary = row.create.span().classlist.set("hosted-suite-summary").text.set("0 cases");
    const duration = row.create.span().classlist.set("hosted-suite-duration").text.set("running");
    liveTreesConstructed += 8;
    suiteRowsCreated += 1;
    const created: SuiteProjection = {
      suite,
      title,
      groupKey,
      cases: [],
      status: "queued",
      executionShape: "cases",
      declaredChecks: null,
      counts: null,
      pass: 0,
      fail: 0,
      skip: 0,
      ms: undefined,
      expanded: false,
      group,
      row,
      disclosure,
      summary,
      duration,
      caseHost: undefined,
      detailsHost: undefined,
      caseRowsHost: undefined,
      presentation: undefined,
      detailsSignature: "",
      lastSequence: -1,
    };
    suites.set(suite, created);
    dirtySuites.add(suite);
    return created;
  }

  function suite_summary(state: SuiteProjection): string {
    if (state.presentation !== undefined) return state.presentation.summary;
    return state.executionShape === "cases"
      ? `${state.cases.length} cases · ${state.pass} pass · ${state.fail} fail · ${state.skip} skip`
      : state.counts !== null && state.counts.executed > 0
        ? `${state.counts.executed}/${state.counts.declared} checks · ${state.counts.passed} pass · ${state.counts.failed} fail`
        : `${state.declaredChecks ?? 0} checks · ${state.status}`;
  }

  function render_suite(state: SuiteProjection): void {
    state.summary.text.set(suite_summary(state));
    state.duration.text.set(state.ms === undefined
      ? state.status
      : format_hosted_test_duration(state.ms));
    for (const status of ["queued", "running", "pass", "fail", "skip", "unsupported", "cancelled"] as const) state.row.classlist.remove(`is-${status}`);
    state.row.classlist.add(`is-${state.status}`);
    if (state.fail > 0 || state.status === "fail") state.row.classlist.add("is-failed");
    else state.row.classlist.remove("is-failed");
  }

  function render_dirty_suites(): void {
    cancelFrame = undefined;
    if (disposed || dirtySuites.size === 0) return;
    renderPasses += 1;
    for (const suite of dirtySuites) {
      const state = suites.get(suite);
      if (state !== undefined) render_suite(state);
    }
    dirtySuites.clear();
  }

  function schedule_render(): void {
    if (disposed || cancelFrame !== undefined || dirtySuites.size === 0) return;
    cancelFrame = scheduler.schedule(render_dirty_suites);
  }

  function flush(): void {
    cancelFrame?.();
    cancelFrame = undefined;
    render_dirty_suites();
  }

  function update_case_view(testCase: ProjectedCase): void {
    const statusView = testCase.statusView;
    if (statusView !== undefined) {
      for (const status of ["queued", "running", "pass", "fail", "skip", "unsupported", "cancelled"] as const) statusView.classlist.remove(`is-${status}`);
      statusView.classlist.add(`is-${testCase.status}`).text.set(testCase.status.toUpperCase());
    }
    testCase.nameView?.attrs.set("title", testCase.err ?? testCase.key).text.set(testCase.name);
    testCase.durationView?.text.set(testCase.ms === null ? testCase.status : format_hosted_test_duration(testCase.ms));
  }

  function append_case(state: SuiteProjection, testCase: ProjectedCase): void {
    const caseHost = state.caseRowsHost;
    if (caseHost === undefined) return;
    const row = caseHost.create.div().classlist.set("hosted-case-row").attrs.set("data-case-key", testCase.key);
    const statusView = row.create.span().classlist.set(`hosted-case-status is-${testCase.status}`).text.set(testCase.status.toUpperCase());
    const nameBlock = row.create.span().classlist.set("hosted-case-name").attrs.set("title", testCase.err ?? testCase.key);
    const nameView = nameBlock.create.span().classlist.set("hosted-case-title").text.set(testCase.name);
    nameBlock.create.span().classlist.set("hosted-case-identity").text.set(testCase.key);
    const durationView = row.create.span().classlist.set("hosted-case-duration").text.set(testCase.ms === null ? testCase.status : format_hosted_test_duration(testCase.ms));
    const controls = row.create.span().classlist.set("hosted-case-actions");
    const viewControl = controls.create.button().classlist.set("hosted-case-action").attrs.setMany({
      type: "button", "data-hosted-action": "view", "data-case-key": testCase.key, "aria-label": `View report for ${testCase.name}`,
    }).text.set("view");
    const copyControl = controls.create.button().classlist.set("hosted-case-action").attrs.setMany({
      type: "button", "data-hosted-action": "copy", "data-case-key": testCase.key, "aria-label": `Copy report for ${testCase.name}`,
    }).text.set("copy");
    retain_action_handle(testCase.key, "view", viewControl);
    retain_action_handle(testCase.key, "copy", copyControl);
    liveTreesConstructed += 9;
    caseRowsCreated += 1;
    visibleCaseRows += 1;
    liveCaseTrees += 9;
    testCase.row = row;
    testCase.statusView = statusView;
    testCase.nameView = nameView;
    testCase.durationView = durationView;
  }

  function render_presentation_details(state: SuiteProjection): void {
    const host = state.detailsHost;
    const presentation = state.presentation;
    if (host === undefined || presentation === undefined) return;
    const signature = JSON.stringify({
      metadata: presentation.metadata,
      failures: presentation.failures,
      evidence: presentation.evidence,
    });
    if (signature === state.detailsSignature) return;
    state.detailsSignature = signature;
    host.empty();
    host.create.div().classlist.set("hosted-suite-meta").text.set(presentation.metadata.join("\n"));
    liveTreesConstructed += 1;
    for (const failure of presentation.failures) {
      const card = host.create.div().classlist.set("hosted-failure-card").attrs.setMany({
        "data-failure-kind": failure.kind,
        "data-failure-id": failure.identity,
      });
      card.create.div().classlist.set("hosted-failure-label").text.set(failure.label);
      card.create.div().text.set(`${failure.title}\n${failure.identity}\nstatus: ${failure.status}\n${failure.message}`);
      if (failure.expected !== null) card.create.div().text.set(`expected: ${failure.expected}`);
      if (failure.actual !== null) card.create.div().text.set(`actual: ${failure.actual}`);
      card.create.div().text.set(`executor: ${failure.executorId}`);
      if (failure.stack !== null) card.create.pre().classlist.set("hosted-evidence-content").text.set(failure.stack);
      if (failure.relevantOutput !== null) card.create.pre().classlist.set("hosted-evidence-content").text.set(failure.relevantOutput);
      liveTreesConstructed += 4 + (failure.expected === null ? 0 : 1) + (failure.actual === null ? 0 : 1)
        + (failure.stack === null ? 0 : 1) + (failure.relevantOutput === null ? 0 : 1);
    }
    for (const section of presentation.evidence) {
      const details = host.create.details().classlist.set("hosted-evidence-section").attrs.set("data-evidence-kind", section.key);
      details.create.summary().classlist.set("hosted-evidence-summary").text.set(`${section.label} (${section.entries.length})`);
      details.create.pre().classlist.set("hosted-evidence-content").text.set(section.entries.join("\n\n"));
      liveTreesConstructed += 3;
    }
  }

  function set_expanded(suite: string, expanded: boolean): void {
    if (disposed) return;
    const state = suites.get(suite);
    if (state === undefined || state.expanded === expanded) return;
    state.expanded = expanded;
    state.row.attrs.set("aria-expanded", expanded ? "true" : "false");
    state.disclosure.text.set(expanded ? "▾" : "▸");
    if (!expanded) {
      state.caseHost?.remove();
      state.caseHost = undefined;
      state.detailsHost = undefined;
      state.caseRowsHost = undefined;
      state.detailsSignature = "";
      for (const testCase of state.cases) {
        release_case_action_handles(testCase.key);
        testCase.row = undefined;
        testCase.statusView = undefined;
        testCase.nameView = undefined;
        testCase.durationView = undefined;
      }
      visibleCaseRows -= state.cases.length;
      liveCaseTrees -= state.cases.length * 9;
      return;
    }
    state.caseHost = state.group.create.div().classlist.set("hosted-case-block");
    state.detailsHost = state.caseHost.create.div().classlist.set("hosted-suite-details");
    state.caseRowsHost = state.caseHost.create.div().classlist.set("hosted-case-rows");
    liveTreesConstructed += 3;
    render_presentation_details(state);
    if (state.executionShape !== "cases") return;
    for (const testCase of state.cases) append_case(state, testCase);
  }

  async function run_case_action(button: LiveTree, action: HostedTestCaseAction, caseKey: string): Promise<void> {
    const actionGeneration = generation;
    const controlKey = action_handle_key(caseKey, action);
    button.flags.set("disabled");
    button.attrs.set("aria-busy", "true");
    button.text.set("…");
    try {
      await actions[action](caseKey);
    } catch (error) {
      if (!disposed && generation === actionGeneration) show_error(error instanceof Error ? error.message : String(error));
    } finally {
      if (!disposed && generation === actionGeneration && actionHandles.get(controlKey) === button) {
        button.flags.clear("disabled");
        button.attrs.drop("aria-busy");
        button.text.set(action);
      }
    }
  }

  const actionListener = root.listen.onClick((event) => {
    if (disposed) return;
    const target = action_target(event);
    const action = target?.getAttribute("data-hosted-action");
    if (target === undefined || action === null) return;
    if (action === "toggle-suite") {
      const suite = target.getAttribute("data-hosted-suite");
      if (suite !== null) set_expanded(suite, !(suites.get(suite)?.expanded ?? false));
      return;
    }
    if (action !== "view" && action !== "copy") return;
    const caseKey = target.getAttribute("data-case-key");
    if (caseKey === null) return;
    const button = actionHandles.get(action_handle_key(caseKey, action));
    if (button !== undefined) void run_case_action(button, action, caseKey);
  });

  function show_error(message: string): void {
    if (disposed) return;
    root.create.div().classlist.set("hosted-case-error").text.set(`error: ${message}`);
    liveTreesConstructed += 1;
  }

  return Object.freeze({
    ingest(update: HostedTestPanelReportUpdate) {
      if (disposed) return;
      for (const suiteRun of [...(update.changedSuites ?? update.report.suiteRuns)].sort((left, right) => left.order - right.order)) {
        const existing = suites.get(suiteRun.id);
        if (existing !== undefined && existing.lastSequence === suiteRun.lastSequence) continue;
        const presentation = hosted_test_suite_presentation(suiteRun);
        const state = ensure_suite(suiteRun.id, suiteRun.title, presentation.group);
        state.lastSequence = suiteRun.lastSequence;
        state.presentation = presentation;
        state.status = suiteRun.status;
        state.executionShape = suiteRun.executionShape;
        state.declaredChecks = suiteRun.declaredChecks;
        state.counts = suiteRun.counts;
        state.ms = suiteRun.ms ?? undefined;
        for (const plannedCase of suiteRun.cases) {
          let projected = caseRecords.get(plannedCase.id);
          if (projected === undefined) {
            projected = {
              key: plannedCase.id,
              suite: suiteRun.id,
              caseId: plannedCase.caseId,
              name: plannedCase.title,
              status: plannedCase.status,
              ms: plannedCase.ms,
              err: plannedCase.err,
            };
            caseRecords.set(projected.key, projected);
            state.cases.push(projected);
            if (state.expanded) append_case(state, projected);
          } else {
            projected.status = plannedCase.status;
            projected.ms = plannedCase.ms;
            projected.err = plannedCase.err;
            update_case_view(projected);
          }
        }
        state.pass = state.cases.filter((item) => item.status === "pass").length;
        state.fail = state.cases.filter((item) => item.status === "fail").length;
        state.skip = state.cases.filter((item) => item.status === "skip").length;
        dirtySuites.add(state.suite);
        if (state.expanded) render_presentation_details(state);
        else if (presentation.failures.length > 0) set_expanded(state.suite, true);
      }
      schedule_render();
      if (update.terminal) flush();
    },
    suite_count() {
      return suites.size;
    },
    set_expanded,
    show_error,
    flush,
    action_handle(caseKey, action) {
      return actionHandles.get(action_handle_key(caseKey, action));
    },
    snapshot() {
      const caseKeysBySuite: Record<string, readonly string[]> = {};
      const summariesBySuite: Record<string, string> = {};
      const statusesBySuite: Record<string, string> = {};
      const failureKindsBySuite: Record<string, readonly string[]> = {};
      const evidenceSectionsBySuite: Record<string, readonly string[]> = {};
      for (const [suite, state] of suites) caseKeysBySuite[suite] = Object.freeze(state.cases.map((testCase) => testCase.key));
      for (const [suite, state] of suites) {
        statusesBySuite[suite] = state.status;
        summariesBySuite[suite] = suite_summary(state);
        failureKindsBySuite[suite] = Object.freeze(state.presentation?.failures.map((failure) => failure.kind) ?? []);
        evidenceSectionsBySuite[suite] = Object.freeze(state.presentation?.evidence.map((section) => section.key) ?? []);
      }
      const expandedSuites = Object.freeze([...suites.values()].filter((state) => state.expanded).map((state) => state.suite));
      return Object.freeze({
        suites: suites.size,
        cases: caseRecords.size,
        launchers: [...suites.values()].filter((state) => state.executionShape === "opaque-aggregate").length,
        summariesBySuite: Object.freeze(summariesBySuite),
        statusesBySuite: Object.freeze(statusesBySuite),
        groupOrder: Object.freeze([...subjectGroups.keys()]),
        suiteOrder: Object.freeze([...suites.keys()]),
        failureKindsBySuite: Object.freeze(failureKindsBySuite),
        evidenceSectionsBySuite: Object.freeze(evidenceSectionsBySuite),
        expandedSuites,
        caseKeysBySuite: Object.freeze(caseKeysBySuite),
        metrics: Object.freeze({
          suiteRowsCreated,
          caseRowsCreated,
          visibleCaseRows,
          liveCaseTrees,
          actionHandleEntries: actionHandles.size,
          listenerRegistrations: disposed ? 0 : 1,
          liveTreesConstructed,
          cssSurfaceAccesses: 1,
          modelCaseRecords: caseRecords.size,
          syntheticEvents: 0,
          fullCaseFlattens: 0,
          renderPasses,
          expandedSuites: expandedSuites.length,
        }),
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      cancelFrame?.();
      cancelFrame = undefined;
      actionListener.off();
      for (const state of suites.values()) state.caseHost = undefined;
      suites.clear();
      subjectGroups.clear();
      caseRecords.clear();
      actionHandles.clear();
      dirtySuites.clear();
      visibleCaseRows = 0;
      liveCaseTrees = 0;
      root.remove();
    },
  });
}
