import type { CssMap } from "hson-live/types";
import { $blu_, $cols } from "../../consts/colors.consts";
import { $GEM_WIDTHstr } from "../../../tests/tests.consts";

export const UI_ROOTcss:CssMap = {
    position: "absolute",
    inset: "0",
    display: "grid",
    height: "100%",
    width: "100%",
    pointerEvents: "none",
    // outline: "2px solid red",
} as const;

// export const UI_SHELLcss: CssMap = {
//     pointerEvents: "auto",
//     width: "min(1100px, 100%)",
//     height: "100%",
//     display: "grid",
//     gap: "12px",
//     boxSizing: "border-box",
// } as const;

export const PANEL_OUTERcss:CssMap = {
    minHeight: "200px",
    minWidth: "0",
    // display: "grid",
    pointerEvents: "all",
} as const;

export const PANEL_SURFACEcss: CssMap = {
    borderRadius: "14px",
    padding: "12px",
    boxSizing: "border-box",
    overflow: "auto",
    display: "grid",
    gap: "8px",
    minHeight: "18rem",
    minWidth: "0",
    backgroundColor: "rgba(0, 20, 20, 1)",
    pointerEvents: "all",

} as const;

export const PANEL_FRAMEcss = {
    backgroundColor: $cols.bckgd,
    backdropFilter: "blur(8px)",
    minHeight: "18rem",
    outline: `1px solid rgba(10,150,220,1)`,
    color: $cols.txtmain,
    fontFamily: "'Inconsolata'",
} as const;

export const LAYOUT_GRIDcss: CssMap = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    display: "grid",
    gap: "12px",
    padding: "12px",
    boxSizing: "border-box",
    gridAutoColumns: "1fr 1fr",
    overflowY: "scroll"
} as const;

export const MENU_BTNcss = {
    display: "grid",
    placeItems: "center",
    padding: "10px 8px",
    borderRadius: "12px",
    userSelect: "none",
    cursor: "pointer",

    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",

    // neutral default
    background: "rgba(255,255,255,0.03)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const PANEL_STACKcss = {
    display: "grid",
    alignContent: "start",
    gap: "12px",
    minHeight: "0",         // critical for nested scrolling
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

export const PARSING_PANEL_ROOTcss ={
      display: "grid",
      gap: "12px",
      minHeight: "0",
      minWidth: "0",
      gridAutoFlow: "column",
}
    
export const PANELcss ={
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: "8px",
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
    background: $cols.bckgd,
    color: $blu_.sky,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "10px",
    outline: "none",
};

export const TEST_BODY_OVERRIDEScss: CssMap = {
    overflow: "hidden",           
    // gridTemplateRows: "auto 1fr", 
    alignContent: "start",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gridTemplateRows: "1fr auto"
} as const;

export const TEST_TOOLBARcss: CssMap = {
   display: "grid",
  gap: "8px",
  width: "100%",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "1fr 1fr",
    boxSizing: "border-box",
    gridRow: "2 / 3",
  gridColumn: "1 / 3"
} as const;

export const TEST_STATUS_CHIPcss: CssMap = {
    padding: "8px 10px",
    boxSizing: "border-box",
    fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: "rgba(255,255,255,0.02)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    opacity: "0.9",
    color: $blu_.pastel,
    maxWidth: $GEM_WIDTHstr
} as const;

export const MARQUEEcss: CssMap = {
    // ...SCROLLERcss,                  // nah
    borderRadius: "12px",
    padding: "10px",
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.20)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    whiteSpace: "pre",
    minWidth: "100%",
    gridColumn: "1 / 5",
    color: $cols.txtmain,
} as const;