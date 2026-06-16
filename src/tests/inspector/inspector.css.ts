import type { CssMap } from "hson-live/types";
import { $grn_, $gry_, $pnk_, $red_etc_, ACID_WASH_RGBA } from "../../app/core/consts/old-rgb.consts";
import { ACID_WASH_OKLCH, OKLCH_ACID_WASHED } from "../../app/core/consts/oklch.consts";
import { øfontWeight } from "../../app/core/consts/ui-consts";
import { TXTcol_CODE, _COLS, øHSON_COL } from "../../app/core/consts/colors.consts";
import { set_alpha } from "../../app/core/helpers/color-helpers";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { øfontSize } from "../../app/core/consts/ui-consts";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch.consts";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";

const nameWidth = "35ch"; // standardize width so it doesn’t jump
const rowFade = `linear-gradient(150deg, ${_COLS.backhi}, transparent)`;
const rowFadeFail = `linear-gradient(150deg, ${set_alpha(OKLCH_VIBRANT.redInfra, 0.4)}, transparent)`;

export const LOG_SCROLLcss: CssMap = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",

  // fill available space in parent panel
  height: "100%",
  minHeight: "0",
};

export const INSPECTORcss: CssMap = {
  position: "relative",
  width: "100%",
  // maxWidth: "90ch",
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  background: _COLS.backlo,
  fontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
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
  ...FONT_FAM_MONO,
  padding: "8px 12px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  background: _COLS.backhi,
};


export const ROW_SUITEcss: CssMap = {
  background: rowFade,
  cursor: "pointer",
  textAlign: "left",
};
export const ROW_GROUPcss: CssMap = {
  background: _COLS.backhi,
  cursor: "pointer",
};

export const tdNameCssBase: CssMap = {
  width: nameWidth,
  maxWidth: nameWidth,
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
  background: rowFadeFail,
  color: ACID_WASH_OKLCH.ash,
};


export const ROW_CASEcss: CssMap = {
  color: OKLCH_VIBRANT.mintIce,
  fontWeight: øfontWeight.main,
};

export const ROW_CASE_FAILcss: CssMap = {
  color: "red",
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
  // whiteSpace: "nowrap",
  padding: "1rem",
  // overflow: "scroll",
  // textOverflow: "ellipsis",
  background: _COLS.backlo,
  color: øHSON_COL.n,
};

export const PREVIEW_META_FAILcss: CssMap = {
  background: "black",
  color: OKLCH_VIBRANT.redSignal,
  height: "fit-content"
  // filter: "saturate(1.3) brightness(1.3)"
};

export const BUTTON_BARcss = {
  display: "flex",
  gap: "1ch",
  alignItems: "center",
  justifyContent: "flex-end",
};

export const INSP_PREV_PREcss = {
  margin: "0",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  color: TXTcol_CODE,
  fontSize: øfontSize.smol
};

export const INSP_CAP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "1ch",
  alignItems: "center",
  marginBottom: "0.5rem",
};