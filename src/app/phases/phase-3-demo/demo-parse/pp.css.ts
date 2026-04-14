// pp.terminal.css.ts

import type { CssMap } from "hson-live/types";
import type { CssMapBase } from "../../../../../../hson-live/dist/types/css.types";
import { $gry_, ACID_WASH_OKLCH } from "../../../core/consts/colors.consts";
import { _COLS } from "../../../core/consts/ui-consts";
import { OKLCH_NEUTRALS } from "../../../core/consts/vibrant-oklch";
import { MONO_MAINfont, _TXT, GRID_GAPstr, COLOR_FOR_FMT_, HSON_COLOR_, TXTcol_ALT } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import type { Fmt } from "../../../core/types/core.types";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";


export const VIEW_TOGGLEcss: CssMap = {
  //   height: "90%",
  //   maxHeight: "3rem",
  // maxWidth: "4rem",
}

export const PP_HEADERcss: CssMap = {
  // gap: "10px",
  position: "relative",
  zIndex: "5",
  minHeight: "2rem",
  padding: "6px",
  background: _COLS.bckdeep,
  // columnGap: "0.5ch",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};


// text container
export const PP_TEXTWRAPcss = (f: Fmt | null) => {
  const color = (f === null) ? OKLCH_NEUTRALS.silver : COLOR_FOR_FMT_[f];
  return {
    position: "relative",
    minHeight: "0",
    minWidth: "0",
    background: set_alpha(color, 0.1),
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
  overflow: "hidden",

  // fill the available row instead of collapsing
  alignSelf: "stretch",
  height: "auto",
};

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
  fontSize: _TXT.heading,
  textTransform: "uppercase",
  overflow: "hidden",
  zIndex: -50,

};


export const PP_ACTIVE_VALIDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 15px 0.1px " + set_alpha(COLOR_FOR_FMT_[f], 0.5),
    background: set_alpha(COLOR_FOR_FMT_[f], 0.1),
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
    boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.4), // + set_alpha(COLOR_FOR_FMT_[f], 0.1),
    background: set_alpha(COLOR_FOR_FMT_[f], 0.1),
    border: "none",
    color: "red",
  } as CssMap;
};


export const PP_INACTIVE_VALIDcss = (f: Fmt) => {
  return {
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "none",
    background: set_alpha(COLOR_FOR_FMT_[f], 0.1),
    boxShadow: "inset 0 0 9px 1px " + set_alpha(COLOR_FOR_FMT_[f], 0.1),
    color: COLOR_FOR_FMT_[f],
  };
}
//// used
export const PP_IDLEcss = (f: Fmt) => {
  return {
    filter: "saturate(0.9) brightness(0.8)",
    pointerEvents: "auto",
    userSelect: "none",
    boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
    background: _COLS.bckdeep,
    color: "darkred",
  };
}

export const PP_INACTIVE_INVALIDcss = (f: Fmt) => {
  return {
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "none",
    background: _COLS.bckdeep,
    boxShadow: "inset 0 0 9px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.9),
    color: "darkred",
  };
}

export const PARSING_PANEL_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  overflow: "hidden",
};

