import type { CssMap } from "hson-live/types";
import { $blu_, $cols_, $grn_, $gry_, $pnk_, $ylw_, ACID_WASH_OKLCH } from "../../../consts/colors.consts";
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
  color: $gry_.mid,            //  list text color here only
  minWidth: "0",
};


export const DOC_BTNcss:CssMap = {
  display: "grid",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "10px",
  cursor: "pointer",
  userSelect: "none",
  fontFamily: "monaco",
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
  // maxWidth: "60ch",
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
  fontFamily: "monaco",
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
  fontFamily: "monaco",
  fontSize: $txt_.sub,
  lineHeight: "1.75",
}

export const MD_TICKcss: CssMap = {
  // “third color” for the backticks themselves
  color: $ylw_.faded,
  fontWeight: "700",
} as const;

export const MD_CODEcss: CssMap = {
  // code inner styling (different from surrounding monospace)
  color: ACID_WASH_OKLCH.ice,
  fontWeight: "300",
} as const;

export const MD_PARENcss: CssMap = {
  // parens + contents
  color: $blu_.std, // pick whatever fits your palette
  fontWeight: "700",
} as const;

// backticks themselves
export const INLINE_TICKcss: CssMap = {
  color: $gry_.dimmer,              // muted gray
  fontWeight: "700",
  fontFamily: "monaco",
} as const;

// inline code wrapper
export const INLINE_CODEcss: CssMap = {
  // fontSize: $txt_.main,
  color: $blu_.pastel,              // same family as method names, but slightly calmer
  fontFamily: "monaco",
  fontWeight: "300",
} as const;

// parentheses inside inline code
export const CODE_PARENcss: CssMap = {
  color: ACID_WASH_OKLCH.ember, // choose something distinct but harmonious
  fontFamily: "monaco",
  fontWeight: "600",

} as const;

export const CODE_PAREN_INNERcss: CssMap = {
  color: ACID_WASH_OKLCH.amber,
  fontFamily: "monaco",
  fontWeight: "300",
} as const;

export const CODE_COMMENTScss = {
  color: ACID_WASH_OKLCH.seaGlass
};
// // CHANGED: render tokens into a container.
// // This container should be an element you already created (p/li/etc).
// function render_inline(container: LiveTree, src: string): void {
//   // important: don’t container.empty() unless you want to blow away other structure.
//   // In your usage below, you’ll call it on a fresh div, so it’s fine either way.
//   // container.empty();
//   const tokens = tokenize_inline(src, INLINE_RULES);
//   for (const tok of tokens) {
//     if (tok.kind === "text") {
//       container.create.span().text.set(tok.text);
//       continue;
//     }
//     if (tok.kind === "code") {
//       // render: `foo` with the wrap and inner styled differently
//       const wrap = container.create.span().css.setMany(INLINE_CODE_WRAPcss);
//       // include the backticks, but style inner separately
//       wrap.create.span().text.set("`");
//       wrap.create.span().css.setMany(INLINE_CODE_INNERcss).text.set(tok.inner);
//       wrap.create.span().text.set("`");
//       continue;
//     }
//     if (tok.kind === "parens") {
//       container.create.span().css.setMany(INLINE_PARENScss).text.set(tok.text);
//       continue;
//     }
//   }
// }
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
