import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $red_etc_, $ylw_ } from "../../consts/colors.consts";
import { $GEM_WIDTHstr } from "../../../tests/tests.consts";
import { $GRID_GAPstr, $txt_ } from "../../consts/ui-consts";

export const UI_ROOTcss: CssMap = {
    // CHANGED: must be a normal grid item (no absolute overlay)
    position: "relative",
    minWidth: "0",
    minHeight: "0",
    pointerEvents: "all",
    gridColumn: "2 / 3",
    gridRow: "1 / 2",
};

export const PANEL_OUTERcss: CssMap = {
    minHeight: "200px",
    minWidth: "0",
    // display: "grid",
    pointerEvents: "all",
} as const;

export const PANEL_SURFACEcss: CssMap = {
    width: "100%",
    height: "100%",
    minWidth: "0",
    minHeight: "0",
    overflow: "auto",
    borderRadius: "14px",
    padding: "12px",
    boxSizing: "border-box",
    display: "grid",
    gap: $GRID_GAPstr,
    backgroundColor: $cols_.bckgd,
    pointerEvents: "all",

} as const;

export const PANEL_FRAMEcss = {
    // backgroundColor: $cols.backdeep,
    backdropFilter: "blur(8px)",
    // minHeight: "18rem",
    // outline: `1px solid rgba(10,150,220,1)`,
    color: $blu_.std,
    fontFamily: "'Inconsolata'",
} as const;

export const LAYOUT_GRIDcss: CssMap = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    display: "grid",
    gap: $GRID_GAPstr,
    padding: "12px",
    boxSizing: "border-box",
    gridAutoColumns: "1fr 1fr",
    overflowY: "scroll"
} as const;

export const TEST_ACTION_BTN = {
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    userSelect: "none",
    cursor: "pointer",

    fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.sub,
    letterSpacing: "0.1em",
    textTransform: "uppercase",

    // neutral default
    background: $cols_.backdeep,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const PANEL_STACKcss = {
    display: "grid",
    alignContent: "start",
    gap: $GRID_GAPstr,
    minHeight: "0",
} as const;

export const PANEL_ITEMcss = {
    minHeight: "0",
} as const;

export const PANEL_HIDDENcss = {
    display: "none",
} as const;

// export const SCROLLERcss = {
//     overflow: "auto",
//     minHeight: "0",
// } as const;

export const PARSING_PANEL_ROOTcss = {
    display: "grid",
    gap: $GRID_GAPstr,
    minHeight: "0",
    minWidth: "0",
    gridAutoFlow: "column",
}

export const PANELcss = {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: $GRID_GAPstr,
    minHeight: "0",
    minWidth: "0",
    padding: "10px",
    borderRadius: "12px",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.03)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
}

export const PANEL_TEXTAREAcss = {
    minHeight: "0",
    minWidth: "0",
    resize: "none",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    background: $cols_.backdeep,
    color: $grn_.faded,
    border: `1px solid ${$red_etc_.stonerPurple}`,
    borderRadius: "10px",
    // padding: "10px",
    outline: "none",
};

export const TEST_BODY_OVERRIDEScss: CssMap = {
    // overflow: "hidden",
    // alignContent: "start",
    // display: "grid",
    // gridTemplateColumns: "1fr auto",
    // gridTemplateRows: "1fr auto"
} as const;

export const TEST_STATUS_CHIPcss: CssMap = {
    padding: "8px 10px",
    boxSizing: "border-box",
    fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.heading,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: $cols_.bckgd,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    opacity: "0.9",
    color: $gry_.dim,
    maxWidth: $GEM_WIDTHstr
} as const;

export const MARQUEEcss: CssMap = {
    // ...SCROLLERcss,                  // nah
    borderRadius: "12px",
    padding: "10px",
    boxSizing: "border-box",
    background: $cols_.backdeep,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.sub,
    height: "100%",
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

export const MARQUEE_BOXcss: CssMap = {
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
    gridTemplateColumns: $GEM_WIDTHstr + $GEM_WIDTHstr + $GEM_WIDTHstr,
    width: "100%",
    boxSizing: "border-box",
};

export const PANEL_BRANCHcss: CssMap = {
    display: "grid",
    gap: "8px",
    padding: "10px",
    width: "420px",
    boxSizing: "border-box",
    gridTemplateColumns: `${$GEM_WIDTHstr} ${$GEM_WIDTHstr}`,
    gridTemplateRows: "auto " + $GEM_WIDTHstr,
};

export const CONTROL_ROWcss: CssMap = {
    ...TEST_PANELcss,
    // gridRow: "3",
    gridColumn: "1 / 5",
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    gap: "10px",
    padding: "0",
    background: "transparent",
    border: "none",
    boxShadow: "none",
};

export const RUN_BUTTONcss: CssMap = {
    ...TEST_ACTION_BTN,
    borderRadius: "18px",
    background: "rgba(0,0,0,0.18)",
    transition: "transform 90ms ease, filter 140ms ease",
    _hover: {
        background: $grn_.faded,
        color: $cols_.backdeep
    }
};

export const TEST_SELECTcss = {
    minWidth: "12ch",
    padding: "10px 8px",
    borderRadius: "12px",
    boxSizing: "border-box",

    fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: $txt_.sub,
    letterSpacing: "0.06em",

    background: $cols_.backdeep,
    color: $grn_.std,
    border: "1px solid rgba(255,255,255,0.10)",
    outline: "none",
} as const;
