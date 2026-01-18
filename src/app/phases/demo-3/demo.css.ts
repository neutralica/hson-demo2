// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS, VER_CSS, WORD_CSS } from "../../wordmark/wordmark.css";

// “home page” palette: mostly grayscale, small accent per letter (optional)
export const LETTER_COLOR_DEMO = {
  H: "rgb(230,230,235)",
  S: "rgb(220,220,226)",
  O: "rgb(235,235,240)",
  N: "rgb(255,225,232)",
} as const;

// If you still want per-letter accents, make them *subtle* and use as --glow
export const LETTER_ACCENT_DEMO = {
  H: "rgba(80,200,255,0.55)",
  S: "rgba(255,210,80,0.45)",
  O: "rgba(120,255,180,0.40)",
  N: "rgba(255,140,200,0.40)",
} as const;

export const LETTER_INK_DEMO = {
  H: "rgb(212,214,218)", // bright
  S: "rgb(162,168,176)", // darker
  O: "rgb(186,191,180)", // slightly warm
  N: "rgb(150,145,162)", // slightly cool
} as const;

export const LETTER_HALO_DEMO = {
  H: "rgba(210,215,255,0.10)",
  S: "rgba(190,255,230,0.08)",
  O: "rgba(255,220,190,0.08)",
  N: "rgba(255,190,240,0.08)",
} as const;

export const WORD_CSS_DEMO: CssMap = {
  ...WORD_CSS,
  zIndex: "10",
};

export const CELL_CSS_DEMO: CssMap = {
  display: "block",
  position: "relative",
  lineHeight: "1",
};

export const VER6_CSS_DEMO: CssMap = {
  display: "inline-block",
  transform: "translateX(0.11em)",
};

export const FRAME_CSS_DEMO: CssMap = {
  position: "relative",

  // geometry
  padding: "56px 64px",
  borderRadius: "22px",
width: "80%",
height: "80%",
  // “terminal slab”
  background: [
    "linear-gradient(180deg, rgba(18,18,22,0.96), rgba(8,8,10,0.96))",
  ].join(", "),

  // hard-ish frame + soft room shadow (static, cheap)
  boxShadow: [
    "0 26px 90px rgba(0,0,0,0.72)",
    "0 2px 0 rgba(255,255,255,0.05)",
    "inset 0 0 0 1px rgba(255,255,255,0.08)",
    "inset 0 10px 18px rgba(255,255,255,0.04)",
    "inset 0 -18px 26px rgba(0,0,0,0.55)",
  ].join(", "),

  overflow: "hidden",
  isolation: "isolate",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gridTemplateRows: "1fr 1fr 1fr",
  placeItems: "center",
  // optional: very slight “CRT softness” without blur
  filter: "contrast(1.02)",
};

export const FRAME_SHINE_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  borderRadius: "18px",
  mixBlendMode: "screen",
  opacity: "0.55",
  background: [
    // highlight follows mouse (near side)
    "radial-gradient(420px 320px at var(--mxp, 50%) var(--myp, 50%), rgba(255,255,255,0.14), transparent 70%)",
    // gentle edge sheen
    "linear-gradient(180deg, rgba(255,255,255,0.08), transparent 40%, rgba(0,0,0,0.10))",
  ].join(", "),
};

export const DEMO_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  background: "#07070a",
};

export const DEMO_BACKDROP_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  background: [
    // top wash (cool, dim)
    "radial-gradient(1200px 700px at 45% 18%, rgba(210,220,255,0.10), transparent 58%)",
    // bottom weight (denser, darker)
    "radial-gradient(1400px 900px at 50% 110%, rgba(0,0,0,0.55), transparent 55%)",
    // stipple A (fine)
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.040) 0 1px, transparent 1px 4px)",
    // stipple B (coarse)
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 7px)",
    // subtle vertical vignette / “screen falloff”
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.30))",
    // base
    "linear-gradient(180deg, #101118, #0d0e12 50%, #090a0d)",
  ].join(", "),
};

