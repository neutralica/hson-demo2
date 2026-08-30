import type { LiveMapPathHandle } from "hson-live/livemap";
import type { MainViewId, WidgetId } from "./shell-ids";

export type { MainViewId, WidgetId } from "./shell-ids";

export type DemoView = MainViewId | null;
export type DemoWidget = WidgetId;
export type DemoState = Readonly<{
  ui: Readonly<{ currentView: DemoView; activeWidgets: readonly DemoWidget[] }>;
}>;

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
};
