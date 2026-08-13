import { hson } from "hson-live";
import { WIDGET_IDS, type MainViewId, type WidgetId } from "./shell-ids";
import { DEMO_LIVEMAP_SCHEMA } from "./shell.schema";
import type { DemoState, DemoStore, DemoView } from "./state.types";

export function make_initial_demo_state(): DemoState {
  return {
    ui: {
      currentView: null,
      activeWidgets: ["bling"],
    },
  };
}

export const INITIAL_DEMO_STATE: DemoState = make_initial_demo_state();


export { DEMO_LIVEMAP_SCHEMA } from "./shell.schema";

export function canonicalize_widget_ids(widgets: readonly WidgetId[]): WidgetId[] {
  return WIDGET_IDS.filter((widget) => widgets.includes(widget));
}

export function create_demo_store(
  initial: DemoState = INITIAL_DEMO_STATE,
): DemoStore {
  const demoState = hson.liveMap
    .fromJson(JSON.stringify(initial))
    .schema.use(DEMO_LIVEMAP_SCHEMA);
  const currentView = demoState.at(["ui", "currentView"]);
  const activeWidgets = demoState.at(["ui", "activeWidgets"]);
  const locations = { currentView, activeWidgets } as const;

  function getView(): DemoView {
    return currentView.snap();
  }

  function getWidgets(): readonly WidgetId[] {
    return activeWidgets.snap();
  }

  function hasWidget(widget: WidgetId): boolean {
    return getWidgets().includes(widget);
  }

  function setView(next: DemoView): void {
    currentView.set(next);
  }

  function toggleView(next: MainViewId): void {
    setView(getView() === next ? null : next);
  }

  function startWidget(next: WidgetId): void {
    const widgets = getWidgets();
    if (widgets.includes(next)) return;

    activeWidgets.set(canonicalize_widget_ids([...widgets, next]));
  }

  function stopWidget(next: WidgetId): void {
    const widgets = getWidgets();
    const filtered = canonicalize_widget_ids(widgets.filter((widget) => widget !== next));

    if (filtered.length === widgets.length) return;
    activeWidgets.set(filtered);
  }

  function toggleWidget(widget: WidgetId): void {
    if (hasWidget(widget)) {
      stopWidget(widget);
      return;
    }
    
    startWidget(widget);
  }

  return {
    locations,
    getView,
    getWidgets,

    setView,
    toggleView,
    startWidget,
    stopWidget,
    toggleWidget,
  };
}

const demoStore = create_demo_store();

export const demo_shell_locations = demoStore.locations;

export const set_view = demoStore.setView;
export const toggle_view = demoStore.toggleView;
export const deactivate_widget = demoStore.stopWidget;
export const toggle_widget = demoStore.toggleWidget;
