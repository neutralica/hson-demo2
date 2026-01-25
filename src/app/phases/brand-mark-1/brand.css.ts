//css.consts.ts

import type { CssMap } from "../../../../../hson-live/dist/types/css.types";
import { $COL } from "../../consts/colors.consts";

const LOGOBOX_CSS = {
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
  backgroundColor: $COL._bckgd,
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
  color: "light-grey",
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
  // removed filter: blur here
}

export const Intro_css = {
  zalgo: ZALGO_CSS,
  brand: BRAND_CSS,
  logobox: LOGOBOX_CSS,
}
