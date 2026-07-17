import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { ACID_WASH_RGBA } from "../../core/consts/old-rgb.consts";
import { $LOGGER_WIDTH, SYS_MONOfont, _fontSize, _fontWeight } from "../../core/consts/ui-consts";
import { UI_BTN_STDcss, UI_BTN_HOVERcss } from "../../ui/panels/panels.css";
import { OKLCH_FLEURS } from "../fleurs/fleurs.consts";
import { get_line_color } from "./test-helpers";

export const TP_BRANCHcss: CssMap = {
  display: "grid",
  // padding: "10px",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  gridTemplateColumns: "minmax(0, 1fr) " + $LOGGER_WIDTH,
  gridTemplateRows: "minmax(0, 1fr)",
  // background: _colors.backlo,
};

export const TP_ROOTcss: CssMap = {
  width: "100%",
  height: "100%",

}

export const TEST_ROW_CONTAINERcss = {
  display: "grid",
  columnGap: "0",
  rowGap: "0",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "auto",
  alignItems: "end",
  alignSelf: "end",
  gridRow: "2",
  gridColumn: "1",
  margin: "0",
  padding: "0.45rem 0.75rem 0.75rem",
  width: "100%",
  boxSizing: "border-box",
  border: "none",
  background: "transparent",
  boxShadow: "none",
};

export const TEST_CONTENTcss: CssMap = {
  marginTop: "0.75rem",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  gridColumn: "1",
  gridRow: "1",
  minWidth: "0",
  minHeight: "0",
  overflow: "hidden",
};

export const TP_CONTROL_ROWcss: CssMap = {
  width: "100%",
  minHeight: "10rem",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridAutoRows: "max-content",
  gap: "7px",
  alignContent: "start",
  alignItems: "stretch",
  gridColumn: "1",
  gridRow: "2",
  alignSelf: "end",
  padding: "9px",
  border: "6px ridge " + _colors.txt.grey,
  // background: _colors.backlo,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.55)",
};

export const TEST_CHIP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(7ch, auto))",
  gap: "6px",
  gridRow: "1",
  gridColumn: "1",
  justifySelf: "stretch",
  alignSelf: "end",
  alignItems: "stretch",
  padding: "7px 9px",
  boxSizing: "border-box",
  // border: "6px ridge rgba(190, 205, 196, 0.36)",
  // background: _colors.backlo,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.45)",
}

export const TEST_CHIP_DEFcss = {
  padding: "4px 8px",
  display: "grid",
  gridTemplateRows: "auto auto",
  justifyItems: "center",
  alignContent: "center",
  minHeight: "28px",
  minWidth: "7ch",
  boxSizing: "border-box",
  overflow: "hidden",
  background: _colors.backlo,
  border: "1px solid rgba(190, 205, 196, 0.22)",
  transition: "transform 90ms ease, filter 140ms ease",
};


export const TEST_CHIP_VALUEcss = {
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  fontWeight: _fontWeight.fat,
  lineHeight: "1",
  letterSpacing: "0.04em",
}

export const TEST_CHIP_LABELcss = {
  marginTop: "3px",
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  lineHeight: "1",
  letterSpacing: "0.08em",
  textTransform: "lowercase",
  whiteSpace: "nowrap",
  opacity: "0.72",
}


export const TEST_CLEAR_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(_colors.txt.menu),
  alignItems: "center",
  background: _colors.backlo,
  color: _colors.txt.menu,
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  lineHeight: "1",
  minHeight: "24px",
  minWidth: "7ch",
  padding: "4px 8px",
  justifyContent: "center",
  textTransform: "lowercase",
  letterSpacing: "0.06em",
  cursor: "pointer",
}


export const TEST_RUN_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(ACID_WASH_RGBA.fadedMint),
  alignItems: "center",
  color: ACID_WASH_RGBA.fadedMint,
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  lineHeight: "1",
  minHeight: "24px",
  minWidth: "7ch",
  padding: "4px 8px",
  justifyContent: "center",
  textTransform: "lowercase",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

export const TEST_SELECTORcss: CssMap = {
  minWidth: "18ch",
  padding: "4px 8px",
  minHeight: "24px",
  boxSizing: "border-box",
  ...FONT_FAM_MONO,
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  lineHeight: "1",

  // background: $cols_.backdeep,
  color: _colors.txt.main,
  border: "1px solid rgba(255,255,255,0.2)",
  outline: "none",
  _hover: {
    border: `1px solid ${OKLCH_FLEURS.fadedGold}`
  }
} as const;

export const TEST_INSPECTOR_PANEcss: CssMap = {
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  width: "100%",
  minWidth: "0",
  minHeight: "0",
  gridColumn: "1",
  gridRow: "1",
};

export const TEST_LOG_PANEcss: CssMap = {
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  rowGap: "0.75rem",
  gridColumn: "2",
  gridRow: "1",
  overflow: "hidden",
  overflowWrap: "normal",
  minWidth: "0",
  minHeight: "0",
  zIndex: "20",
};

export const TEST_LOGGERcss: CssMap = {
  overflowX: "hidden",     // CHANGED
  overflowY: "auto",
  minHeight: "0",
  gridRow: "1",
  overflowWrap: "anywhere", // CHANGED: long hashes/URLs/errors may break
  wordBreak: "break-word",  // CHANGED: backup for stubborn tokens
  whiteSpace: "pre-wrap",

  minWidth: "0",           // CHANGED
  maxWidth: "100%",        // CHANGED

  fontSize: _fontSize.smol,
  color: OKLCH_FLEURS.blazeOrange,
} as const;

export const TP_LOG_ROWcss = (line: string): CssMap => {
  return {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere", // CHANGED
    wordBreak: "break-word",  // CHANGED
    overflowX: "hidden",      // CHANGED
    minWidth: "0",
    maxWidth: "100%",         // CHANGED

    fontFamily: SYS_MONOfont,
    fontSize: _fontSize.smol,
    textAlign: "end",
    color: get_line_color(line),
  };
};
