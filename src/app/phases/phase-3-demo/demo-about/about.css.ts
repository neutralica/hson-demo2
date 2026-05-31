import type { CssMap } from "hson-live/types";
import { $gry_ } from "../../../core/consts/old-rgb.consts";
import { FONT_FAM_MONO } from "../../../core/consts/css.consts";
import { ACID_WASH_OKLCH, OKLCH_NEUTRALS, OKLCH_TERMINAL_4, OKLCH_VIBRANT } from "../../../core/consts/oklch.consts";
import { $SIDEBAR_WIDTH, CODE_BRACEcol, CODE_EQUALScol, CODE_PARENS_INNERcol, CODE_PARENScol, CODE_PUNCTcol, CODE_QUOTEcol, COMMENTScol, COPYRITEcol, HEADERcol, LISTcol, REDcol, SYS_MONOfont, SYS_SANSfont, TOCcol, TXTcol_ALT, TXTcol_CODE, TXTcol_MAIN, URLcol, øCOLS, øfontWeight, øfontSize, $CONTENT_WIDTH, CODE_ALTcol } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";



export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "10px 10px 10px 2rem",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  background: øCOLS.backlo,
  width: "90ch",

};

export const DOC_CONTAINER = {
  maxWidth: "80ch",
}

export const ABOUT_TOCcss: CssMap = {
  alignContent: "end",
  padding: "1em",
  boxSizing: "border-box",
  background: øCOLS.backlo,
  overflowY: "auto",
  overflowX: "hidden",
  ...FONT_FAM_MONO,
};

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  ...FONT_FAM_MONO,
  whiteSpace: "pre-wrap",
  // lineHeight: "2em",
  color: TXTcol_MAIN,
}


export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  columnGap: "1rem",
  alignItems: "start",
  minWidth: "0",
  maxWidth: "70ch",
  color: OKLCH_FLEURS.mauve,
  ...FONT_FAM_MONO,
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  display: "inline",
  textAlign: "left",
  userSelect: "none",
  whiteSpace: "pre",
  // fontSize: "1rem",
  // verticalAlign: "center",
  color: LISTcol,
};

export const LIST_TEXTcss: CssMap = {
  ...FONT_FAM_MONO,
  color: LISTcol,
};


export const ANTI_LIST_MARKERcss: CssMap = {
  color: set_alpha(REDcol, 0.8),
  fontWeight: øfontWeight.fat,
};

export const ANTI_LIST_TEXTcss: CssMap = {
  ...LIST_TEXTcss,
  color: REDcol,
  // fontSize: $txt_.main,
  // textDecoration: "line-through",
};

export const HRcss: CssMap = {
  width: "90%",
  height: "1px",
  background: TXTcol_ALT,
  // opacity: "0.8",
  marginTop: "2em",
  marginBottom: "3em",
  marginLeft: "auto",
  marginRight: "auto",
};

export const TOC_BTN_ACTIVEcss: CssMap = {
  textDecoration: "underline",
  textUnderlineOffset: "4px",
  color: TXTcol_CODE,
  fontWeight: øfontWeight.fat,
  _hover: {
    color: TXTcol_CODE,
    background: $gry_.dark,
  }
};

export const TOC_BTN_IDLEcss: CssMap = {
  background: "transparent",
  textDecoration: "none",
  color: TOCcol,
  fontSize: øfontSize.main,
  _hover: {
    color: øCOLS.backlo,
    background: TOCcol,
  }
};

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  ...FONT_FAM_MONO,
  color: CODE_ALTcol,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  ...FONT_FAM_MONO,
  color: CODE_PARENScol, // choose something distinct but harmonious
} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  ...FONT_FAM_MONO,
  color: CODE_PARENS_INNERcol,
} as const;

export const CODE_BRACEcss: CssMap = {
  ...FONT_FAM_MONO,
  color: CODE_BRACEcol
}

export const CODE_COMMENTScss: CssMap = {
  ...FONT_FAM_MONO,
  color: COMMENTScol,
  overflowWrap: "anywhere",
  whiteSpace: "normal",

};

export const CODE_QUOTEcss = {
  color: CODE_QUOTEcol,              // muted gray
};
export const CODE_EQUALSscss = {
  color: CODE_EQUALScol,              // muted gray
};

export const CODE_PUNCTcss = {
  color: CODE_PUNCTcol,              // muted gray
};


export const WARNINGcss: CssMap = {
  color: "red",
  fontSize: øfontSize.main,
  textTransform: "uppercase",
  textAlign: "center",
  textDecoration: "underline",
  fontWeight: øfontWeight.fat,
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
  gridTemplateColumns: $SIDEBAR_WIDTH + " 1fr",
  gap: "0",
  boxSizing: "border-box",
  maxWidth: "calc("+$SIDEBAR_WIDTH +" + "+ $CONTENT_WIDTH+")"
};


export const TOC_BTNcss: CssMap = {
  ...FONT_FAM_MONO,
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  textAlign: "right",
  lineHeight: "2",
  _hover: {
    background: TOCcol,
    color: øCOLS.backlo
  }
};

export const MD_CODE_PREcss: CssMap = {
  margin: "20px",
  background: øCOLS.backhi,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word", // not anywhere
  fontSize: øfontSize.main,
  // lineHeight: "1.85",
  padding: "1rem",
  // whiteSpace: "normal",
  border: "1px solid " + set_alpha(ACID_WASH_OKLCH.lilac, 0.5),

};
export const CODE_COLONcss = {
  ...FONT_FAM_MONO,
  color: OKLCH_FLEURS.blazeOrange
};
/* export const SLASHcss = OKLCH_FLEURS.blazeOrange;
export const PIPEcss = OKLCH_NEUTRALS.slate;
export const ANGLEcss = OKLCH_VIBRANT.roseNeon;

*/


export const ANGLEcss = {
  ...FONT_FAM_MONO,
  color: OKLCH_VIBRANT.roseNeon
}
export const PIPEcss = {
  ...FONT_FAM_MONO,
  color: OKLCH_NEUTRALS.slate
}
export const SLASHcss = {
  ...FONT_FAM_MONO,
  color: OKLCH_FLEURS.blazeOrange
}
export const CODE_TYPEcss = {
  ...FONT_FAM_MONO,
  color: OKLCH_TERMINAL_4.pink
}

export const ABOUT_HEADERcss: (x: number) => CssMap = (level: number) => {
  return {
    marginTop: level === 1 ? "6px" : "2rem",
    marginBottom: "18px",
    textDecoration: level <= 2 ? "underline" : "",
    textUnderlineOffset: "5px",
    fontFamily: SYS_MONOfont,
    letterSpacing: "0.06em",
    textTransform: level === 2 ? "uppercase" : "none",
    fontSize: øfontSize.main,
    // fontSize: level === 1 ? _TXT.heading : level === 2 ? _TXT.subhead : level === 3 ? _TXT.subhead : _TXT.main,
    fontWeight: level === 1 ? øfontWeight.fat : level === 2 ? 600 : 400,
    justifySelf: level <= 2 ? "center" : "start",
    color: HEADERcol,
  }
}

export const MD_COPY_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  fontFamily: SYS_SANSfont,
  fontSize: øfontSize.smol,
  color: COPYRITEcol,
  marginTop: "2rem",
}

export const MD_LINK_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  color: URLcol,
  ...FONT_FAM_MONO,
  textDecoration: "underline",
  marginLeft: "2rem"
}

export const FLUSH_LISTcss = {
  display: "grid",
  gap: "1rem",
  margin: "20px 0",
  minWidth: "0",
};



