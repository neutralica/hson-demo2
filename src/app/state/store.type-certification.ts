import { demo_shell_locations } from "./store";
import type { DemoStore, MainViewId, WidgetId } from "./state.types";
import type { MAIN_VIEW_IDS, WIDGET_IDS } from "./shell-ids";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
  (<T>() => T extends TRight ? 1 : 2) ? true : false;
type Expect<TValue extends true> = TValue;

type CurrentViewSnap = ReturnType<typeof demo_shell_locations.currentView.snap>;
type ActiveWidgetsSnap = ReturnType<typeof demo_shell_locations.activeWidgets.snap>;

type _MainViewIdComesFromCatalog = Expect<Equal<MainViewId, typeof MAIN_VIEW_IDS[number]>>;
type _WidgetIdComesFromCatalog = Expect<Equal<WidgetId, typeof WIDGET_IDS[number]>>;
type _CurrentViewLocationSnap = Expect<Equal<CurrentViewSnap, MainViewId | null>>;
type _ActiveWidgetsLocationSnap = Expect<Equal<ActiveWidgetsSnap, readonly WidgetId[]>>;

declare const store: DemoStore;

if (false) {
  store.setView("color-sudoku");
  store.toggleView("about");
  store.toggleWidget("point");

  // @ts-expect-error widget IDs are not main-view IDs
  store.setView("bling");
  // @ts-expect-error unknown main-view IDs reject at the intent boundary
  store.toggleView("unknown-view");
  // @ts-expect-error experimental main-view typos reject at the intent boundary
  store.setView("color-sudoko");
  // @ts-expect-error main-view IDs are not widget IDs
  store.startWidget("about");
  // @ts-expect-error unknown widget IDs reject at the intent boundary
  store.toggleWidget("unknown-widget");
}
