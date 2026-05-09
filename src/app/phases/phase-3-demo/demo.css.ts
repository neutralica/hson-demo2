// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, } from "../../core/consts/colors.consts";
import { _COLS, SYS_SANSfont, SYS_SMOLfont} from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { GRID_GAPstr, _TXT, GRAFFITIcol, SYS_MONOfont, TXTcol_MENU,  BLUELIKEcol, FADE_1col, COPYRITEcol } from "../../core/consts/ui-consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";


export const MAIN_MENUcss: CssMap = {
  ...FONT_FAM_MONO,
  userSelect: "none",
  color: TXTcol_MENU,
  pointerEvents: "all",
  cursor: "pointer",
  lineHeight: "1.6",
  _hover: {
    fontWeight: "100",
    background: BLUELIKEcol,
    color: _COLS.backhi
  },
  _active: {
    background: _COLS.backhi,
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
  fontSize: "4rem",
  fontFamily: SYS_MONOfont,
  fontWeight: "100",
  width: "0.5em",
  userSelect: "none",
  lineHeight: "0.9",
  verticalAlign: "bottom"

}

export const DEMOcss: CssMap = {
  position: "fixed",
  inset: "0",
  maxWidth: "100%",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: `linear-gradient(${_COLS.backlo} 80%,${set_alpha($blu_.muted, 0.03)})`,
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

}

export const DEMO_SCREEN_FXcss: CssMap = {
  boxSizing: "border-box",
  position: "relative",
  display: "grid",
  // left = nav, right = main
  gridTemplateColumns: "210px 1fr",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: GRID_GAPstr,

  width: "100%",
  height: "100%",
  // minHeight: "0",
  // minWidth: "0",
  // maxWidth: "100vw",

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
  color: FADE_1col,
  // color: ACID_WASH_RGBA.wornPurple,
  // color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  userSelect: "none",
}

export const COPYRITEcss: CssMap = {
  fontFamily: SYS_SANSfont,
  fontSize: _TXT.smol,
  position: "fixed",
  bottom: "0.2rem",
  right: "1rem",
  color: COPYRITEcol,
  zIndex: "-10",
}