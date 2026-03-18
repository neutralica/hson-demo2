import type { CssMap } from "hson-live/types"
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts"
import { $cols_ } from "../../consts/colors.consts"


export const MOBILE_TOCcss = {
  display: "grid",
  position: "fixed",
  left: "2rem",
  bottom: "11.5rem",
  width: "min(20rem, calc(100vw - 4rem))",
  maxHeight: "45vh",
  zIndex: "9998",
}

export const MOBILE_DOCcss = {
  gridColumn: "1",
  minWidth: "0",
  width: "100%",
}

export const SIZE_WARNINGcss: CssMap = {
  __after: {
    content: `"please use a larger device to fully explore hson::liveDemo"`,
    position: "fixed",
    left: "2rem",
    right: "2rem",
    bottom: "6rem",
    zIndex: "9997",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    fontFamily: "Monaco",
    background: OKLCH_FLEURS.rustPink,
    color: $cols_.bckdeep,
    borderRadius: "12px",
    textAlign: "center",
    transition: "opacity 15s linear",
    opacity: "1"
  }
}