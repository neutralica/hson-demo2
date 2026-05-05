import type { CssMap } from "hson-live/types"
import { OKLCH_FLEURS } from "./demo-fleurs/fleurs.consts"
import { $gry_, ACID_WASH_RGBA } from "../../core/consts/colors.consts"
import { _COLS, MONO_MAINfont } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { _TXT, REDLIKEcol, TXTcol_MENU } from "../../core/consts/ui-consts";

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
      fontSize: "1.3rem",
      width: "auto",
      fontFamily: MONO_MAINfont,
      color: REDLIKEcol,
      background: _COLS.backhi,
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

export const GLOB_SCROLL_THUMBcss = {
  background: "rgba(160,220,255,0.45)",
  border: "2px solid rgba(0,0,0,0.45)"
};

export const MENU_ACTIVE_VIEWcss: CssMap = {
  color: "oklch(0.80 0.02 260)",
  fontWeight: "100",
  textDecoration: "underline",
  textUnderlineOffset: "0.3em",
  _hover: {
    background: $gry_.dark,
    color: _COLS.backhi,
    fontWeight: "100",
  },
};

export const MENU_ACTIVE_WIDGETcss: CssMap = {
  color: OKLCH_FLEURS.dimFern,
  fontWeight: "700",
  _hover: {
    background: set_alpha(TXTcol_MENU, 0.6),
    color: _COLS.backhi,
    fontWeight: "100",
  },

};

export const ABOUT_BTN_MOBcss = {
  position: "fixed",
  bottom: "2rem",
  left: "2rem",
  fontWeight: "700",
  fontSize: _TXT.wordMobile,
};