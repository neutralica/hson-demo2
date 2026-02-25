// build.css.ts
import type { CssMap } from "hson-live/types";
import { $GRID_GAPstr, $txt_ } from "../../../consts/ui-consts";
import { $blu_, $cols_, $grn_, $ylw_ } from "../../../consts/colors.consts";
import { PANEL_TEXTAREAcss, TEST_ACTION_BTN } from "../panels/demo-panels.css";

// --- root that lives inside build.surface ---
export const BUILD_ROOTcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: $GRID_GAPstr,
};

// The pane "body" inside each PANELcss panel
export const BUILD_PANE_BODYcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  display: "grid",
};

// Header row pinned at top of each pane
export const BUILD_HEADcss: CssMap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: "0",
};

export const BUILD_TITLEcss: CssMap = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: $blu_.std,
  opacity: "0.9",
};

export const BUILD_SPACERcss: CssMap = {
  marginLeft: "auto",
};

// Wrap for overlays + textarea/preview
export const BUILD_TEXTWRAPcss: CssMap = {
  position: "relative",
  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  display: "grid",
};

// Input textarea: just reuse PANEL_TEXTAREAcss, add padding back if you want
export const BUILD_TEXTAREAcss: CssMap = {
  ...PANEL_TEXTAREAcss,
  color: $blu_.baby,
  fontSize: $txt_.main,
  padding: "10px", // you had this commented out on PANEL_TEXTAREAcss
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
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

// Buttons: reuse TEST_ACTION_BTN so the look stays coherent
export const BUILD_BTNcss: CssMap = {
  ...TEST_ACTION_BTN,
  padding: "8px 10px",
  borderRadius: "12px",
  background: $cols_.backdeep,
  color: $ylw_.candy,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
};

// Toggle container for Render/HTML
export const BUILD_TOGGLEcss: CssMap = {
  display: "grid",
  gridAutoFlow: "column",
  gap: "8px",
  marginLeft: "auto",
};

// Tabs (plain div “buttons”)
export const BUILD_TABcss: CssMap = {
  ...TEST_ACTION_BTN,
  padding: "8px 10px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.18)",
  color: $grn_.faded,
};

export const BUILD_TAB_ACTIVEcss: CssMap = {
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
  color: $grn_.std,
};

// Preview host: fills available space and scrolls if content is large
export const BUILD_PREVIEWHOSTcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  overflow: "auto",
  borderRadius: "10px",
  boxSizing: "border-box",
  background: $cols_.backdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  padding: "10px",
};

// HTML output box: same textarea styling
export const BUILD_HTMLBOXcss: CssMap = {
  ...PANEL_TEXTAREAcss,
  padding: "10px",
  color: $grn_.std,
};


export const BUILD_PANEcss: CssMap = {
  display: "grid",
  gridTemplateRows: "1fr",
  minHeight: "0",
  minWidth: "0",
  height: "100%"
};

export const BUILD_BODYcss: CssMap = {
  position: "relative",
  minHeight: "0",
  minWidth: "0",
  overflow: "hidden",
};

export const BUILD_WATERMARKcss: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.08",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "72px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export const BUILD_EMPTY_SYNTAXcss: CssMap = {
  position: "absolute",
  left: "14px",
  bottom: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.25",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "14px",
  letterSpacing: "0.06em",
};
