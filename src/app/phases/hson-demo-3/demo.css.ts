// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $cols_, $grn_, $ylw_ } from "../../consts/colors.consts";
import { $GRID_GAPstr, $txt_ } from "../../consts/ui-consts";


export const MAIN_MENUcss: CssMap = {
  fontFamily: "monospace",
  fontSize: $txt_.heading,
  fontWeight: "400",
  _hover: {
    fontWeight: "700",
    background: $grn_.muted,
    color: $cols_.backdeep
  },
  _active: {
    background: $ylw_.muted,
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
  gridTemplateColumns: "1fr 6fr",
  gridTemplateRows: "minmax(0, 1fr)",

  gap:$GRID_GAPstr,

  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",
  paddingLeft: "1rem",

  pointerEvents: "all",
};

export const MENU_LISTcss: CssMap = {
  gridColumn: "1",
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
  // CHANGED: remove viewport anchoring — let the parent grid do its job
  position: "absolute",
  minWidth: "0",
  minHeight: "0",

  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "flex-start",

  // ADDED: place into left column
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
};
  
  export const LAYOUT_GRIDcss: CssMap = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    minWidth: "0",
    display: "grid",
    gridTemplateRows: "3fr minmax(auto, 1fr)",
    gap: $GRID_GAPstr,
  // padding: "12px",
  boxSizing: "border-box",
  overflow: "hidden", // CHANGED: avoid scrollbars here; panels/surfaces scroll
} as const;

export const PANEL_SAFETYcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
};

export const VIEW_SLOTcss={
    position: "relative",
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    pointerEvents: "auto",
  }

export const DOCK_SLOTcss ={
    position: "relative",
    bottom: "0",
    // top: "-110",
    // left: "0",
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    maxHeight: "15rem",
    overflow: "hidden",
    pointerEvents: "auto",
  }