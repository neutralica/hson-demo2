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

export const STIPPLE_LAYER_0_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at 2px 2px, rgba(56, 100, 144, 0.30) 0 1px, transparent 2.8px)",
  backgroundRepeat: "repeat",
  backgroundSize: "53px 89px",
  opacity: "0.85",
  animation: "stipple_drift_0 84s linear infinite",
};

export const STIPPLE_LAYER_1_CSS: CssMap = {
  ...STIPPLE_LAYER_BASE,
  backgroundImage:
    "radial-gradient(circle at 6px -5px, rgba(123, 69, 69, 0.40) 0 0.9px, transparent 4.1px)",
  backgroundRepeat: "repeat",
  backgroundSize: "41px 37px",
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
    "radial-gradient(circle at -5px -7px, rgba(53, 86, 136, 0.12) 0 2.1px, transparent 5.4px)",
  backgroundRepeat: "repeat",
  backgroundSize: "53px 67px",
  opacity: "0.60",
  animation: "stipple_drift_3 52s linear infinite",
};