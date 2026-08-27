import type { LiveTree } from "hson-live/livetree";
import { OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { _fontSize } from "../../../core/consts/ui-consts";
import { mount_hosted_case_report } from "./hosted-test-report-view";
import {
  FROZEN_TEST_EXPLORER_CATEGORIES,
  frozen_test_explorer_category,
  make_frozen_test_evidence_client,
  project_frozen_test_explorer,
  type FrozenRowArtifact,
  type FrozenRowEvidenceSelection,
  type FrozenTestEvidenceClient,
  type FrozenTestEvidenceIndex,
  type FrozenTestSuite,
} from "./frozen-test-evidence-client";
import {
  format_frozen_evidence_size,
  format_frozen_test_duration,
  mount_frozen_generic_evidence,
  serialize_frozen_index_summary,
  serialize_frozen_row_artifact,
} from "./frozen-test-presentation";

export type FrozenTestPanelSnapshot = Readonly<{
  state: "loading" | "ready" | "error";
  categories: number;
  suites: number;
  cases: number;
  evidenceRequests: number;
  renderedCases: number;
  retainedRowArtifacts: number;
}>;

export type FrozenTestPanel = Readonly<{
  branch: LiveTree;
  ready: Promise<FrozenTestEvidenceIndex | undefined>;
  snapshot(): FrozenTestPanelSnapshot;
  deactivate(): void;
  dispose(): void;
}>;

const STYLES = Object.freeze({
  root: { position: "relative", width: "100%", height: "100%", overflow: "auto", fontFamily: "DM Mono, monospace", fontSize: _fontSize.wee },
  notice: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: "10px", padding: "12px 10px", color: OKLCH_VIBRANT.ghost, fontSize: ".76rem", fontWeight: "600", background: OKLCH_VIBRANT.voidInk, borderTop: `1px solid ${OKLCH_VIBRANT.graphite}`, borderBottom: `1px solid ${OKLCH_VIBRANT.cyanGlass}` },
  error: { padding: "12px 8px", color: OKLCH_VIBRANT.redSignal, border: `1px solid ${OKLCH_VIBRANT.redOxide}`, whiteSpace: "pre-wrap" },
  category: { borderBottom: `1px solid ${OKLCH_VIBRANT.graphite}` },
  categoryHeading: { padding: "9px 8px 5px", color: OKLCH_VIBRANT.cyanGlass, letterSpacing: ".08em", textTransform: "uppercase" },
  categorySummary: { marginLeft: "10px", color: OKLCH_VIBRANT.ghost, letterSpacing: "normal", textTransform: "none" },
  suite: { borderTop: `1px solid ${OKLCH_VIBRANT.graphite}` },
  suiteRow: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,auto)", gap: "8px", alignItems: "center", padding: "7px 8px", color: OKLCH_VIBRANT.cyanGlass },
  suiteRowEvidence: { gridTemplateColumns: "80px minmax(0,1fr) minmax(300px,auto)" },
  suiteIdentity: { display: "flex", gap: "7px", alignItems: "center", minWidth: "0", overflowWrap: "anywhere" },
  suiteDisclosure: { flex: "0 0 12px", color: OKLCH_VIBRANT.cyanGlass, transform: "rotate(0deg)", transformOrigin: "center", transition: "transform 120ms ease" },
  suiteTitle: { color: OKLCH_VIBRANT.ghost, marginLeft: "8px" },
  summary: { color: OKLCH_VIBRANT.ghost, whiteSpace: "nowrap", textAlign: "right" },
  duration: { color: OKLCH_VIBRANT.graphite, textAlign: "right", whiteSpace: "nowrap" },
  rowSummary: { display: "grid", gridTemplateColumns: "minmax(8ch,1fr) minmax(8ch,1fr) minmax(8ch,1fr) 72px", gap: "10px", alignItems: "center", minWidth: "300px", fontVariantNumeric: "tabular-nums" },
  metric: { textAlign: "right", whiteSpace: "nowrap" },
  failed: { color: OKLCH_VIBRANT.redSignal },
  caseRow: { display: "grid", gridTemplateColumns: "80px minmax(0,1fr) minmax(120px,auto)", gap: "8px", minHeight: "27px", alignItems: "center", padding: "3px 8px", borderTop: `1px solid ${OKLCH_VIBRANT.graphite}`, color: OKLCH_VIBRANT.ghost },
  caseIdentity: { display: "flex", gap: "8px", alignItems: "center", minWidth: "0", paddingLeft: "18px", overflowWrap: "anywhere" },
  caseSummary: { display: "grid", gridTemplateColumns: "minmax(8ch,1fr) minmax(8ch,1fr) minmax(8ch,1fr) 72px", gap: "10px", alignItems: "center", minWidth: "300px", fontVariantNumeric: "tabular-nums" },
  caseStatus: { gridColumn: "1 / 4", textAlign: "right" },
  casePass: { color: OKLCH_VIBRANT.fernStatic },
  caseFail: { color: OKLCH_VIBRANT.redSignal },
  caseSkip: { color: OKLCH_VIBRANT.yellowBrass },
  actions: { display: "grid", gridTemplateColumns: "30px 42px", gap: "4px", alignItems: "center", justifyContent: "start", color: OKLCH_VIBRANT.graphite, whiteSpace: "nowrap" },
  action: { color: OKLCH_VIBRANT.cyanGlass, background: "transparent", border: "0", padding: "2px", cursor: "pointer", font: "inherit", textAlign: "left" },
  evidenceName: { color: "inherit", background: "transparent", border: "0", padding: "0", cursor: "pointer", font: "inherit", textAlign: "left", textDecoration: "none" },
  evidenceSize: { textAlign: "center" },
  rowError: { gridColumn: "1 / -1", color: OKLCH_VIBRANT.redSignal, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
} as const);

