import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { DEMO_LIVEMAP_SCHEMA } from "../../../src/app/state/shell.schema";
import { canonicalize_widget_ids, create_demo_store } from "../../../src/app/state/store";
import type { DemoView, WidgetId } from "../../../src/app/state/state.types";

const SUITE = "unit/livedemo-shell-state";

function state(activeWidgets: WidgetId[] = [], currentView: DemoView = null): {
  ui: { currentView: DemoView; activeWidgets: WidgetId[] };
} {
  return { ui: { currentView, activeWidgets } };
}

function assert_validation(candidate: JsonValue, expected: boolean): void {
  const validation = DEMO_LIVEMAP_SCHEMA.validateRoot(candidate);
  if (validation.ok !== expected) {
    throw new Error(`expected validation ok=${expected}, received ${JSON.stringify(validation)}`);
  }
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
      name: "initial shell state keeps desktop view null and Bling active",
      run: () => {
        const store = create_demo_store();
        if (store.getView() !== null) throw new Error("expected initial currentView to be null");
        assert_widgets(store.getWidgets(), ["bling"]);
      },
    },
    {
      suite: SUITE,
      name: "schema accepts canonical widget membership and registration order",
      run: () => assert_validation(state(["point", "bling"]), true),
    },
    {
      suite: SUITE,
      name: "schema rejects duplicate widget membership",
      run: () => assert_validation(state(["point", "point"]), false),
    },
    {
      suite: SUITE,
      name: "schema rejects noncanonical widget order",
      run: () => assert_validation(state(["bling", "point"]), false),
    },
    {
      suite: SUITE,
      name: "base schema rejects unknown widget IDs",
      run: () => assert_validation({ ui: { currentView: null, activeWidgets: ["unknown-widget"] } }, false),
    },
    {
      suite: SUITE,
      name: "schema accepts the experimental color-sudoku identity",
      run: () => assert_validation(state([], "color-sudoku"), true),
    },
    {
      suite: SUITE,
      name: "schema rejects unknown, widget, and misspelled main-view IDs",
      run: () => {
        assert_validation({ ui: { currentView: "unknown-view", activeWidgets: [] } }, false);
        assert_validation({ ui: { currentView: "bling", activeWidgets: [] } }, false);
        assert_validation({ ui: { currentView: "color-sudoko", activeWidgets: [] } }, false);
      },
    },
    {
      suite: SUITE,
      name: "exact shell schema rejects removed aboutTocOpen state",
      run: () => assert_validation({ ui: { currentView: null, activeWidgets: [], aboutTocOpen: false } }, false),
    },
    {
      suite: SUITE,
      name: "canonicalizer deduplicates and restores registration order",
      run: () => assert_widgets(
        canonicalize_widget_ids(["bling", "point", "point", "oklch"]),
        ["point", "oklch", "bling"],
      ),
    },
    {
      suite: SUITE,
      name: "typed widget location retains the schema as final invariant guard",
      run: () => {
        const store = create_demo_store(state(["point", "bling"]));
        let rejected = false;
        try {
          store.locations.activeWidgets.set(["bling", "point"]);
        } catch {
          rejected = true;
        }
        if (!rejected) throw new Error("expected noncanonical direct location write to reject");
        assert_widgets(store.getWidgets(), ["point", "bling"]);
      },
    },
    {
      suite: SUITE,
      name: "widget intents always commit canonical membership",
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
      name: "main-view intents preserve null toggle semantics",
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
