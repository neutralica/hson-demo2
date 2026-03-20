import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, ACID_WASH_OKLCH, ACID_WASH_RGBA, set_alpha } from "../../../core/consts/colors.consts";
import { $txt_ } from "../../../core/consts/ui-consts";
import { MENU_FONT } from "../demo.css";
import { MONOcss } from "../../../core/core.css";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";

// ADDED: list cell styling (prevents baseline + indent issues)
export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "3ch 1fr", //  stable marker column
  columnGap: "10px",
  alignItems: "start",            //  fixes number baseline wobble
  minWidth: "0",
  maxWidth: "70ch",
};
export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "22px 26px 80px 26px",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "hidden",
  background: set_alpha($cols_.bckdeep, 0.88),
  borderRadius: "18px",
  border: `1px solid ${set_alpha($blu_.faded, 0.08)}`,
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
export const TOC_BTN_ACTIVEcss: CssMap = {
  textDecoration: "underline",
  textUnderlineOffset: "6px",
  background:set_alpha(ACID_WASH_RGBA.dimIce,0.2),
  color: OKLCH_FLEURS.pollen,
};

export const TOC_BTN_IDLEcss: CssMap = {
  background: "transparent",
  textDecoration: "none",
  color: OKLCH_FLEURS.brass,
};

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
  lineHeight: "1.55rem",
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


export const ABOUT_ROOTcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  boxSizing: "border-box",
};

export const ABOUT_BODY_ROWcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  // gridTemplateColumns: "21ch minmax(0, 1fr)",
  gap: "14px",
  boxSizing: "border-box",
};

export const ABOUT_TOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  gridAutoRows: "min-content",
  alignContent: "end",
  // justifyContent: "right",
  gap: "8px",
  padding: "8px 8px 12px 8px",
  boxSizing: "border-box",
  background: set_alpha($cols_.bckdeep, 0.72),
  borderRadius: "18px",
  border: `1px solid ${set_alpha($blu_.faded, 0.12)}`,
  overflowY: "auto",
  overflowX: "hidden",
};

export const DATA_TOC_OPENcss = {
  display: "grid",
  position: "fixed",
  left: "2rem",
  bottom: "6.5rem",
  width: "min(22rem, calc(100vw - 4rem))",
  maxHeight: "55vh",
  zIndex: "9998",
  background: "red",
};

export const ABOUT_TOC_TITLEcss: CssMap = {
  fontFamily: MENU_FONT,
  fontSize: "12px",
  letterSpacing: "0.12em",
  fontWeight: "700",
  color: OKLCH_FLEURS.navyCore,
  textTransform: "uppercase",
  padding: "4px 10px 8px 10px",
};

export const TOC_BTNcss: CssMap = {
  ...MONOcss,
  fontSize: "18px",
  lineHeight: "1.1",
  padding: "12px 26px",
  borderRadius: "10px",
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  minWidth: "0",
  textAlign: "right",
  background: set_alpha($cols_.bckdeep, 0.18),
  color: ACID_WASH_RGBA.brickDust,
  __after: {
    content: '',
  }
};