type RowAction = "view" | "copy";
type Surface = Readonly<{ dispose(): void }>;
const EVIDENCE_PARAM = "evidence";
const CASE_PARAM = "case";
const SUITE_PARAM = "suite";
const FROZEN_HISTORY_MARKER = "hsonFrozenInspectorEntry";

function row_selection(suite: FrozenTestSuite, testCase?: FrozenTestSuite["cases"][number]): FrozenRowEvidenceSelection {
  return Object.freeze({ category: suite.category, suite, ...(testCase === undefined ? {} : { testCase }), reference: (testCase?.evidence ?? suite.evidence)! });
}

function append_actions(row: LiveTree, label: string, selection: FrozenRowEvidenceSelection | undefined, onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void): void {
  if (selection === undefined || selection.reference.available !== true || selection.reference.rawBytes === undefined) return;
  const controls = row.create.span().classlist.set("frozen-test-actions").attrs.set("data-testid", "frozen-row-actions");
  const reference = selection.reference;
  const rawBytes = reference.rawBytes;
  if (rawBytes === undefined) return;
  controls.attrs.set("data-frozen-actions", "available");
  const copy = controls.create.button().classlist.set("frozen-test-action").attrs.setMany({ type: "button", "data-frozen-action": "copy", "aria-label": `Copy evidence for ${label}` }).text.set("Copy");
  controls.create.span().classlist.set("frozen-test-evidence-size").attrs.set("data-testid", "frozen-evidence-size").text.set(format_frozen_evidence_size(rawBytes));
  copy.listen.stopProp().onClick(() => onAction("copy", selection, row, copy));
}

