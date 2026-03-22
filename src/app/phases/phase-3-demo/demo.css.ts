// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $pnk_, $red_etc_, $ylw_, ACID_WASH_OKLCH, ACID_WASH_RGBA, set_alpha } from "../../core/consts/colors.consts";
import { $GRID_GAPstr, $txt_ } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts";

export const MENU_TEXT_COL = OKLCH_FLEURS.rustPink;
export const MENU_FONT = "Monaco, mono"

export const MAIN_MENUcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: $txt_.heading,
  fontWeight: "500",
  userSelect: "none",
  color: MENU_TEXT_COL,
  pointerEvents: "all",
  cursor: "pointer",
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

export const $T$GHSONcss: CssMap = {
  fontSize: $txt_.hsonWordMarkMain,
  fontFamily: MENU_FONT,
  width: "max-content",
  userSelect: "none",
  lineHeight: "0.9",
  verticalAlign: "bottom"

}

export const DEMOcss: CssMap = {
  position: "fixed",
  width: "100%",
  height: "100%",
  inset: "0",
  overflow: "hidden",
  background: `linear-gradient(${$cols_.bckgd} 60%,${set_alpha($blu_.muted, 0.06)})`,
  pointerEvents: "none",
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
  pointerEvents: "all",
  minHeight: "0",
}

export const DEMO_SCREEN_FXcss: CssMap = {
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
  paddingLeft: "1rem",

  pointerEvents: "all",
};

export const MENU_BOXcss: CssMap = {
  // gridColumn: "1",
  // gridRow: "1 / span 2",
  // marginLeft: "2rem",
  // alignContent: "left",
  position: "relative",
  lineHeight: "2.5rem",

};

export const TITLE_BOXcss: CssMap = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
  minWidth: "0",
  marginTop:"1rem",
}

export const DEMO_MAIN_LOGOcss: CssMap = {
  display: "flex",
  alignContent: "baseline",
  justifyContent: "flex-start",
  flexDirection: "column",

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
  minWidth: "0",
  minHeight: "0",
};

export const VIEW_SLOTcss: CssMap = {
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
  textWrap: "nowrap",
  color: ACID_WASH_OKLCH.steel,
  marginBottom: "1rem",
  lineHeight: "1.6",
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