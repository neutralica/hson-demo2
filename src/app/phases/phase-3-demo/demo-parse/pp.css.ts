// pp.terminal.css.ts

import type { CssMap } from "hson-live/types";
import type { CssMapBase } from "../../../../../../hson-live/dist/types/css.types";
import { COLORS_, $gry_ } from "../../../core/consts/colors.consts";
import { MONO_MAINfont, $txt_, GRID_GAPstr, COLOR_FOR_FMT_ } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import type { Fmt } from "../../../core/types/core.types";

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
export const PP_TEXTWRAPcss: CssMap = {
  position: "relative",
  minHeight: "0",
  minWidth: "0",
  background: COLORS_.bckdeep,
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
  overflow: "hidden"
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

export const PP_UNMUTEDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "none",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 15px 1px " + COLOR_FOR_FMT_[f],
    border: "none",
  } as CssMap;
};

//// used
export const PP_MUTEDcss: CssMapBase = {
  filter: "saturate(0.9) brightness(0.8)",

  pointerEvents: "auto",
  userSelect: "none",
};

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