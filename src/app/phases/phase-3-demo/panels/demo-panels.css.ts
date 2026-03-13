import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $red_etc_, $ylw_, back_w_alpha } from "../../../consts/colors.consts";
import { $CHIP_WIDTHstr } from "../../../../tests/tests.consts";
import { $GRID_GAPstr, $txt_ } from "../../../consts/ui-consts";
import { TEST_ACTION_BTN } from "../demo-test/test-panel-factory";

export const UI_ROOTcss: CssMap = {
  // this is the main content column (right side)
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
    padding: "12px",
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
    fontFamily: "monospace",
} as const;

export const PANELcss: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: $GRID_GAPstr,
    minHeight: "0",
    minWidth: "0",
    width: "100%",
    padding: "10px",
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
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    // background: $cols_.backdeep,
    color: $grn_.std,
    border: `1px solid ${$red_etc_.stonerPurple}`,
    borderRadius: "10px",
    outline: "none",
};


export const TEST_STATUS_CHIPcss: CssMap = {
    padding: "8px 10px",
    boxSizing: "border-box",
    fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.heading,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    // background: $cols_.bckgd,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    opacity: "0.9",
    color: $gry_.dimmer,
    maxWidth: $CHIP_WIDTHstr
} as const;

export const TEST_LOGGERcss: CssMap = {
    // ...SCROLLERcss,                  // nah
    borderRadius: "12px",
    padding: "10px",
    boxSizing: "border-box",
    // background: $cols_.backdeep,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.sub,
    height: "100%",
    minHeight: "10rem",
    maxHeight: "100%",
    minWidth: "100%",
    gridColumn: "1 / 5",
    color: $ylw_.candy,
    whiteSpace: "wrap",
    letterSpacing: "0.1em",
    lineHeight: "1.5rem",
    opacity: "0.92",
    
} as const;

export const CLEAR_BTNcss: CssMap = {
    ...TEST_ACTION_BTN,
    borderRadius: "18px",
    background: "rgba(0,0,0,0.18)",
    transition: "transform 90ms ease, filter 140ms ease",
    _hover: {
        background: "orange",
        color: $cols_.backdeep,
    }
}

export const LOG_BOXcss: CssMap = {
    overflow: "hidden",
    gridColumn: "1 / 5",


};
export const ROW_SUITE_FAILcss: CssMap = {
    background: "rgba(255, 0, 0, 0.2)",
};

export const ROW_GROUP_FAILcss: CssMap = {
    background: "rgba(255, 0, 0, 0.3)",
};

export const ROW_CASE_FAILcss: CssMap = {
    background: "rgba(255, 0, 0, 0.4)",
};

export const TEST_PANELcss: CssMap = {
    display: "grid",
    gap: "6px",
    gridTemplateColumns: $CHIP_WIDTHstr + $CHIP_WIDTHstr + $CHIP_WIDTHstr,
    width: "100%",
    boxSizing: "border-box",
};

export const PANEL_BRANCHcss: CssMap = {
    display: "grid",
    gap: "8px",
    padding: "10px",
    width: "420px",
    boxSizing: "border-box",
    gridTemplateColumns: `${$CHIP_WIDTHstr} ${$CHIP_WIDTHstr}`,
    gridTemplateRows: "auto " + $CHIP_WIDTHstr,
    background: "rgba(0,0,0, 1)",
};
