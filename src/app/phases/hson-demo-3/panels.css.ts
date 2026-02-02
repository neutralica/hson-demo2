import type { CssMap } from "hson-live/types";
import { $COL, _setBckgdAlpha } from "../../consts/colors.consts";

export const UI_ROOTcss:CssMap = {
    position: "absolute",
    inset: "0",
    display: "grid",
    height: "100%",
    width: "100%",
    pointerEvents: "none",
    // outline: "2px solid red",
} as const;

export const UI_SHELLcss: CssMap = {
    pointerEvents: "auto",
    width: "min(1100px, 100%)",
    height: "100%",
    display: "grid",
    gap: "12px",
    boxSizing: "border-box",
} as const;

export const PANEL_OUTERcss:CssMap = {
    minHeight: "200px",
    minWidth: "0",
    display: "grid",
    pointerEvents: "all",
} as const;

export const PANEL_SURFACEcss: CssMap = {
    borderRadius: "14px",
    padding: "12px",
    boxSizing: "border-box",
    overflow: "auto",
    display: "grid",
    gap: "8px",
    minHeight: "0",
    minWidth: "0",
    backgroundColor: "rgba(0, 0, 40, 0.85)",
    pointerEvents: "all"

} as const;

export const PANEL_FRAMEcss = {
    boxShadow:
        `inset 0 0 0 1px ${$COL.stonerPurple}, inset 0 0 0 2px rgba(0,0,0,0.22)`,
    backgroundColor: "white",
    backdropFilter: "blur(8px)",
    minHeight: "1.5rem",
    outline: "1px solid rgba(255,0,0,0.65)",
    color: $COL._txtmain,
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
    gridAutoColumns: "minmax(200px, auto)",
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

export const SCROLLERcss = {
    overflow: "auto",
    minHeight: "0",
} as const;

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
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "10px",
    outline: "none",
};

export const TEST_BODY_OVERRIDEScss = {
    overflow: "hidden",              // override PANEL_SURFACEcss
    gridTemplateRows: "auto 1fr",    // toolbar + console
    alignContent: "start",
} as const;

export const TEST_TOOLBARcss = {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "max-content",
    gap: "8px",
    alignItems: "center",
    minHeight: "0",
} as const;

export const TEST_STATUS_CHIPcss: CssMap = {
    padding: "8px 10px",
    borderRadius: "999px",
    boxSizing: "border-box",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: "rgba(255,255,255,0.02)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    opacity: "0.9",
    color: $COL.skyBlue
} as const;

export const TEST_CONSOLEcss = {
    ...SCROLLERcss,                  // <- reuse
    borderRadius: "12px",
    padding: "10px",
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.20)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    whiteSpace: "pre",
    minWidth: "0",
    color: $COL._txtmain,
} as const;