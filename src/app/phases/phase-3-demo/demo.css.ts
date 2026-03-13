// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $pnk_, $ylw_, ACID_WASH_OKLCH } from "../../consts/colors.consts";
import { $GRID_GAPstr, $txt_ } from "../../consts/ui-consts";

export const MENU_TEXT_COL = ACID_WASH_OKLCH.straw;

export const MAIN_MENUcss: CssMap = {
  fontFamily: "monospace",
  fontSize: $txt_.heading,
  fontWeight: "400",
  userSelect: "none",
  color: MENU_TEXT_COL,
  _hover: {
    fontWeight: "700",
    background: $blu_.muted,
    color: $cols_.backdeep
  },
  _active: {
    background: $grn_.muted,
    color: $cols_.backdeep
  }
}

export const $T$GHSONcss: CssMap = {
  fontSize: $txt_.hsonWord,
  fontFamily: "Jacquard12",
  width: "max-content",
}

export const DEMOcss: CssMap = {
  position: "fixed",
  width: "100%",
  height: "100%",
  inset: "0",
  overflow: "hidden",
  background: $cols_.bckgd,
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
  gridTemplateColumns: "1fr 4fr",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: $GRID_GAPstr,

  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  paddingLeft: "1rem",

  pointerEvents: "all",
};

export const MENU_LISTcss: CssMap = {
  // gridColumn: "1",
  // gridRow: "1 / span 2",
  marginLeft: "2rem",
  position: "relative",
  lineHeight: "2.5rem",

};

export const TITLE_BOXcss: CssMap = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
}

export const DEMO_MAIN_LOGOcss: CssMap = {
  display: "flex",
  alignContent: "baseline",
  justifyContent: "flex-start",
  fontFamily: "Jacquard12",

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
};

export const LAYOUT_GRIDcss: CssMap = {
  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  display: "grid",

  // no dock row anymore
  gridTemplateRows: "minmax(0, 1fr)",

  gap: $GRID_GAPstr,
  boxSizing: "border-box",
  overflow: "hidden",
} as const;

export const MOUSE_SLOTcss: CssMap = {
  marginTop: "1rem",   // space below menu

  width: "100%",
  minWidth: "0",
  minHeight: "0",

  display: "flex",     // so child can size naturally
  flexDirection: "column",
};

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
  // height: "50%",
  // width: "50%",
  color: ACID_WASH_OKLCH.orchid,
  maxWidth: " calc(100vw - 2rem)",   /* keep 1rem gutters */
  boxSizing: "border-box",
  textShadow: "0 0 1px " + $cols_.backdeep,
  mixBlendMode: "multiply",
}