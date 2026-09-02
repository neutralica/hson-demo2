import type { LiveTree } from "hson-live/livetree";
import { OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { _fontSize } from "../../../core/consts/ui-consts";
import {
  make_frozen_test_evidence_client,
  project_frozen_test_explorer,
  type FrozenRowArtifact,
  type FrozenRowEvidenceSelection,
  type FrozenTestEvidenceClient,
  type FrozenTestEvidenceIndex,
  type FrozenTestCategory,
  type FrozenTestCategoryListing,
  type FrozenTestExplorerCategoryId,
  type FrozenTestSuite,
  type FrozenTestSuiteListing,
  type FrozenSuiteArtifact,
} from "./frozen-test-evidence-client";
import {
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
  root: { position: "relative", width: "100%", height: "100%", overflow: "hidden", fontFamily: "DM Mono, monospace", fontSize: _fontSize.wee },
  browsing: { width: "100%", height: "100%", overflow: "auto", minWidth: "0", minHeight: "0" },
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
type SuiteController = Readonly<{ suite: FrozenTestSuite; load(openDisclosure?: boolean): Promise<FrozenTestSuiteListing | undefined>; close(): void }>;
type CategoryController = Readonly<{ category: FrozenTestCategory; load(openDisclosure?: boolean): Promise<FrozenTestCategoryListing | undefined>; close(): void; suites(): ReadonlyMap<string, SuiteController> }>;
type HierarchyController = Readonly<{ categories: ReadonlyMap<FrozenTestExplorerCategoryId, CategoryController>; dispose(): void; renderedSuites(): number }>;
const EVIDENCE_PARAM = "evidence";
const CATEGORY_PARAM = "category";
const CASE_PARAM = "case";
const SUITE_PARAM = "suite";
const FROZEN_HISTORY_MARKER = "hsonFrozenInspectorEntry";

function row_selection(suite: FrozenTestSuite, testCase: FrozenTestSuiteListing["cases"][number]): FrozenRowEvidenceSelection {
  return Object.freeze({ suite, testCase, reference: testCase.evidence });
}

function append_actions(row: LiveTree, label: string, selection: FrozenRowEvidenceSelection | undefined, onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void): void {
  if (selection === undefined) return;
  const controls = row.create.span().classlist.set("frozen-test-actions").attrs.set("data-testid", "frozen-row-actions");
  const reference = selection.reference;
  controls.attrs.set("data-frozen-actions", "available");
  const copy = controls.create.button().classlist.set("frozen-test-action").attrs.setMany({ type: "button", "data-frozen-action": "copy", "aria-label": `Copy evidence for ${label}` }).text.set("Copy");
  copy.listen.stopProp().onClick(() => onAction("copy", selection, row, copy));
}

function mount_case_rows(
  suiteGroup: LiveTree,
  suite: FrozenTestSuite,
  listing: FrozenTestSuiteListing,
  onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void,
): LiveTree {
  const rows = suiteGroup.create.div().classlist.set("frozen-test-case-rows").attrs.setMany({
    "data-testid": "frozen-suite-case-rows",
    "data-frozen-suite-case-rows": suite.id,
  });
  for (const item of listing.cases) {
    const caseRow = rows.create.div().classlist.set("frozen-test-case-row").attrs.setMany({
      "data-testid": "frozen-case-row", "data-frozen-case": item.id, "data-frozen-suite-id": suite.id,
      "data-frozen-status": item.status, "data-frozen-evidence": "available",
    });
    const caseSelection = row_selection(suite, item);
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
    caseSummary.create.span().classlist.set("frozen-test-duration").text.set(format_frozen_test_duration(item));
  }
  return rows;
}

function render_index(
  branch: LiveTree,
  index: FrozenTestEvidenceIndex,
  client: FrozenTestEvidenceClient,
  onAction: (action: RowAction, selection: FrozenRowEvidenceSelection, row: LiveTree, control: LiveTree) => void,
  onSuiteAction: (action: RowAction, artifact: FrozenSuiteArtifact, suite: FrozenTestSuite, row: LiveTree, control: LiveTree) => void,
  onCopyReports: (control: LiveTree) => void,
  onRenderedCases: (delta: number) => void,
  onDisclosureClose: (suiteId?: string) => void,
): HierarchyController {
  branch.empty();
  const projection = project_frozen_test_explorer(index);
  const notice = branch.create.div().classlist.set("frozen-test-notice").attrs.set("data-testid", "frozen-test-summary");
  const summary = notice.create.span();
  summary.create.span().text.set(`${projection.overall.suites} suites · ${projection.overall.cases} cases · `);
  summary.create.span().text.set(`${projection.overall.pass} pass`).css.set.color(OKLCH_VIBRANT.fernStatic);
  summary.create.span().text.set(" · ");
  summary.create.span().text.set(`${projection.overall.fail} fail`).css.set.color(projection.overall.fail === 0 ? OKLCH_VIBRANT.ghost : OKLCH_VIBRANT.redSignal);
  summary.create.span().text.set(` · ${index.status.toUpperCase()} · ${index.runId.slice(0, 8)}`).css.set.color(index.status === "pass" ? OKLCH_VIBRANT.fernStatic : OKLCH_VIBRANT.redSignal);
  if (index.diagnostics.length > 0) summary.create.span().text.set(` · ${index.diagnostics.length} run diagnostic${index.diagnostics.length === 1 ? "" : "s"}`).css.set.color(OKLCH_VIBRANT.yellowBrass);
  const repository = index.repositories[0];
  if (repository !== undefined) summary.create.span().text.set(` · ${repository.name} ${repository.revision?.slice(0, 10) ?? "revision unavailable"}${repository.dirty === null ? "" : repository.dirty ? " · dirty" : " · clean"}`).css.set.color(OKLCH_VIBRANT.ghost);
  const copyReports = notice.create.button().classlist.set("frozen-test-action").attrs.setMany({ type: "button", "data-testid": "frozen-copy-reports", "aria-label": "Copy Reports" }).text.set("Copy Reports");
  copyReports.listen.onClick(() => onCopyReports(copyReports));

  const controllers = new Map<FrozenTestExplorerCategoryId, CategoryController>();
  let renderedSuiteCount = 0;
  let hierarchyDisposed = false;
  for (const category of index.categories) {
    const categoryId = category.id;
    const totals = category.counts;
    const status = category.status.toUpperCase();
    const group = branch.create.details().classlist.set("frozen-test-category").attrs.setMany({ "data-frozen-category": categoryId, "data-testid": `frozen-category-${categoryId}` });
    const heading = group.create.summary().classlist.set("frozen-test-category-heading");
    heading.create.span().text.set(category.id);
    heading.create.span().classlist.set("frozen-test-category-summary").text.set(`${status} · ${totals.suites} suites · ${totals.cases} cases · ${totals.pass} pass · ${totals.fail} fail · ${totals.skip} skip · ${totals.unsupported} unsupported · ${totals.cancelled} cancelled · ${totals.error} error`);

    let categoryRevision = 0;
    let categoryListing: FrozenTestCategoryListing | undefined;
    let categoryContent: LiveTree | undefined;
    let categoryPending: Promise<FrozenTestCategoryListing | undefined> | undefined;
    const suiteControllers = new Map<string, SuiteController>();
    const close_category = (): void => {
      categoryRevision += 1;
      for (const controller of suiteControllers.values()) controller.close();
      renderedSuiteCount -= suiteControllers.size;
      suiteControllers.clear();
      categoryContent?.remove();
      categoryContent = undefined;
      categoryListing = undefined;
      categoryPending = undefined;
      group.attrs.set("data-frozen-category-state", "closed");
    };
    const load_category = (openDisclosure = false): Promise<FrozenTestCategoryListing | undefined> => {
      if (hierarchyDisposed) return Promise.resolve(undefined);
      if (openDisclosure) group.attrs.set("open", "");
      if (categoryListing !== undefined) return Promise.resolve(categoryListing);
      if (categoryPending !== undefined) return categoryPending;
      const revision = ++categoryRevision;
      group.attrs.set("data-frozen-category-state", "loading");
      categoryContent?.remove();
      categoryContent = group.create.div().classlist.set("frozen-test-category-content");
      categoryContent.create.div().classlist.set("frozen-test-category-summary").attrs.set("data-testid", "frozen-category-loading").text.set("Loading suites…");
      categoryPending = client.loadCategory(category).then((loaded) => {
        if (hierarchyDisposed || revision !== categoryRevision) return undefined;
        categoryListing = loaded;
        categoryContent?.empty();
        for (const suite of loaded.suites) {
          const expandable = true;
          const suiteGroup = expandable
            ? categoryContent!.create.details().classlist.set("frozen-test-suite").attrs.setMany({ "data-frozen-suite": suite.id, "data-frozen-status": suite.status, "data-frozen-expandable": "true" })
            : categoryContent!.create.div().classlist.set("frozen-test-suite").attrs.setMany({ "data-frozen-suite": suite.id, "data-frozen-status": suite.status, "data-frozen-expandable": "false" });
          const row = (expandable ? suiteGroup.create.summary() : suiteGroup.create.div()).classlist.set("frozen-test-suite-row").attrs.set("data-testid", "frozen-suite-row");
          if (suite.status === "fail") row.classlist.add("is-fail");
          let suiteCopy: LiveTree | undefined;
          {
            row.classlist.add("has-evidence");
            const controls = row.create.span().classlist.set("frozen-test-actions").attrs.setMany({ "data-testid": "frozen-row-actions", "data-frozen-actions": "available" });
            suiteCopy = controls.create.button().classlist.set("frozen-test-action").attrs.setMany({ type: "button", "data-frozen-action": "copy", "aria-label": `Copy evidence for ${suite.title}` }).text.set("Copy");
          }
          const identity = row.create.span().classlist.set("frozen-test-suite-identity");
          if (expandable) identity.create.span().classlist.set("frozen-test-suite-disclosure").attrs.setMany({ "aria-hidden": "true", "data-testid": "frozen-suite-disclosure" }).text.set("›");
          const name = identity.create.button().classlist.set("frozen-test-evidence-name").attrs.setMany({ type: "button", "data-frozen-action": "view", "aria-label": `Open report for ${suite.title}` }).text.set(suite.id);
          identity.create.span().classlist.set("frozen-test-suite-title").text.set(suite.title);
          const suiteSummary = row.create.span().classlist.set("frozen-test-row-summary");
          suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.counts.pass} pass`);
          suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.counts.fail} fail`);
          suiteSummary.create.span().classlist.set("frozen-test-suite-summary frozen-test-metric").text.set(`${suite.status.toUpperCase()}`);
          suiteSummary.create.span().classlist.set("frozen-test-duration").text.set(format_frozen_test_duration(suite));
          let suiteRevision = 0;
          let suiteListing: FrozenTestSuiteListing | undefined;
          let suiteRows: LiveTree | undefined;
          let suiteStatus: LiveTree | undefined;
          let suitePending: Promise<FrozenTestSuiteListing | undefined> | undefined;
          const close_suite = (): void => {
            suiteRevision += 1;
            if (suiteRows !== undefined && suiteListing !== undefined) onRenderedCases(-suiteListing.cases.length);
            suiteRows?.remove(); suiteRows = undefined;
            suiteStatus?.remove(); suiteStatus = undefined;
            suiteListing = undefined; suitePending = undefined;
            suiteGroup.attrs.set("data-frozen-suite-state", "closed");
            onDisclosureClose(suite.id);
          };
          const load_suite = (openDisclosure = false): Promise<FrozenTestSuiteListing | undefined> => {
            if (hierarchyDisposed || categoryListing === undefined) return Promise.resolve(undefined);
            if (openDisclosure && expandable) suiteGroup.attrs.set("open", "");
            if (suiteListing !== undefined) return Promise.resolve(suiteListing);
            if (suitePending !== undefined) return suitePending;
            const suiteLoadRevision = ++suiteRevision;
            suiteGroup.attrs.set("data-frozen-suite-state", "loading");
            suiteStatus?.remove();
            suiteStatus = suiteGroup.create.div().classlist.set("frozen-test-category-summary").attrs.set("data-testid", "frozen-suite-loading").text.set("Loading cases…");
            suitePending = client.loadSuite(suite).then((loadedSuite) => {
              if (hierarchyDisposed || revision !== categoryRevision || suiteLoadRevision !== suiteRevision) return undefined;
              suiteListing = loadedSuite;
              suiteStatus?.remove(); suiteStatus = undefined;
              if (expandable) {
                suiteRows = mount_case_rows(suiteGroup, suite, loadedSuite, onAction);
                onRenderedCases(loadedSuite.cases.length);
              }
              suiteGroup.attrs.set("data-frozen-suite-state", "ready");
              return loadedSuite;
            }).catch((cause: unknown) => {
              if (!hierarchyDisposed && revision === categoryRevision && suiteLoadRevision === suiteRevision) {
                suiteStatus?.text.set(`Cases could not be loaded. ${cause instanceof Error ? cause.message : String(cause)}`).classlist.add("frozen-test-row-error");
                suiteGroup.attrs.set("data-frozen-suite-state", "error");
              }
              return undefined;
            }).finally(() => { if (suiteLoadRevision === suiteRevision) suitePending = undefined; });
            return suitePending;
          };
          const suiteController: SuiteController = Object.freeze({ suite, load: load_suite, close: close_suite });
          suiteControllers.set(suite.id, suiteController);
          name.listen.stopProp().onClick(async () => {
            const loadedSuite = await load_suite();
            if (loadedSuite?.detail !== undefined) onSuiteAction("view", loadedSuite.detail, suite, row, name);
          });
          if (suiteCopy !== undefined) suiteCopy.listen.stopProp().onClick(async () => {
            const loadedSuite = await load_suite();
            if (loadedSuite?.detail !== undefined) onSuiteAction("copy", loadedSuite.detail, suite, row, suiteCopy!);
          });
        }
        renderedSuiteCount += loaded.suites.length;
        group.attrs.set("data-frozen-category-state", "ready");
        return loaded;
      }).catch((cause: unknown) => {
        if (!hierarchyDisposed && revision === categoryRevision) {
          categoryContent?.empty();
          categoryContent?.create.div().classlist.set("frozen-test-row-error").attrs.setMany({ role: "alert", "data-testid": "frozen-category-error" }).text.set(`Suites could not be loaded. ${cause instanceof Error ? cause.message : String(cause)}`);
          group.attrs.set("data-frozen-category-state", "error");
        }
        return undefined;
      }).finally(() => { if (revision === categoryRevision) categoryPending = undefined; });
      return categoryPending;
    };
    const controller: CategoryController = Object.freeze({ category, load: load_category, close: close_category, suites: () => suiteControllers });
    controllers.set(categoryId, controller);
  }
  return Object.freeze({
    categories: controllers,
    renderedSuites: () => renderedSuiteCount,
    dispose() { if (hierarchyDisposed) return; hierarchyDisposed = true; for (const controller of controllers.values()) controller.close(); controllers.clear(); },
  });
}

