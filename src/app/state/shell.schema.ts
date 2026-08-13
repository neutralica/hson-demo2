import { hson } from "hson-live";
import { MAIN_VIEW_IDS, WIDGET_IDS, type WidgetId } from "./shell-ids";

export function are_canonical_widget_ids(widgets: readonly WidgetId[]): boolean {
  let priorRegistrationIndex = -1;
  for (const widget of widgets) {
    const registrationIndex = WIDGET_IDS.indexOf(widget);
    if (registrationIndex <= priorRegistrationIndex) return false;
    priorRegistrationIndex = registrationIndex;
  }
  return true;
}

export const DEMO_LIVEMAP_SCHEMA = hson.liveMap.schema.define((s) => s.object.exact({
  ui: s.object.exact({
    currentView: s.literal(...MAIN_VIEW_IDS).nullable,
    activeWidgets: s.array(s.literal(...WIDGET_IDS)).constrain(
      "unique widget IDs in registration order",
      are_canonical_widget_ids,
    ),
  }),
}));
