import type { CssMap } from "hson-live/types";
import  { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { ACID_WASH_OKLCH, OKLCH_VIBRANT, OKLCH_NEUTRALS, OKLCH_TERMINAL_4 } from "../../core/consts/oklch.consts";
import { øfontSize, MAIN_OKLCH, øfontWeight, $SIDEBAR_WIDTH, $CONTENT_WIDTH, SYS_MONOfont } from "../../core/consts/ui-consts";
import  { set_alpha } from "../../core/helpers/color-helpers";
import { OKLCH_FLEURS } from "../fleurs/fleurs.consts";



export const ABOUT_DOCcss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  padding: "10px 10px 10px 2rem",
  boxSizing: "border-box",
  overflowY: "scroll",
  overflowX: "hidden",
  width: "90ch",
  lineHeight: "1.9"

};

export const DOC_CONTAINER: CssMap = {
  maxWidth: "80ch",
fontSize: øfontSize.smol,
}

export const ABOUT_TOCcss: CssMap = {
  alignContent: "end",
  padding: "1em",
  boxSizing: "border-box",
  background: "transparent",
  overflowY: "auto",
  overflowX: "hidden",
  ...FONT_FAM_MONO,
};

export const ABOUT_P_TEXTcss: CssMap = {
  // padding: "0 30px 0 30px",
  // ...FONT_FAM_MONO,
  whiteSpace: "pre-wrap",
  // lineHeight: "2em",
  color: MAIN_OKLCH,
}


export const ABOUT_LIST_ROWcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  columnGap: "1rem",
  alignItems: "start",
  minWidth: "0",
  maxWidth: "70ch",
  // ...FONT_FAM_MONO,
};

export const ABOUT_LIST_MARKERcss: CssMap = {
  display: "inline",
  textAlign: "left",
  userSelect: "none",
  whiteSpace: "pre",
  // fontSize: "1rem",
  // verticalAlign: "center",
  color: _cols.txt.list,
};

export const LIST_TEXTcss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.txt.list,
};


export const ANTI_LIST_MARKERcss: CssMap = {
  color: set_alpha(_cols.red, 0.8),
  fontWeight: øfontWeight.fat,
};

export const ANTI_LIST_TEXTcss: CssMap = {
  ...LIST_TEXTcss,
  color: _cols.red,
  // fontSize: $txt_.main,
  // textDecoration: "line-through",
};

export const HRcss: CssMap = {
  width: "90%",
  height: "1px",
  background: _cols.txt.grey,
  // opacity: "0.8",
  marginTop: "2em",
  marginBottom: "3em",
  marginLeft: "auto",
  marginRight: "auto",
};



export const TOC_BTNcss: CssMap = {
  // ...FONT_FAM_MONO,
  boxSizing: "border-box",
  cursor: "pointer",
  userSelect: "none",
  textAlign: "right",
  lineHeight: "2",
  paddingRight: "2rem",
  color: _cols.bluelike,
  // _hover: {
  //   background: TOCcol,
  //   color: øCOLS.backlo
  // }
};

export const TOC_BTN_ACTIVEcss: CssMap = {
  // textDecoration: "underline",
  // textUnderlineOffset: "4px",
  opacity: "1",
  fontWeight: øfontWeight.fat,
  background: "transparent",
  __after: {
    content: " <",
    position: "absolute",
    marginLeft : "2ch"
  },
  _hover: {
    // color: øHSON_COL.h,
    background: _cols.txt.grey,
    color: _cols.backlo,
    __after: {
      content: "x",
      position: "absolute",
      marginLeft : "2ch"
    },
  },
};

export const TOC_BTN_IDLEcss: CssMap = {
  background: "transparent",
  textDecoration: "none",
  opacity: "0.8",
  fontSize: øfontSize.main,
  __after: {},
  _hover: {
    __after: {
      content: "<<",
      position: "absolute",
      marginLeft: "1ch",
      // right: "-1rem",
    },
    color: _cols.backlo,
    background: _cols.toc,
  }
};

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.code.alt,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.code.parens, // choose something distinct but harmonious
} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.code.parensInner,
} as const;

export const CODE_BRACEcss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.code.brace
}

export const CODE_COMMENTScss: CssMap = {
  // ...FONT_FAM_MONO,
  color: _cols.code.comment,
  overflowWrap: "anywhere",
  whiteSpace: "normal",

};

export const CODE_QUOTEcss = {
  color: _cols.code.quotes,              
};
export const CODE_EQUALSscss = {
  color: _cols.code.equals,              
};

export const CODE_PUNCTcss = {
  color: _cols.code.dot,              
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
  maxWidth: "calc(" + $SIDEBAR_WIDTH + " + " + $CONTENT_WIDTH + ")"
};


export const MD_CODE_PREcss: CssMap = {
  margin: "20px",
  background: _cols.backhi,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word", // not anywhere
  fontSize: øfontSize.smol,
  lineHeight: "2",
  padding: "1em",
  // whiteSpace: "normal",
  border: "1px solid " + set_alpha(ACID_WASH_OKLCH.lilac, 0.5),

};
export const CODE_COLONcss = {
  // ...FONT_FAM_MONO,
  color: _cols.code.colon
};
/* export const SLASHcss = OKLCH_FLEURS.blazeOrange;
export const PIPEcss = OKLCH_NEUTRALS.slate;
export const ANGLEcss = OKLCH_VIBRANT.roseNeon;

*/


export const ANGLEcss = {
  // ...FONT_FAM_MONO,
  color: OKLCH_VIBRANT.roseNeon
}
export const PIPEcss = {
  // ...FONT_FAM_MONO,
  color: OKLCH_NEUTRALS.slate
}
export const SLASHcss = {
  // ...FONT_FAM_MONO,
  color: OKLCH_FLEURS.blazeOrange
}
export const CODE_TYPEcss = {
  // ...FONT_FAM_MONO,
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
    fontSize: level === 1 ? øfontSize.main: øfontSize.smol,
    // fontSize: level === 1 ? _TXT.heading : level === 2 ? _TXT.subhead : level === 3 ? _TXT.subhead : _TXT.main,
    fontWeight: level === 1 ? øfontWeight.fat : level === 2 ? 600 : 400,
    justifySelf: level <= 2 ? "center" : "start",
    color: _cols.txt.header,
  }
}

export const MD_COPY_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  fontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
  color: _cols.txt.copyright,
  marginTop: "2rem",
}

export const MD_LINK_LINEcss: CssMap = {
  ...ABOUT_P_TEXTcss,
  color: _cols.code.url,
  // ...FONT_FAM_MONO,
  textDecoration: "underline",
  marginLeft: "2rem"
}

export const FLUSH_LISTcss = {
  display: "grid",
  // gap: "1rem",
  margin: "20px 0",
  minWidth: "0",
};


export const SPECIAL_WORDScss = {
  color: _cols.greenlike,
  // background: _cols.backhi,
}
