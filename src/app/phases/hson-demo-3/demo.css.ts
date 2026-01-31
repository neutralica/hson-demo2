// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS } from "../../wordmark/wordmark.css";
import { $COL } from "../../consts/colors.consts";


export const MAIN_TEXTcss: CssMap = {
  fontFamily: "'Inconsolata', monaco, monospace",
  fontSize: "2rem",

}

export const $T$GHSONcss = {
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
 * OUTER SURFACE (user-facing bezel plane)
 * - texture carries the darkness (not a single flat dark color)
 * - keep it subtle so panels remain legible
 */
export const DEMO_WALLcss: CssMap = {
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  pointerEvents: "none",
  borderRadius: "28px",
  isolation: "isolate",
  border: `1px double ${$COL.stonerPurple}`
};

/**
 * WALL FX (glint + edge pickup)
 * - this should NOT paint a giant hazy frame
 * - keep it to bottom/right edges only
 */
export const DEMO_WALL_FXcss: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  borderRadius: "28px",
  overflow: "hidden",
  // A *localized* edge pickup, not a ring.
  // Use backgrounds instead of borders+blur (borders+blur tend to smear into a gasket look).
  // backgroundColor: " rgba(255,255,255,0.10)",

  opacity: "0.65",
  filter: "blur(1.1px)",
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
}

export const DEMO_SCREEN_FXcss: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "all",
  mixBlendMode: "normal",
  opacity: "1",

};

export const MENU_BOXcss = {
  position: "absolute",
  left: "500px",
  height: "max-content",
  width: "max-content",
  zIndex: "-1",
  color: $COL.skyBlue,
  filter: "blur(0.35px)",
  margin: "2rem",
  fontFamily: "monospace",
  border: "1px solid aquamarine",
  pointerEvents: "all",
  padding: "1rem",
}

/**
 * INSET / INNER FRAME
 * - stop heavy uniform inset rings (gasket)
 * - keep your bottom-right glint via XY offset shadow
 * - allow it to read as a darker surround to the glass
 */
export const SCREEN_GLINTstr =
  "2px 2px 0 0.5px rgba(65, 110, 165, 0.96)";

/**
 * this selector describes the (in the narrative of the terminal screen) 
 * thin band of plastic that meets the glass perpendicularly, which will 
 * catch reflection from the screen illumination and also carry a thin 
 * band of ambient light on the frame edge
 */
export const DEMO_SCREEN_INSETcss: CssMap = {
  position: "absolute",
  left: "3%",
  top: "3%",
  width: "94%",
  height: "94%",
  pointerEvents: "none",
  borderRadius: "26px",
  padding: "12px",
  boxSizing: "border-box",
  overflow: "hidden",
  isolation: "isolate",
  backgroundColor: $COL.greyBlack,
  // slightly darker than glass
  background: [
    // "linear-gradient(180deg, rgba(18,18,18,1), rgba(16,16,16,1))",
    //   // tiny internal grain so it isn’t a flat slab
    // "repeating-linear-gradient(0deg, rgba(255,255,255,0.010) 0 1px, transparent 1px 12px)",
    // "repeating-linear-gradient(90deg, rgba(255,255,255,0.008) 0 1px, transparent 1px 16px)",
  ].join(", "),

  boxShadow: [
    // remove the thick uniform ring that reads like rubber
    "inset 0 0 0 1px rgba(255,255,255,0.020)",
    "inset 0 0 0 2px rgba(0,0,0,0.18)",

    // bottom-right specular catch (your discovery)
    SCREEN_GLINTstr,

    // depth, but light-touch
    "inset 0 18px 30px rgba(0,0,0,0.16)",
    "inset 0 -18px 30px rgba(0,0,0,0.20)",
  ].join(", "),
};

export const TITLE_BOX_CSS: CssMap = {
  position: "absolute",
  display: "flex",
  flexDirection: "row",
  padding: "1rem",
}

export const HEADLINE_CSS: CssMap = {
  display: "flex",
  alignContent: "baseline",
  justifyContent: "flex-start",
  zIndex: 100,
  fontFamily: "Jacquard12",
}

export const MAIN_CONTAINERcss = {
  position: "relative",
  top: "5vh",
  left: "5vw",
  height: "90%",
  width: "20rem",
  border: "1px dashed grey",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",


};