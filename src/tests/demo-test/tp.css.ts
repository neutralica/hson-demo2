import type { CssMap } from "hson-live/types";
import { $red_etc_, ACID_WASH_RGBA, $ylw_, $gry_ } from "../../app/core/consts/colors.consts";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch";
import { _COLS } from "../../app/core/consts/ui-consts";
import { GRID_GAPstr, _TXT, TXTcol_CODE, TXTcol_MENU, HSON_COLOR_ } from "../../app/core/consts/ui-consts";
import { PANEL_SAFETYcss } from "../../app/phases/phase-3-demo/demo.css";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { $CHIP_WIDTHstr } from "../tests.consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { UI_BTN_STDcss, UI_BTN_HOVERcss } from "../../app/ui/panels/panels.css";
import { OKLCH_VIBRANT } from "../../app/core/consts/oklch";

export const TEST_CHIP_VALUEcss = {
  fontSize: _TXT.unter,
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
  gridRow: "2",
  // background: "transparent",
  border: "none",
  boxShadow: "none",
};

export const TEST_CHIP_LABELcss = {
  marginTop: "4px",
  fontSize: _TXT.unter,
  lineHeight: "1",
  letterSpacing: "0.06em",
  textTransform: "lowercase",
  whiteSpace: "nowrap",
}


export const TEST_CLEAR_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(TXTcol_MENU),
  alignItems: "center",
  background: _COLS.backhi,
  color: TXTcol_MENU,
  fontSize: _TXT.subhead,
}


export const TEST_RUN_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(ACID_WASH_RGBA.fadedMint),
  alignItems: "center",
  color: ACID_WASH_RGBA.fadedMint,
  fontSize: _TXT.subhead,
};

export const TEST_SELECTORcss: CssMap = {
  minWidth: "20ch",
  padding: "10px 8px 10px 20px",
  boxSizing: "border-box",

  fontFamily: SYS_MONOfont,
  fontSize: _TXT.main,

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
  // background: $cols_.backdeep,
  fontFamily: SYS_MONOfont,
  fontSize: _TXT.unter,
  width: "100%",
  overflowY: "scroll",
  overflowX: "hidden",
  overflowWrap: "anywhere",
  minWidth: "100%",
  color: OKLCH_VIBRANT.blueCobalt,
  whiteSpace: "pre-wrap",
  // letterSpacing: "0.14em",
  lineHeight: "1.75rem",
} as const;

export const TEST_LOG_BOXcss: CssMap = {
  gridColumn: "2 / 3",
  overflow: "auto",
  height: "100%",
  display: "grid",
  background: _COLS.backhi,
};
export const TEST_ROW_CONTAINERcss = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "1fr 1fr auto",
  gridTemplateRows: "1fr",
  gridRow: "1",
  gridColumn: "1 / 3"

};

export const TEST_CONTENTcss: CssMap = {
  padding: "1rem 1rem 0 0",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gridColumn: "1 /3",
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
  ...PANEL_SAFETYcss,
  width: "100%",
  height: "100%",

}
export const TEST_CHIP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: "8px",
  gridRow: "2",
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
  background: _COLS.backhi,
  transition: "transform 90ms ease, filter 140ms ease",
};