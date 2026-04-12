import type { CssMap } from "hson-live/types";
import { $blu_, ACID_WASH_OKLCH, ACID_WASH_RGBA, COLORS_ } from "../../app/core/consts/colors.consts";
import { GRID_GAPstr, $txt_, TXTcol_ALT } from "../../app/core/consts/ui-consts";
import { MONO_MAINfont } from "../../app/core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../app/phases/phase-3-demo/demo-fleurs/fleurs.consts";

export const UI_ROOTcss: CssMap = {

  display: "grid",

  // no dock row anymore
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

export const PANELcss: CssMap = {
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
}

export const PANEL_TEXTAREAcss = {
    height:"100%",
    minWidth: "0",
    resize: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: MONO_MAINfont,
    fontSize: $txt_.reg,
    lineHeight: "1.55",
    // background: COLORS_.bckdeep,
    border: "none",
    padding: "1rem",
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
    background: COLORS_.bckdeep,
};
