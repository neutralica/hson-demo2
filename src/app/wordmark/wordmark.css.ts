import type { CssMap } from "hson-live/types";

export const HSON_FONT_PX = 96
export const HSON_FONT_str = `${HSON_FONT_PX}px`;

export const CELL_CSS: CssMap = {
  display: "block",
  alignItems: "baseline",
  lineHeight: "1",
  position: "relative",
};/*  layout box: stable geometry */


export const LETTER_CSS: CssMap = {
  position: "relative",
  display: "block",
  fontSize: HSON_FONT_str,
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
};

export const WORD_CSS: CssMap = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "4.15rem 4.25rem",
  gridTemplateRows: "5rem 3.96rem",
  gap: "0",
  placeItems: "end start",
  isolation: "isolate",
  userSelect: "none",
  zIndex: "-10",
  
};

export const LOGOBOX_CSS: CssMap = {
  position: "fixed",
  left: "50vw",
  top: "30vh",
  transform: "translate(-50%, -50%)",

  width: "max-content",
  height: "max-content",
  // zIndex: "50",
  pointerEvents: "none",
};


export const O_ROT: CssMap = {
  fontSize: "5.7rem",
  display: "inline-block",
  transform: "rotate(32deg) translateX(5px) translateY(-6px)",
  transformOrigin: "50% 55%",
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

