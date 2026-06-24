import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { OKLCH_VIBRANT } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import type { MotesOpts } from "./make-mote";


export const MOTES_LAYERcss: CssMap = {
  position: "fixed",
  left: "0",
  top: "0",
  height: "100%",
  width: "100%",
  pointerEvents: "none",
  zIndex: "100",
  background: `linear-gradient(transparent 50%, ${set_alpha(OKLCH_VIBRANT.orangeEmber, 0.1)})`,
} as const;

export const MOTEcss: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  willChange: "transform, opacity",
  fontFamily: "monospace",
  fontSize: "14px",
  lineHeight: "14px",
  userSelect: "none",
  pointerEvents: "any",
  // “Apple II-ish” vibe via glow; tweak to taste
  textShadow: "12px 12px 4px rgba(120,255,160,1)",
} as const;

export const MOTES_ROOTcss: CssMap = {
  position: "fixed",
  left: "0",
  top: "0",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  zIndex: "0",

};

export const MOTES_LAYeR_2css = {
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  pointerEvents: "none",
};