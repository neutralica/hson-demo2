// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS, LOGOBOX_CSS, VER_CSS, WORD_CSS } from "../../wordmark/wordmark.css";
import { $COLOR } from "../../consts/color.consts";
import { FRAME_CSS_SPLASH } from "../splash-2/splash.css";
import { FRAME_CSS } from "../../consts/core.css";

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
  border: `2px solid ${$COLOR.greyDim}`,
};


export const DEMO_CSS: CssMap = {
  position: "fixed",
  width: "100%",
  height: "100%",
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

export const DEMO_WALL_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  // borderRadius: "28px",
  overflow: "hidden",
  pointerEvents: "none",
  // Wall should read as a field (texture + gentle room light), not a machined bezel.
  background: [
    // outside-high -> inside-low (broad ramp)
    // ADDED
   // edges a hair brighter, center a hair darker (reads as sinking inward)
"radial-gradient(140% 140% at 50% 50%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.00) 55%, rgba(255,255,255,0.030) 100%)",
    // room tone (very broad)
    "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,0.00) 78%, rgba(0,0,0,0.18) 94%, rgba(0,0,0,0.24) 100%)",
    "radial-gradient(140% 110% at 45% 8%, rgba(255,255,255,0.07), transparent 60%)",
    "radial-gradient(120% 140% at 60% 70%, rgba(120,170,255,0.04), transparent 65%)",
    // DEMO_WALL_CSS: add near the top of background layers
    "radial-gradient(140% 120% at 50% 40%, rgba(255,255,255,0.040), transparent 62%)",
    "radial-gradient(120% 120% at 50% 55%, rgba(0,0,0,0.38), transparent 70%)",
    // DEMO_WALL_CSS: add near top (after pillow roll is fine)
    "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,0.00) 62%, rgba(0,0,0,0.20) 82%, rgba(0,0,0,0.30) 100%)",
    // micro-grid (keep it subtle)
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.014) 0 1px, transparent 1px 4px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.010) 0 1px, transparent 1px 5px)",

    // base material
    "linear-gradient(180deg, #15181d, #11141a 55%, #0d1015)",
  ].join(", "),

  // Important: no “frame-like” shadowing here.
  boxShadow: "none",
  filter: "contrast(1.02) brightness(1.08)",
};

export const DEMO_SCREEN_CSS: CssMap = {
  position: "relative", // important: it sits inside plush padding
  width: "100%",
  height: "100%",
  borderRadius: "18px",
  overflow: "hidden",
  isolation: "isolate",
pointerEvents: "none",
  background: "linear-gradient(180deg, rgba(24,26,32,0.96), rgba(10,11,14,0.97))",

  boxShadow: [
    // inner falloff: this is the “depth” cue *inside* the screen, not a rim
    "inset 0 18px 28px rgba(0,0,0,0.40)",
    "inset 0 -28px 44px rgba(0,0,0,0.62)",
    // almost-nothing edge line
    // "inset 0 0 0 1px rgba(255,255,255,0.02)",
  ].join(", "),
};

export const DEMO_SCREEN_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",

  opacity: "0.28",
  mixBlendMode: "overlay",

  background: [
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.040) 0 1px, transparent 1px 9px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.024) 0 1px, transparent 1px 12px)",
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.18) 78%, rgba(0,0,0,0.26))",
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
  padding: "24px", // was 28px — small physical thin; tweak 20–26
  boxSizing: "border-box",
  overflow: "hidden",
  isolation: "isolate",

  background: [
    // 1) broad roll (very subtle, prevents “machined ring”)
    "radial-gradient(160% 130% at 38% 18%, rgba(255,255,255,0.045), transparent 60%)",
    "radial-gradient(150% 150% at 70% 88%, rgba(0,0,0,0.40), transparent 62%)",

    // 2) IMPORTANT: most contrast lives near the inner seam (steeper at the end)
    // Think: gentle slope → sharper drop into cavity.
    "radial-gradient(closest-side at 50% 50%, " +
    "transparent 70%, " +                 // flat-ish plateau
    "rgba(0,0,0,0.14) 86%, " +            // begin slope
    "rgba(0,0,0,0.6) 96%, " +            // steepening
    "rgba(0,0,0,0.70) 100%)",             // seam

    // 3) base leather tone (keep it simple)
    "linear-gradient(180deg, rgba(70, 73, 84, 0.62), rgba(14,16,20,0.94))",
  ].join(", "),

  boxShadow: [
    // Outer weight (soft, wide)
    "0 18px 70px rgba(0,0,0,0.28)",

    // Subtle top-left lift and bottom-right sink (avoid crisp edges)
    "inset 10px 10px 22px rgba(255,255,255,0.025)",
    "inset -16px -16px 30px rgba(0,0,0,0.42)",

    // Kill outlines: if you keep this at all, keep it *nearly invisible*
    // "inset 0 0 0 1px rgba(255,255,255,0.010)",
  ].join(", "),
};