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
  position: "relative",  // critical anchor for uiRoot absolute
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gridTemplateRows: "1fr 2fr 2fr 1fr",
  width: "100%",
  height: "100%",
  minHeight: "0",
  inset: "0",
  pointerEvents: "all",
  mixBlendMode: "normal",
  opacity: "1",
};

export const MENU_BOXcss: CssMap = {
  position: "relative",
  left: "6rem",
  lineHeight: "2rem",

}

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
  position: "relative",
  top: "0",
  left: "0",
  height: "100vh",
  width: "20rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

export const LAYOUT_GRIDcss: CssMap = {
  left: "30%",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "1fr 1fr",   // force two visible rows
  gridColumn: "2 / 5"
}