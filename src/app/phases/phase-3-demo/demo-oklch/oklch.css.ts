import type { CssMap } from "hson-live/types";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { TXTcol_CODE, øfontSize, øCOLS, TXTcol_MENU } from "../../../core/consts/ui-consts";
import { CssManager } from "hson-live";


const cssVars = CssManager.api().var

export const ROOT_CSS: CssMap = {
  position: "fixed",
  bottom: "0",
  right: "0",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 7rem",
  color: TXTcol_CODE,
  ...FONT_FAM_MONO,
  fontSize: øfontSize.smol,
  // gap: "1rem",
  // minWidth: "0",
  // minHeight: "0",
  // height: "100%",
  "& div#test-div": {
    background: "red",
  },
};
export const PANEL_CSS: CssMap = {
  display: "grid",
  // gap: "0.65rem",
  alignContent: "start",
  minWidth: "0",
};
export const ROW_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "4ch minmax(0, 1fr) 8ch",
  // gap: "0.65rem",
  alignItems: "center",
  minWidth: "0",
};
export const PREVIEW_CSS: CssMap = {
  height: "5rem",
  width: "5rem",
  background: cssVars.get("oklch-demo-current"),
};
export const RANGE_CSS: CssMap = {
  appearance: "none",
  WebkitAppearance: "none",

  width: "100%",
  height: "1rem", // overall clickable region
  margin: "0",
  background: "transparent",
  cursor: "crosshair",

  // actual visible track
  "&::-webkit-slider-runnable-track": {
    height: "0.2rem",
    background: øCOLS.backhi,
    border: `1px solid ${TXTcol_CODE}`,
  },

  // draggable handle
  "::-webkit-slider-thumb": {
    WebkitAppearance: "none",

    width: "0.75rem",
    height: "0.75rem",
    marginTop: "-0.32rem",

    border: `10px solid ${TXTcol_CODE}`,
    background: "hotpink",
    borderRadius: "0",
  },

  "&::-moz-range-track": {
    height: "0.2rem",
    background: øCOLS.backhi,
    border: `1px solid ${TXTcol_CODE}`,
  },

  "&::-moz-range-thumb": {
    width: "0.75rem",
    height: "0.75rem",
    border: `1px solid ${TXTcol_CODE}`,
    background: cssVars.get("oklch-demo-current"),
    borderRadius: "0",
  },
};