function mount_case_rows(
  suiteGroup: LiveTree,
  suite: FrozenTestSuite,
  onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void,
): LiveTree {
  const rows = suiteGroup.create.div().classlist.set("frozen-test-case-rows").attrs.setMany({
    "data-testid": "frozen-suite-case-rows",
    "data-frozen-suite-case-rows": suite.id,
  });
  for (const item of [...suite.cases].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
    const caseRow = rows.create.div().classlist.set("frozen-test-case-row").attrs.setMany({
      "data-testid": "frozen-case-row", "data-frozen-case": item.id, "data-frozen-suite-id": suite.id,
      "data-frozen-status": item.status, "data-frozen-evidence": item.evidence?.available === true ? "available" : "absent",
    });
    const caseSelection = item.evidence?.available === true ? row_selection(suite, item) : undefined;
    if (caseSelection !== undefined) append_actions(caseRow, item.title, caseSelection, onAction);
    else caseRow.classlist.add("has-no-evidence");
    const identity = caseRow.create.span().classlist.set("frozen-test-case-identity");
    const title = caseSelection === undefined
      ? identity.create.span().text.set(item.title)
      : identity.create.button().attrs.setMany({ type: "button", "data-frozen-action": "view", "aria-label": `Open evidence for ${item.title}` }).text.set(item.title);
    if (caseSelection !== undefined) {
      title.classlist.add("frozen-test-evidence-name");
      title.listen.stopProp().onClick(() => onAction("view", caseSelection, caseRow, title));
    }
    identity.create.span().css.setMany({ color: OKLCH_VIBRANT.graphite, fontSize: ".66rem" }).text.set(item.caseId);
    const caseSummary = caseRow.create.span().classlist.set("frozen-test-case-summary");
    caseSummary.create.span().classlist.set(`frozen-test-status frozen-test-case-status-cell is-${item.status}`).text.set(item.status.toUpperCase());
    caseSummary.create.span().classlist.set("frozen-test-duration").text.set(format_frozen_test_duration(item.timing));
  }
  return rows;
}

