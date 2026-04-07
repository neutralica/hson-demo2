// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, COLORS_, $grn_, $gry_, $pnk_, $red_etc_, $ylw_, ACID_WASH_RGBA } from "../../core/consts/colors.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { GRID_GAPstr, $txt_, GRAFFITIcol, MONO_MAINfont, TXTcol_MENU, GREENLIKEcol, BLUELIKEcol, FADE_1col, COPYRITEcol } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";

export const MAIN_MENUcss: CssMap = {
  fontFamily: MONO_MAINfont,
  fontSize: $txt_.subhead,
  fontWeight: "400",
  userSelect: "none",
  color: TXTcol_MENU,
  pointerEvents: "all",
  cursor: "pointer",
  lineHeight: "1.6",
  letterSpacing: "6%",
  _hover: {
    fontWeight: "100",
    background: BLUELIKEcol,
    color: COLORS_.bckdeep
  },
  _active: {
    background: COLORS_.bckdeep,
    color: BLUELIKEcol,
    fontWeight: "700",
  }
}


export const MENU_BOXcss: CssMap = {
  position: "relative",
  lineHeight: "2.5rem",
};

export const DEMO_HEADLINEcss: CssMap = {
  display: "flex",
  alignContent: "end",

}

export const MENU_CONTAINERcss: CssMap = {
  position: "relative", // not absolute

  display: "flex",
  flexDirection: "column",

  alignItems: "stretch",
  width: "auto",
  height: "100%",
  // pointerEvents: "none",
  marginLeft: "2rem",
  marginTop: "2rem",
  zIndex: "50",

};


export const HSON_WORDcss: CssMap = {
  fontSize: $txt_.hsonWordMarkMain,
  fontFamily: MONO_MAINfont,
  fontWeight: "100",
  width: "0.5em",
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
  background: `linear-gradient(${COLORS_.bckgd} 80%,${set_alpha($blu_.muted, 0.03)})`,
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
  backgroundColor: COLORS_.bckgd,
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
  boxSizing: "border-box",
  overscrollBehaviorY:"none", // not sure it will do what I want

}

export const DEMO_SCREEN_FXcss: CssMap = {
  boxSizing: "border-box",
  position: "relative",
  display: "grid",

  // left = nav, right = main
  gridTemplateColumns: "200px 4fr",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: GRID_GAPstr,

  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  padding: "1rem",
  maxWidth: "100vw",

  pointerEvents: "none",
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
  color: GRAFFITIcol,
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
  fontFamily: MONO_MAINfont,
  fontSize: $txt_.main,
  position: "relative",
  textWrap: "nowrap",
  color: FADE_1col,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  userSelect: "none",
}

export const COPYRITEcss: CssMap = {
  fontFamily: MONO_MAINfont,
  fontSize: $txt_.unter,
  position: "fixed",
  bottom: "0.2rem",
  right: "1rem",
  color: COPYRITEcol,
  zIndex: "-10",
}