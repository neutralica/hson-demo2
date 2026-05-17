import type { CssMap } from "hson-live/types";
import { $red_etc_, ACID_WASH_RGBA, $ylw_, $gry_ } from "../../app/core/consts/colors.consts";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch";
import { _COLS, SYS_SMOLfont } from "../../app/core/consts/ui-consts";
import { GRID_GAPstr, _TXT, TXTcol_CODE, TXTcol_MENU, HSON_COLOR_ } from "../../app/core/consts/ui-consts";
import { PANEL_SAFETYcss } from "../../app/phases/phase-3-demo/demo.css";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { $CHIP_WIDTHstr } from "../tests.consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { UI_BTN_STDcss, UI_BTN_HOVERcss } from "../../app/ui/panels/panels.css";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";

export const TEST_CHIP_VALUEcss = {
  fontSize: _TXT.main,
  fontWeight: "700",
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
  fontSize: _TXT.main,
  lineHeight: "1",
  letterSpacing: "0.06em",
  textTransform: "lowercase",
  whiteSpace: "nowrap",
}


export const TEST_CLEAR_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(TXTcol_MENU),
  alignItems: "center",
  background: _COLS.backlo,
  color: TXTcol_MENU,
  fontSize: _TXT.main,
}


export const TEST_RUN_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(ACID_WASH_RGBA.fadedMint),
  alignItems: "center",
  color: ACID_WASH_RGBA.fadedMint,
  fontSize: _TXT.main,
};

export const TEST_SELECTORcss: CssMap = {
  minWidth: "20ch",
  padding: "10px 8px 10px 20px",
  boxSizing: "border-box",

  ...FONT_FAM_MONO,

  // background: $cols_.backdeep,
  color: OKLCH_FLEURS.fadedGold,
  border: "1px solid rgba(255,255,255,0.2)",
  outline: "none",
  _hover: {
    outline: `2px solid ${OKLCH_FLEURS.fadedGold}`
  }
} as const;

export const TEST_LOGGERcss: CssMap = {
  padding: "5px",
  boxSizing: "border-box",
  width: "100%",
  overflowY: "scroll",
  overflowX: "hidden",
  overflowWrap: "anywhere",
  minWidth: "100%",
  color: OKLCH_VIBRANT.blueCobalt,
  whiteSpace: "pre-wrap",
  // letterSpacing: "0.14em",
  // lineHeight: "1.75rem",
} as const;

export const TEST_LOG_BOXcss: CssMap = {
  gridColumn: "2 / 3",
  overflow: "auto",
  height: "100%",
  display: "grid",
  background: _COLS.backlo,
};
export const TEST_ROW_CONTAINERcss = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "1fr 1fr auto",
  gridTemplateRows: "1fr",
  gridRow: "2",
  gridColumn: "1 / 3"

};

export const TEST_CONTENTcss: CssMap = {
  padding: "1rem 1rem 0 0",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gridColumn: "1 /3",
  gridRow: "1",
  gap: GRID_GAPstr,
  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

export const TEST_INSPECTOR_PANEcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  margin: "0 1rem 1rem 0",
  gridColumn: "1",
};

export const TEST_LOG_PANEcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  maxWidth: "100%",
  margin: "0 1rem 1rem 0",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  gridColumn: "2",
  padding: "5px",
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
  background: _COLS.backlo,
  transition: "transform 90ms ease, filter 140ms ease",
};
export const UI_ROOTcss: CssMap = {
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr)",
    boxSizing: "border-box",
    overflow: "hidden",
    gridColumn: "2 / 3",
    gridRow: "1 / 2",

    minWidth: "0",
    minHeight: "0",
    width: "100%",
    height: "100%",

    position: "relative",
    pointerEvents: "auto",
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
    background: _COLS.backlo,
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
    color: OKLCH_FLEURS.cyanDust,
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
    background: _COLS.backlo,
};
