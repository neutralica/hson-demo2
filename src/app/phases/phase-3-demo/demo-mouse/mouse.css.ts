import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, ACID_WASH_OKLCH, ACID_WASH_RGBA, back_w_alpha } from "../../../consts/colors.consts";
import { MENU_FONT } from "../demo.css";

export const MOUSE_HOSTcss: CssMap = {
  width: "100%",
  minWidth: "0",
  minHeight: "0",
  maxWidth: "40ch",
  color: ACID_WASH_RGBA.terminalGreen,
  fontFamily: MENU_FONT,
  borderRadius: "14px",
  
}


// unify row layout (header + data rows) so columns line up
export const ROW_GRIDcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "4ch 1fr", // 3 columns only (#, element, _QUID)
  columnGap: "12px",
  alignItems: "baseline",
  minWidth: "0",
} as const;

export const MOUSE_TRACKERcss: CssMap = {
  position: "relative",
  width: "140px",
  height: "140px",
  borderRadius: "999px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  background: back_w_alpha(0.7),
  gridColumn: "1",
  gridRow: "1",
  border: `1px solid ${ACID_WASH_OKLCH.mist}`,
  // overflow: "hidden",
} as const;

export const MOUSE_COORDScss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto auto auto", // CHANGED
  minWidth: "0",
  gridColumn: "2",
  gridRow: "1",
  marginLeft: "-1.5rem",
  alignContent: "end",              // CHANGED
  justifyItems: "start",
} as const;

// reusable monospace baseline for this widget
export const MONOcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: "12px",
  letterSpacing: "0.06em",
  background: $cols_.bckdeep,
  width: "100%"
} as const;

// grid-cell clamp so long values don't push neighbors
export const CELL_CLAMPcss: CssMap = {
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;