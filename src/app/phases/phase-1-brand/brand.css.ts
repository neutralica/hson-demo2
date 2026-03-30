//css.consts.ts

import type { CssMap } from "../../../../../hson-live/dist/types/css.types";
import { $cols_ } from "../../core/consts/colors.consts";

const LOGOBOXcss:CssMap = {
  display: "flex",
  placeItems: "center",
  height: "5rem",
  position: "fixed",
  bottom: "2rem",
  right: "2rem",
  overflowX: "hidden",
  overflowY: "hidden",
  color: "white",
  width: "25ch",
  backgroundColor: $cols_.bckgd,
  fontFamily: `monospace`,
}


const BRAND_CSS: CssMap = {
  height: "3rem",
  position: "absolute",
  bottom: "1rem",
  display: "flex",
  placeItems: "center",
  zIndex: 50,
  width: "15ch",
  color: "lightgrey",
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

export const Intro_css = {
  zalgo: ZALGO_CSS,
  brand: BRAND_CSS,
  logobox: LOGOBOXcss,
}
