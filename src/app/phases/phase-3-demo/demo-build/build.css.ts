// build.css.ts

import type { CssMap } from "hson-live/types";
import  { TEST_ACTION_BTN } from "../../../../tests/demo-test/tp.css";
import { $cols_, ACID_WASH_OKLCH } from "../../../core/consts/colors.consts";
import { $GRID_GAPstr } from "../../../core/consts/ui-consts";
import  { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { MENU_FONT } from "../../../core/consts/ui-consts";
import { PANEL_TEXTAREAcss } from "../../../ui/panel/tp-panels.css";

// --- root that lives inside build div ---
export const BUILD_ROOTcss: CssMap = {
  // actual two-pane split
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: $GRID_GAPstr,
};


// Header row pinned at top of each pane
export const BUILD_HEADcss: CssMap = {
  // compact header row
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: "0",
  minHeight: "0",
  height: "auto",
  paddingBottom: "2px",
  fontSize: "2rem",
  fontWeight: "700",
};

export const BUILD_TITLEcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: "22px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: OKLCH_FLEURS.cyanDust,
  flexShrink: "0",
};

export const BUILD_SPACERcss: CssMap = {
  marginLeft: "auto",
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
  borderRadius: "10px",
  background: $cols_.bckdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
};

// Input textarea: just reuse PANEL_TEXTAREAcss, add padding back if you want
export const BUILD_TEXTAREAcss: CssMap = {
  ...PANEL_TEXTAREAcss,

  // truly fill the pane
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  boxSizing: "border-box",
  resize: "none",
  border: `1px solid ${OKLCH_FLEURS.bruisedPlum}`,

  background: $cols_.bckdeep,
  color: ACID_WASH_OKLCH.straw,
  lineHeight: "1.8",
  padding: "10px",
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
  fontFamily: MENU_FONT,
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
fontFamily: MENU_FONT,
  fontSize: "14px",
  letterSpacing: "0.06em",
};

// Focused-only status ("valid/invalid/...")
export const BUILD_STATUScss: CssMap = {
  position: "absolute",
  top: "10px",
  right: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0",
  fontFamily: MENU_FONT,
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

// Buttons: reuse TEST_ACTION_BTN so the look stays coherent
export const BUILD_BTNcss: CssMap = {
  ...TEST_ACTION_BTN,
  padding: "8px 10px",
  borderRadius: "12px",
  background: $cols_.bckdeep,
  color: OKLCH_FLEURS.sourSage,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  flexShrink: "0",
};

// Toggle container for Render/HTML
export const BUILD_TOGGLEcss: CssMap = {
  display: "grid",
  gridAutoFlow: "column",
  gap: "8px",
  marginLeft: "auto",
  alignItems: "center",
};

// Tabs (plain div “buttons”)
export const BUILD_TABcss: CssMap = {
  ...TEST_ACTION_BTN,
  padding: "8px 10px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.18)",
  color: ACID_WASH_OKLCH.bruisedPlum,
  flexShrink: "0",
};

export const BUILD_TAB_ACTIVEcss: CssMap = {
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
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
  borderRadius: "10px",
  background: $cols_.bckdeep,
  border: `2px solid ${OKLCH_FLEURS.bruisedPlum}`,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
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
  border: "0",
  outline: "none",

  padding: "10px",
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
  borderRadius: "14px",
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