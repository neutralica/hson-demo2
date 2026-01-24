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
