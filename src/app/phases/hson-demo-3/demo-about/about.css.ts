import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $ylw_ } from "../../../consts/colors.consts";
import { $txt_ } from "../../../consts/ui-consts";

// ADDED: list cell styling (prevents baseline + indent issues)
export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "3ch 1fr", //  stable marker column
  columnGap: "10px",
  alignItems: "start",            //  fixes number baseline wobble
  minWidth: "0",
  maxWidth: "70ch",
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  opacity: "0.85",
  color: $blu_.std,               //  marker color only (no bleed)
  lineHeight: "1.55",
  textAlign: "right",
  userSelect: "none",
  whiteSpace: "pre",
};

export const LIST_TEXTcss: CssMap = {
  whiteSpace: "pre-wrap",         //  wrap but stay in text column
  lineHeight: "1.55",
  color: $ylw_.easter,            //  list text color here only
  minWidth: "0",
};


export const DOC_BTNcss:CssMap = {
  display: "grid",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "10px",
  cursor: "pointer",
  userSelect: "none",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  letterSpacing: "0.06em",
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const DOC_BTN_ACTIVEcss:CssMap = {
  background: "rgba(120,255,210,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
} as const;

export const DOC_BTN_IDLEcss:CssMap = {
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const ABOUT_P_TEXTcss:CssMap = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.55",
  marginBottom: "10px",
  color: $cols_.txtmain,
  textIndent: "4ch",
  maxWidth: "60ch",
}

export const ABOUT_LI_TEXTcss:CssMap = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.55",
  color: $grn_.easter
}


export const ABOUT_LOGOcss:CssMap = {
  // ASCII logo: preserve spacing, tighter leading, allow horizontal scroll
  whiteSpace: "pre",
  overflowX: "hidden",
  // overflowY: "auto",
  padding: "12px 12px",
  background: $cols_.backdeep,
  color: $ylw_.candy,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  marginBottom: "12px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  lineHeight: "1.1",
  margin: "auto auto",
  letterSpacing: "0",
}

export const ABOUT_NOT_LOGOcss:CssMap = {
  // normal code blocks
  whiteSpace: "pre-line",
  overflowX: "auto",
  padding: "10px 12px",
  background: $cols_.backdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  marginBottom: "12px",
  fontweight: 300,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: $txt_.sub,
  lineHeight: "1.75",
}