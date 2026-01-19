// pp.terminal.css.ts
import type { CssMap } from "hson-live/types";
import { $COL } from "../consts/colors.consts";

export const PP_ROOT_TG_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "54%",
  transform: "translate(-50%, -50%)",

  width: "min(1180px, 94vw)",
  height: "min(640px, 72vh)",

  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",

  padding: "18px",
  borderRadius: "16px",

  // mostly-transparent; let the “screen” show through
  background: $COL._backColor,

  // tension lines, not “cards”
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.10)",
    "0 18px 80px rgba(0,0,0,0.55)",
  ].join(", "),

  // typography baseline
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: "12.5px",
  letterSpacing: "0.01em",
  lineHeight: "1.35",
  color: "rgba(235,238,246,0.84)",

  // subtle “CRT air”
  filter: "saturate(1.05) contrast(1.02)",
};

export const PP_PANEL_TG_CSS: CssMap = {
  position: "relative",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  gap: "10px",

  padding: "10px 10px 12px",
  borderRadius: "12px",

  background: "rgba(0,0,0,0.28)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.08)",
    "inset 0 -22px 30px rgba(0,0,0,0.35)",
  ].join(", "),

  overflow: "hidden",
  isolation: "isolate",
};

export const PP_PANEL_HEADER_TG_CSS: CssMap = {
  display: "flex",
  alignItems: "baseline",
  gap: "10px",

  padding: "6px 8px 8px",
  borderRadius: "10px",

  background: "rgba(255,255,255,0.03)",
  boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)",

  // small halo without skeuo
  textShadow: "0 0 10px rgba(140,210,255,0.10)",
};

export const PP_FMT_TAG_TG_CSS: CssMap = {
  fontSize: "11px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  opacity: "0.82",
};

export const PP_CHIP_TG_CSS: CssMap = {
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  minWidth: "64px",
  height: "20px",
  padding: "0 10px",
  borderRadius: "999px",

  fontSize: "11px",
  letterSpacing: "0.10em",
  textTransform: "uppercase",

  background: "rgba(255,255,255,0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
  color: "rgba(235,235,235,0.70)",
};

export const PP_CHIP_VALID_TG_CSS: CssMap = {
  background: "rgba(140,255,210,0.09)",
  boxShadow: "inset 0 0 0 1px rgba(140,255,210,0.24)",
  color: "rgba(185,255,230,0.88)",
};

export const PP_CHIP_INVALID_TG_CSS: CssMap = {
  background: "rgba(255,140,170,0.09)",
  boxShadow: "inset 0 0 0 1px rgba(255,140,170,0.24)",
  color: "rgba(255,200,212,0.86)",
};

export const PP_TEXTAREA_TG_CSS: CssMap = {
  width: "100%",
  height: "100%",
  resize: "none",

  padding: "12px",
  borderRadius: "10px",
  border: "none",
  outline: "none",

  background: "rgba(0,0,0,0.46)",
  color: "rgba(230,236,248,0.88)",

  lineHeight: "1.35",
  fontSize: "12.5px",
  letterSpacing: "0.01em",

  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,0.08)",
    "inset 0 18px 26px rgba(0,0,0,0.35)",
  ].join(", "),

  caretColor: "rgba(180,240,255,0.70)",

  // “terminal” feel: no iOS bevels
  appearance: "none",
};

export const PP_FOOTER_TG_CSS: CssMap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "6px 8px 2px",
  opacity: "0.86",
};

export const PP_BYTES_TG_CSS: CssMap = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: "0.62",
};

export const PP_COPYBTN_TG_CSS: CssMap = {
  marginLeft: "auto",
  height: "24px",
  padding: "0 10px",
  borderRadius: "10px",

  background: "rgba(255,255,255,0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
  color: "rgba(220,235,255,0.78)",

  fontSize: "11px",
  letterSpacing: "0.10em",
  textTransform: "uppercase",

  cursor: "pointer",
  userSelect: "none",
};

export const PP_COPYBTN_BUSY_TG_CSS: CssMap = {
  background: "rgba(160,220,255,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(160,220,255,0.22)",
  color: "rgba(200,245,255,0.92)",
};

export const PP_RULE_TG_CSS: CssMap = {
  position: "absolute",
  left: "10px",
  right: "10px",
  top: "42px",
  height: "1px",
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
  opacity: "0.9",
  pointerEvents: "none",
};