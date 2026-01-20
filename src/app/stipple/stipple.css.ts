// stipple.layers.css.ts
import type { CssMap } from "hson-live/types";

const STIPPLE_LAYER_BASE: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  willChange: "transform",
  transform: "translate3d(0px,0px,0)",
  overflow: "hidden"
};
// CHANGED: base plane always defines geometry + compositing
export const STIPPLE_PLANE_BASE: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  // important when multiple overlays exist
  isolation: "isolate",
  // optional: helps with rotation/drift visuals
  transformOrigin: "50% 50%",
};

export const STIPPLE_LAYER_0_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at 9px 9px, rgba(56, 100, 144, 0.50) 0 10px, transparent 2.8px)",
  backgroundRepeat: "repeat",
  backgroundSize: "553px 389px",
  opacity: "0.85",
  animation: "stipple_drift_0 84s linear infinite",
};

export const STIPPLE_LAYER_1_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at 6px -5px, rgba(123, 69, 69, 0.60) 0 10.9px, transparent 4.1px)",
  backgroundRepeat: "repeat",
  backgroundSize: "341px 227px",
  opacity: "0.70",
  animation: "stipple_drift_1 26s linear infinite",
};

export const STIPPLE_LAYER_2_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at -3px 3px, rgba(196, 199, 158, 0.605) 0 0.7px, transparent 4.6px)",
  backgroundRepeat: "repeat",
  backgroundSize: "49px 41px",
  opacity: "0.55",
  animation: "stipple_drift_2 58s linear infinite",
};

export const STIPPLE_LAYER_3_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at -5px -7px, rgba(0, 102, 255, 1) 0 2.1px, transparent 5.4px)",
  backgroundRepeat: "repeat",
  backgroundSize: "53px 67px",
  opacity: "0.60",
  animation: "stipple_drift_3 52s linear infinite",
};
export const STIPPLE_LAYER_4_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at -5px -7px, rgba(53, 86, 136, 0.2) 0 2.1px, transparent 5.4px)",
  backgroundRepeat: "repeat",
  backgroundSize: "53px 67px",
  opacity: "0.20",
  animation: "stipple_drift_3 52s linear infinite",
};

export const STIPPLE_PLANE_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  position: "absolute",
  inset: "-18%",        // CHANGED: oversized so rotation stays covered
  transformOrigin: "50% 50%",
  pointerEvents: "none",
};