import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { canonicalize_widget_ids, create_demo_store } from "../../../src/app/state/store";
import type { DemoView, WidgetId } from "../../../src/app/state/state.types";

const SUITE = "unit/livedemo-shell-state";

function state(activeWidgets: WidgetId[] = [], currentView: DemoView = null): {
  ui: { currentView: DemoView; activeWidgets: WidgetId[] };
} {
  return { ui: { currentView, activeWidgets } };
}

function assert_validation(candidate: ReturnType<typeof state> | { ui: { currentView: string | null; activeWidgets: string[]; aboutTocOpen?: boolean } }, expected: boolean): void {
  let accepted = true;
  try { create_demo_store(candidate as never); } catch { accepted = false; }
  if (accepted !== expected) throw new Error(`expected application validation ok=${expected}`);
}

function assert_widgets(actual: readonly WidgetId[], expected: readonly WidgetId[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export function live_demo_shell_state_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: SUITE,
      caseId: "initial-shell-state-keeps-view-null-and-ornament-opt-in", name: "initial shell state keeps the view null and ornament opt-in",
      run: () => {
        const store = create_demo_store();
        if (store.getView() !== null) throw new Error("expected initial currentView to be null");
        assert_widgets(store.getWidgets(), []);
      },
    },
    {
      suite: SUITE,
      caseId: "schema-accepts-canonical-widget-membership-and-registration-order", name: "schema accepts canonical widget membership and registration order",
      run: () => assert_validation(state(["point", "bling"]), true),
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-duplicate-widget-membership", name: "schema rejects duplicate widget membership",
      run: () => assert_validation(state(["point", "point"]), false),
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-noncanonical-widget-order", name: "schema rejects noncanonical widget order",
      run: () => assert_validation(state(["bling", "point"]), false),
    },
    {
      suite: SUITE,
      caseId: "base-schema-rejects-unknown-widget-ids", name: "base schema rejects unknown widget IDs",
      run: () => assert_validation({ ui: { currentView: null, activeWidgets: ["unknown-widget"] } }, false),
    },
    {
      suite: SUITE,
      caseId: "schema-accepts-the-experimental-color-sudoku-identity", name: "schema accepts the experimental color-sudoku identity",
      run: () => assert_validation(state([], "color-sudoku"), true),
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-unknown-widget-and-misspelled-main-view-ids", name: "schema rejects unknown, widget, and misspelled main-view IDs",
      run: () => {
        assert_validation({ ui: { currentView: "unknown-view", activeWidgets: [] } }, false);
        assert_validation({ ui: { currentView: "bling", activeWidgets: [] } }, false);
        assert_validation({ ui: { currentView: "color-sudoko", activeWidgets: [] } }, false);
      },
    },
    {
      suite: SUITE,
      caseId: "exact-shell-schema-rejects-removed-abouttocopen-state", name: "exact shell schema rejects removed aboutTocOpen state",
      run: () => assert_validation({ ui: { currentView: null, activeWidgets: [], aboutTocOpen: false } }, false),
    },
    {
      suite: SUITE,
      caseId: "canonicalizer-deduplicates-and-restores-registration-order", name: "canonicalizer deduplicates and restores registration order",
      run: () => assert_widgets(
        canonicalize_widget_ids(["bling", "point", "point", "oklch"]),
        ["point", "oklch", "bling"],
      ),
    },
    {
      suite: SUITE,
      caseId: "widget-intents-always-commit-canonical-membership", name: "widget intents always commit canonical membership",
      run: () => {
        const store = create_demo_store(state());
        store.startWidget("bling");
        store.startWidget("point");
        store.startWidget("point");
        store.startWidget("oklch");
        assert_widgets(store.getWidgets(), ["point", "oklch", "bling"]);

        store.toggleWidget("point");
        store.toggleWidget("point");
        store.stopWidget("oklch");
        assert_widgets(store.getWidgets(), ["point", "bling"]);
      },
    },
    {
      suite: SUITE,
      caseId: "main-view-intents-preserve-null-toggle-semantics", name: "main-view intents preserve null toggle semantics",
      run: () => {
        const store = create_demo_store(state());
        store.toggleView("about");
        if (store.getView() !== "about") throw new Error("expected about to be selected");
        store.toggleView("about");
        if (store.getView() !== null) throw new Error("expected repeated toggle to clear selection");
      },
    },
  ];

  return {
    suite: SUITE,
    cases,
  };
}
