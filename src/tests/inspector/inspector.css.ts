import type { CssMap } from "hson-live/types";
import { $grn_, $gry_, $pnk_, $red_etc_, ACID_WASH_RGBA } from "../../app/core/consts/old-rgb.consts";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch.consts";
import { øCOLS, øfontWeight } from "../../app/core/consts/ui-consts";
import { set_alpha } from "../../app/core/helpers/color-helpers";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { øfontSize } from "../../app/core/consts/ui-consts";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch.consts";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";


export const NAME_WIDTH = "45ch"; // standardize width so it doesn’t jump


export const LOG_SCROLLcss: CssMap = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",

  // fill available space in parent panel
  height: "100%",
  minHeight: "0",
};

export const INSPECTORcss = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  background: øCOLS.backlo,
  fontFamily: SYS_MONOfont,
  fontSize: øfontSize.main,
};

export const THcss: CssMap = {
  padding: "6px 8px",
  textAlign: "left",
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
  ...FONT_FAM_MONO,
  background: øCOLS.backhi,
};

export const CLICKABLEcss: CssMap = { cursor: "pointer", userSelect: "any" };

export const ROW_SUITEcss: CssMap = {
  background: øCOLS.backhi,
  cursor: "pointer",
  textAlign: "left",
};
export const ROW_GROUPcss: CssMap = {
  background: øCOLS.backhi,
  cursor: "pointer",
};

export const tdNameCssBase: CssMap = {
  width: NAME_WIDTH,
  maxWidth: NAME_WIDTH,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  userSelect: "any",
  textAlign: "left",
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
  color: OKLCH_VIBRANT.mintIce,
  fontWeight: øfontWeight.main,
};

export const ROW_CASE_FAILcss: CssMap = {
  color: $red_etc_.heartsBlood,
  background: øCOLS.backhi,
  fontWeight: øfontWeight.fat,
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
  background: øCOLS.backhi,
  color: ACID_WASH_OKLCH.mutedRed,
  // filter: "saturate(1.3) brightness(1.3)"
};