//css.consts.ts

import type { CssMap } from "../../../../../hson-live/dist/types/css.types";
import { øCOLS, SYS_MONOfont, øHSON_COL, øfontSize } from "../../core/consts/ui-consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../core/consts/oklch.consts";
import { FADE_1col } from "../../core/consts/ui-consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";

const LOGOBOXcss:CssMap = {
  display: "flex",
  placeItems: "center",
  height: "5rem",
  position: "fixed",
  bottom: "2rem",
  right: "2rem",
  overflowX: "hidden",
  overflowY: "hidden",
  color: OKLCH_NEUTRALS.ash,
  width: "25ch",
  backgroundColor: øCOLS.backlo,
  fontFamily: SYS_MONOfont,
}


const BRAND_CSS: CssMap = {
  height: "3rem",
  position: "absolute",
  bottom: "1rem",
  display: "flex",
  placeItems: "center",
  zIndex: 50,
  width: "15ch",
  color: FADE_1col,
  overflowX: "hidden",
  filter: `drop-shadow(0 1px 0 rgba(0,0,0,.7))
          drop-shadow(0 0 6px rgba(0,0,0,.35))`
}

const ZALGO_CSS: CssMap = {
  height: "5rem",
  position: "absolute",
  bottom: "0",
  display: "grid",
  placeItems: "center",
  whiteSpace: "pre",
  pointerEvents: "none",
  opacity: "0",

}
export const NOTEBOXcss: CssMap= {
  position: "fixed",
  top: "1rem",
  left: "1rem",
  backgroundColor: øCOLS.backlo,
  padding: "1rem",
  ...FONT_FAM_MONO,
  color: øHSON_COL.n,
  fontSize: øfontSize.smol
};
export const Intro_css = {
  zalgo: ZALGO_CSS,
  brand: BRAND_CSS,
  logobox: LOGOBOXcss,
}
