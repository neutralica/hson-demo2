// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS, LOGOBOX_CSS, VER_CSS, WORD_CSS } from "../../wordmark/wordmark.css";
import { $COL } from "../../consts/color.consts";
import { FRAME_CSS_SPLASH } from "../splash-2/splash.css";
import { FRAME_CSS } from "../../consts/core.css";
import { bckColor } from "../../consts/color.consts";

// “home page” palette: mostly grayscale, small accent per letter (optional)
export const LETTER_COLOR_DEMO = {
  H: "rgb(230,230,235)",
  S: "rgb(220,220,226)",
  O: "rgb(235,235,240)",
  N: "rgb(255,225,232)",
} as const;


export const LETTER_ACCENT_DEMO = {
  H: "rgba(80,200,255,0.55)",
  S: "rgba(255,210,80,0.45)",
  O: "rgba(120,255,180,0.40)",
  N: "rgba(255,140,200,0.40)",
} as const;

export const LETTER_INK_DEMO = {
  H: "rgba(153, 162, 190, 1)", // bright
  S: "rgba(181, 140, 153, 1)", // darker
  O: "rgba(104, 108, 97, 1)", // slightly warm
  N: "rgba(73, 64, 92, 1)" // slightly cool
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
  transform: "translateX(2px)",
};

export const FRAME_CSS_DEMO: CssMap = {
  ...FRAME_CSS,
  border: `2px solid ${$COL.greyDim}`,
};


export const DEMO_CSS: CssMap = {
  position: "fixed",
  width: "100%",
  height: "100%",
  inset: "0",
  overflow: "hidden",
  background: "#07070a",
  pointerEvents: "none",
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
  ...LOGOBOX_CSS,
  // transform: "translate(-50%, -50%) scale(0.975)",
  opacity: "0.86",
  // filter: "saturate(0) contrast(1.08) brightness(0.98)",
};


export const STAGE_CSS_DEMO: CssMap = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  // default vars (even if unused initially)
  "--mxp": "50%",
  "--myp": "40%",
  backgroundColor: "#0e0f12",
  pointerEvents: "none",

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
    // "inset 0 0 0 1px rgba(255,255,255,0.10)",
    "inset 0 16px 26px rgba(255,255,255,0.05)",
    "inset 0 -18px 30px rgba(0,0,0,0.35)",
  ].join(", "),
  overflow: "hidden",
  isolation: "isolate",
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

  color: "rgba(159, 160, 162, 1)",
  opacity: "1",
};



/***************
 * BORDER AND INSET
 ***************/



export const DEMO_WALL_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  pointerEvents: "none",
  borderRadius: "28px",
  isolation: "isolate",

  // CHANGED: darker, flatter (no big lighting story on this plane)
  background: "linear-gradient(180deg, #0e1014, #0c0e12 55%, #090b0f)",
};
export const DEMO_WALL_FX_CSS: CssMap = {
  position: "absolute",
  inset: "6px",            // CHANGED: pull the blur away from the wall face
  pointerEvents: "none",
  borderRadius: "22px",    // CHANGED: match inset

  background: "none",
  overflow: "hidden",

  borderRight: "2px solid rgba(255,255,255,0.10)",
  borderBottom: "2px solid rgba(255,255,255,0.10)",

  filter: "blur(1.6px)",
  opacity: "0.75",
};
// ------------------------------------------------------------
// 1) SCREEN: add a tiny outward “glow” onto the glass-adjacent frame
// ------------------------------------------------------------
export const DEMO_SCREEN_CSS: CssMap = {
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: "18px",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "all",

  background: $COL.greyBlack,

   boxShadow: [
    // edge definition so the glass doesn't vanish
    "0 0 20px 1px rgba(255,255,255,0.2)",

    // THIS is the glow — but it must be BLURRED, not spread
    "0 0 6px rgba(255,255,255,0.06)",
  ].join(", "),
};

export const DEMO_SCREEN_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",

  // keep neutral
  mixBlendMode: "normal",
  opacity: "0.08",

  background: [
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.020) 0 1px, transparent 1px 12px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 16px)",
  ].join(", "),
};

export const DEMO_SCREEN_PLUSH_CSS: CssMap = {
  position: "absolute",
  left: "2%",
  top: "2%",
  width: "96%",
  height: "96%",
  pointerEvents: "none",
  borderRadius: "26px",
  padding: "12px",
  boxSizing: "border-box",
  overflow: "hidden",
  isolation: "isolate",

  // CHANGED: slightly darker than the glass, fairly uniform
  background: "rgba(18,18,18,1)",

  boxShadow: [
    // ---- seam where plush meets wall (subtle, symmetric)
    
    "inset 0 0 0 2px rgba(0,0,0,0.22)",
// 
    // ---- CHANGED: glass -> plastic illumination should be OUTWARD, not inset.
    // This is the key: a faint outer glow that makes the plastic edge “catch” the screen.
    // (2–3px, ~0.2 strength)
    "2px 2px 0 0.5px rgba(255,255,255,0.4)",
    

    // ---- keep depth, but DO NOT crush corners
    "inset 0 18px 30px rgba(63, 63, 63, 0.1)",
    "inset 0 -18px 30px rgba(44, 43, 43, 0.12)",
  ].join(", "),
};

export const SCREEN_GLINT_SHADOW = 
  "2px 2px 0 0.5px rgba(255,255,255,0.28)";