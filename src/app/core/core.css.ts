import type { CssMap } from "hson-live/types";
import { MENU_FONT } from "./consts/ui-consts";


// reusable monospace baseline for this widget

export const MONOcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: "12px",
  letterSpacing: "0.06em",
  // background: $cols_.bckdeep,
  width: "100%",
  fontWeight: "600"
} as const;
