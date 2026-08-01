import { selector_for_quid } from "../../../../hson-live/dist/api/livetree/managers/css-manager";

export const HSON_QUID_MARKUP_NAME = "hson:quid";
export const HSON_INDEX_MARKUP_NAME = "hson:index";

export function hson_quid_selector(quid: string): string {
  return selector_for_quid(quid);
}
