import type { CssMap } from "hson-live/types";
import { $blu_, COLORS_, $grn_, COLOR_4WAY, ACID_WASH_RGBA, CYBERPUNK_2060_OKLCH, ACID_WASH_OKLCH, $gry_ } from "../../../core/consts/colors.consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { $txt_, COMMENTScol, CODE_EQUALScol, CODE_PARENScol, CODE_PARENS_INNERcol, CODE_PUNCTcol, CODQ_QUOTEcol, COPYRITEcol, GREENLIKEcol, HEADERcol, URLcol, REDLIKEcol, TOCcol, TXTcol_MAIN, TXTcol_ALT, TXTcol_ALT_ALT, TXTcol_CODE, $CODE_FONT_SIZE } from "../../../core/consts/ui-consts";
import { MONO_MAINfont } from "../../../core/consts/ui-consts";
import { MONOcss } from "../../../core/core.css";

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.85",
  letterSpacing: "1px",
  color: TXTcol_MAIN,
  textShadow: "0 0 5px oklch(0.85 0.03 260 / 0.25)",
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
  color: TXTcol_MAIN,
  fontFamily: MONO_MAINfont
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  lineHeight: "1",
  textAlign: "left",
  userSelect: "none",
  whiteSpace: "pre",
  fontSize: "0.75rem",
  color: set_alpha(TXTcol_MAIN, 0.6),
  paddingTop: "0.7em",
};

export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "10px",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  background: COLORS_.bckdeep,

};

export const DOC_CONTAINER = {
  maxWidth: "80ch", 
  
}

export const ABOUT_TOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  gridAutoRows: "min-content",
  alignContent: "end",
  gap: "8px",
  padding: "8px 8px 12px 8px",
  boxSizing: "border-box",
  background:COLORS_.bckdeep,
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
  _hover: {
    color: "black",
    background:$gry_.dark,
  }
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
  background: COLORS_.bckdeep,
  fontweight: 300,
  fontFamily: MONO_MAINfont,
  lineHeight: "1.75rem",
  fontSize: $txt_.main,
}

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  fontFamily: MONO_MAINfont,
  fontWeight: "300",
  letterSpacing: "0.06em",
  lineHeight: "1.55rem",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  color: CODE_PARENScol, // choose something distinct but harmonious
  fontFamily: MONO_MAINfont,
  fontWeight: "600",

} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  color: CODE_PARENS_INNERcol,
  fontFamily: MONO_MAINfont,
  fontWeight: "300",
} as const;

export const CODE_COMMENTScss: CssMap = {
  color: COMMENTScol,
  fontFamily: MONO_MAINfont,
  // fontSize: $txt_.main,
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
  // fontSize: $txt_.main,
  // textDecoration: "line-through",
};

export const WARNINGcss: CssMap = {
  color: "red",
  fontSize: $txt_.subhead,
  textTransform: "uppercase",
  textAlign: "center",
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


export const TOC_BTNcss: CssMap = {
  ...MONOcss,
  fontSize: $txt_.main,
  // lineHeight: "1.1",
  // padding: "12px 26px",
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  minWidth: "0",
  textAlign: "right",
  _hover: {
    background: TOCcol,
    color: COLORS_.bckgd
  }
};

export const MD_CODE_PREcss: CssMap = {
  margin: "20px",
  background: COLORS_.bckdeep,
  overflowWrap: "anywhere",
  fontSize: $CODE_FONT_SIZE,
  lineHeight: "1.85",
  padding: "1rem",
  // whiteSpace: "normal",
  border: "1px solid " + set_alpha(ACID_WASH_OKLCH.lilac, 0.5),
  color: TXTcol_CODE,

};

export const ABOUT_HEADERcss: (x: number) => CssMap = (level: number) => {
  return {
    marginTop: level === 1 ? "6px" : "2rem",
    marginBottom: "8px",
    textDecoration: level <= 3 ? "underline" : "",
    textUnderlineOffset: "5px",
    fontFamily: MONO_MAINfont,
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