export function mount_frozen_test_panel(host: LiveTree, options: Readonly<{ evidenceRoot?: string; client?: FrozenTestEvidenceClient }> = {}): FrozenTestPanel {
  const branch = host.create.div().id.set("test-panel-branch").attrs.setMany({
    "data-testid": "frozen-test-panel", "data-test-acquisition": "frozen", "data-frozen-panel-state": "loading", "data-hosted-execution-count": "0",
    "data-frozen-rendered-case-count": "0", "data-frozen-retained-row-artifacts": "0",
  });
  branch.css.setMany(STYLES.root);
  const browsing = branch.create.div().classlist.set("frozen-test-browsing").attrs.set("data-testid", "frozen-test-browsing");
  browsing.css.setMany(STYLES.browsing);
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
  branch.css.selector("& .frozen-test-status.is-unsupported").setMany(STYLES.caseSkip);
  branch.css.selector("& .frozen-test-status.is-cancelled").setMany(STYLES.failed);
  branch.css.selector("& .frozen-test-status.is-error").setMany(STYLES.failed);
  branch.css.selector("& .frozen-test-actions").setMany(STYLES.actions);
  branch.css.selector("& .frozen-test-action").setMany(STYLES.action);
  branch.css.selector("& .frozen-test-evidence-name").setMany(STYLES.evidenceName);
  branch.css.selector("& .frozen-test-evidence-size").setMany(STYLES.evidenceSize);
  branch.css.selector("& .frozen-test-row-error").setMany(STYLES.rowError);

  browsing.create.div().classlist.set("frozen-test-notice").text.set("Loading test reports…");
  let state: FrozenTestPanelSnapshot["state"] = "loading";
  let index: FrozenTestEvidenceIndex | undefined;
  let disposed = false;
  let surface: Surface | undefined;
  let activeInspectorKey: string | undefined;
  let pendingInspectorKey: string | undefined;
  let navigationRevision = 0;
  let renderedCases = 0;
  let hierarchy: HierarchyController | undefined;
  let disclosureListener: Readonly<{ off(): void }> | undefined;
  let client: FrozenTestEvidenceClient;
  try {
    client = options.client ?? make_frozen_test_evidence_client({ ...(options.evidenceRoot === undefined ? {} : { root: options.evidenceRoot }) });
  } catch (cause) {
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    browsing.empty();
    browsing.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" }).text.set(cause instanceof Error ? cause.message : String(cause));
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

  const selection_key = (selection: FrozenRowEvidenceSelection): string => `case:${selection.testCase!.id}`;
  const inspector_url = (loaded: FrozenTestEvidenceIndex, target?: Readonly<{ suiteId: string; caseId?: string; categoryId?: FrozenTestExplorerCategoryId }>): URL => {
    const url = new URL(location.href);
    url.searchParams.delete(EVIDENCE_PARAM);
    url.searchParams.delete(CATEGORY_PARAM);
    url.searchParams.delete(CASE_PARAM);
    url.searchParams.delete(SUITE_PARAM);
    if (target !== undefined) {
      url.searchParams.set(EVIDENCE_PARAM, loaded.runId);
      if (target.categoryId !== undefined) url.searchParams.set(CATEGORY_PARAM, target.categoryId);
      if (target.suiteId !== "") url.searchParams.set(target.caseId === undefined ? SUITE_PARAM : CASE_PARAM, target.caseId ?? target.suiteId);
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
  const mount_surface = (artifact: FrozenRowArtifact): Surface => mount_frozen_generic_evidence(branch, artifact, { onClose: close_from_control, reportRoot: client.root });
  const open_artifact = (artifact: FrozenRowArtifact, key: string): void => {
    navigationRevision += 1;
    surface?.dispose();
    client.releaseRowEvidence();
    surface = mount_surface(artifact);
    activeInspectorKey = key;
    pendingInspectorKey = undefined;
    branch.attrs.setMany({ "data-frozen-inspector-state": "open", "data-frozen-inspector-key": key });
    sync_client_state();
  };
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
        client.releaseRowEvidence(selection.reference.file);
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
  const reconcile_location = async (row?: LiveTree, control?: LiveTree): Promise<void> => {
    if (disposed || index === undefined || hierarchy === undefined) return;
    const url = new URL(location.href);
    if (url.searchParams.get(EVIDENCE_PARAM) !== index.runId) { close_surface(); return; }
    const directCategory = url.searchParams.get(CATEGORY_PARAM);
    const directCase = url.searchParams.get(CASE_PARAM);
    const directSuite = url.searchParams.get(SUITE_PARAM);
    if (directCategory !== null && directCase === null && directSuite === null) {
      if (!hierarchy.categories.has(directCategory)) { close_surface(); return; }
      await hierarchy.categories.get(directCategory)?.load(true);
      close_surface();
      return;
    }
    if ((directCase === null) === (directSuite === null) || directCategory === null) { close_surface(); return; }
    let suiteId = directSuite;
    if (directCase !== null) {
      const separator = directCase.indexOf("::");
      if (separator <= 0 || separator !== directCase.lastIndexOf("::")) { close_surface(); return; }
      suiteId = directCase.slice(0, separator);
    }
    try {
      const categoryController = hierarchy.categories.get(directCategory);
      const categoryListing = await categoryController?.load(true);
      if (categoryListing === undefined || disposed) return;
      const suiteController = categoryController!.suites().get(suiteId!);
      const suiteListing = await suiteController?.load(true);
      if (suiteListing === undefined || disposed) return;
      if (directCase !== null) {
        const testCase = suiteListing.cases.find((item) => item.id === directCase);
        if (testCase === undefined) throw new Error(`Case ${directCase} has no detailed report.`);
        const selection = row_selection(suiteController!.suite, testCase);
        const key = selection_key(selection);
        if (key !== activeInspectorKey && key !== pendingInspectorKey) await open_selection(selection, row, control);
      } else if (suiteListing.detail !== undefined) {
        const key = `suite:${suiteId}`;
        if (key !== activeInspectorKey) open_artifact(suiteListing.detail, key);
      } else close_surface();
    } catch (cause) {
      close_surface();
      if (row !== undefined) show_row_error(row, cause);
      else branch.attrs.setMany({ "data-frozen-inspector-state": "error", title: cause instanceof Error ? cause.message : String(cause) });
    }
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
          const previous = typeof history.state === "object" && history.state !== null ? history.state as Record<string, unknown> : {};
          history.pushState({ ...previous, [FROZEN_HISTORY_MARKER]: true }, "", inspector_url(index, { suiteId: selection.suite.id, caseId: selection.testCase!.id, categoryId: selection.suite.category }));
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
      if (action === "copy") client.releaseRowEvidence(selection.reference.file);
      if (!disposed) {
        sync_client_state();
        control.flags.clear("disabled");
      }
    }
  };
  const onSuiteAction = async (action: RowAction, artifact: FrozenSuiteArtifact, suite: FrozenTestSuite, row: LiveTree, control: LiveTree): Promise<void> => {
    control.flags.set("disabled");
    try {
      if (action === "view") {
        if (index !== undefined) {
          const previous = typeof history.state === "object" && history.state !== null ? history.state as Record<string, unknown> : {};
          history.pushState({ ...previous, [FROZEN_HISTORY_MARKER]: true }, "", inspector_url(index, { suiteId: suite.id, categoryId: suite.category }));
        }
        await reconcile_location(row, control);
      } else await navigator.clipboard.writeText(serialize_frozen_row_artifact(artifact));
    } catch (cause) { if (!disposed) show_row_error(row, cause); }
    finally { if (!disposed) control.flags.clear("disabled"); }
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
    hierarchy = render_index(
      browsing,
      loaded,
      client,
      (action, selection, row, control) => { void onAction(action, selection, row, control); },
      (action, artifact, suite, row, control) => { void onSuiteAction(action, artifact, suite, row, control); },
      (control) => { void onCopyReports(control); },
      (delta) => {
        renderedCases += delta;
        branch.attrs.set("data-frozen-rendered-case-count", String(renderedCases));
      },
      (suiteId) => {
        if (suiteId === undefined || activeInspectorKey === `suite:${suiteId}` || activeInspectorKey?.startsWith(`case:${suiteId}::`) === true) {
          history.replaceState(history.state, "", inspector_url(loaded));
          close_surface();
        }
      },
    );
    const disclosureHandler = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("button, a, input, select, textarea") !== null) return;
      const summary = target?.closest("summary") ?? null;
      const details = summary?.parentElement;
      if (!(details instanceof HTMLDetailsElement)) return;
      const categoryId = details.getAttribute("data-frozen-category") as FrozenTestExplorerCategoryId | null;
      const suiteId = details.getAttribute("data-frozen-suite");
      if (categoryId === null && suiteId === null) return;
      const open = !details.open;
      event.preventDefault();
      details.open = open;
      globalThis.setTimeout(() => { if (details.isConnected) details.open = open; }, 0);
      if (disposed || hierarchy === undefined) return;
      if (categoryId !== null) {
        const controller = hierarchy.categories.get(categoryId);
        if (open) void controller?.load(); else controller?.close();
        return;
      }
      const owner = [...hierarchy.categories.values()].find(category => category.suites().has(suiteId!));
      const controller = owner?.suites().get(suiteId!);
      if (open) void controller?.load(); else controller?.close();
    };
    const branchElement = branch.dom.htmlEl();
    branchElement?.addEventListener("click", disclosureHandler, true);
    disclosureListener = Object.freeze({ off: () => branchElement?.removeEventListener("click", disclosureHandler, true) });
    state = "ready";
    const requests = client.snapshot();
    const projection = project_frozen_test_explorer(loaded);
    branch.attrs.setMany({
      "data-frozen-panel-state": "ready", "data-frozen-category-count": String(loaded.categories.length), "data-frozen-suite-count": "0",
      "data-frozen-case-count": String(projection.overall.cases), "data-frozen-index-requests": String(requests.indexRequests),
      "data-frozen-initial-category-requests": String(requests.categoryRequests), "data-frozen-initial-suite-requests": String(requests.suiteRequests),
      "data-frozen-initial-evidence-requests": String(requests.rowEvidenceRequests), "data-frozen-row-evidence-requests": String(requests.rowEvidenceRequests),
    });
    void reconcile_location();
    return loaded;
  }).catch((cause: unknown) => {
    if (disposed) return undefined;
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    browsing.empty();
    browsing.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" }).text.set(`Test reports could not be loaded.\n${cause instanceof Error ? cause.message : String(cause)}`);
    return undefined;
  });

  return Object.freeze({
    branch,
    ready,
    snapshot: () => Object.freeze({
      state,
      categories: index?.categories.length ?? 0,
      suites: hierarchy?.renderedSuites() ?? 0,
      cases: index === undefined ? 0 : project_frozen_test_explorer(index).overall.cases,
      evidenceRequests: client.snapshot().rowEvidenceRequests,
      renderedCases,
      retainedRowArtifacts: client.snapshot().retainedRowArtifacts,
    }),
    deactivate() {
      if (disposed) return;
      if (index !== undefined) history.replaceState(history.state, "", inspector_url(index));
      for (const controller of hierarchy?.categories.values() ?? []) controller.close();
      close_surface();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("popstate", popstateListener);
      disclosureListener?.off();
      hierarchy?.dispose();
      close_surface();
      branch.remove();
    },
  });
}
