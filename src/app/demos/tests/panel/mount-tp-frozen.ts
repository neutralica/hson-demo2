import type { LiveTree } from "hson-live/livetree";
import { _fontSize } from "../../../core/consts/ui-consts";
import {
  FROZEN_TEST_CATEGORIES,
  make_frozen_test_evidence_client,
  type FrozenTestEvidenceClient,
  type FrozenTestEvidenceIndex,
  type FrozenTestTiming,
} from "./frozen-test-evidence-client";

export type FrozenTestPanelSnapshot = Readonly<{
  state: "loading" | "ready" | "error";
  categories: number;
  suites: number;
  cases: number;
  evidenceRequests: number;
}>;

export type FrozenTestPanel = Readonly<{
  branch: LiveTree;
  ready: Promise<FrozenTestEvidenceIndex | undefined>;
  snapshot(): FrozenTestPanelSnapshot;
  dispose(): void;
}>;

const STYLES = Object.freeze({
  root: { width: "100%", height: "100%", overflow: "auto", fontFamily: "DM Mono, monospace", fontSize: _fontSize.wee },
  notice: { padding: "10px 8px", color: "#9bb3a6", borderBottom: "1px solid rgba(125,216,207,.25)" },
  error: { padding: "12px 8px", color: "#ff8778", border: "1px solid rgba(255,135,120,.45)", whiteSpace: "pre-wrap" },
  category: { borderBottom: "1px solid rgba(125,216,207,.26)" },
  categoryHeading: { padding: "9px 8px 5px", color: "#d7ff70", letterSpacing: ".08em", textTransform: "uppercase" },
  categorySummary: { marginLeft: "10px", color: "#9bb3a6", letterSpacing: "normal", textTransform: "none" },
  suite: { borderTop: "1px solid rgba(125,216,207,.14)" },
  suiteRow: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto 72px", gap: "8px", padding: "7px 8px", color: "#7dd8cf" },
  suiteTitle: { color: "#9bb3a6", marginLeft: "8px" },
  summary: { color: "#9bb3a6", whiteSpace: "nowrap" },
  duration: { color: "#89948d", textAlign: "right", whiteSpace: "nowrap" },
  failed: { color: "#ff8778" },
  caseRow: { display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 70px", gap: "7px", minHeight: "27px", alignItems: "center", padding: "3px 8px 3px 26px", borderTop: "1px solid rgba(200,220,208,.09)", color: "#ddd9cd" },
  casePass: { color: "#9ddf8b" },
  caseFail: { color: "#ff8778" },
  caseSkip: { color: "#c4b070" },
} as const);

function duration(timing: FrozenTestTiming): string {
  const value = timing.ms ?? timing.durationMs ?? timing.runnerMs ?? timing.hostMs;
  if (value === null || value === undefined) return "—";
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 1_000) return `${value.toFixed(1)} ms`;
  return `${(value / 1_000).toFixed(2)} s`;
}

