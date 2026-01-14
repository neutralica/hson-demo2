import type { CssMap } from "hson-live/types";

/*  layout box: stable geometry */
export const CELL_CSS: CssMap = {
  display: "block",
  alignItems: "baseline",
  lineHeight: "1",
  position: "relative",
};

/*  glyph: rotate/translate */
export const LETTER_CSS: CssMap = {
  position: "relative",
  display: "block",
  fontSize: "6rem",
  lineHeight: "0.88",
  fontFamily: "'Times New Roman', Georgia, Iowan Old Style, Palatino, serif, ui-serif",
  fontWeight: "700",
  color: "black",
  textShadow: "0 0 0 transparent",
};

export const LETTER_CSS_FINAL: CssMap = {
  color: "var(--final)",
  textShadow: "0 0 0 transparent",
  filter: "brightness(1)",
};export const WORD_CSS: CssMap = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "4.25rem 4.25rem",
  gridTemplateRows: "3.85rem 3.95rem",
  gap: "0",
  placeItems: "end start",
  isolation: "isolate",
  userSelect: "none",
  zIndex: "40",
};

export const O_ROT: CssMap = {
  fontSize: "3.8rem",
  display: "inline-block",
  transform: "rotate(32deg) translateX(5px) translateY(-3px)",
  transformOrigin: "50% 55%",
};

export const LETTER_COLOR = {
  H: "rgb(0, 220, 255)",
  S: "rgb(255, 210, 0)",
  O: "rgb(0, 255, 120)",
  N: "rgb(255, 100, 170)",
};

export const VER6_CSS: CssMap = {
  display: "inline-block",
  transform: "translateX(0.11em)", // tweak: 0.05–0.12em is typical
};

export const VER_CSS: CssMap = {
  position: "absolute",
  right: "8px",
  bottom: "5px",
  fontFamily: "monospace",
  fontSize: "1rem",
  fontWeight: "700",
  letterSpacing: "-0.19em",
  color: "white",
  opacity: "0",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