export const DEMO_LOGOBOX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",

  // for any absolute children you still want
  isolation: "isolate",
};

export const STAGE_CSS_DEMO: CssMap = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  // default vars (even if unused initially)
  "--mxp": "50%",
  "--myp": "40%",
  backgroundColor: "#0e0f12",
};

export const PORTAL_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "44%",
  transform: "translate(-50%, -50%)",
  width: "min(860px, 92vw)",
  padding: "44px 52px 36px",
  borderRadius: "16px",
  background: "linear-gradient(180deg, rgba(24,26,32,0.94), rgba(14,15,18,0.94))",
  boxShadow: [
    "0 30px 110px rgba(0,0,0,0.70)",
    "inset 0 0 0 1px rgba(255,255,255,0.10)",
    "inset 0 16px 26px rgba(255,255,255,0.05)",
    "inset 0 -18px 30px rgba(0,0,0,0.35)",
  ].join(", "),
  overflow: "hidden",
  isolation: "isolate",
};

export const WORDMARK_SUNK_CSS: CssMap = {
  opacity: "0.92",
  filter: "saturate(0.85) contrast(1.05)",
};

export const LETTER_CSS_DEMO: CssMap = {
  ...LETTER_CSS,
  color: "rgba(230,232,238,0.80)",
  textShadow: [
    // slight emboss: light edge + dark edge
    "0 1px 0 rgba(255,255,255,0.08)",
    "0 -1px 0 rgba(0,0,0,0.35)",
    // soft “ink” bleed
    "0 0 18px rgba(0,0,0,0.30)",
  ].join(", "),
  filter: "contrast(1.02)",
};

export const MENU_CSS: CssMap = {
  marginTop: "28px",
  display: "grid",
  gap: "10px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: "14px",
  letterSpacing: "0.02em",
  color: "rgba(230,232,238,0.82)",
};

export const MENU_ITEM_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "22px 1fr",
  alignItems: "baseline",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer",
  userSelect: "none",
};

export const MENU_BULLET_CSS: CssMap = {
  opacity: "0.55",
};
export const VER_CSS_DEMO: CssMap = {
  ...VER_CSS,

  color: "rgba(225,228,235,1)",
  opacity: "1",
};

export const DEMO_WALL_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  background: [
    "radial-gradient(120% 110% at 40% 18%, rgba(255,255,255,0.08), transparent 62%)",
    "radial-gradient(90% 120% at 70% 68%, rgba(140,190,255,0.06), transparent 60%)",

    "repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 4px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 5px)",

    "linear-gradient(180deg, #1a1d22, #13161b 55%, #0f1116)",
  ].join(", "),
  filter: "contrast(1.03) brightness(1.12)",
};export const DEMO_SCREEN_CSS: CssMap = {
  position: "relative", // CHANGE: was absolute; make this the containing block
  width: "min(860px, 78vw)",
  height: "min(540px, 68vh)", // keep
  minHeight: "360px",         // CHANGE: safety for short viewports

  borderRadius: "20px",
  overflow: "hidden",
  isolation: "isolate",

  background: "linear-gradient(180deg, rgba(24,26,30,0.94), rgba(14,15,18,0.96))",
  boxShadow: [
    "0 18px 60px rgba(0,0,0,0.45)",
    "inset 0 0 0 1px rgba(255,255,255,0.06)",
  ].join(", "),
};
export const DEMO_SCREEN_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",

  opacity: "0.28",
  mixBlendMode: "soft-light",

  background: [
    // corpo stipple (bigger than wall micro-grid)
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 8px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.032) 0 1px, transparent 1px 10px)",

    // VERY subtle falloff (don’t crush mids)
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.14) 78%, rgba(0,0,0,0.22))",
  ].join(", "),

  // keep this modest; your wall already has contrast
  filter: "contrast(1.02) brightness(1.04)",
};