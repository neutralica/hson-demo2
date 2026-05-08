import type { CssMap } from "hson-live/types";
import {  ACID_WASH_RGBA, $gry_ } from "../../../core/consts/colors.consts";
import { ACID_WASH_OKLCH, OKLCH_MUTED_PASTEL } from "../../../core/consts/oklch";
import { _COLS, SYS_SANSfont } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { _TXT, COMMENTScol, CODE_EQUALScol, CODE_PARENScol, CODE_PARENS_INNERcol, CODE_PUNCTcol, CODQ_QUOTEcol, COPYRITEcol,  HEADERcol, URLcol, REDLIKEcol, TOCcol, TXTcol_MAIN, TXTcol_ALT,  TXTcol_CODE, $CODE_FONT_SIZE } from "../../../core/consts/ui-consts";
import { SYS_MONOfont } from "../../../core/consts/ui-consts";
import { MONOcss } from "../../../core/core.css";



export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "10px 10px 10px 2rem ",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  background: _COLS.backhi,


};

export const DOC_CONTAINER = {
  maxWidth: "80ch",
}

export const ABOUT_TOCcss: CssMap = {
  alignContent: "end",

  lineHeight: "2rem",
  padding: "1em",
  boxSizing: "border-box",
  background: _COLS.backhi,
  overflowY: "auto",
  overflowX: "hidden",
  fontSize: _TXT.main,
};

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.85",
  letterSpacing: "1px",
  color: TXTcol_MAIN,
  // textShadow: "0 0 5px oklch(0.85 0.03 260 / 0.25)",
  fontFamily: SYS_SANSfont,
  fontWeight: "100",
  fontSize: _TXT.sansMain,
}


export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "5ch 1fr",
  columnGap: "1rem",
  alignItems: "start",
  minWidth: "0",
  maxWidth: "70ch",
  color: TXTcol_MAIN,
  fontFamily: SYS_MONOfont
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  display: "inline",
  textAlign: "left",
  userSelect: "none",
  whiteSpace: "pre",
  // fontSize: "1rem",
  verticalAlign: "center",
  color: TXTcol_ALT,
};

export const LIST_TEXTcss: CssMap = {
  fontWeight: "300",
  fontFamily: SYS_MONOfont,
  fontSize: _TXT.main,
  color: TXTcol_ALT,
  letterSpacing: "1px",
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

export const HRcss: CssMap = {
  width: "90%",
  height: "1px",
  background: `linear-gradient(90deg,
  transparent 0%,
  ${ACID_WASH_RGBA.fadedMagenta} 10%,
  ${ACID_WASH_RGBA.fadedMagenta} 90%,
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
  color: HEADERcol,
  _hover: {
    color: HEADERcol,
    background: $gry_.dark,
  }
};

export const TOC_BTN_IDLEcss: CssMap = {
  background: "transparent",
  textDecoration: "none",
  color: TOCcol,
  fontSize: _TXT.main,
  _hover: {
    color: _COLS.backlo,
    background: TOCcol,
  }
};

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  fontFamily: SYS_MONOfont,
  fontWeight: "300",
  letterSpacing: "0.06em",
  lineHeight: "1.55em",
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  color: CODE_PARENScol, // choose something distinct but harmonious
  fontFamily: SYS_MONOfont,
  fontWeight: "600",

} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  color: CODE_PARENS_INNERcol,
  fontFamily: SYS_MONOfont,
  fontWeight: "300",
} as const;

export const CODE_COMMENTScss: CssMap = {
  color: COMMENTScol,
  fontFamily: SYS_MONOfont,
  // fontSize: $txt_.main,
  overflowWrap: "anywhere",
  whiteSpace: "normal",
  // display: "inline-block",
  // paddingLeft: "2rem",
  // textIndent: "-2rem",

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


export const WARNINGcss: CssMap = {
  color: "red",
  fontSize: _TXT.subhead,
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
  fontSize: _TXT.main,
};

export const ABOUT_BODY_ROWcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  gridTemplateColumns: "1fr 3fr",
  gap: "14px",
  boxSizing: "border-box",
};


export const TOC_BTNcss: CssMap = {
  ...MONOcss,
  fontSize: _TXT.main,
  // lineHeight: "1.1",
  // padding: "12px 26px",
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  textAlign: "right",
  _hover: {
    background: TOCcol,
    color: _COLS.backlo
  }
};

export const MD_CODE_PREcss: CssMap = {
  margin: "20px",
  background: _COLS.backhi,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word", // not anywhere
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
    marginBottom: "18px",
    textDecoration: level <= 2 ? "underline" : "",
    textUnderlineOffset: "5px",
    fontFamily: SYS_MONOfont,
    letterSpacing: "0.06em",
    textTransform: level === 2 ? "uppercase" : "none",
    fontSize: _TXT.main,
    // fontSize: level === 1 ? _TXT.heading : level === 2 ? _TXT.subhead : level === 3 ? _TXT.subhead : _TXT.main,
    fontWeight: level === 1 ? 700 : level === 2 ? 600 : 400,
    justifySelf: level <= 2 ? "center" : "start",
    color: HEADERcol,
  }
}

export const MD_COPY_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  fontSize: _TXT.main,
  color: COPYRITEcol,
  marginTop: "2rem",
}
export const MD_LINK_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  color: URLcol,
  fontSize: _TXT.main,
  fontFamily: SYS_MONOfont,
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
