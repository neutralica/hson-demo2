// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, } from "../../../core/consts/old-rgb.consts";
import { $MENU_SHADOW, øCOLS, øHSON_COL, SYS_SANSfont, SYS_SMOLfont, øfontWeight, TXTcol_ALT, $SIDEBAR_WIDTH, MENU_OKLCH} from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { GRID_GAPstr, øfontSize, GRAFFITIcol, SYS_MONOfont, TXTcol_MENU,  BLUELIKEcol, FADE_1col, COPYRITEcol } from "../../../core/consts/ui-consts";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { OKLCH_NEUTRALS } from "../../../core/consts/oklch.consts";
import { CssManager } from "hson-live";


export const UI_ROOTcss: CssMap = {
  // display: "grid",
  // gridTemplateRows: "minmax(0, 1fr)",
  boxSizing: "border-box",
  overflow: "hidden",
  gridColumn: "2 / 3",
  gridRow: "1 / 2",

  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",

  position: "relative",
  pointerEvents: "auto",
};

export const MAIN_MENUcss: CssMap = {
  ...FONT_FAM_MONO,
  userSelect: "none",
  color: MENU_OKLCH,
  pointerEvents: "all",
  cursor: "pointer",
  lineHeight: "2",
  textShadow: $MENU_SHADOW + set_alpha(TXTcol_MENU, 0.4)
          + ", 0 0 58px " + set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.1),
  fontWeight: øfontWeight.main,
  _hover: {
    fontWeight: øfontWeight.main,
    background:MENU_OKLCH,
    color: øCOLS.backhi
  },
  
  _active: {
        background: øCOLS.backhi,
    color: BLUELIKEcol,
    fontWeight: øfontWeight.fat,
  }
}


export const MENU_BOXcss: CssMap = {
  position: "relative",
  lineHeight: "2.5rem",
};

export const DEMO_HEADLINEcss: CssMap = {
  textShadow: "1px 1px 62px hotpink",
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
  fontSize: "4rem",
  fontFamily: SYS_MONOfont,
  fontWeight: øfontWeight.main,
  width: "0.5em",
  userSelect: "none",
  lineHeight: "0.9",
  verticalAlign: "bottom",
  pointerEvents: "auto",

}

export const DEMOcss: CssMap = {
  position: "fixed",
  inset: "0",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: `linear-gradient(${øCOLS.backlo} 80%,${set_alpha($blu_.muted, 0.03)})`,
  pointerEvents: "none",
  boxSizing: "border-box"
};


/**
 * GLASS (screen)
 * - keep your greyBlack
 * - stop huge bloom that reads like a seal / fog
 */
export const DEMO_SCREENcss: CssMap = {
  position: "fixed",
  inset: "0",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "none",
  minHeight: "0",
  boxSizing: "border-box",
  overscrollBehaviorY: "none", // not sure it will do what I want
  display: "grid",
  gridTemplateColumns: $SIDEBAR_WIDTH + " auto",
  gridTemplateRows: "minmax(0, 1fr)",
  
  gap: GRID_GAPstr,

}

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
  margin: "2rem",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  whiteSpace: "pre",
  fontFamily: "monospace", // best density; do not change to system mono
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
  ...FONT_FAM_MONO,
  position: "relative",
  textWrap: "nowrap",
  color: OKLCH_NEUTRALS.ash,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  userSelect: "none",
}

export const COPYRITEcss: CssMap = {
  fontFamily: SYS_SANSfont,
  fontSize: øfontSize.smol,
  position: "fixed",
  bottom: "0.2rem",
  right: "1rem",
  color: COPYRITEcol,
  zIndex: "-10",
};