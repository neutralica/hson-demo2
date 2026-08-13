import type { InferLiveMapSchema, LiveMapPathHandle } from "hson-live/livemap";
import type { DEMO_LIVEMAP_SCHEMA } from "./shell.schema";
import type { MainViewId, WidgetId } from "./shell-ids";

export type { MainViewId, WidgetId } from "./shell-ids";

export type DemoView = MainViewId | null;
export type DemoWidget = WidgetId;
export type DemoState = InferLiveMapSchema<typeof DEMO_LIVEMAP_SCHEMA>;

export type DemoShellLocations = Readonly<{
  currentView: LiveMapPathHandle<DemoView>;
  activeWidgets: LiveMapPathHandle<readonly WidgetId[]>;
}>;

export type DemoStore = {
  locations: DemoShellLocations;
  getView(): DemoView;
  getWidgets(): readonly WidgetId[];

  setView(next: DemoView): void;
  toggleView(next: MainViewId): void;

  startWidget(next: DemoWidget): void;
  stopWidget(next: DemoWidget): void;
  toggleWidget(widget: DemoWidget): void;

  subscribeViewState(fn: () => void): () => void;
};
