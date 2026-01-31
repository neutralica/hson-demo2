import type { CssMap } from "hson-live/types";

export const UI_ROOTcss = {
    position: "absolute",
    inset: "0",
    display: "grid",
    height: "100%",
    width: "100%",
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

export const PANEL_OUTERcss = {
  minHeight: "200px",
  minWidth: "0",
  display: "grid",
} as const;

export const PANEL_SURFACEcss = {
  borderRadius: "14px",
  padding: "12px",
  boxSizing: "border-box",
  overflow: "auto",
  display: "grid",
  gap: "8px",
  minHeight: "0",
  minWidth: "0",
} as const;

export const PANEL_FRAMEcss = {
    boxShadow:
        "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 0 2px rgba(0,0,0,0.22)",
    background: "rgba(18,18,20,0.88)",
    backdropFilter: "blur(8px)",
    minHeight: "200px",
    outline: "1px solid rgba(255,0,0,0.35)",
} as const;

export const LAYOUT_GRIDcss = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    display: "grid",
    gap: "12px",
    padding: "12px",
    boxSizing: "border-box",
    gridAutoRows: "minmax(200px, auto)",
    // outline: "2px solid lime",
} as const;

export const MENU_BARcss = {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "1fr",
    gap: "8px",

    // keep it pinned at bottom of the shell
    alignSelf: "end",
} as const;

export const MENU_DOCKcss = {
    padding: "10px",
    borderRadius: "16px",
    boxSizing: "border-box",
    background: "rgba(12,12,14,0.88)",
    boxShadow:
        "inset 0 0 0 1px rgba(255,255,255,0.05), 0 12px 30px rgba(0,0,0,0.35)",
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

export const MENU_BTN_ACTIVEcss = {
    background: "rgba(255,255,255,0.08)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
} as const;

export const MENU_BTN_ACCENT = (col: string) => ({
    color: col,
    textShadow: "0 1px 0 rgba(0,0,0,0.22)",
} as const);

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

export const TEST_STATUS_CHIPcss = {
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
} as const;