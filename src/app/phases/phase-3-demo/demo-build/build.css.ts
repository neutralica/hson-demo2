// build.css.ts

import type { CssMap } from "hson-live/types";
import { ACID_WASH_OKLCH, OKLCH_NEUTRALS } from "../../../core/consts/oklch.consts";
import { $CONTENT_WIDTH, $SIDEBAR_WIDTH } from "../../../core/consts/ui-consts";
import { _cols } from "../../../core/consts/colors.consts";
import { øfontSize } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { UI_2STACK_VALcss, UI_BTN_STDcss, UI_BTNcss, UI_STACK_LABELcss } from "../../../ui/panels/panels.css";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { UI_TEXTcss } from "../../../ui/panels/panels.css";

// --- root that lives inside build div ---
export const BUILD_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: "100%",
    maxWidth: "calc(" + $SIDEBAR_WIDTH + " + " + $CONTENT_WIDTH + ")",
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
  background: _cols.backlo,

};

export const BUILD_TEXTAREAcss: CssMap = {
  ...UI_TEXTcss,
  color: _cols.fmt.hson,
  fontSize: øfontSize.smol,
  padding: "15px",
  boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
  _focus: {
    boxShadow: "inset 0 0 15px 1px " + set_alpha(_cols.fmt.hson, 0.5),

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
  alignItems: "center",
};

// Tabs (plain div “buttons”)
export const BUILD_TABcss: CssMap = {
  ...UI_BTN_STDcss,
  padding: "0.1rem 0.45rem",
  minHeight: "1.35rem",
  flexShrink: "0",
  fontSize: øfontSize.smol,
  lineHeight: "1",
  letterSpacing: "0.04em",
  color: _cols.txt.code,
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
  background: _cols.backlo,
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

  boxShadow: "inset 0 0 25px 1px " + set_alpha(_cols.fmt.html, 0.6),
  color: _cols.fmt.html,
  caretColor: "auto",
  // fontSize: øfontSize.main

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
  // padding: "10px",
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
export const BUILD_HEADER_BTNcss: CssMap = {
  ...UI_BTNcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
  // minHeight: "1.35rem",
  padding: "0.4em 0.5em",
  letterSpacing: "0.04em",
};

export const BUILD_HEADER_VALUEcss: CssMap = {
  ...UI_2STACK_VALcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
};

export const BUILD_HEADER_LABELcss: CssMap = {
  ...UI_STACK_LABELcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
};

