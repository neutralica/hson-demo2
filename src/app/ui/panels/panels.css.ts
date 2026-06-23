import type { CssMap } from "hson-live/types";
import { GRID_GAPstr } from "../../core/consts/ui-consts";
import { _colors } from "../../core/consts/colors.consts";
import { SYS_MONOfont, _fontSize } from "../../core/consts/ui-consts";
import { OKLCH_VIBRANT } from "../../core/consts/oklch.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";


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
export const UI_BTN_HOVERcss = (col: string = _colors.txt.menu, back: string = _colors.backhi): CssMap => {
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
  ...FONT_FAM_MONO,
  textTransform: "lowercase",
  background: _colors.backlo,
  fontSize: _fontSize.main,
  lineHeight:"1",
} as const;


export const UI_STACK_LABELcss: CssMap = {
  position: "relative",
  fontSize: _fontSize.main,
};

export const UI_BTNcss: CssMap = {
  ...UI_BTN_STDcss,
  ...UI_BTN_HOVERcss(_colors.txt.code),
  height: "100%",
  padding: "0.4em 0.5em",
  background: _colors.backlo,
  color: _colors.txt.code,
  width: "25%",
// justifyContent: "flex-end",
  // alignSelf: "flex-end"
};

export const UI_2STACKcss: CssMap = {
  display: "flex",
  flexDirection: "column",
  placeItems: "center",
  // width: "15%",
  // height: "100%",
  fontSize: _fontSize.main,
  padding: "0.4em 0.5em",
  justifyContent: "flex-end",
};

export const UI_2STACK_VALcss: CssMap = {
  display: "inline",
  position: "relative",
  pointerEvents: "none",
  userSelect: "none",
  ...FONT_FAM_MONO,
  justifySelf: "flex-end",
  color: OKLCH_VIBRANT.mintIce
};

export const UI_PANEL_HEADcss: CssMap = {
  position: "relative",
  zIndex: "5",
  height: "2rem",
  // maxHeight: "3rem",
  padding: "6px",
  background: _colors.backlo,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  // gap: "2ch",
};

export const UI_PANEL_HEADERcss: CssMap = {
  // gap: "10px",
  position: "relative",
  zIndex: "5",
  height: "2rem",
  maxHeight: "2rem",
  background: _colors.backhi,
  // columnGap: "0.5ch",
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const UI_TEXTcss: CssMap = {
  height: "100%",
  minWidth: "0",
  resize: "none",
  width: "100%",
  boxSizing: "border-box",
  ...FONT_FAM_MONO,
  fontSize: _fontSize.smol,
  // background: COLORS_.bckdeep,
  border: "none",
  padding: "10px",
  color: _colors.txt.menu,
  outline: "none"
};
export const UI_PANELcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: GRID_GAPstr,
  minHeight: "0",
  minWidth: "0",
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  overflowY: "auto",
  maxHeight: "100%",
  background: _colors.backlo,
};

