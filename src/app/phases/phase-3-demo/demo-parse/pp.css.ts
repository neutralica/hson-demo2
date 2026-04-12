// pp.terminal.css.ts

import type { CssMap } from "hson-live/types";
import type { CssMapBase } from "../../../../../../hson-live/dist/types/css.types";
import { COLORS_, $gry_, ACID_WASH_OKLCH, CYBERPUNK_2060_NEUTRALS } from "../../../core/consts/colors.consts";
import { MONO_MAINfont, $txt_, GRID_GAPstr, COLOR_FOR_FMT_, HSON_COLOR_ } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import type { Fmt } from "../../../core/types/core.types";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";

function darkenOklch(oklch: string, factor: number): string {
  const match = oklch.match(/oklch\(([^ ]+) ([^ ]+) ([^)]+)\)/);
  if (!match) return oklch;
  let [_, l, c, h] = match;
  if (!l) return oklch;

  const newL = Math.max(0, parseFloat(l) * factor);

  return `oklch(${newL} ${c} ${h})`;
}

//// used
export const PP_HEADERcss: CssMap = {
  display: "flex",
  alignItems: "baseline",
  gap: "10px",
  position: "relative",
  zIndex: "5",
  minHeight: "2rem",
  padding: "6px",
  background: set_alpha(COLORS_.bckdeep, 0.7),
};

//// used:
// overlay wrapper
export const PP_TEXTWRAPcss = (f: Fmt | null) => {
  const color = (f === null) ? CYBERPUNK_2060_NEUTRALS.silver : COLOR_FOR_FMT_[f];
  return {
    position: "relative",
    minHeight: "0",
    minWidth: "0",
    background: darkenOklch(color, 0.2),
    color: color,
  }
};

export const PP_GRIDcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gridAutoRows: "minmax(0, 1fr)",
  width: "100%",
  minWidth: "0",
  minHeight: "0",
  gap: "12px",
  overflow: "hidden",

  // fill the available row instead of collapsing
  alignSelf: "stretch",
  height: "auto",
};

//// used
//  faint format label (“JSON”)
export const PP_WATERMARKcss: CssMap = {
  position: "absolute",
  inset: "0",
  color: $gry_.dimmer,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  userSelect: "none",
  fontFamily: MONO_MAINfont,
  fontSize: $txt_.heading,
  textTransform: "uppercase",
  overflow: "hidden",
  zIndex: -50,

};


//// used
// focused-only “invalid/valid/...” status (large, centered-ish but not obnoxious)
export const PP_STATUScss: CssMap = {
  position: "absolute",
  top: "10px",
  right: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0", // set by JS
  fontFamily: MONO_MAINfont,
  fontSize: "14px",
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

export const PP_ACTIVE_VALIDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 15px 1px " + COLOR_FOR_FMT_[f],
    border: "none",
    color: COLOR_FOR_FMT_[f]
  } as CssMap;
};
export const PP_ACTIVE_INVALIDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "none",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 15px 1px " + set_alpha(CYBERPUNK_2060_NEUTRALS.silver, 0.4), // + set_alpha(COLOR_FOR_FMT_[f], 0.1),
    border: "none",
    color: "red",
  } as CssMap;
};

//// used
export const PP_IDLEcss = (f: Fmt) => {
  return {
    filter: "saturate(0.9) brightness(0.8)",
    pointerEvents: "auto",
    userSelect: "none",
    boxShadow: "inset 0 0 5px 1px " + set_alpha(COLOR_FOR_FMT_[f], 0.1),
    color: "darkred",
  };
}
export const PP_INACTIVE_VALIDcss = (f: Fmt) => {
  return {
    filter: "saturate(0.9) brightness(0.8)",
    pointerEvents: "auto",
    userSelect: "none",
    boxShadow: "inset 0 0 5px 1px " + set_alpha(COLOR_FOR_FMT_[f], 1),
    color: COLOR_FOR_FMT_[f],
  };
}

//// used
export const PP_COPYBTNcss: CssMap = {
  marginLeft: "auto",
  height: "26px",
  padding: "4px 10px",
  borderRadius: "10px",

  background: "rgba(0,0,0,0.14)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
  color: "rgba(170,255,235,0.80)",

  fontSize: "12px",
  letterSpacing: "0.04em",
  cursor: "pointer",
  userSelect: "none",

  mixBlendMode: "screen",
};

export const PARSING_PANEL_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  gap: GRID_GAPstr,
  overflow: "hidden",
};