function render_index(branch: LiveTree, index: FrozenTestEvidenceIndex): void {
  branch.empty();
  branch.create.div().classlist.set("frozen-test-notice")
    .attrs.set("data-testid", "frozen-test-summary")
    .text.set(`${index.suites.length} suites · ${index.suites.reduce((total, suite) => total + suite.cases.length, 0)} cases · deployment ${index.deployment.hsonDeployCommit}`);

  for (const categoryId of FROZEN_TEST_CATEGORIES) {
    const category = index.categories.find((item) => item.id === categoryId)!;
    const group = branch.create.section().classlist.set("frozen-test-category").attrs.setMany({
      "data-frozen-category": categoryId,
      "data-testid": `frozen-category-${categoryId}`,
    });
    const heading = group.create.div().classlist.set("frozen-test-category-heading");
    heading.create.span().text.set(categoryId);
    heading.create.span().classlist.set("frozen-test-category-summary")
      .text.set(`${category.status.toUpperCase()} · ${category.suiteCounts.total} suites · ${category.caseCounts.total} cases · ${duration(category.timing)}`);
    const suites = index.suites.filter((suite) => suite.category === categoryId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    for (const suite of suites) {
      const suiteGroup = group.create.div().classlist.set("frozen-test-suite").attrs.setMany({
        "data-frozen-suite": suite.id,
        "data-frozen-status": suite.status,
      });
      const row = suiteGroup.create.div().classlist.set("frozen-test-suite-row").attrs.set("data-testid", "frozen-suite-row");
      if (suite.status === "fail") row.classlist.add("is-fail");
      const name = row.create.span();
      name.create.span().text.set(suite.id);
      name.create.span().classlist.set("frozen-test-suite-title").text.set(suite.title);
      row.create.span().classlist.set("frozen-test-suite-summary")
        .text.set(`${suite.status.toUpperCase()} · ${suite.counts.passed} pass · ${suite.counts.failed} fail · ${suite.counts.skipped} skip`);
      row.create.span().classlist.set("frozen-test-duration").text.set(duration(suite.timing));
      for (const item of [...suite.cases].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
        const caseRow = suiteGroup.create.div().classlist.set("frozen-test-case-row").attrs.setMany({
          "data-testid": "frozen-case-row",
          "data-frozen-case": item.id,
          "data-frozen-suite-id": suite.id,
          "data-frozen-status": item.status,
          "data-frozen-evidence": item.evidence?.available === true ? "available" : "absent",
        });
        caseRow.create.span().classlist.set(`frozen-test-status is-${item.status}`).text.set(item.status.toUpperCase());
        const title = caseRow.create.span();
        title.create.span().text.set(item.title);
        title.create.span().css.setMany({ color: "#81948a", marginLeft: "8px", fontSize: ".66rem" }).text.set(item.caseId);
        caseRow.create.span().classlist.set("frozen-test-duration").text.set(duration(item.timing));
      }
    }
  }
}

export function mount_frozen_test_panel(host: LiveTree, options: Readonly<{
  evidenceRoot?: string;
  client?: FrozenTestEvidenceClient;
}> = {}): FrozenTestPanel {
  const branch = host.create.div().id.set("test-panel-branch").attrs.setMany({
    "data-testid": "frozen-test-panel",
    "data-test-acquisition": "frozen",
    "data-frozen-panel-state": "loading",
    "data-hosted-execution-count": "0",
  });
  branch.css.setMany(STYLES.root);
  branch.css.selector("& .frozen-test-notice").setMany(STYLES.notice);
  branch.css.selector("& .frozen-test-error").setMany(STYLES.error);
  branch.css.selector("& .frozen-test-category").setMany(STYLES.category);
  branch.css.selector("& .frozen-test-category-heading").setMany(STYLES.categoryHeading);
  branch.css.selector("& .frozen-test-category-summary").setMany(STYLES.categorySummary);
  branch.css.selector("& .frozen-test-suite").setMany(STYLES.suite);
  branch.css.selector("& .frozen-test-suite-row").setMany(STYLES.suiteRow);
  branch.css.selector("& .frozen-test-suite-title").setMany(STYLES.suiteTitle);
  branch.css.selector("& .frozen-test-suite-summary").setMany(STYLES.summary);
  branch.css.selector("& .frozen-test-duration").setMany(STYLES.duration);
  branch.css.selector("& .frozen-test-suite-row.is-fail").setMany(STYLES.failed);
  branch.css.selector("& .frozen-test-case-row").setMany(STYLES.caseRow);
  branch.css.selector("& .frozen-test-status.is-pass").setMany(STYLES.casePass);
  branch.css.selector("& .frozen-test-status.is-fail").setMany(STYLES.caseFail);
  branch.css.selector("& .frozen-test-status.is-skip").setMany(STYLES.caseSkip);

  branch.create.div().classlist.set("frozen-test-notice").text.set("loading immutable test evidence index…");
  let state: FrozenTestPanelSnapshot["state"] = "loading";
  let index: FrozenTestEvidenceIndex | undefined;
  let evidenceRequests = 0;
  let disposed = false;
  let client: FrozenTestEvidenceClient;
  try {
    client = options.client ?? make_frozen_test_evidence_client({
      ...(options.evidenceRoot === undefined ? {} : { root: options.evidenceRoot }),
      fetch: async (input, init) => {
        evidenceRequests += 1;
        return globalThis.fetch(input, init);
      },
    });
  } catch (cause) {
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    branch.empty();
    branch.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" })
      .text.set(cause instanceof Error ? cause.message : String(cause));
    return Object.freeze({
      branch,
      ready: Promise.resolve(undefined),
      snapshot: () => Object.freeze({ state, categories: 0, suites: 0, cases: 0, evidenceRequests }),
      dispose: () => { if (!disposed) { disposed = true; branch.remove(); } },
    });
  }

  const ready = client.loadIndex().then((loaded) => {
    if (disposed) return undefined;
    index = loaded;
    render_index(branch, loaded);
    state = "ready";
    branch.attrs.setMany({
      "data-frozen-panel-state": "ready",
      "data-frozen-category-count": String(loaded.categories.length),
      "data-frozen-suite-count": String(loaded.suites.length),
      "data-frozen-case-count": String(loaded.suites.reduce((total, suite) => total + suite.cases.length, 0)),
      "data-frozen-initial-evidence-requests": String(evidenceRequests),
    });
    return loaded;
  }).catch((cause: unknown) => {
    if (disposed) return undefined;
    state = "error";
    branch.attrs.set("data-frozen-panel-state", "error");
    branch.empty();
    branch.create.div().classlist.set("frozen-test-error").attrs.setMany({ role: "alert", "data-testid": "frozen-test-error" })
      .text.set(`Frozen test evidence could not be loaded.\n${cause instanceof Error ? cause.message : String(cause)}`);
    return undefined;
  });

  return Object.freeze({
    branch,
    ready,
    snapshot: () => Object.freeze({
      state,
      categories: index?.categories.length ?? 0,
      suites: index?.suites.length ?? 0,
      cases: index?.suites.reduce((total, suite) => total + suite.cases.length, 0) ?? 0,
      evidenceRequests,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      branch.remove();
    },
  });
}
