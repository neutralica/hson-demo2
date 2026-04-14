import type { CssMap } from "hson-live/types";
import { ACID_WASH_RGBA } from "../../core/consts/colors.consts";
import { _COLS } from "../../core/consts/ui-consts";
import { MONO_MAINfont, _TXT, TXTcol_CODE, TXTcol_MENU } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";


export const UI_BUTTON_BORDERcss: CssMap = {
  __after: {
    content: "]",
    display: "inline",
  },
  __before: {
    content: "[",
    display: "inline",

  }
};
export const UI_BUTTON_HOVERcss = (col: string = TXTcol_MENU, back: string = _COLS.bckdeep): CssMap => {
  return {
    _hover: {
      background: col,
      color: back,
    }
  }
};

export const UI_CHIP_BORDERcss: CssMap = {
  
};

export const UI_BTN_STDcss: CssMap = {
  ...UI_BUTTON_BORDERcss,
  ...UI_BUTTON_HOVERcss,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  cursor: "pointer",
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.reg,
  textTransform: "lowercase",
  background: _COLS.bckdeep,
} as const;


export const PP_LABELcss = {
  position: "absolute",
  bottom: "10px",
  fontSize: _TXT.reg,
};

export const PP_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  // height: "26px",
  padding: "4px 4px",
  background: _COLS.bckdeep,
  color: TXTcol_CODE,
  flex: "0 0 auto",
  // lineHeight: "1.1rem",
  alignSelf: "flex-end"
};

export const UI_2STACK_CHIPcss: CssMap = {
  display: "flex",
  flexDirection: "column",
  placeItems: "center",
  height: "32px",
  width: "6ch",
  fontSize: _TXT.reg,
  padding: "1ch",
  justifyContent: "flex-end",
};
//// used
// focused-only “invalid/valid/...” status (large, centered-ish but not obnoxious)
export const UI_2STACK_VALcss: CssMap = {
  display: "block",
  position: "relative",
  // top: "0px",
  // right: "12px",
  pointerEvents: "none",
  userSelect: "none",
  // opacity: "0", // set by JS
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.main,
  letterSpacing: "0.10em",
  alignSelf: "center",
  textTransform: "uppercase",
  textAlign: "center",
  width: "10ch",
  height: "100%",
  // border: "1px solid " + OKLCH_FLEURS.rustPink,
};

export const PP_HEADcss: CssMap = {
  position: "relative",
  zIndex: "5",
  minHeight: "2rem",
  padding: "6px",
  background: _COLS.bckdeep,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // gap: "2ch",
};

