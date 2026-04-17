import type { CssMap } from "hson-live/types";
import { _COLS } from "../../core/consts/ui-consts";
import { MONO_MAINfont, _TXT, TXTcol_CODE, TXTcol_MENU } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { OKLCH_VIBRANT } from "../../core/consts/vibrant-oklch";


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
export const UI_BTN_HOVERcss = (col: string = TXTcol_MENU, back: string = _COLS.bckdeep): CssMap => {
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
  ...UI_BTN_HOVERcss,
  display: "inline-flex",
  alignItems: "flex-end",
  justifyContent: "center",
  userSelect: "none",
  cursor: "pointer",
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.reg,
  textTransform: "lowercase",
  background: _COLS.bckdeep,
} as const;


export const UI_STACK_LABELcss: CssMap = {
  position: "relative",
  fontSize: _TXT.reg,
};

export const UI_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(TXTcol_CODE),
  height: "100%",
  padding: "4px 4px",
  background: _COLS.bckdeep,
  color: TXTcol_CODE,
  width: "25%",
// justifyContent: "flex-end",
  // alignSelf: "flex-end"
};

export const UI_2STACKcss: CssMap = {
  display: "flex",
  flexDirection: "column",
  placeItems: "center",
  width: "15%",
  height: "100%",
  fontSize: _TXT.unter,
  padding: "4px",
  justifyContent: "flex-end",
};

export const UI_2STACK_VALcss: CssMap = {
  display: "inline",
  position: "relative",
  pointerEvents: "none",
  userSelect: "none",
  fontFamily: MONO_MAINfont,
  fontSize: _TXT.unter,
  justifySelf: "flex-end",
  color: OKLCH_VIBRANT.mintIce
};

export const UI_PANEL_HEADcss: CssMap = {
  position: "relative",
  zIndex: "5",
  height: "2rem",
  maxHeight: "2rem",
  padding: "6px",
  background: _COLS.bckdeep,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // gap: "2ch",
};
export const UI_PANEL_HEADERcss: CssMap = {
  // gap: "10px",
  position: "relative",
  zIndex: "5",
  height: "2rem",
  maxHeight: "2rem",
  background: _COLS.bckdeep,
  // columnGap: "0.5ch",
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

