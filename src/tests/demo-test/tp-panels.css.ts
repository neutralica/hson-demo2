import type { CssMap } from "hson-live/types";
import { $blu_, ACID_WASH_RGBA } from "../../app/core/consts/colors.consts";
import { ACID_WASH_OKLCH } from "../../app/core/consts/oklch";
import { _COLS } from "../../app/core/consts/ui-consts";
import { GRID_GAPstr, _TXT, TXTcol_ALT } from "../../app/core/consts/ui-consts";
import { SYS_MONOfont } from "../../app/core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { FONT_FAM_MONO } from "../../app/core/consts/css.consts";

export const UI_ROOTcss: CssMap = {
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  boxSizing: "border-box",
  overflow: "hidden",
  gridColumn: "2 / 3",
  gridRow: "1 / 2",

  minWidth: "0",
  minHeight: "0",
  width: "100%",
  height: "100%",

  position: "relative",
  pointerEvents: "auto",
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
    background: _COLS.backlo,
}

export const UI_TEXTcss = {
    height:"100%",
    minWidth: "0",
    resize: "none",
    width: "100%",
    boxSizing: "border-box",
    ...FONT_FAM_MONO,
    // background: COLORS_.bckdeep,
    border: "none",
    padding: "10px",
    color: OKLCH_FLEURS.cyanDust,
    outline: "none"
};

export const PANEL_BRANCHcss: CssMap = {
    display: "grid",
    // padding: "10px",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    gridTemplateColumns: `1fr 1fr`,
    gridTemplateRows: "auto 1fr",
    background: _COLS.backlo,
};
