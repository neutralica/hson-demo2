// demo.css.ts

import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { OKLCH_VIBRANT, OKLCH_NEUTRALS, OKLCH_FOREST } from "../../core/consts/oklch.consts";
import { _fontWeight, SYS_MONOfont, $SIDEBAR_WIDTH, GRID_GAPstr, _fontSize } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { HSON_FONT_str } from "../../ui/wordmark/wordmark.css";
import { HSON_LIVE_GRAFFITIstr } from "../../core/consts/ui-consts";

function cssFriendlyText(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, "\\A ")}"`;
}
const hsonContent = cssFriendlyText(HSON_LIVE_GRAFFITIstr);

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
  background: _colors.backlo,
  opacity: "0.9",
  textIndent: "1rem",
  paddingLeft: "1ch",
  fontWeight: _fontWeight.main,
  __before: {},
  _hover: {
    // fontWeight: øfontWeight.main,
    background: _colors.txt.menu,
    color: _colors.backhi,
    __before: {
      content: ">>",
      position: "absolute",
      left: "-1rem"
    }
  },
  _active: {
    background: _colors.backhi,
    color: _colors.bluelike,
    fontWeight: _fontWeight.fat,
  }
}


export const MENU_BOXcss: CssMap = {
  position: "relative",
  lineHeight: "2.5rem",
};

export const DEMO_HEADLINEcss: CssMap = {
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
  fontWeight: _fontWeight.main,
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
  zIndex: "50"
};

export const DEMO_SCREENcss: CssMap = {
  position: "fixed",
  inset: "0",
  // maxWidth: "100%",
  // width: "100%",
  // height: "100%",
  overflow: "hidden",
  // isolation: "isolate",
  pointerEvents: "none",
  minHeight: "0",
  boxSizing: "border-box",
  overscrollBehaviorY: "none", 
  display: "grid",
  gridTemplateColumns: $SIDEBAR_WIDTH + " auto",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: GRID_GAPstr,

}

export const HSON_GRAFFITIcss: CssMap = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  whiteSpace: "pre",
  fontFamily: "monospace", // best density; do not change to system mono
  color: _colors.graffiti,
  boxSizing: "border-box",
  fontSize: "min(16px, calc((100vw) / 84))",
  lineHeight: "1",
  width: "100%",
  textAlign: "center",
  maxWidth: "calc(100vw)",
  userSelect: "none",
  textShadow: "18px 5px 2px " + set_alpha(_colors.graffitiShadow, 0.12),
}

export const HSON_SUBcss: CssMap = {
  ...FONT_FAM_MONO,
  position: "relative",
  textWrap: "nowrap",
  color: OKLCH_NEUTRALS.ash,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "0.5rem",
  userSelect: "none",
  textIndent: "1rem",
  paddingLeft: "1ch",
}

export const OKLCH_HOSTcss = {
  position: "fixed",
  zIndex: "20",
  top: "calc(50% + 0.5rem)",
  right: "1rem",
  bottom: "1rem",
  left: "auto",
  width: "min(36rem, calc(100% - 2rem))",
  maxHeight: "calc(50% - 1.5rem)",
  boxSizing: "border-box",
  overflow: "auto",
};


export const COPYRITEcss: CssMap = {
  fontFamily: SYS_MONOfont,
  fontSize: _fontSize.smol,
  position: "fixed",
  bottom: "0.2rem",
  right: "1rem",
  color: _colors.txt.copyright,
  zIndex: "-10",
};

