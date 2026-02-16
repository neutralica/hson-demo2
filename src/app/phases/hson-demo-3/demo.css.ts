// demo.css.ts

import type { CssMap } from "hson-live/types";
import { $cols_, $grn_ } from "../../consts/colors.consts";
import { $txt_ } from "../../consts/ui-consts";


export const MAIN_TEXTcss: CssMap = {
  fontFamily: "'Inconsolata', monaco, monospace",
  fontSize: $txt_.heading,
  _hover: {
    fontWeight: "700",
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
  borderRadius: "18px",
  overflow: "hidden",
  isolation: "isolate",
  pointerEvents: "all",
  minHeight: "0",
}

export const DEMO_SCREEN_FXcss: CssMap = {
  position: "relative",
  display: "grid",

  // left = nav, right = main
  gridTemplateColumns: "minmax(18rem, 1fr) minmax(0, 2.5fr)",
  gridTemplateRows: "minmax(0, 1fr)",

  gap: "2.5rem",
  padding: "3rem",

  width: "100%",
  height: "100%",
  minHeight: "0",
  minWidth: "0",

  pointerEvents: "all",
};

export const MENU_BOXcss: CssMap = {
  gridColumn: "1",
  gridRow: "1 / span 2",

  position: "relative",
  lineHeight: "2rem",
};

export const TITLE_BOXcss: CssMap = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
}

export const HEADLINEcss: CssMap = {
  display: "flex",
  alignContent: "baseline",
  justifyContent: "flex-start",
  fontFamily: "Jacquard12",

}

export const MAIN_CONTAINERcss: CssMap = {
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
  gridColumn: "2",
  gridRow: "1",
  display: "grid",
  placeItems: "center",
  gap: "1.25rem",

  minWidth: "0",
  minHeight: "0",
  overflow: "hidden",
};

export const PANEL_SAFETYcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
};