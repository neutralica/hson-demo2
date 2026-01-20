// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS, LOGOBOX_CSS, VER_CSS, WORD_CSS } from "../../wordmark/wordmark.css";
import { $COL, bckColor } from "../../consts/colors.consts";

import { FRAME_CSS } from "../../consts/core.css";
import { make_stipple_drift_css } from "../../stipple/make-stipple";


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
  H: "rgba(88, 215, 151, 1)", // bright
  S: "rgba(66, 167, 229, 1)", // darker
  O: "rgba(233, 123, 209, 1)", // slightly warm
  N: "rgba(116, 116, 231, 1)" // slightly cool
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
  backgroundColor: $COL._backColor,
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

/**
 * A tight “leather weave” that reads as texture, not “noise”.
 * Use as a top layer with very low alpha.
 */
export const STIPPLE_WEAVE_TIGHT =
  [
    // micro crosshatch
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.020) 0 1px, transparent 1px 3px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 4px)",

    // faint diagonal bias (breaks grid tyranny)
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.010) 0 1px, transparent 1px 6px)",
    "repeating-linear-gradient(-45deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 7px)",
  ].join(", ");


/**
 * OUTER SURFACE (user-facing bezel plane)
 * - texture carries the darkness (not a single flat dark color)
 * - keep it subtle so panels remain legible
 */
export const DEMO_WALL_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  pointerEvents: "none",
  borderRadius: "28px",
  isolation: "isolate",
  border: `1px double ${$COL.stonerPurple}`
};

/**
 * WALL FX (glint + edge pickup)
 * - this should NOT paint a giant hazy frame
 * - keep it to bottom/right edges only
 */
export const DEMO_WALL_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  borderRadius: "28px",
  overflow: "hidden",
  // A *localized* edge pickup, not a ring.
  // Use backgrounds instead of borders+blur (borders+blur tend to smear into a gasket look).
  // backgroundColor: " rgba(255,255,255,0.10)",

  opacity: "0.65",
  filter: "blur(1.1px)",
};

/**
 * GLASS (screen)
 * - keep your greyBlack
 * - stop huge bloom that reads like a seal / fog
 */
export const DEMO_SCREEN_CSS: CssMap = {
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: "18px",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "all",
  // backgroundColor: $COL.greyDimmer,
  // background: [
  //   // $COL.greyDimmer
  //   // base tone (do not over-darken; let texture do the work)
  //   // "linear-gradient(180deg, #0f1116, #0c0e12 55%, #090b0f)",

  //   // leather-ish weave
  //   // STIPPLE_WEAVE_TIGHT,
  //   // corpo wall grain
  //   ].join(", "),

  // boxShadow: [
  //   // edge definition only (tight)
  //   "inset 0 0 0 1px rgba(255,255,255,0.034)",

  //   // very soft glass bloom (small + subtle)
  //   "0 0 10px rgba(255,255,255,0.015)",

  //   // tiny “lift” so it doesn’t look switched off
  //   "0 0 40px rgba(255,255,255,0.030)",
  // ].join(", "),
}

export const DEMO_SCREEN_FX_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  mixBlendMode: "normal",
  opacity: "1",

};


/**
 * INSET / INNER FRAME
 * - stop heavy uniform inset rings (gasket)
 * - keep your bottom-right glint via XY offset shadow
 * - allow it to read as a darker surround to the glass
 */
export const SCREEN_GLINT_SHADOW =
  "2px 2px 0 0.5px rgba(65, 110, 165, 0.96)";

/**
 * this selector describes the (in the narrative of the terminal screen) 
 * thin band of plastic that meets the glass perpendicularly, which will 
 * catch reflection from the screen illumination and also carry a thin 
 * band of ambient light on the frame edge
 */
export const DEMO_SCREEN_INSET_CSS: CssMap = {
  position: "absolute",
  left: "3%",
  top: "3%",
  width: "94%",
  height: "94%",
  pointerEvents: "none",
  borderRadius: "26px",
  padding: "12px",
  boxSizing: "border-box",
  overflow: "hidden",
  isolation: "isolate",
  backgroundColor: $COL.greyBlack,
  // slightly darker than glass
  background: [
    // "linear-gradient(180deg, rgba(18,18,18,1), rgba(16,16,16,1))",
    //   // tiny internal grain so it isn’t a flat slab
    // "repeating-linear-gradient(0deg, rgba(255,255,255,0.010) 0 1px, transparent 1px 12px)",
    // "repeating-linear-gradient(90deg, rgba(255,255,255,0.008) 0 1px, transparent 1px 16px)",
  ].join(", "),

  boxShadow: [
    // remove the thick uniform ring that reads like rubber
    "inset 0 0 0 1px rgba(255,255,255,0.020)",
    "inset 0 0 0 2px rgba(0,0,0,0.18)",

    // bottom-right specular catch (your discovery)
    SCREEN_GLINT_SHADOW,

    // depth, but light-touch
    "inset 0 18px 30px rgba(0,0,0,0.16)",
    "inset 0 -18px 30px rgba(0,0,0,0.20)",
  ].join(", "),
};