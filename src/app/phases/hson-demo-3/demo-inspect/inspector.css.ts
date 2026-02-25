import { $cols_ } from "../../../consts/colors.consts";

export const NAME_WIDTH = "38ch"; // standardize width so it doesn’t jump

export const SCROLL_WRAPcss: Record<string, string> = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",
  maxHeight: "70vh",
};
export const THcss: Record<string, string> = {
  padding: "6px 8px",
  textAlign: "left",
  fontWeight: "600",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "nowrap",
  opacity: "0.85",
};
export const TDcss: Record<string, string> = {
  padding: "6px 8px",
  verticalAlign: "top",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};
export const TD_PREVIEW_ROWcss: Record<string, string> = {
  padding: "8px 12px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  background: $cols_.backdeep,
  opacity: "0.95",
};
export const CLICKABLEcss: Record<string, string> = { cursor: "pointer", userSelect: "none" };
export const ROW_SUITEcss: Record<string, string> = {
  background: $cols_.backdeep,
  cursor: "pointer",
};
export const ROW_GROUPcss: Record<string, string> = {
  background: $cols_.backdeep,
  cursor: "pointer",
};

export const tdNameCssBase: Record<string, string> = {
  width: NAME_WIDTH,
  maxWidth: NAME_WIDTH,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const tdNameChildCss: Record<string, string> = {
  ...tdNameCssBase,
  paddingLeft: "18px",
  opacity: "0.95",
};
