import type { CssMap } from "hson-live/types";
import { $red_etc_, ACID_WASH_RGBA, $ylw_, $gry_ } from "../../app/core/consts/colors.consts";
import { øCOLS, SYS_SMOLfont, TXTcol_MAIN, øfontWeight, $LAYOUT_COLUMN_WIDTH } from "../../app/core/consts/ui-consts";
import { GRID_GAPstr, øtextSize, TXTcol_CODE, TXTcol_MENU, øHSON_COL } from "../../app/core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { UI_BTN_STDcss, UI_BTN_HOVERcss } from "../../app/ui/panels/panels.css";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";
import { get_line_color } from "./test-helpers";

export const TEST_CHIP_VALUEcss = {
  fontSize: øtextSize.main,
  fontWeight: øfontWeight.fat,
  lineHeight: "1",
  letterSpacing: "0.01em",
}

export const CONTROL_ROWcss: CssMap = {
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "1fr 2fr 1fr",
  gap: "8px",
  gridColumn: "1 / 2",
  gridRow: "1",
  // background: "transparent",
  border: "none",
  boxShadow: "none",
};

export const TEST_CHIP_LABELcss = {
  marginTop: "4px",
  fontSize: øtextSize.main,
  lineHeight: "1",
  letterSpacing: "0.06em",
  textTransform: "lowercase",
  whiteSpace: "nowrap",
}


export const TEST_CLEAR_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(TXTcol_MENU),
  alignItems: "center",
  background: øCOLS.backlo,
  color: TXTcol_MENU,
  fontSize: øtextSize.main,
}


export const TEST_RUN_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(ACID_WASH_RGBA.fadedMint),
  alignItems: "center",
  color: ACID_WASH_RGBA.fadedMint,
  fontSize: øtextSize.main,
};

export const TEST_SELECTORcss: CssMap = {
  minWidth: "20ch",
  padding: "10px 8px 10px 20px",
  boxSizing: "content-box",

  ...FONT_FAM_MONO,

  // background: $cols_.backdeep,
  color: TXTcol_MAIN,
  border: "1px solid rgba(255,255,255,0.2)",
  outline: "none",
  _hover: {
    border: `2px solid ${OKLCH_FLEURS.fadedGold}`
  }
} as const;

export const TEST_LOGGERcss: CssMap = {
  // padding: "5px",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
} as const;

export const TEST_ROW_CONTAINERcss = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "1fr 1fr auto",
  gridTemplateRows: "1fr",
  gridRow: "2",
  gridColumn: "1 / 3"

};

export const TEST_CONTENTcss: CssMap = {
  marginTop: "1rem",
  display: "grid",
  gridTemplateColumns: "auto " + $LAYOUT_COLUMN_WIDTH,
  gridColumn: "1 /3",
  gridRow: "1",
  overflow: "hidden",
};

export const TEST_INSPECTOR_PANEcss: CssMap = {
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  // margin: "0 1rem 1rem 0",
  // inset: "0",
  gridColumn: "1",
};

export const TEST_LOG_PANEcss: CssMap = {
  overflow: "hidden",
  display: "grid",
  // gridTemplateRows: "minmax(0, 1fr)",
  gridColumn: "2",
};

export const TP_ROOTcss: CssMap = {
  width: "100%",
  height: "100%",

}
export const TEST_CHIP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: "8px",
  gridRow: "1",
  gridColumn: "2 / 3",
  padding: "0",
}

export const MAKE_CHIP_DEFAULTcss = {
  padding: "8px 8px",
  display: "grid",
  gridTemplateRows: "auto auto",
  justifyItems: "center",
  alignContent: "center",
  minHeight: "44px",
  minWidth: "44px",
  boxSizing: "border-box",
  overflow: "hidden",
  background: øCOLS.backlo,
  transition: "transform 90ms ease, filter 140ms ease",
};

export const UI_PANELcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: GRID_GAPstr,
  minHeight: "0",
  minWidth: "0",
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  overflowY: "auto",
  maxHeight: "100%",
  background: øCOLS.backlo,
};

export const UI_TEXTcss = {
  height: "100%",
  minWidth: "0",
  resize: "none",
  width: "100%",
  boxSizing: "border-box",
  ...FONT_FAM_MONO,
  // background: COLORS_.bckdeep,
  border: "none",
  padding: "10px",
  color: TXTcol_MENU,
  outline: "none"
};

export const PANEL_BRANCHcss: CssMap = {
  display: "grid",
  // padding: "10px",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  gridTemplateColumns: `1fr 1fr`,
  gridTemplateRows: "6fr auto",
  background: øCOLS.backlo,
};

export const LOG_SPANcss = (line: string) => {
  return {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    minWidth: "0",
    color: get_line_color(line),
    marginLeft: "1ch",
  }
}