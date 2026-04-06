import type { CssMap } from "hson-live/types";
import { COLORS, $grn_, $gry_, $pnk_, $red_etc_, ACID_WASH_OKLCH, ACID_WASH_RGBA } from "../../app/core/consts/colors.consts";
import { set_alpha } from "../../app/core/helpers/color-helpers";
import { MENU_FONT } from "../../app/core/consts/ui-consts";
import { $txt_ } from "../../app/core/consts/ui-consts";


export const NAME_WIDTH = "45ch"; // standardize width so it doesn’t jump

export const INSPECTOR_ROOTcss = {
  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  lineHeight: "1.35",
}

export const LOG_SCROLLcss: CssMap = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",

  // fill available space in parent panel
  height: "100%",
  minHeight: "0",
};

export const THcss: CssMap = {
  padding: "6px 8px",
  textAlign: "left",
  fontWeight: "300",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "nowrap",
};

export const TDcss: CssMap = {
  padding: "6px 8px",
  verticalAlign: "top",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};
export const TD_PREVIEW_ROWcss: CssMap = {
  padding: "8px 12px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontFamily: "Monaco",
  background: COLORS.bckdeep,
};

export const CLICKABLEcss: CssMap = { cursor: "pointer", userSelect: "any" };

export const ROW_SUITEcss: CssMap = {
  background: COLORS.bckdeep,
  cursor: "pointer",
};
export const ROW_GROUPcss: CssMap = {
  background: COLORS.bckdeep,
  cursor: "pointer",
};

export const tdNameCssBase: CssMap = {
  width: NAME_WIDTH,
  maxWidth: NAME_WIDTH,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  userSelect: "any",
};

export const tdNameChildCss: CssMap = {
  ...tdNameCssBase,
  // paddingLeft: "18px",
};

export const ROW_SUITE_FAILcss: CssMap = {
  background: "rgba(190, 20, 20, 0.3)",
  color: ACID_WASH_OKLCH.ash,
};


export const ROW_CASEcss: CssMap = {
  background: "transparent",
  color: $grn_.faded,
};

export const ROW_CASE_FAILcss: CssMap = {
  color: $red_etc_.heartsBlood,
  background: COLORS.bckdeep,
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
  background: COLORS.bckdeep,
  color: ACID_WASH_OKLCH.mutedRed,
  // filter: "saturate(1.3) brightness(1.3)"
};