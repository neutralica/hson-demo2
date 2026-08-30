import { Hson, type HsonSchema } from "hson-live";
import { WIDGET_IDS, type WidgetId } from "./shell-ids";

export function are_canonical_widget_ids(widgets: readonly WidgetId[]): boolean {
  let priorRegistrationIndex = -1;
  for (const widget of widgets) {
    const registrationIndex = WIDGET_IDS.indexOf(widget);
    if (registrationIndex <= priorRegistrationIndex) return false;
    priorRegistrationIndex = registrationIndex;
  }
  return true;
}

export const DEMO_LIVEMAP_SCHEMA: HsonSchema = Hson`
  <type "data" content <ui <content <
    currentView <union ["string", "null"]>
    activeWidgets <array "string">
  >>>>
`;

// @hson-schema generated type exports
import type { DEMO_LIVEMAP_SCHEMAType, DEMO_LIVEMAP_SCHEMAHson } from "./shell.schema.DEMO_LIVEMAP_SCHEMA.hson-schema.generated.js";
export type { DEMO_LIVEMAP_SCHEMAType, DEMO_LIVEMAP_SCHEMAHson };
// @hson-schema end generated type exports
