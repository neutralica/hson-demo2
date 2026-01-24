// css.consts.ts

import type { CssMap } from "hson-live/types";
import { sunColor, sunFade, skyGradient } from "./splash.consts";
import { FRAME_CSS } from "../../consts/core.css";
import { $COL, _setBckgdAlpha } from "../../consts/colors.consts";

export const STAGE_CSS: CssMap = {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100vw",
  height: "100vh",
  backgroundColor: $COL._bckgd
}
export const SKY_CSS = {
  position: "relative",
  width: "100%",
  minHeight: "calc(var(--frameSize) * 2)",
  overflow: "hidden",
  "--frameSize": "min(15rem, 520px)",
}

export const SUN_CARRIER_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  zIndex: "-50",
  // smooth curve
  offsetPath: `path("M 30 400 A 400 500 0 0 1 320 -120")`,
  offsetRotate: "0deg",
  offsetAnchor: "50% 50%",
  offsetDistance: "0%",
  willChange: "offset-distance",
};

export const SUN_CSS: CssMap = {
  width: "5.25em",
  height: "5.25em",
  borderRadius: "999px",
  background: sunColor,
  boxShadow: `0 0 28px ${sunFade}`,
  opacity: "0",
  transform: "scale(1.06)",
  willChange: "transform, opacity",

};

export const FLARE_BOX_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "32%",
  transform: "translate(-50%, -50%)",

  width: "calc(var(--frameSize) * 2)",
  height: "calc(var(--frameSize) * 2)",

  pointerEvents: "none",
  overflow: "visible",
  zIndex: "50",

};

export const FLARE_CSS: CssMap = {
  position: "absolute",
  inset: "0",                    // keep: ensures real size
  pointerEvents: "none",
  opacity: "0",
  mixBlendMode: "screen",
  willChange: "transform, opacity",
  background: `
    linear-gradient(
      120deg,
      transparent 45%,
      rgba(255,255,255,0.25) 50%,
      transparent 55%
    ),
    radial-gradient(
      circle at 50% 50%,
      rgba(255,255,255,0.35),
      transparent 60%
    )
  `,
};

export const FRAME_CSS_SPLASH: CssMap = {
  ...FRAME_CSS,
};

export const GRADIENT_CSS: CssMap = {
  position: "absolute",
  left: "0%",
  top: "0%",
  width: "100%",
  height: "100%",
  zIndex: 90,
  opacity: 0,
  willChange: "opacity",
  background: skyGradient,
}

export const STAR_CARRIER_CSS: CssMap = {
  position: "absolute",

  left: "0",
  top: "0",
  /* anchor is a point */
  width: "0",
  height: "0",

  pointerEvents: "none",
  zIndex: "100",
  overflow: "visible",

  offsetPath: `path("M -40 -30 L 380 160")`,
  offsetRotate: "auto",
  offsetAnchor: "50% 50%",
  offsetDistance: "0%",

  willChange: "offset-distance",
};
export const STAR_WRAP_CSS: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  width: "0",
  height: "0",
  transform: "none",
  transformOrigin: "0 0",
};
export const STAR_HEAD_CSS: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  width: "6px",
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.95)",
  boxShadow: "0 0 10px rgba(255,255,255,0.6)",
  transform: "translate(-50%, -50%)",

  opacity: "0",
  willChange: "opacity",

};
const TAIL_BASE: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",

  width: "360px",

  borderRadius: "999px",

  /* head at RIGHT edge */
  transformOrigin: "100% 50%",
  transform: "translate(-100%, -50%) scaleX(0.01)",

  willChange: "transform, opacity",
};

export const STAR_TAIL_A_CSS: CssMap = {
  ...TAIL_BASE,
  height: "2px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))",
  filter: "blur(01.05px)",
  opacity: "0",
};

export const STAR_TAIL_B_CSS: CssMap = {
  ...TAIL_BASE,
  height: "5px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(210,235,255,0.45))",
  filter: "blur(6.2px)",
  opacity: "0",
};

export const STAR_TAIL_C_CSS: CssMap = {
  ...TAIL_BASE,
  height: "9px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(180,220,255,0.22))",
  filter: "blur(14.4px)",
  opacity: "0",
};

export const CLOUD_LAYER_BASE_CSS: CssMap = {
  position: "absolute",
  left: "0",
  bottom: "0%",
  width: "100%",
  height: "52%",
  pointerEvents: "none",
  zIndex: "35",

  // CHANGED: do not set maskImage here (masking strategy is per-layer)
  // CHANGED: do not set backgroundRepeat/Position/Size here (we're using mask tiling)

  filter: "none",
  mixBlendMode: "multiply",
  opacity: "1",

  // CHANGED: we animate mask-position + opacity, not background-position
  willChange: "mask-position, -webkit-mask-position, opacity",
};

export const CLOUD_BOX_CSS ={
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        zIndex: "40",
        overflow: "hidden",          // crops the river at the frame edge
        transform: "translateZ(0)",  // forces compositing; helps mask/filter weirdness
    }