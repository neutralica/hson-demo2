// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, } from "../../../core/consts/old-rgb.consts";
import { SYS_SANSfont, SYS_SMOLfont, øfontWeight, $SIDEBAR_WIDTH, MENU_OKLCH, GRAF_OKLCH, GRAF_OKLCHname } from "../../../core/consts/ui-consts";
import { $MENU_SHADOW, _COLS, øHSON_COL, TXTcol_GREY } from "../../../core/consts/colors.consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { GRID_GAPstr, øfontSize, SYS_MONOfont } from "../../../core/consts/ui-consts";
import { GRAFFITIcol, TXTcol_MENU, BLUELIKEcol, FADE_1col, COPYRITEcol } from "../../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { CssManager } from "hson-live";


export const UI_ROOTcss: CssMap = {
  // display: "grid",
  // gridTemplateRows: "minmax(0, 1fr)",
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

export const MAIN_MENUcss: CssMap = {
  ...FONT_FAM_MONO,
  userSelect: "none",
  pointerEvents: "all",
  cursor: "pointer",
  lineHeight: "2",
  background: _COLS.backlo,
  opacity: "0.9",
  textIndent: "1rem",
  paddingLeft: "1ch",
  fontWeight: øfontWeight.main,
  __before: {},
  _hover: {
    // fontWeight: øfontWeight.main,
    background: MENU_OKLCH,
    color: _COLS.backhi,
    __before: {
      content: ">>",
      position: "absolute",
      left: "-1rem"
    }
  },
  _active: {
    background: _COLS.backhi,
    color: BLUELIKEcol,
    fontWeight: øfontWeight.fat,
  }
}


export const MENU_BOXcss: CssMap = {
  position: "relative",
  lineHeight: "2.5rem",
};

export const DEMO_HEADLINEcss: CssMap = {
  textShadow: "1px 1px 62px hotpink",
  display: "flex",
  alignContent: "end",

}

export const MENU_CONTAINERcss: CssMap = {
  position: "relative", // not absolute

  display: "flex",
  flexDirection: "column",

  alignItems: "stretch",
  width: "auto",
  height: "100%",
  // pointerEvents: "none",
  marginLeft: "1rem",
  marginTop: "1rem",
  zIndex: "40",

};


export const HSON_WORDcss: CssMap = {
  fontSize: "4rem",
  fontFamily: SYS_MONOfont,
  fontWeight: øfontWeight.main,
  width: "0.5em",
  userSelect: "none",
  lineHeight: "0.9",
  verticalAlign: "bottom",
  pointerEvents: "auto",

}

export const DEMOcss: CssMap = {
  position: "fixed",
  inset: "0",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  overflow: "hidden",

  pointerEvents: "none",
  boxSizing: "border-box"
};

export const FX_LAYERcss: CssMap = {
  position: "fixed",
  top: "0",
  left: "0",
  height: "100%",
  width: "100%",
  background: `linear-gradient(transparent 50%,${set_alpha(OKLCH_VIBRANT.cyanSeaLaser, 0.1)})`,
  zIndex: "50"
};
/**
 * GLASS (screen)
 * - keep your greyBlack
 * - stop huge bloom that reads like a seal / fog
 */
export const DEMO_SCREENcss: CssMap = {
  position: "fixed",
  inset: "0",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "none",
  minHeight: "0",
  boxSizing: "border-box",
  overscrollBehaviorY: "none", // not sure it will do what I want
  display: "grid",
  gridTemplateColumns: $SIDEBAR_WIDTH + " auto",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: GRID_GAPstr,

}

export const HSON_GRAFFITIcss: CssMap = {
  position: "fixed",
  margin: "2rem",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  whiteSpace: "pre",
  fontFamily: "monospace", // best density; do not change to system mono
  color: GRAF_OKLCH,
  boxSizing: "border-box",
  mixBlendMode: "multiply",
  fontSize: "min(16px, calc((100vw) / 84))",
  lineHeight: "1",
  width: "100%",
  textAlign: "center",
  maxWidth: "calc(100vw)",
  userSelect: "none",
}

export const HSON_SUBcss: CssMap = {
  ...FONT_FAM_MONO,
  position: "relative",
  textWrap: "nowrap",
  color: OKLCH_NEUTRALS.ash,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  userSelect: "none",
  textIndent: "1rem",
  paddingLeft: "1ch",
}



export const OKLCH_HOSTcss = {
  position: "fixed",
  right: "1.2rem",
  bottom: "1.2rem",
  zIndex: "20",
};


export const COPYRITEcss: CssMap = {
  fontFamily: SYS_SANSfont,
  fontSize: øfontSize.smol,
  position: "fixed",
  bottom: "0.2rem",
  right: "1rem",
  color: COPYRITEcol,
  zIndex: "-10",
};