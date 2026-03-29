import type { CssMap } from "hson-live/types"
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts"
import { $cols_, ACID_WASH_RGBA } from "../../core/consts/colors.consts"



export const DISP_SIZE_ALERTcss = (onoff: "on" | "off" = "on"): CssMap => {
  return {
    __after: {
      content: `"please use a larger device to fully explore hson::liveDemo -- for now: tap to create flowers!"`,
      position: "fixed",
      left: "2rem",
      right: "2rem",
      top: "10rem",
      zIndex: "9997",
      fontSize: "1.3rem",
      width: "auto",
      fontFamily: "Monaco",
      color:ACID_WASH_RGBA.strawSmoke,
      background: $cols_.bckdeep,
      border:`10px double ${ACID_WASH_RGBA.oxidizedRed}`,
      borderRadius: "12px",
      textAlign: "center",
      transition: "opacity 5s ease-in",
      opacity: onoff === "on" ? 1 : 0,
    }
  }
}

