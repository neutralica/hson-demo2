import type { CssMap } from "hson-live/types";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { TXTcol_CODE, øfontSize, TXTcol_MENU, TXTcol_MAIN, CURRENT_OKLCH } from "../../../core/consts/ui-consts";


export const ROOT_CSS: CssMap = {
  position: "fixed",
  right: "1.2rem",
  bottom: "1.2rem",
  zIndex: "20",

  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 6.35rem",
  gap: "0.85rem",
  alignItems: "stretch",

  width: "min(36rem, calc(100vw - 2.4rem))",
  minHeight: "11.4rem",
  padding: "0.85rem",

  color: TXTcol_CODE,
  ...FONT_FAM_MONO,
  fontSize: øfontSize.smol,

  // CHANGED: #12-inspired instrument material: dead CRT glass + amber buried
  // lamp + ordered/coarse stipple. Keep this static first; animation can be
  // added later with a pseudo-element veil once the material feels right.
  background: "radial-gradient(circle at 50% 126%, oklch(72% 0.13 82 / 0.045), transparent 50%), radial-gradient(circle at 20% 104%, oklch(62% 0.12 150 / 0.035), transparent 44%), linear-gradient(145deg, oklch(6% 0.022 250 / 0.98), oklch(2.5% 0.016 286 / 0.99))",
  backgroundImage: "radial-gradient(circle, oklch(90% 0.04 250 / 0.045) 0 1px, transparent 1.3px), radial-gradient(circle at 50% 126%, oklch(72% 0.13 82 / 0.045), transparent 50%), radial-gradient(circle at 20% 104%, oklch(62% 0.12 150 / 0.035), transparent 44%), linear-gradient(145deg, oklch(6% 0.022 250 / 0.98), oklch(2.5% 0.016 286 / 0.99))",
  backgroundSize: "7px 7px, auto, auto, auto",
  backgroundPosition: "1px 2px, center, center, center",
  backgroundBlendMode: "screen, normal, normal, normal",

  border: `1px solid oklch(78% 0.13 245 / 0.72)`,
  outline: `1px solid oklch(78% 0.13 145 / 0.24)`,
  outlineOffset: "-0.34rem",
  boxShadow: `0 0 1.05rem oklch(70% 0.16 145 / 0.11), inset 0 -1.15rem 2.4rem oklch(78% 0.14 82 / 0.035), inset 0 0 1.5rem oklch(85% 0.02 260 / 0.04)`,

  overflow: "hidden",
  isolation: "isolate",
};
export const PANEL_CSS: CssMap = {
  display: "grid",
  gap: "0.42rem",
  alignContent: "start",
  minWidth: "0",

  // CHANGED: keep subpanels mostly structural, but give them a slight inset
  // surface so controls sit in the material instead of floating on top of it.
  position: "relative",
  padding: "0.2rem",
  boxSizing: "border-box",
};
export const ROW_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "4ch minmax(0, 1fr) 8ch",
  gap: "0.45rem",
  alignItems: "center",
  minWidth: "0",
  color: "oklch(84% 0.018 285 / 0.88)",
  padding: "0.05rem 0.2rem",
  background: "oklch(0% 0 0 / 0.105)",
};

export const TITLE_CSS: CssMap = {
  color: TXTcol_MENU,
  letterSpacing: "0.055em",
  padding: "0 0.1rem 0.35rem",
  borderBottom: `1px solid oklch(84% 0.04 250 / 0.32)`,
  textShadow: "0 0 0.35rem currentColor",
};

export const CODE_CSS: CssMap = {
  minHeight: "1.2rem",
  padding: "0.28rem 0.35rem",
  color: TXTcol_MENU,
  border: "1px solid oklch(84% 0.04 250 / 0.16)",
  background: "oklch(0% 0 0 / 0.24)",
};

export const TARGET_ROW_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  padding: "0.18rem 0.4rem",
  border: `1px solid transparent`,
  cursor: "crosshair",
  background: "oklch(0% 0 0 / 0.10)",
  boxShadow: "none",
};

export const TARGET_ROW_ACTIVE_CSS: CssMap = {
  ...TARGET_ROW_CSS,
  border: `1px solid oklch(78% 0.13 145 / 0.46)`,
  background: "oklch(10% 0.035 145 / 0.44)",
  color: TXTcol_CODE,
  boxShadow: "inset 0 0 0 1px " + TXTcol_MAIN,
};

export const PREVIEW_CSS: CssMap = {
  height: "5.2rem",
  width: "5.2rem",
  alignSelf: "start",
  justifySelf: "center",
  background: CURRENT_OKLCH,
  border: `1px solid oklch(84% 0.04 250 / 0.42)`,
  outline: `1px solid oklch(0% 0 0 / 0.45)`,
  outlineOffset: "-0.28rem",
  boxShadow: `0 0 0.65rem ${CURRENT_OKLCH}, inset 0 0 1.1rem oklch(0% 0 0 / 0.35)`,
};

export const RANGE_CSS: CssMap = {
  appearance: "none",
  "-webkit-appearance": "none",

  height: "1.2rem",
  width: "100%",
  margin: "0",
  overflow: "hidden",
  cursor: "crosshair",
  accentColor: CURRENT_OKLCH,

  // actual visible track
  "&::-webkit-slider-runnable-track": {
    height: "0.46rem",
    background: "oklch(0% 0 0 / 0.46)",
    border: `1px solid oklch(84% 0.04 250 / 0.30)`,
  },

  // draggable handle
  "&::-webkit-slider-thumb": {
    "-webkit-appearance": "none",
    appearance: "none",

    width: "1rem",
    height: "1rem",
    marginTop: "-0.35rem",

    border: `1px solid oklch(84% 0.04 250 / 0.62)`,
    background: CURRENT_OKLCH,
    borderRadius: "999px",
    boxShadow: `0 0 0.45rem ${CURRENT_OKLCH}, 0 0 0 1px oklch(0% 0 0 / 0.45)`,
  },

  "&::-moz-range-track": {
    height: "0.46rem",
    background: "oklch(0% 0 0 / 0.46)",
    border: `1px solid oklch(84% 0.04 250 / 0.30)`,
  },

  "&::-moz-range-thumb": {
    width: "1rem",
    height: "1rem",
    border: `1px solid oklch(84% 0.04 250 / 0.62)`,
    background: CURRENT_OKLCH,
    borderRadius: "999px",
    boxShadow: `0 0 0.45rem ${CURRENT_OKLCH}, 0 0 0 1px oklch(0% 0 0 / 0.45)`,
  },
};