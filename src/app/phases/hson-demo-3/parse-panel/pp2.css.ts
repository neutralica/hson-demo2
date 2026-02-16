import type { CssMap } from "hson-live/types";
import type { CssMapBase } from "../../../../../../hson-live/dist/types/css.types";
import { $cols_ } from "../../../consts/colors.consts";

// overlay wrapper
export const PP_TEXTWRAPcss: CssMap = {
  position: "relative",
  minHeight: "0",
  minWidth: "0",
};

// big faint format label (“JSON”)
export const PP_WATERMARK_FMTcss: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.08",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "72px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

// smaller empty-syntax overlay (“{}”, “<>”, “</>”)
export const PP_WATERMARK_EMPTYcss: CssMap = {
  position: "absolute",
  left: "14px",
  bottom: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0.25",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "14px",
  letterSpacing: "0.06em",
};

// focused-only “invalid/valid/...” status (large, centered-ish but not obnoxious)
export const PP_STATUScss: CssMap = {
  position: "absolute",
  top: "10px",
  right: "12px",
  pointerEvents: "none",
  userSelect: "none",
  opacity: "0",              // CHANGED by JS
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "14px",
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

// helper: allow focusing panel to pop slightly (optional, low-risk)
export const PP_FOCUS_PANELcss: CssMap = {
  // keep subtle; typography is the decoration
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
};

export const PP_UNMUTEDcss: CssMapBase = {
  opacity: "1",
  filter: "none",
  pointerEvents: "auto",
  userSelect: "auto",
};

export const PP_MUTEDcss: CssMapBase = {
  opacity: "0.22",
  color: $cols_.sysInvalid,
  filter: "saturate(0.6) brightness(0.8)",
  pointerEvents: "auto", 
  userSelect: "none",
};
