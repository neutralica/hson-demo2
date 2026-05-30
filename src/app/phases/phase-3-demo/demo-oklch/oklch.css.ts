import type { CssMap } from "hson-live/types";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { TXTcol_CODE, øfontSize, øCOLS, TXTcol_MENU, MENU_OKLCH } from "../../../core/consts/ui-consts";
import { CssManager } from "hson-live";


export const ROOT_CSS: CssMap = {
  position: "fixed",
  right: "1.2rem",
  bottom: "1.2rem",
  zIndex: "20",

  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 7rem",
  gap: "0.85rem",
  alignItems: "stretch",

  width: "min(42rem, calc(100vw - 2.4rem))",
  minHeight: "11rem",
  padding: "0.85rem",

  color: TXTcol_CODE,
  ...FONT_FAM_MONO,
  fontSize: øfontSize.smol,

  background: "oklch(7% 0.025 260 / 0.94)",
  border: `1px solid ${TXTcol_CODE}`,
  boxShadow: `0 0 0.75rem ${TXTcol_CODE}`,
};
export const PANEL_CSS: CssMap = {
  display: "grid",
  gap: "0.35rem",
  alignContent: "start",
  minWidth: "0",
};
export const ROW_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "4ch minmax(0, 1fr) 8ch",
  gap: "0.35rem",
  alignItems: "center",
  minWidth: "0",
};

export const TITLE_CSS: CssMap = {
  color: TXTcol_MENU,
  letterSpacing: "0.04em",
  paddingBottom: "0.25rem",
  borderBottom: `1px solid ${TXTcol_CODE}`,
};

export const CODE_CSS: CssMap = {
  minHeight: "1.2rem",
  paddingTop: "0.25rem",
  color: TXTcol_MENU,
};

export const TARGET_ROW_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  padding: "0.15rem 0.35rem",
  border: `1px solid transparent`,
  cursor: "crosshair",
};

export const TARGET_ROW_ACTIVE_CSS: CssMap = {
  ...TARGET_ROW_CSS,
  border: `1px solid ${TXTcol_CODE}`,
  background: "oklch(16% 0.035 260 / 0.9)",
  color: TXTcol_CODE,
};

export const PREVIEW_CSS: CssMap = {
  height: "5.75rem",
  width: "5.75rem",
  alignSelf: "start",
  justifySelf: "center",
  background: MENU_OKLCH,
  border: `1px solid ${TXTcol_CODE}`,
  boxShadow: `0 0 0.55rem ${MENU_OKLCH}`,
};

export const RANGE_CSS: CssMap = {
  appearance: "none",
  "-webkit-appearance": "none",

  height: "1rem",
  width: "100%",
  margin: "0",
  overflow: "hidden",
  cursor: "crosshair",
  accentColor: MENU_OKLCH,

  // actual visible track
  "&::-webkit-slider-runnable-track": {
    height: "0.35rem",
    background: øCOLS.backhi,
    border: `1px solid ${TXTcol_CODE}`,
  },

  // draggable handle
  "&::-webkit-slider-thumb": {
    "-webkit-appearance": "none",
    appearance: "none",

    width: "1rem",
    height: "1rem",
    marginTop: "-0.35rem",

    border: `1px solid ${TXTcol_CODE}`,
    background: MENU_OKLCH,
    borderRadius: "999px",
    boxShadow: `0 0 0.35rem ${MENU_OKLCH}`,
  },

  "&::-moz-range-track": {
    height: "0.35rem",
    background: øCOLS.backhi,
    border: `1px solid ${TXTcol_CODE}`,
  },

  "&::-moz-range-thumb": {
    width: "1rem",
    height: "1rem",
    border: `1px solid ${TXTcol_CODE}`,
    background: MENU_OKLCH,
    borderRadius: "999px",
    boxShadow: `0 0 0.35rem ${MENU_OKLCH}`,
  },
};