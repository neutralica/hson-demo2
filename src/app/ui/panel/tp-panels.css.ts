import type { CssMap } from "hson-live/types";
import { $blu_, ACID_WASH_OKLCH, ACID_WASH_RGBA, $cols_ } from "../../core/consts/colors.consts";
import { $GRID_GAPstr, $txt_ } from "../../core/consts/ui-consts";
import { MENU_FONT } from "../../phases/phase-3-demo/demo.css";

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

export const PANEL_OUTERcss: CssMap = {
    // minHeight: "200px",
    minWidth: "0",
    // display: "grid",
    pointerEvents: "all",
} as const;

export const PANEL_SURFACEcss: CssMap = {
    width: "100%",
    height: "100%",
    minWidth: "0",
    minHeight: "0",
    borderRadius: "14px",
    // padding: "12px",
    boxSizing: "border-box",
    // display: "grid",
    gap: $GRID_GAPstr,
    // backgroundColor: $cols_.bckgd,
    pointerEvents: "all",

} as const;

export const PANEL_FRAMEcss = {
    // backgroundColor: back_w_alpha(0.4),
    // backdropFilter: "blur(8px)",
    // maxHeight: "100%",
    // outline: `1px solid rgba(10,150,220,1)`,
    color: $blu_.std,
    fontFamily: MENU_FONT,
} as const;

export const PANELcss: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: $GRID_GAPstr,
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    padding: "8px",
    borderRadius: "12px",
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
    fontFamily: MENU_FONT,
    fontSize: $txt_.unter,
    lineHeight: "1.85",
    // background: $cols_.backdeep,
    padding: "10px",
    color: ACID_WASH_OKLCH.bruisedPlum,
    border: `1px solid ${ACID_WASH_RGBA.oxidizedRed}`,
    borderRadius: "10px",
    outline: "none",
};

export const PANEL_BRANCHcss: CssMap = {
    display: "grid",
    // padding: "10px",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    gridTemplateColumns: `1fr 1fr`,
    gridTemplateRows: "auto 1fr",
    // gridTemplateRows: "auto " + $CHIP_WIDTHstr,
    background: $cols_.bckdeep,
};
