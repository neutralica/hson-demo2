// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $pnk_, $red_etc_, $ylw_, ACID_WASH_OKLCH, ACID_WASH_RGBA, set_alpha } from "../../core/consts/colors.consts";
import { $GRID_GAPstr, $txt_ } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";

export const MENU_TEXT_COL = OKLCH_FLEURS.rustPink;
export const MENU_FONT = "Monaco, mono"

export const MAIN_MENUcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: $txt_.subhead,
  fontWeight: "400",
  userSelect: "none",
  color: MENU_TEXT_COL,
  pointerEvents: "all",
  cursor: "pointer",
  lineHeight: "2",
  letterSpacing: "6%",
  _hover: {
    fontWeight: "100",
    background: ACID_WASH_RGBA.mutedViolet,
    color: $cols_.bckdeep
  },
  _active: {
    background: $cols_.bckgd,
    color: ACID_WASH_RGBA.dullAmber,
    fontWeight: "700",
  }
}

export const HSON_WORDcss: CssMap = {
  fontSize: $txt_.hsonWordMarkMain,
  fontFamily: MENU_FONT,
  width: "max-content",
  userSelect: "none",
  lineHeight: "0.9",
  verticalAlign: "bottom"

}

export const DEMOcss: CssMap = {
  position: "fixed",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  inset: "0",
  overflow: "hidden",
  background: `linear-gradient(${$cols_.bckgd} 60%,${set_alpha($blu_.muted, 0.06)})`,
  pointerEvents: "none",
  boxSizing: "border-box"
};


export const DEMO_STAGEcss: CssMap = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  // default vars (even if unused initially)
  "--mxp": "50%",
  "--myp": "40%",
  backgroundColor: $cols_.bckgd,
  pointerEvents: "none",
boxSizing: "border-box"
};

/**
 * GLASS (screen)
 * - keep your greyBlack
 * - stop huge bloom that reads like a seal / fog
 */
export const DEMO_SCREENcss: CssMap = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "none",
  minHeight: "0",
  boxSizing: "border-box"
}

export const DEMO_SCREEN_FXcss: CssMap = {
  boxSizing: "border-box",
  position: "relative",
  display: "grid",

  // left = nav, right = main
  gridTemplateColumns: "200px 4fr",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: $GRID_GAPstr,

  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  padding: "1rem",
  maxWidth: "100vw",

  pointerEvents: "none",
};

export const MENU_BOXcss: CssMap = {
  position: "relative",
  lineHeight: "2.5rem",

};

export const DEMO_MAIN_LOGOcss: CssMap = {
  display: "flex",
  alignContent: "end",

}

export const MENU_CONTAINERcss: CssMap = {
  position: "relative", // CHANGED: not absolute

  display: "flex",
  flexDirection: "column",

  alignItems: "stretch",

  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  // marginLeft: "2rem",
  // marginTop:"2rem"
};

export const LAYOUT_GRIDcss: CssMap = {
  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  display: "grid",

  // no dock row anymore
  gridTemplateRows: "minmax(0, 1fr)",
  boxSizing: "border-box",
  overflow: "hidden",
} as const;


export const PANEL_SAFETYcss: CssMap = {
  //// this is often redundant since we set it on so many other css objects
  minWidth: "0",
  minHeight: "0",
};

export const DEMO_SLOTcss: CssMap = {
  position: "relative",
  minHeight: "0",
  minWidth: "0",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  pointerEvents: "auto",
};

export const HSON_GRAFFITIcss: CssMap = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  whiteSpace: "pre",
  fontFamily: "monospace",
  color: ACID_WASH_OKLCH.bruisedPlum,
  boxSizing: "border-box",
  mixBlendMode: "multiply",
  fontSize: "min(16px, calc((100vw) / 84))",
  lineHeight: "1",
  width: "100%",
  textAlign: "center",
  maxWidth: "calc(100vw)",
  userSelect: "none",
}

export const HSON_SUBcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: $txt_.main,
  position: "relative",
  textWrap: "nowrap",
  color: OKLCH_FLEURS.violet,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  userSelect: "none",
}

export const COPYRITEcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  position: "fixed",
  bottom: "0.2rem",
  right: "0.2rem",
  color: $gry_.dim,
  zIndex: "-10",
}