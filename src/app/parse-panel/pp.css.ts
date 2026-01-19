// parse-panels.css.ts
import type { CssMap } from "hson-live/types";
import { $COL, bckColor } from "../consts/color.consts";

export const PP_ROOT_CSS: CssMap = {
  // attach this to #parsing-panels-root
  position: "absolute",
  left: "50%",
  top: "52%",
  transform: "translate(-50%, -50%)",

  width: "min(1120px, 92vw)",
  height: "max(640px, 72vh)",

  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",

  // “framework” feel
  padding: "16px",
  borderRadius: "18px",
  backgroundColor: bckColor,
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.06)",
    "0 18px 60px rgba(0,0,0,0.35)",
  ].join(", "),
  zIndex: "70",

  // typography baseline (terminal-ish)
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  color: "rgba(235,235,235,0.84)",
};

export const PP_PANEL_CSS: CssMap = {
  // attach this to each <section data-role="panel-...">
  position: "relative",
  display: "grid",
  gridTemplateRows: "7fr 1fr 1fr 1fr",
  gap: "10px",

  padding: "12px",
  borderRadius: "16px",
  maxHeight: "600px",
  background: bckColor,
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.07)",
    "inset 0 -18px 30px rgba(0,0,0,0.28)",
  ].join(", "),

  overflow: "hidden",
  isolation: "isolate",
};

export const PP_CHIP_CSS: CssMap = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  height: "22px",
  padding: "0 10px",
  borderRadius: "999px",

  fontSize: "12px",
  letterSpacing: "0.02em",
  textTransform: "uppercase",

  background: "rgba(255,255,255,0.05)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
  color: "rgba(235,235,235,0.70)",
};

export const PP_BYTES_CSS: CssMap = {
  marginLeft: "8px",
  fontSize: "12px",
  opacity: "0.62",
};

export const PP_COPYBTN_CSS: CssMap = {
  marginLeft: "auto",
  height: "26px",
  padding: "0 10px",
  borderRadius: "10px",

  background: "rgba(255,255,255,0.05)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
  color: "rgba(235,235,235,0.76)",

  fontSize: "12px",
  letterSpacing: "0.02em",
  cursor: "pointer",
  userSelect: "none",
};

export const PP_TEXTAREA_CSS: CssMap = {
  width: "100%",
  height: "100%",
  resize: "none",

  padding: "12px 12px",
  borderRadius: "12px",
  border: "none",
  outline: "none",

  background: $COL.greyBlack ?? "rgba(26,26,26,1)",
  color: "rgba(232,236,242,0.86)",

  lineHeight: "1.35",
  fontSize: "12.5px",
  letterSpacing: "0.01em",

  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.06)",
    "inset 0 14px 22px rgba(0,0,0,0.28)",
    "0 0 10px rgba(255,255,255,0.03)",
  ].join(", "),

  // keep it “display-ish”
  caretColor: "rgba(255,255,255,0.55)",
};


export const PP_CHIP_VALID_TRUE_CSS: CssMap = {
  background: "rgba(120,255,180,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,180,0.25)",
  color: "rgba(170,255,210,0.86)",
};

export const PP_CHIP_VALID_FALSE_CSS: CssMap = {
  background: "rgba(255,120,150,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(255,120,150,0.25)",
  color: "rgba(255,180,195,0.86)",
};

