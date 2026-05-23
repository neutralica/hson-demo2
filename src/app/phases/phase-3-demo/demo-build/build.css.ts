// build.css.ts

import type { CssMap } from "hson-live/types";
import { ACID_WASH_OKLCH, OKLCH_NEUTRALS } from "../../../core/consts/oklch";
import { øCOLS } from "../../../core/consts/ui-consts";
import { øfontSize, øCOL_FOR_FMT_, GRID_GAPstr, TXTcol_ALT, TXTcol_CODE, TXTcol_MAIN } from "../../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { SYS_MONOfont } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { UI_TEXTcss } from "../../../../tests/demo-test/tp.css";
import { OKLCH_VIBRANT } from "../../../core/consts/oklch";
import { UI_BTN_STDcss } from "../../../ui/panels/panels.css";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";

// --- root that lives inside build div ---
export const BUILD_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  gridTemplateColumns: "1fr 1fr",
};

export const BUILD_TITLEcss: CssMap = {
  position: "relative",
  ...FONT_FAM_MONO,
  textTransform: "lowercase",
  height: "100%",
  width: "25%",
  textAlign: "center",
  alignContent: "flex-end",
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
  background: øCOLS.backlo,

};

export const BUILD_TEXTAREAcss: CssMap = {
  ...UI_TEXTcss,
  color: øCOL_FOR_FMT_.hson,
  fontSize: øfontSize.main,
  padding: "15px",
  boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
  _focus: {
    boxShadow: "inset 0 0 15px 1px " + set_alpha(øCOL_FOR_FMT_["hson"], 0.5),

  }

};

export const BUILD_WATERMARK_EMPTYcss: CssMap = {
  position: "absolute",
  left: "14px",
  bottom: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.25",
  ...FONT_FAM_MONO,
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
  background: øCOLS.backlo,
  boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
};

// HTML output box: same textarea styling
export const BUILD_HTMLBOXcss: CssMap = {
  ...UI_TEXTcss,

  // same fill behavior as source textarea
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  boxSizing: "border-box",
  resize: "none",
  outline: "none",

  boxShadow: "inset 0 0 25px 1px " + set_alpha(øCOL_FOR_FMT_["html"], 0.6),
  color: øCOL_FOR_FMT_.html,
  caretColor: "auto",
  fontSize: øfontSize.main

};

export const BUILD_PANEcss: CssMap = {
  // stable head/body stack
  // minWidth: "0",
  // minHeight: "0",
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