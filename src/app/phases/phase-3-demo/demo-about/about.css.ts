import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $pnk_, $ylw_, ACID_WASH_OKLCH, ACID_WASH_RGBA } from "../../../consts/colors.consts";
import { $txt_ } from "../../../consts/ui-consts";
import { MENU_FONT } from "../demo.css";

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
  color: $blu_.candy,               //  marker color only
  lineHeight: "1.55",
  textAlign: "right",
  userSelect: "none",
  whiteSpace: "pre",
};

export const LIST_TEXTcss: CssMap = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.55",
  fontWeight: "300",
  fontFamily: "Trebuchet MS", // DO NOT CHANGE - should NOT be Gill Sans
  color: ACID_WASH_OKLCH.lilac,
  minWidth: "0",
};

export const HRcss: CssMap = {
  width: "90%",
  height: "1px",
  background: `linear-gradient(90deg,
    transparent 0%,
    ${ACID_WASH_RGBA.fadedMagenta} 20%,
    ${ACID_WASH_RGBA.fadedMagenta} 80%,
    transparent 100%)`,
  opacity: "0.8",
  marginTop: "12px",
  marginBottom: "12px",
  marginLeft: "auto",
  marginRight: "auto",
};

export const DOC_BTNcss: CssMap = {
  display: "grid",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "10px",
  cursor: "pointer",
  userSelect: "none",
  fontFamily: MENU_FONT,
  fontSize: "15px",
  letterSpacing: "0.06em",
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const DOC_BTN_ACTIVEcss: CssMap = {
  background: "rgba(120,255,210,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
} as const;

export const DOC_BTN_IDLEcss: CssMap = {
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.85",
  letterSpacing: "0.7px",
  fontSize: "18px",
  color: ACID_WASH_OKLCH.frost,
  fontFamily: "Gill Sans",
  fontWeight: "200",
}

export const ABOUT_CSS: CssMap = {
  whiteSpace: "pre-line",
  overflowX: "auto",
  padding: "10px 12px",
  background: $cols_.bckdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  // marginBottom: "12px",
  fontweight: 300,
  fontFamily: MENU_FONT,
  // fontSize: $txt_.sub,
  lineHeight: "1.75rem",
}

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  // fontSize: $txt_.main,
  color: $blu_.pastel,              // same family as method names, but slightly calmer
  fontFamily: MENU_FONT,
  fontWeight: "300",
  letterSpacing: "0.06em",
  lineHeight: "1.85rem",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  color: ACID_WASH_OKLCH.ember, // choose something distinct but harmonious
  fontFamily: MENU_FONT,
  fontWeight: "600",

} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  color: ACID_WASH_OKLCH.ash,
  fontFamily: MENU_FONT,
  fontWeight: "300",
} as const;

export const CODE_COMMENTScss: CssMap = {
  color: ACID_WASH_OKLCH.fern,
  fontFamily: MENU_FONT,
  fontSize: "16px",
  overflowWrap: "anywhere",
  whiteSpace: "normal",

};

export const CODE_QUOTEcss = {
  color: ACID_WASH_OKLCH.bruisedPlum,              // muted gray
  fontWeight: "700",
};
export const CODE_EQUALSscss = {
  color: ACID_WASH_OKLCH.smokeRose,              // muted gray
  fontWeight: "700",
};

export const CODE_PUNCTcss = {
  color: ACID_WASH_OKLCH.straw,              // muted gray
  fontWeight: "700",
};

export const ANTI_LIST_MARKERcss: CssMap = {
  color: "#b44",
  fontWeight: "700",
};

export const ANTI_LIST_TEXTcss: CssMap = {
  ...LIST_TEXTcss,
  color: "#b44",
  fontSize: "18px",
  // textDecoration: "line-through",
};

export const WARNINGcss: CssMap = {
  color: "red",
  fontSize: "22px",
  textDecoration: "underline",
  fontWeight: "700",
}