// pp.terminal.css.ts

import type { CssMap } from "hson-live/types";
import  { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import  { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import  { set_alpha } from "../../core/helpers/color-helpers";
import type { Fmt } from "../../core/types/core.types";

export const VIEW_TOGGLEcss: CssMap = {
  //   height: "90%",
  //   maxHeight: "3rem",
  // maxWidth: "4rem",
}

// text container
export const PP_TEXTWRAPcss = (f: Fmt | null) => {
  const color = (f === null) ? OKLCH_NEUTRALS.silver : _colors.fmt[f];
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
  color: _colors.txt.grey,
  display: "grid",
  placeItems: "center",
  pointerEvents: "all",
  userSelect: "none",
  ...FONT_FAM_MONO,
  textTransform: "uppercase",
  overflow: "hidden",
  zIndex: -50,

};
// export const PP_HOVERcss = {
//   _hover: {
//     color: OKLCH_SOFT_CORE_4.yellow + " !Important",
//   }
// }

export const PP_ACTIVE_VALIDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 15px 0.1px " + set_alpha(_colors.fmt[f], 0.5),
    // background: set_alpha(_cols.fmt[f], 0.1),
    border: "none",
    color: _colors.fmt[f]
  } as CssMap;
};

export const PP_ACTIVE_INVALIDcss = (f: Fmt) => {
  return {
    opacity: "1",
    filter: "none",
    pointerEvents: "auto",
    userSelect: "auto",
    boxShadow: "inset 0 0 9px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.9),
    background: _colors.backlo,
    border: "none",
    color: "red",
  } as CssMap;
};


export const PP_INACTIVE_VALIDcss = (f: Fmt) => {
  return {
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "none",
    // background: set_alpha(_cols.fmt[f], 0.01),
    boxShadow: "inset 0 0 9px 1px " + set_alpha(_colors.fmt[f], 0.4),
    color: _colors.fmt[f],
  };
}
//// used
export const PP_IDLEcss = (f: Fmt) => {
  return {
    filter: "saturate(0.9) brightness(0.8)",
    pointerEvents: "auto",
    userSelect: "none",
    boxShadow: "inset 0 0 19px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
    background: _colors.backlo,
    color: "darkred",
  };
}

export const PP_INACTIVE_INVALIDcss = (f: Fmt) => {
  return {
    filter: "saturate(1.1) brightness(1.1)",
    pointerEvents: "auto",
    userSelect: "none",
    background: _colors.backlo,
    boxShadow: "inset 0 0 9px 1px " + set_alpha(OKLCH_NEUTRALS.silver, 0.3),
    color: "darkred",
  };
}

export const PP_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  overflow: "hidden",
};

