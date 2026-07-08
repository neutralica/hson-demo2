import type { CssMap } from "hson-live/types";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch.consts";
import { _fontWeight } from "../../app/core/consts/ui-consts";
import { _colors } from "../../app/core/consts/colors.consts";
import { set_alpha } from "../../app/core/helpers/color-helpers";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { _fontSize } from "../../app/core/consts/ui-consts";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch.consts";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";


const nameWidth = "35ch"; // standardize width so it doesn’t jump
const rowFade = `linear-gradient(6deg, ${set_alpha(_colors.backhi, 0.7)}, transparent)`;
const rowFadeFail = `linear-gradient(150deg, ${set_alpha(OKLCH_VIBRANT.redInfra, 0.4)}, transparent)`;

export const LOG_SCROLLcss: CssMap = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",

  // fill available space in parent panel
  height: "100%",
  minHeight: "0",
};

export const INSP_T_HOSTcss = {
  position: "absolute",
  inset: "0",
  height: "100%",
  width: "100%",
  display: "flex",
  overflow: "hidden",
  fontSize: _fontSize.smol,
  color: _colors.txt.main,
  // margin: "0rem 3rem",
};
export const INSPECTORcss: CssMap = {
  position: "relative",
  width: "100%",
  // maxWidth: "90ch",
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  // background: _colors.backlo,
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
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
  background: _colors.backhi,
};


export const ROW_SUITEcss: CssMap = {
  background: rowFade,
  cursor: "pointer",
  textAlign: "left",
};
export const ROW_GROUPcss: CssMap = {
  background: _colors.backhi,
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
  fontWeight: _fontWeight.main,
};

export const ROW_CASE_FAILcss: CssMap = {
  color: "red",
  fontWeight: _fontWeight.fat,
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
  background: _colors.backlo,
  color: _colors.greenlike,
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
  color: _colors.txt.code,
  fontSize: _fontSize.smol
};

export const INSP_CAP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "1ch",
  alignItems: "center",
  marginBottom: "0.5rem",
};

export const INSPECTOR_TABLEcss = {
  width: "100%",
  borderCollapse: "collapse",
  background: set_alpha(_colors.backlo, 0.7),
  
};