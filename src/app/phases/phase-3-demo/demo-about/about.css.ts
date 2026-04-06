import type { CssMap } from "hson-live/types";
import { $blu_, COLORS, $grn_, COLOR_4WAY, ACID_WASH_RGBA, CYBERPUNK_2060_OKLCH } from "../../../core/consts/colors.consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { $txt_, COMMENTScol, CODE_EQUALScol, CODE_PARENScol, CODE_PARENS_INNERcol, CODE_PUNCTcol, CODQ_QUOTEcol, COPYRITEcol, GREENLIKEcol, HEADERcol, URLcol, REDLIKEcol, TOCcol, TXTcol_MAIN } from "../../../core/consts/ui-consts";
import { MENU_FONT } from "../../../core/consts/ui-consts";
import { MONOcss } from "../../../core/core.css";

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.85",
  letterSpacing: "1px",
  color: TXTcol_MAIN,
  textShadow:"0 0 5px oklch(0.85 0.03 260 / 0.25)",
  fontFamily: "sans-serif",
  fontWeight: "100",
  fontSize: $txt_.main,
}

// ADDED: list cell styling (prevents baseline + indent issues)
export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  columnGap: "1rem",
  alignItems: "start",
  minWidth: "0",
  maxWidth: "70ch",
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  lineHeight: "1",
  textAlign: "left",
  userSelect: "none",
  whiteSpace: "pre",
  fontSize: "0.5rem",
  paddingTop: "1.7em",
};

export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "10px",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  background: set_alpha(COLORS.bckdeep, 0.86),
  maxWidth: "80ch",

};

export const ABOUT_TOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  gridAutoRows: "min-content",
  alignContent: "end",
  gap: "8px",
  padding: "8px 8px 12px 8px",
  boxSizing: "border-box",
  background: set_alpha(COLORS.bckdeep, 0.86),
  overflowY: "auto",
  overflowX: "hidden",
};

export const LIST_TEXTcss: CssMap = {
  whiteSpace: "pre-wrap",
  fontWeight: "300",
  fontFamily: "Gill Sans", // DO NOT CHANGE - should NOT be Gill Sans
  letterSpacing: "1px",
  minWidth: "0",
  lineHeight: "1.55",
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
  color: TOCcol,
};

export const TOC_BTN_IDLEcss: CssMap = {
  background: "transparent",
  textDecoration: "none",
  color: set_alpha(TOCcol, 0.7),
};


export const ABOUT_CSS: CssMap = {
  whiteSpace: "pre-line",
  overflowX: "auto",
  padding: "10px 12px",
  background: COLORS.bckdeep,
  fontweight: 300,
  fontFamily: MENU_FONT,
  lineHeight: "1.75rem",
  fontSize: $txt_.main,
}

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  // fontSize: $txt_.main,
  fontFamily: MENU_FONT,
  fontWeight: "300",
  letterSpacing: "0.06em",
  lineHeight: "1.55rem",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  color: CODE_PARENScol, // choose something distinct but harmonious
  fontFamily: MENU_FONT,
  fontWeight: "600",

} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  color: CODE_PARENS_INNERcol,
  fontFamily: MENU_FONT,
  fontWeight: "300",
} as const;

export const CODE_COMMENTScss: CssMap = {
  color: COMMENTScol,
  fontFamily: MENU_FONT,
  fontSize: $txt_.main,
  overflowWrap: "anywhere",
  whiteSpace: "normal",

};

export const CODE_QUOTEcss = {
  color: CODQ_QUOTEcol,              // muted gray
  fontWeight: "700",
};
export const CODE_EQUALSscss = {
  color: CODE_EQUALScol,              // muted gray
  fontWeight: "700",
};

export const CODE_PUNCTcss = {
  color: CODE_PUNCTcol,              // muted gray
  fontWeight: "700",
};

export const ANTI_LIST_MARKERcss: CssMap = {
  color: set_alpha(REDLIKEcol, 0.8),
  fontWeight: "700",
};

export const ANTI_LIST_TEXTcss: CssMap = {
  ...LIST_TEXTcss,
  color: REDLIKEcol,
  fontSize: $txt_.main,
  // textDecoration: "line-through",
};

export const WARNINGcss: CssMap = {
  color: "red",
  fontSize: $txt_.subhead,
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
  fontSize: $txt_.main,
};

export const ABOUT_BODY_ROWcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  gap: "14px",
  boxSizing: "border-box",
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
  fontSize: $txt_.subhead,
  letterSpacing: "0.12em",
  fontWeight: "700",
  alignSelf: "start",
  justifySelf: "end",
  textTransform: "uppercase",
  padding: "4px 10px 8px 10px",
};

export const TOC_BTNcss: CssMap = {
  ...MONOcss,
  fontSize: $txt_.main,
  lineHeight: "1.1",
  padding: "12px 26px",
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  minWidth: "0",
  textAlign: "right",
};
export const MD_CODE_PREcss: CssMap = {
  margin: "20px 0",
  background: COLORS.bckdeep,
  overflowWrap: "anywhere",
  fontSize: $txt_.main,
  lineHeight: "1.85",
  padding: "1rem",
  // whiteSpace: "normal",
};

export const ABOUT_HEADERcss: (x: number) => CssMap = (level: number) => {
  return {
    marginTop: level === 1 ? "6px" : "2rem",
    marginBottom: "8px",
    textDecoration: level <= 3 ? "underline" : "",
    textUnderlineOffset: "5px",
    fontFamily: MENU_FONT,
    letterSpacing: "0.06em",
    textTransform: level === 2 ? "uppercase" : "none",
    fontSize: level === 1 ? $txt_.heading : level === 2 ? $txt_.subhead : level === 3 ? $txt_.subhead : $txt_.main,
    fontWeight: level === 1 ? 700 : level === 2 ? 600 : 400,
    justifySelf: level <= 2 ? "center" : "start",

    color: HEADERcol,
  }
}

export const MD_COPY_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  fontSize: $txt_.reg,
  color: COPYRITEcol,
  marginTop: "2rem",
}
export const MD_LINK_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  color: URLcol,
  fontSize: $txt_.subhead,
  textDecoration: "underline",
  marginLeft: "2rem"
}

export const FLUSH_LISTcss = {
  display: "grid",
  gap: "1rem",
  margin: "20px 0",
  minWidth: "0",
};


export const SPECIAL_WORDScss: CssMap = {
  fontWeight: "300",
};