function render_index(
  branch: LiveTree,
  index: FrozenTestEvidenceIndex,
  onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void,
  onCopyReports: (control: LiveTree) => void,
  onRenderedCases: (delta: number) => void,
): void {
  branch.empty();
  const projection = project_frozen_test_explorer(index);
  const notice = branch.create.div().classlist.set("frozen-test-notice").attrs.set("data-testid", "frozen-test-summary");
  const summary = notice.create.span();
  summary.create.span().text.set(`${projection.overall.suites} suites · ${projection.overall.cases} cases · `);
  summary.create.span().text.set(`${projection.overall.pass} pass`).css.set.color(OKLCH_VIBRANT.fernStatic);
  summary.create.span().text.set(" · ");
  summary.create.span().text.set(`${projection.overall.fail} fail`).css.set.color(projection.overall.fail === 0 ? OKLCH_VIBRANT.ghost : OKLCH_VIBRANT.redSignal);
  summary.create.span().text.set(` · ${index.deployment.hsonDeployCommit.slice(0, 10)}`).css.set.color(OKLCH_VIBRANT.ghost);
  const copyReports = notice.create.button().classlist.set("frozen-test-action").attrs.setMany({ type: "button", "data-testid": "frozen-copy-reports", "aria-label": "Copy Reports" }).text.set("Copy Reports");
  copyReports.listen.onClick(() => onCopyReports(copyReports));

  for (const categoryId of FROZEN_TEST_EXPLORER_CATEGORIES) {
    const suites = index.suites.filter((suite) => frozen_test_explorer_category(suite) === categoryId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const totals = projection.categories[categoryId];
    const captureStatus = index.categories.find((category) => category.id === categoryId)?.status;
    const unexecuted = suites.length === 0 && captureStatus === "cancelled";
    const status = unexecuted ? "UNEXECUTED" : suites.some((suite) => suite.status === "fail") ? "FAIL" : suites.some((suite) => suite.status === "skip") ? "SKIP" : "PASS";
    const durationMs = suites.reduce((total, suite) => total + (suite.timing.ms ?? suite.timing.durationMs ?? 0), 0);
    const group = branch.create.details().classlist.set("frozen-test-category").attrs.setMany({ "data-frozen-category": categoryId, "data-testid": `frozen-category-${categoryId}` });
    const heading = group.create.summary().classlist.set("frozen-test-category-heading");
    heading.create.span().text.set(categoryId);
    heading.create.span().classlist.set("frozen-test-category-summary").text.set(`${status} · ${totals.suites} suites · ${totals.cases} cases · ${totals.pass} pass · ${totals.fail} fail · ${unexecuted ? "—" : format_frozen_test_duration({ ms: durationMs })}`);
    for (const suite of suites) {
      const expandable = suite.cases.length > 0;
      const suiteGroup = expandable
        ? group.create.details().classlist.set("frozen-test-suite").attrs.setMany({ "data-frozen-suite": suite.id, "data-frozen-status": suite.status, "data-frozen-expandable": "true" })
        : group.create.div().classlist.set("frozen-test-suite").attrs.setMany({ "data-frozen-suite": suite.id, "data-frozen-status": suite.status, "data-frozen-expandable": "false" });
      const row = (expandable ? suiteGroup.create.summary() : suiteGroup.create.div()).classlist.set("frozen-test-suite-row").attrs.set("data-testid", "frozen-suite-row");
      if (suite.status === "fail") row.classlist.add("is-fail");
      const suiteSelection = suite.evidence?.available === true ? row_selection(suite) : undefined;
      if (suiteSelection !== undefined) {
        row.classlist.add("has-evidence");
        append_actions(row, suite.title, suiteSelection, onAction);
      }
      const identity = row.create.span().classlist.set("frozen-test-suite-identity");
      if (expandable) identity.create.span().classlist.set("frozen-test-suite-disclosure").attrs.setMany({ "aria-hidden": "true", "data-testid": "frozen-suite-disclosure" }).text.set("›");
      const name = suiteSelection === undefined
        ? identity.create.span().text.set(suite.id)
        : identity.create.button().attrs.setMany({ type: "button", "data-frozen-action": "view", "aria-label": `Open evidence for ${suite.title}` }).text.set(suite.id);
      if (suiteSelection !== undefined) {
        name.classlist.add("frozen-test-evidence-name");
        name.listen.stopProp().onClick(() => onAction("view", suiteSelection, row, name));
      }
      identity.create.span().classlist.set("frozen-test-suite-title").text.set(suite.title);
      const suiteSummary = row.create.span().classlist.set("frozen-test-row-summary");
      suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.counts.passed} pass`);
      suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.counts.failed} fail`);
      suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.counts.skipped} skip`);
      suiteSummary.create.span().classlist.set("frozen-test-duration").text.set(format_frozen_test_duration(suite.timing));
      if (expandable) {
        let caseRows: LiveTree | undefined;
        suiteGroup.listen.on("toggle", (event: Event) => {
          const open = event.currentTarget instanceof HTMLDetailsElement && event.currentTarget.open;
          if (open && caseRows === undefined) {
            caseRows = mount_case_rows(suiteGroup, suite, onAction);
            onRenderedCases(suite.cases.length);
          } else if (!open && caseRows !== undefined) {
            caseRows.remove();
            caseRows = undefined;
            onRenderedCases(-suite.cases.length);
          }
        });
      }
    }
  }
}

export function mount_frozen_test_panel(host: LiveTree, options: Readonly<{ evidenceRoot?: string; client?: FrozenTestEvidenceClient }> = {}): FrozenTestPanel {
  const branch = host.create.div().id.set("test-panel-branch").attrs.setMany({
    "data-testid": "frozen-test-panel", "data-test-acquisition": "frozen", "data-frozen-panel-state": "loading", "data-hosted-execution-count": "0",
    "data-frozen-rendered-case-count": "0", "data-frozen-retained-row-artifacts": "0",
  });
  branch.css.setMany(STYLES.root);
  branch.css.selector("& .frozen-test-notice").setMany(STYLES.notice);
  branch.css.selector("& .frozen-test-error").setMany(STYLES.error);
  branch.css.selector("& .frozen-test-category").setMany(STYLES.category);
  branch.css.selector("& .frozen-test-category-heading").setMany(STYLES.categoryHeading);
  branch.css.selector("& .frozen-test-category-summary").setMany(STYLES.categorySummary);
  branch.css.selector("& .frozen-test-suite").setMany(STYLES.suite);
  branch.css.selector("& .frozen-test-suite-row").setMany(STYLES.suiteRow);
  branch.css.selector("& .frozen-test-suite-row.has-evidence").setMany(STYLES.suiteRowEvidence);
  branch.css.selector("& summary.frozen-test-suite-row::-webkit-details-marker").set.display("none");
  branch.css.selector("& .frozen-test-suite-identity").setMany(STYLES.suiteIdentity);
  branch.css.selector("& .frozen-test-suite-disclosure").setMany(STYLES.suiteDisclosure);
  branch.css.selector("& .frozen-test-suite[open] > .frozen-test-suite-row .frozen-test-suite-disclosure").set.transform("rotate(90deg)");
  branch.css.selector("& .frozen-test-suite-title").setMany(STYLES.suiteTitle);
  branch.css.selector("& .frozen-test-suite-summary").setMany(STYLES.summary);
  branch.css.selector("& .frozen-test-row-summary").setMany(STYLES.rowSummary);
  branch.css.selector("& .frozen-test-metric").setMany(STYLES.metric);
  branch.css.selector("& .frozen-test-duration").setMany(STYLES.duration);
  branch.css.selector("& .frozen-test-suite-row.is-fail").setMany(STYLES.failed);
  branch.css.selector("& .frozen-test-case-row").setMany(STYLES.caseRow);
  branch.css.selector("& .frozen-test-case-identity").setMany(STYLES.caseIdentity);
  branch.css.selector("& .frozen-test-case-row.has-no-evidence > .frozen-test-case-identity").set.gridColumn("2");
  branch.css.selector("& .frozen-test-case-summary").setMany(STYLES.caseSummary);
  branch.css.selector("& .frozen-test-case-status-cell").setMany(STYLES.caseStatus);
  branch.css.selector("& .frozen-test-status.is-pass").setMany(STYLES.casePass);
  branch.css.selector("& .frozen-test-status.is-fail").setMany(STYLES.caseFail);
  branch.css.selector("& .frozen-test-status.is-skip").setMany(STYLES.caseSkip);
  branch.css.selector("& .frozen-test-actions").setMany(STYLES.actions);
  branch.css.selector("& .frozen-test-action").setMany(STYLES.action);
  branch.css.selector("& .frozen-test-evidence-name").setMany(STYLES.evidenceName);
  branch.css.selector("& .frozen-test-evidence-size").setMany(STYLES.evidenceSize);
  branch.css.selector("& .frozen-test-row-error").setMany(STYLES.rowError);

  branch.create.div().classlist.set("frozen-test-notice").text.set("Loading test reports…");
  let state: FrozenTestPanelSnapshot["state"] = "loading";
  let index: FrozenTestEvidenceIndex | undefined;
  let disposed = false;
  let surface: Surface | undefined;
  let activeInspectorKey: string | undefined;
  let pendingInspectorKey: string | undefined;
  let navigationRevision = 0;
  let renderedCases = 0;
  let client: FrozenTestEvidenceClient;
  try {
    client = options.client ?? make_frozen_test_evidence_client({ ...(options.evidenceRoot === undefined ? {} : { root: options.evidenceRoot }) });
  } catch (cause) {
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    branch.empty();
    branch.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" }).text.set(cause instanceof Error ? cause.message : String(cause));
    return Object.freeze({
      branch,
      ready: Promise.resolve(undefined),
      snapshot: () => Object.freeze({ state, categories: 0, suites: 0, cases: 0, evidenceRequests: 0, renderedCases: 0, retainedRowArtifacts: 0 }),
      deactivate: () => undefined,
      dispose: () => { if (!disposed) { disposed = true; branch.remove(); } },
    });
  }

  const sync_client_state = (): void => {
    const snapshot = client.snapshot();
    branch.attrs.setMany({
      "data-frozen-row-evidence-requests": String(snapshot.rowEvidenceRequests),
      "data-frozen-retained-row-artifacts": String(snapshot.retainedRowArtifacts),
    });
  };

  const show_row_error = (row: LiveTree, cause: unknown): void => {
    row.attrs.set("data-frozen-row-state", "error");
    row.find.byClass("frozen-test-row-error")?.remove();
    row.create.span().classlist.set("frozen-test-row-error").attrs.setMany({ role: "alert", "data-testid": "frozen-row-evidence-error" }).text.set(`Test evidence could not be loaded. ${cause instanceof Error ? cause.message : String(cause)}`);
  };

  const selection_key = (selection: FrozenRowEvidenceSelection): string => selection.testCase === undefined
    ? `suite:${selection.suite.id}`
    : `case:${selection.testCase.id}`;
  const selection_from_url = (loaded: FrozenTestEvidenceIndex): FrozenRowEvidenceSelection | undefined => {
    const url = new URL(location.href);
    if (url.searchParams.get(EVIDENCE_PARAM) !== loaded.deployment.hsonDeployCommit) return undefined;
    const caseId = url.searchParams.get(CASE_PARAM);
    const suiteId = url.searchParams.get(SUITE_PARAM);
    if ((caseId === null) === (suiteId === null)) return undefined;
    if (caseId !== null) {
      for (const suite of loaded.suites) {
        const testCase = suite.cases.find((item) => item.id === caseId);
        if (testCase?.evidence?.available === true) return row_selection(suite, testCase);
      }
      return undefined;
    }
    const suite = loaded.suites.find((item) => item.id === suiteId);
    return suite?.evidence?.available === true ? row_selection(suite) : undefined;
  };
  const inspector_url = (loaded: FrozenTestEvidenceIndex, selection?: FrozenRowEvidenceSelection): URL => {
    const url = new URL(location.href);
    url.searchParams.delete(EVIDENCE_PARAM);
    url.searchParams.delete(CASE_PARAM);
    url.searchParams.delete(SUITE_PARAM);
    if (selection !== undefined) {
      url.searchParams.set(EVIDENCE_PARAM, loaded.deployment.hsonDeployCommit);
      url.searchParams.set(selection.testCase === undefined ? SUITE_PARAM : CASE_PARAM, selection.testCase?.id ?? selection.suite.id);
    }
    return url;
  };
  const close_surface = (): void => {
    navigationRevision += 1;
    surface?.dispose();
    surface = undefined;
    client.releaseRowEvidence();
    activeInspectorKey = undefined;
    pendingInspectorKey = undefined;
    branch.attrs.set("data-frozen-inspector-state", "closed");
    branch.attrs.drop("data-frozen-inspector-key");
    sync_client_state();
  };
  const close_from_control = (): void => {
    const state = history.state as Readonly<Record<string, unknown>> | null;
    if (state?.[FROZEN_HISTORY_MARKER] === true) {
      history.back();
      return;
    }
    if (index !== undefined) {
      history.replaceState(state, "", inspector_url(index));
      void reconcile_location();
      return;
    }
    close_surface();
  };
  const mount_surface = (artifact: FrozenRowArtifact): Surface => artifact.owner === "case" && artifact.diagnostic !== null
    ? mount_hosted_case_report(branch, artifact.diagnostic, { archiveNavigation: true, onClose: close_from_control })
    : mount_frozen_generic_evidence(branch, artifact, { onClose: close_from_control });
  const open_selection = async (
    selection: FrozenRowEvidenceSelection,
    row?: LiveTree,
    control?: LiveTree,
  ): Promise<void> => {
    const revision = ++navigationRevision;
    const key = selection_key(selection);
    surface?.dispose();
    surface = undefined;
    client.releaseRowEvidence();
    activeInspectorKey = undefined;
    pendingInspectorKey = key;
    branch.attrs.setMany({ "data-frozen-inspector-state": "loading", "data-frozen-inspector-key": key });
    if (control !== undefined) control.flags.set("disabled");
    row?.attrs.set("data-frozen-row-state", "loading");
    try {
      const artifact = await client.loadRowEvidence(selection);
      if (disposed || revision !== navigationRevision) return;
      surface = mount_surface(artifact);
      activeInspectorKey = key;
      pendingInspectorKey = undefined;
      branch.attrs.setMany({ "data-frozen-inspector-state": "open", "data-frozen-inspector-key": key });
      row?.attrs.set("data-frozen-row-state", "ready");
    } catch (cause) {
      if (!disposed && revision === navigationRevision) {
        client.releaseRowEvidence(selection.reference.path);
        pendingInspectorKey = undefined;
        branch.attrs.set("data-frozen-inspector-state", "error");
        if (row !== undefined) show_row_error(row, cause);
      }
    } finally {
      if (!disposed) {
        sync_client_state();
        control?.flags.clear("disabled");
      }
    }
  };
  const reconcile_location = (row?: LiveTree, control?: LiveTree): Promise<void> => {
    if (disposed || index === undefined) return Promise.resolve();
    const selection = selection_from_url(index);
    if (selection === undefined) {
      close_surface();
      return Promise.resolve();
    }
    const key = selection_key(selection);
    if (key === activeInspectorKey || key === pendingInspectorKey) return Promise.resolve();
    return open_selection(selection, row, control);
  };
  const popstateListener = (): void => { void reconcile_location(); };
  window.addEventListener("popstate", popstateListener);

  const onAction = async (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree): Promise<void> => {
    row.find.byClass("frozen-test-row-error")?.remove();
    row.attrs.set("data-frozen-row-state", "loading");
    control.flags.set("disabled");
    try {
      if (action === "view") {
        if (index !== undefined) {
          const selected = selection_from_url(index);
          if (selected === undefined || selection_key(selected) !== selection_key(selection)) {
            const previous = typeof history.state === "object" && history.state !== null ? history.state as Record<string, unknown> : {};
            history.pushState({ ...previous, [FROZEN_HISTORY_MARKER]: true }, "", inspector_url(index, selection));
          }
        }
        await reconcile_location(row, control);
        return;
      }
      const artifact: FrozenRowArtifact = await client.loadRowEvidence(selection);
      if (disposed) return;
      await navigator.clipboard.writeText(serialize_frozen_row_artifact(artifact));
      row.attrs.set("data-frozen-row-state", "ready");
    } catch (cause) {
      if (!disposed) show_row_error(row, cause);
    } finally {
      if (action === "copy") client.releaseRowEvidence(selection.reference.path);
      if (!disposed) {
        sync_client_state();
        control.flags.clear("disabled");
      }
    }
  };
  const onCopyReports = async (control: LiveTree): Promise<void> => {
    if (index === undefined) return;
    control.flags.set("disabled");
    try {
      await navigator.clipboard.writeText(serialize_frozen_index_summary(index));
      control.attrs.set("data-frozen-copy-state", "copied");
    } catch (cause) {
      control.attrs.set("data-frozen-copy-state", "error").attrs.set("title", cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!disposed) control.flags.clear("disabled");
    }
  };

  const ready = client.loadIndex().then((loaded) => {
    if (disposed) return undefined;
    index = loaded;
    render_index(
      branch,
      loaded,
      (action, selection, row, control) => { void onAction(action, selection, row, control); },
      (control) => { void onCopyReports(control); },
      (delta) => {
        renderedCases += delta;
        branch.attrs.set("data-frozen-rendered-case-count", String(renderedCases));
      },
    );
    state = "ready";
    const requests = client.snapshot();
    const projection = project_frozen_test_explorer(loaded);
    branch.attrs.setMany({
      "data-frozen-panel-state": "ready", "data-frozen-category-count": String(loaded.categories.length), "data-frozen-suite-count": String(loaded.suites.length),
      "data-frozen-case-count": String(projection.overall.cases), "data-frozen-index-requests": String(requests.indexRequests),
      "data-frozen-initial-evidence-requests": String(requests.rowEvidenceRequests), "data-frozen-row-evidence-requests": String(requests.rowEvidenceRequests),
    });
    void reconcile_location();
    return loaded;
  }).catch((cause: unknown) => {
    if (disposed) return undefined;
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    branch.empty();
    branch.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" }).text.set(`Test reports could not be loaded.\n${cause instanceof Error ? cause.message : String(cause)}`);
    return undefined;
  });

  return Object.freeze({
    branch,
    ready,
    snapshot: () => Object.freeze({
      state,
      categories: index?.categories.length ?? 0,
      suites: index?.suites.length ?? 0,
      cases: index === undefined ? 0 : project_frozen_test_explorer(index).overall.cases,
      evidenceRequests: client.snapshot().rowEvidenceRequests,
      renderedCases,
      retainedRowArtifacts: client.snapshot().retainedRowArtifacts,
    }),
    deactivate() {
      if (disposed) return;
      if (index !== undefined) history.replaceState(history.state, "", inspector_url(index));
      close_surface();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("popstate", popstateListener);
      close_surface();
      branch.remove();
    },
  });
}
