// parse-panels.css.ts
import type { CssMap } from "hson-live/types";
import { $COL } from "../consts/colors.consts";


/**
 * HOLO: overall projected plane
 * NOTE: we rely on an extra child overlay element (#pp-holo-fx) created in pp_factory.
 */
export const PP_ROOT_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "54%",
  width: "min(1180px, 94vw)",
  height: "max(620px, 70vh)",

  // Projection: tilt the whole UI like it’s hovering over the surface.
  transform: [
    "translate(-50%, -50%)",
    // "perspective(1100px)",
    "rotateX(26deg)",
    // "rotateZ(-21deg)",
    // "translateZ(12px)",
  ].join(" "),
  transformStyle: "preserve-3d",

  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",

  padding: "18px",
  borderRadius: "22px",
  isolation: "isolate",
  pointerEvents: "all",
  zIndex: "70",

  // The plane itself should be almost invisible.
  backgroundColor: $COL._backColor,

  // Keep the “projection” feel: faint perimeter + soft lift, NOT a big box.
  boxShadow: [
    "0 12px 70px rgba(0,0,0,0.55)",
    "inset 0 0 0 1px rgba(120,255,210,0.10)",
  ].join(", "),

  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  color: "rgba(200,255,230,0.84)",
};

/**
 * A single overlay layer for scanlines / sheen / haze.
 * This is an actual node (no pseudo), positioned absolute inside root.
 */
export const PP_HOLO_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  borderRadius: "22px",
  overflow: "hidden",

  // “Laser in air”: scanlines + diagonal sheen + faint bloom
  background: [
    // scanlines
    "repeating-linear-gradient(0deg, rgba(140,255,220,0.060) 0 1px, transparent 1px 9px)",
    // vertical micro-grain
    "repeating-linear-gradient(90deg, rgba(140,255,220,0.020) 0 1px, transparent 1px 14px)",
    // diagonal sheen (makes it feel like volume)
    "linear-gradient(125deg, transparent 0%, rgba(140,255,220,0.045) 38%, transparent 70%)",
    // soft bloom
    "radial-gradient(120% 120% at 50% 30%, rgba(140,255,220,0.030), transparent 62%)",
  ].join(", "),
  opacity: "0.34",
  mixBlendMode: "screen",
  filter: "blur(0.2px)",
};

export const PP_PANEL_CSS: CssMap = {
  position: "relative",
  display: "grid",
  gridTemplateRows: "1fr auto auto",
  gap: "10px",

  padding: "14px",
  borderRadius: "16px",
  overflow: "hidden",
  isolation: "isolate",

  // “Glass” panel: mostly transparent
  background: [
    "linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.18))",
    "radial-gradient(120% 120% at 50% 20%, rgba(120,255,210,0.06), transparent 55%)",
  ].join(", "),

  // Neon outline + subtle depth. Avoid the rubber o-ring: keep these thin.
  boxShadow: [
    "inset 0 0 0 1px rgba(120,255,210,0.22)",
    "0 0 0 1px rgba(120,255,210,0.10)",
    "0 12px 40px rgba(0,0,0,0.45)",
  ].join(", "),

  // This is key: the panel is light, not paint.
  mixBlendMode: "screen",
};

export const PP_TEXTAREA_CSS: CssMap = {
  width: "100%",
  height: "100%",
  resize: "none",

  padding: "12px",
  borderRadius: "12px",
  border: "none",
  outline: "none",

  // Transparent "air". Let the scene show through.
  background: "transparent",

  // NEGATIVE SPACE GLYPHS:
  // Fill is transparent so the letters read as holes.
  // The glow is the "laser ink" around the holes.
  color: "rgba(0,0,0,0)",
  textShadow: [
    "0 0 1px rgba(140,255,220,0.85)",
    "0 0 8px rgba(140,255,220,0.40)",
    "0 0 18px rgba(140,255,220,0.18)",
  ].join(", "),

  lineHeight: "1.35",
  fontSize: "12.5px",
  letterSpacing: "0.02em",

  caretColor: "rgba(160,255,230,0.75)",

  // Only a thin boundary; no heavy inset bowls.
  boxShadow: [
    "inset 0 0 0 1px rgba(120,255,210,0.22)",
    "0 0 18px rgba(120,255,210,0.08)",
  ].join(", "),
};

export const PP_CHIP_CSS: CssMap = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "22px",
  padding: "0 10px",
  borderRadius: "999px",

  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",

  background: "rgba(0,0,0,0.14)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
  color: "rgba(170,255,235,0.80)",

  mixBlendMode: "screen",
};

export const PP_BYTES_CSS: CssMap = {
  marginLeft: "8px",
  fontSize: "12px",
  opacity: "0.68",
  color: "rgba(170,255,235,0.72)",
  mixBlendMode: "screen",
};

export const PP_COPYBTN_CSS: CssMap = {
  marginLeft: "auto",
  height: "26px",
  padding: "0 10px",
  borderRadius: "10px",

  background: "rgba(0,0,0,0.14)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
  color: "rgba(170,255,235,0.80)",

  fontSize: "12px",
  letterSpacing: "0.04em",
  cursor: "pointer",
  userSelect: "none",

  mixBlendMode: "screen",
};

export const PP_CHIP_VALID_TRUE_CSS: CssMap = {
  background: "rgba(0,0,0,0.14)",
  boxShadow: [
    "inset 0 0 0 1px rgba(120,255,180,0.34)",
    "0 0 16px rgba(120,255,180,0.12)",
  ].join(", "),
  color: "rgba(190,255,220,0.88)",
};

export const PP_CHIP_VALID_FALSE_CSS: CssMap = {
  background: "rgba(0,0,0,0.14)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,120,150,0.34)",
    "0 0 16px rgba(255,120,150,0.12)",
  ].join(", "),
  color: "rgba(255,190,205,0.90)",
};