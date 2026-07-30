import type { LiveTree } from "hson-live/livetree";
import type { HostedTestCaseReport, HostedTestReport } from "../../hosted-test/hosted-test-report.types";
import type { HostedTestPanelReportUpdate } from "./hosted-test-panel-adapter";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

export type HostedTestCaseActions = Readonly<{
  view(caseKey: string): Promise<void>;
  copy(caseKey: string): Promise<void>;
}>;

export type HostedTestPanelProjectionMetrics = Readonly<{
  suiteRowsCreated: number;
  caseRowsCreated: number;
  visibleCaseRows: number;
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
  snapshot(): HostedTestPanelProjectionSnapshot;
  dispose(): void;
}>;

type SuiteProjection = {
  suite: string;
  cases: HostedTestCaseReport[];
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
  external?: HostedTestReport["externalResults"][string];
};

const PANEL_STYLES = Object.freeze({
  root: {
    width: "100%", height: "100%", overflow: "auto", fontFamily: "DM Mono, monospace", fontSize: "11px",
  },
  suiteGroup: { borderBottom: "1px solid rgba(125,216,207,.18)" },
  suiteRow: {
    appearance: "none", width: "100%", display: "grid", gridTemplateColumns: "18px minmax(0,1fr) auto 72px", alignItems: "center", gap: "8px", padding: "7px 8px", border: "0", background: "transparent", color: "#7dd8cf", font: "inherit", textAlign: "left", cursor: "pointer",
  },
  suiteRowHover: { background: "rgba(125,216,207,.06)" },
  suiteRowFocus: { outline: "1px solid #d7ff70", outlineOffset: "-1px" },
  disclosure: { color: "#d7ff70", textAlign: "center" },
  suiteName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
  caseName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
  let renderPasses = 0;
  let disposed = false;
  let generation = 0;
  let cancelFrame: (() => void) | undefined;
  const suites = new Map<string, SuiteProjection>();
  const caseKeys = new Set<string>();
  const dirtySuites = new Set<string>();

  const css = root.css;
  css.setMany(PANEL_STYLES.root);
  css.selector("& .hosted-suite-group").setMany(PANEL_STYLES.suiteGroup);
  css.selector("& .hosted-suite-row").setMany(PANEL_STYLES.suiteRow);
  css.selector("& .hosted-suite-row:hover").setMany(PANEL_STYLES.suiteRowHover);
  css.selector("& .hosted-suite-row:focus-visible").setMany(PANEL_STYLES.suiteRowFocus);
  css.selector("& .hosted-suite-disclosure").setMany(PANEL_STYLES.disclosure);
  css.selector("& .hosted-suite-name").setMany(PANEL_STYLES.suiteName);
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
  css.selector("& .hosted-case-duration").setMany(PANEL_STYLES.caseDuration);
  css.selector("& .hosted-case-actions").setMany(PANEL_STYLES.caseActions);
  css.selector("& .hosted-case-row:hover .hosted-case-actions").setMany(PANEL_STYLES.caseActionsVisible);
  css.selector("& .hosted-case-row:focus-within .hosted-case-actions").setMany(PANEL_STYLES.caseActionsVisible);
  css.selector("& .hosted-case-action").setMany(PANEL_STYLES.caseAction);
  css.selector("& .hosted-case-action:hover").setMany(PANEL_STYLES.caseActionHover);
  css.selector("& .hosted-case-action:focus-visible").setMany(PANEL_STYLES.caseActionHover);
  css.selector("& .hosted-case-error").setMany(PANEL_STYLES.error);
  css.selector("& .hosted-external-output").setMany(PANEL_STYLES.externalOutput);

  function ensure_suite(suite: string): SuiteProjection {
    const existing = suites.get(suite);
    if (existing !== undefined) return existing;
    const group = root.create.div().classlist.set("hosted-suite-group");
    const row = group.create.button().classlist.set("hosted-suite-row").attrs.setMany({
      type: "button",
      "data-hosted-action": "toggle-suite",
      "data-hosted-suite": suite,
      "aria-expanded": "false",
    });
    const disclosure = row.create.span().classlist.set("hosted-suite-disclosure").text.set("▸");
    row.create.span().classlist.set("hosted-suite-name").text.set(suite);
    const summary = row.create.span().classlist.set("hosted-suite-summary").text.set("0 cases");
    const duration = row.create.span().classlist.set("hosted-suite-duration").text.set("running");
    liveTreesConstructed += 6;
    suiteRowsCreated += 1;
    const created: SuiteProjection = {
      suite,
      cases: [],
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
    };
    suites.set(suite, created);
    dirtySuites.add(suite);
    return created;
  }

  function render_suite(state: SuiteProjection): void {
    state.summary.text.set(state.external === undefined
      ? `${state.cases.length} · ${state.pass} pass · ${state.fail} fail · ${state.skip} skip`
      : `${state.external.executableChecks} cases · ${state.external.status}`);
    state.duration.text.set(state.ms === undefined
      ? state.external?.status ?? "running"
      : format_hosted_test_duration(state.ms));
    if (state.fail > 0 || state.external?.status === "fail") state.row.classlist.add("is-failed");
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

  function append_case(state: SuiteProjection, testCase: HostedTestCaseReport): void {
    const caseHost = state.caseHost;
    if (caseHost === undefined) return;
    const row = caseHost.create.div().classlist.set("hosted-case-row").attrs.set("data-case-key", testCase.key);
    row.create.span().classlist.set(`hosted-case-status is-${testCase.status}`).text.set(testCase.status.toUpperCase());
    row.create.span().classlist.set("hosted-case-name").attrs.set("title", testCase.err ?? testCase.key).text.set(testCase.name);
    row.create.span().classlist.set("hosted-case-duration").text.set(format_hosted_test_duration(testCase.ms));
    const controls = row.create.span().classlist.set("hosted-case-actions");
    controls.create.button().classlist.set("hosted-case-action").attrs.setMany({
      type: "button", "data-hosted-action": "view", "data-case-key": testCase.key, "aria-label": `View report for ${testCase.name}`,
    }).text.set("view");
    controls.create.button().classlist.set("hosted-case-action").attrs.setMany({
      type: "button", "data-hosted-action": "copy", "data-case-key": testCase.key, "aria-label": `Copy report for ${testCase.name}`,
    }).text.set("copy");
    liveTreesConstructed += 7;
    caseRowsCreated += 1;
    visibleCaseRows += 1;
  }

  function render_external_output(state: SuiteProjection): void {
    const caseHost = state.caseHost;
    const external = state.external;
    if (caseHost === undefined || external === undefined) return;
    caseHost.empty();
    if (external.status === "queued" || external.status === "running") {
      caseHost.create.div().classlist.set("hosted-external-output").text.set(external.status);
      liveTreesConstructed += 1;
      return;
    }
    const lines = [
      `status: ${external.status}`,
      `exit: ${external.exitCode ?? "none"}${external.signal ? ` · signal ${external.signal}` : ""}${external.timedOut ? " · timeout" : ""}`,
      ...(external.stdout ? ["", "stdout:", external.stdout] : []),
      ...(external.stderr ? ["", "stderr:", external.stderr] : []),
      ...(external.spawnError ? ["", "spawn error:", external.spawnError] : []),
    ];
    caseHost.create.div().classlist.set("hosted-external-output").text.set(lines.join("\n"));
    liveTreesConstructed += 1;
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
      visibleCaseRows -= state.cases.length;
      return;
    }
    state.caseHost = state.group.create.div().classlist.set("hosted-case-block");
    liveTreesConstructed += 1;
    if (state.external !== undefined) {
      render_external_output(state);
      return;
    }
    for (const testCase of state.cases) append_case(state, testCase);
  }

  async function run_case_action(element: Element, action: "view" | "copy", caseKey: string): Promise<void> {
    const actionGeneration = generation;
    const quid = element.getAttribute("hson:quid");
    const button = quid === null ? undefined : root.find.byQuid(quid);
    button?.flags.set("disabled");
    button?.attrs.set("aria-busy", "true");
    button?.text.set("…");
    try {
      await actions[action](caseKey);
    } catch (error) {
      if (!disposed && generation === actionGeneration) show_error(error instanceof Error ? error.message : String(error));
    } finally {
      if (!disposed && generation === actionGeneration) {
        button?.attrs.drop("disabled");
        button?.attrs.drop("aria-busy");
        button?.text.set(action);
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
    if (caseKey !== null) void run_case_action(target, action, caseKey);
  });

  function show_error(message: string): void {
    if (disposed) return;
    root.create.div().classlist.set("hosted-case-error").text.set(`error: ${message}`);
    liveTreesConstructed += 1;
  }

  return Object.freeze({
    ingest(update: HostedTestPanelReportUpdate) {
      if (disposed) return;
      for (const external of Object.values(update.report.externalResults)) {
        const state = ensure_suite(external.suite);
        state.external = external;
        state.ms = external.status === "pass" || external.status === "fail" ? external.ms : undefined;
        dirtySuites.add(state.suite);
        if (state.expanded) render_external_output(state);
        else if (external.status === "fail") set_expanded(state.suite, true);
      }
      for (const testCase of update.newCases) {
        if (caseKeys.has(testCase.key)) continue;
        caseKeys.add(testCase.key);
        const state = ensure_suite(testCase.suite);
        state.cases.push(testCase);
        if (testCase.status === "pass") state.pass += 1;
        else if (testCase.status === "fail") state.fail += 1;
        else state.skip += 1;
        dirtySuites.add(state.suite);
        if (state.expanded) append_case(state, testCase);
      }
      for (const timing of update.newSuiteTimings) {
        const state = ensure_suite(timing.suite);
        state.ms = timing.ms;
        dirtySuites.add(state.suite);
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
    snapshot() {
      const caseKeysBySuite: Record<string, readonly string[]> = {};
      const summariesBySuite: Record<string, string> = {};
      const statusesBySuite: Record<string, string> = {};
      for (const [suite, state] of suites) caseKeysBySuite[suite] = Object.freeze(state.cases.map((testCase) => testCase.key));
      for (const [suite, state] of suites) {
        statusesBySuite[suite] = state.external?.status
          ?? (state.ms === undefined ? "running" : state.fail > 0 ? "fail" : "pass");
        summariesBySuite[suite] = state.external === undefined
          ? `${state.cases.length} · ${state.pass} pass · ${state.fail} fail · ${state.skip} skip`
          : `${state.external.executableChecks} cases · ${state.external.status}`;
      }
      const expandedSuites = Object.freeze([...suites.values()].filter((state) => state.expanded).map((state) => state.suite));
      return Object.freeze({
        suites: suites.size,
        cases: caseKeys.size,
        launchers: [...suites.values()].filter((state) => state.external !== undefined).length,
        summariesBySuite: Object.freeze(summariesBySuite),
        statusesBySuite: Object.freeze(statusesBySuite),
        expandedSuites,
        caseKeysBySuite: Object.freeze(caseKeysBySuite),
        metrics: Object.freeze({
          suiteRowsCreated,
          caseRowsCreated,
          visibleCaseRows,
          listenerRegistrations: disposed ? 0 : 1,
          liveTreesConstructed,
          cssSurfaceAccesses: 1,
          modelCaseRecords: caseKeys.size,
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
      caseKeys.clear();
      dirtySuites.clear();
      visibleCaseRows = 0;
      root.remove();
    },
  });
}
