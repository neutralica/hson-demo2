// build.css.ts

import type { CssMap } from "hson-live/types";
import { ACID_WASH_OKLCH } from "../../../core/consts/colors.consts";
import { _COLS } from "../../../core/consts/ui-consts";
import { _TXT, COLOR_FOR_FMT_, GRID_GAPstr, TXTcol_ALT, TXTcol_CODE, TXTcol_MAIN } from "../../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { MONO_MAINfont } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { PANEL_TEXTAREAcss } from "../../../../tests/demo-test/tp-panels.css";
import { OKLCH_VIBRANT } from "../../../core/consts/vibrant-oklch";
import { UI_BTN_STDcss } from "../../../ui/panels/panels.css";

// --- root that lives inside build div ---
export const BUILD_ROOTcss: CssMap = {
  // actual two-pane split
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: GRID_GAPstr,
};

export const BUILD_HEADcss: CssMap = {
  position: "relative",
  zIndex: "5",
  minHeight: "2rem",
  padding: "6px",
  background: _COLS.bckdeep,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  // gap: "2ch",
};

export const BUILD_TITLEcss: CssMap = {
  position: "relative",
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.main,
  letterSpacing: "0.14em",
  textTransform: "lowercase",
  alignSelf: "flex-end",
  color: OKLCH_VIBRANT.cyanSeaLaser,
  flexShrink: "0",
};

// Wrap for overlays + textarea/preview
export const BUILD_TEXTWRAPcss: CssMap = {
  // wrapper fully fills body
  position: "relative",
  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: _COLS.bckdeep,
};

export const BUILD_TEXTAREAcss: CssMap = {
  ...PANEL_TEXTAREAcss,

  boxShadow: "inset 0 0 25px 1px " + set_alpha(COLOR_FOR_FMT_["hson"], 0.6),
  color: TXTcol_ALT,
  caretColor: "auto",
  fontSize: _TXT.reg,
  _focus: {
    boxShadow: "inset 0 0 25px 1px " + COLOR_FOR_FMT_["hson"],

  }

};

// Watermarks (same idea as parse panels)
export const BUILD_WATERMARK_FMTcss: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.08",
  fontFamily: MONO_MAINfont,
  fontSize: "72px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export const BUILD_WATERMARK_EMPTYcss: CssMap = {
  position: "absolute",
  left: "14px",
  bottom: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.25",
  fontFamily: MONO_MAINfont,
  fontSize: "14px",
  letterSpacing: "0.06em",
};

// Focused-only status ("valid/invalid/...")
export const BUILD_STATUScss: CssMap = {
  position: "relative",
  pointerEvents: "none",
  userSelect: "none",
  // opacity: "0",
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.reg,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};


export const BUILD_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  padding: "4px 4px",
  background: _COLS.bckdeep,
  color: TXTcol_CODE,
  flex: "0 0 auto",
};

// Toggle container for Render/HTML
export const BUILD_TOGGLEcss: CssMap = {
  display: "grid",
  gridAutoFlow: "column",
  gap: "8px",
  // marginLeft: "auto",
  // alignItems: "baseline",
};

// Tabs (plain div “buttons”)
export const BUILD_TABcss: CssMap = {
  ...UI_BTN_STDcss,
  padding: "8px 4px",
  flexShrink: "0",
};

export const BUILD_TAB_ACTIVEcss: CssMap = {
  color: ACID_WASH_OKLCH.cyanDust,
};

// Preview host: fills available space and scrolls if content is large
export const BUILD_PREVIEWcss: CssMap = {
  // fill output pane body cleanly
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  overflow: "auto",
  boxSizing: "border-box",
  padding: "10px",
  background: _COLS.bckdeep,
};

// HTML output box: same textarea styling
export const BUILD_HTMLBOXcss: CssMap = {
  ...PANEL_TEXTAREAcss,

  // same fill behavior as source textarea
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  boxSizing: "border-box",
  resize: "none",
  outline: "none",

  boxShadow: "inset 0 0 25px 1px " + set_alpha(COLOR_FOR_FMT_["hson"], 0.6),
  color: TXTcol_ALT,
  caretColor: "auto",
  fontSize: _TXT.reg

};

export const BUILD_PANEcss: CssMap = {
  // stable head/body stack
  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: "10px",
  padding: "10px",
  boxSizing: "border-box",
  // overflow: "hidden",
};

export const BUILD_BODYcss: CssMap = {
  position: "relative",
  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};