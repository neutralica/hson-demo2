// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS } from "../../wordmark/wordmark.css";
import { $COL, _setBckgdAlpha } from "../../consts/colors.consts";


export const MAIN_TEXTcss: CssMap = {
  fontFamily: "'Inconsolata', monaco, monospace",
  fontSize: "40px",

}

export const $T$GHSONcss: CssMap = {
  fontSize: "6rem",
  fontFamily: "Jacquard12",
  width: "max-content",
}

export const DEMOcss: CssMap = {
  position: "fixed",
  width: "100%",
  height: "100%",
  inset: "0",
  overflow: "hidden",
  background: "#07070a",
  pointerEvents: "none",
};


export const DEMO_STAGEcss: CssMap = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
  // default vars (even if unused initially)
  "--mxp": "50%",
  "--myp": "40%",
  backgroundColor: $COL._bckgd,
  pointerEvents: "none",

};

export const LETTER_CSS_DEMO: CssMap = {
  ...LETTER_CSS,
  color: "rgba(230,232,238,0.80)",
  textShadow: [
    // slight emboss: light edge + dark edge
    "0 1px 0 rgba(255,255,255,0.08)",
    "0 -1px 0 rgba(0,0,0,0.35)",
    // soft “ink” bleed
    "0 0 18px rgba(0,0,0,0.30)",
  ].join(", "),
  filter: "contrast(1.02)",
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
  width: "100%",
  height: "100%",
  minHeight: "0",
  inset: "0",
  pointerEvents: "all",
  mixBlendMode: "normal",
  opacity: "1",
};

export const MENU_BOXcss: CssMap = {
  position: "absolute",
  left: "500px",
  height: "max-content",
  width: "max-content",
  zIndex: "-1",
  filter: "blur(0.35px)",
  margin: "2rem",
  fontFamily: "monospace",
  border: "1px solid aquamarine",
  pointerEvents: "all",
  padding: "1rem",
  color: $COL.skyBlue,
}


export const TITLE_BOXcss: CssMap = {
  position: "absolute",
  display: "flex",
  flexDirection: "row",
  padding: "1rem",
}

export const HEADLINEcss: CssMap = {
  display: "flex",
  alignContent: "baseline",
  justifyContent: "flex-start",
  fontFamily: "Jacquard12",
}

export const MAIN_CONTAINERcss: CssMap = {
  position: "relative",
  top: "5vh",
  left: "10vw",
  height: "90%",
  width: "20rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

export const BELT_HOLDERcss: CssMap = {
  position: "fixed",
  top: "0",
  left: "0",
  height: "100%",
  width: "17%",
  overflow: "hidden",
  scaleY: "3",
  background: `
    /* side sheen */
    linear-gradient(to right,
      rgba(255,255,255,0.10),
      rgba(255,255,255,0.05) 40%,
      rgba(0,0,0,0.08) 78%,
      rgba(0,0,0,0.22)
    ),

    /* end vignette */
    linear-gradient(to bottom,
      rgba(0,0,0,0.62),
      rgba(0,0,0,0.20) 18%,
      rgba(0,0,0,0.08) 50%,
      rgba(0,0,0,0.20) 82%,
      rgba(0,0,0,0.62)
    ),

    /* repeatable signature: faint diagonal scuffs */
    repeating-linear-gradient(135deg,
      rgba(255,255,255,0.02) 0px,
      rgba(255,255,255,0.02) 2px,
      rgba(0,0,0,0.05) 2px,
      rgba(0,0,0,0.00) 10px
    ),

    /* ribs */
    repeating-linear-gradient(to bottom,
      rgba(255,255,255,0.10) 0px,
      rgba(255,255,255,0.60) 1px,
      rgba(255,255,255,0.20) 1px,
      rgba(0,0,0,0.90) 6px
    )
  `,

  backgroundSize: `
    auto,
    auto,
    100% 220px,
    auto
  `,

  backgroundPosition: `
    0 0,
    0 0,
    0 var(--belt-scroll, 0px),
    0 var(--belt-scroll, 0px)
  `,

  boxShadow:
    "inset -1px 0 0 rgba(255,255,255,0.10), inset 1px 0 0 rgba(0,0,0,0.55)",
} as const;

export const LAYOUT_GRIDcss = {

  gridTemplateColumns: "1fr",
  gridTemplateRows: "1fr 1fr",   // force two visible rows

}