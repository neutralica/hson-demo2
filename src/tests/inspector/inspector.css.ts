import type { CssMap } from "hson-live/types";
import { $cols_, $grn_, $gry_, $pnk_, $red_etc_, ACID_WASH_OKLCH, ACID_WASH_RGBA, set_alpha } from "../../app/core/consts/colors.consts";
import { MENU_FONT } from "../../app/phases/phase-3-demo/demo.css";
import { $txt_ } from "../../app/core/consts/ui-consts";


export const NAME_WIDTH = "38ch"; // standardize width so it doesn’t jump

export const INSPECTOR_ROOTcss = {
  // padding: "10px",
  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  lineHeight: "1.35",
  color: ACID_WASH_RGBA.dullAmber,
}

export const LOG_WRAPcss: Record<string, string> = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",

  // CHANGED: fill available space in parent panel
  height: "100%",
  minHeight: "0",
};

export const THcss: Record<string, string> = {
  padding: "6px 8px",
  textAlign: "left",
  fontWeight: "300",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "nowrap",
  opacity: "0.85",
};

export const TDcss: Record<string, string> = {
  padding: "6px 8px",
  verticalAlign: "top",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};
export const TD_PREVIEW_ROWcss: Record<string, string> = {
  padding: "8px 12px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontFamily: "Monaco",
  background: $cols_.bckdeep,
};

export const CLICKABLEcss: Record<string, string> = { cursor: "pointer", userSelect: "none" };

export const ROW_SUITEcss: Record<string, string> = {
  background: $cols_.bckdeep,
  cursor: "pointer",
};
export const ROW_GROUPcss: Record<string, string> = {
  background: $cols_.bckdeep,
  cursor: "pointer",
};

export const tdNameCssBase: Record<string, string> = {
  width: NAME_WIDTH,
  maxWidth: NAME_WIDTH,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const tdNameChildCss: Record<string, string> = {
  ...tdNameCssBase,
  paddingLeft: "18px",
  opacity: "0.95",
};
export const ROW_SUITE_FAILcss: CssMap = {
  background: "rgba(190, 20, 20, 0.3)",
  color: ACID_WASH_OKLCH.ash,
};


export const ROW_CASEcss: Record<string, string> = {
  background: "transparent",
  color: $grn_.faded,
};

export const ROW_CASE_FAILcss: CssMap = {
  color: $red_etc_.heartsBlood,
  background: $cols_.bckdeep,
  fontWeight: "700 /* !important */",
  // filter: "saturate(1.3) brightness(1.3)"
};

export const MADE_BUTTONcss = {
  maxWidth: "10ch",
  padding: "4px 8px",
  borderRadius: "8px",
  userSelect: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  margin: "auto"
};

export const PREVIEW_METAcss: CssMap = {
  minWidth: "0",
  opacity: "0.85",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: ACID_WASH_RGBA.seafoam,
};

export const PREVIEW_META_FAILcss: CssMap = {
  background: $cols_.bckdeep,
  color: ACID_WASH_OKLCH.mutedRed,
  // filter: "saturate(1.3) brightness(1.3)"
};