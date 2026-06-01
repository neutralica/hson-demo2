import type { CssMap } from "hson-live/types"
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts"
import { $gry_, ACID_WASH_RGBA } from "../../../core/consts/old-rgb.consts"
import { øCOLS, øHSON_COL, SYS_MONOfont, øfontWeight, TXTcol_CODE, MENU_OKLCH, WIDGETcol, TXTcol_ALT } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { øfontSize, REDcol, TXTcol_MENU } from "../../../core/consts/ui-consts";
import { ACID_WASH_OKLCH, OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";

export const SCROLL_HOVER_COLcss = {
  background: "rgba(180,230,255,0.65)"
};

export const WEBKIT_SCROLL_TRKcss = {
  background: "rgba(0,0,0,0.35)"
};

export const DISP_SIZE_ALERTcss = (onoff: "on" | "off" = "on"): CssMap => {
  return {
    __after: {
      content: `"please use a larger device to fully explore hson::liveDemo -- for now: tap to create flowers!"`,
      position: "fixed",
      left: "2rem",
      right: "2rem",
      top: "10rem",
      zIndex: "9997",
      width: "auto",
      ...FONT_FAM_MONO,
      color: REDcol,
      background: øCOLS.backhi,
      border: `10px double ${ACID_WASH_RGBA.oxidizedRed}`,
      borderRadius: "12px",
      textAlign: "center",
      transition: "opacity 5s ease-in",
      opacity: onoff === "on" ? 1 : 0,
    }
  }
};

export const GLOB_HIDEcss = {
  visibility: "hidden",
  height: "0",
  display: "none",
};

export const GLOB_SCROLLBARcss = {
  scrollbarWidth: "thick",
  scrollbarColor: "rgba(160,220,255,0.45) rgba(0,0,0,0.35)"
};

export const GLOB_WEBKIT_SCROLLcss = {
  width: "30px",
  height: "10px"
};

export const GLOB_SCROLL_THUMBcss: CssMap = {
  _hover: {
    background: "rgba(160,220,255,0.45)",
    border: "2px solid rgba(0,0,0,0.45)"
  }
};

export const MENU_ACTIVE_VIEWcss: CssMap = {
  textDecoration: "underline",
  textUnderlineOffset: "0.3em",
  fontWeight: øfontWeight.fat,
  opacity: "1",
  _hover: {
    // color: $gry_.dim,
    background:TXTcol_ALT,
    color: øCOLS.backlo,
    fontWeight: øfontWeight.main,
  },
};

export const MENU_ACTIVE_WIDGETcss: CssMap = {
  textDecoration: "underline",
  textUnderlineOffset: "0.3em",
  // color: øHSON_COL.o,
  fontWeight: øfontWeight.fat,
  opacity: "1",
  _hover: {
    background:TXTcol_ALT,
    color: øCOLS.backlo,
    fontWeight: øfontWeight.main,
  },

};

