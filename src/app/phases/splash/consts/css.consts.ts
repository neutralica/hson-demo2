// css.consts.ts

import type { CssMap } from "hson-live/types";

export const skyTimeNum = 10000;
export const skyTimeString = `${skyTimeNum}ms`;


export const starTimeNum = 1400;
export const starTimeString = `${starTimeNum}ms`;
export const starDelayString = `${skyTimeNum + 2000}ms`

export const HSON_LETTERS = ["H", "S", "O", "N"] as const;

export const SKY_CSS = {
  position: "relative",
  width: "100%",
  minHeight: "100vh",
  overflow: "hidden",
  background: "black",
}

export const SUN_CARRIER_CSS: CssMap = {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  zIndex: "-50",
  // smooth curve
  offsetPath: `path("M 30 400 A 400 500 0 0 1 320 -120")`,
  offsetRotate: "0deg",
  offsetAnchor: "50% 50%",
  offsetDistance: "0%",
  willChange: "offset-distance",
  // animation: "hson_sun_path 8000ms linear 0ms 1 forwards",
};

export const SUN_CSS: CssMap = {
  width: "5.25em",
  height: "5.25em",
  borderRadius: "999px",
  background: "rgb(255, 196, 84)",
  boxShadow: "0 0 28px rgba(255, 196, 84, 0.55)",
  opacity: "0",
  transform: "scale(1.06)",
  willChange: "transform, opacity",
  // animation: "hson_sun_disk 8000ms ease-in-out 0ms 1 forwards",
};

export const FRAME_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "32%",
  transform: "translate(-50%, -50%)",
  width: "min(15rem, 520px)",
  height: "min(15rem, 520px)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  // animation: `hson_sky ${skyTimeString} ease-in-out 0ms 1 forwards`,
};

export const WORD_CSS: CssMap = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "4.25rem 4.25rem", // tighten columns
  gridTemplateRows: "3.85rem 3.95rem",    // a little uneven is fine
  gap: "0",
  placeItems: "end start",              // stop baseline games
  isolation: "isolate",
  userSelect: "none",
  zIndex: "0",
};

// this is the *layout* box: stable geometry
export const CELL_CSS: CssMap = {
  display: "block",
  alignItems: "baseline",
  //   width: "3.0rem",
  //   height: "3.5  rem",
  lineHeight: "1",        // critical: kill line-box surprises
  position: "relative",
};

// this is the glyph: free to rotate/translate
export const LETTER_CSS: CssMap = {
  position: "relative",
  display: "block",
  fontSize: "6rem",
  lineHeight: "0.88",     // tighten glyph box
  fontFamily: "'Times New Roman', Georgia, Iowan Old Style, Palatino, serif, ui-serif",
  fontWeight: "700",
  color: "black",          // no fill
  textShadow: "0 0 0 transparent", // no glow

  // animation: `hson_letters 1200ms ease-in-out 9500ms 1 forwards,
  //           hson_letter_starshine ${starTimeString} linear ${starDelayString} 1 forwards`,
};

// apply CELL_CSS to each cell container; LETTER_CSS to glyph spans

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
}

export const VER6_CSS: CssMap = {
  display: "inline-block",
  transform: "translateX(0.11em)", // tweak: 0.05–0.12em is typical
};

export const VER_CSS: CssMap = {
  position: "absolute",
  right: "8px",
  bottom: "5px",
  fontFamily: "monospace",
  fontSize: "0.2em",
  fontWeight: "700",
  letterSpacing: "-0.19em",
  color: "white",
  opacity: "0",
  // transform: "translateY(2px)",
  animationName: "hson_ver",
  animationFillMode: "forwards",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

export const STAR_CARRIER_CSS: CssMap = {
  position: "absolute",

  // CHANGED: anchor is a point, not a full overlay box
  left: "0",
  top: "0",
  width: "0",
  height: "0",

  pointerEvents: "none",
  zIndex: "100",
  overflow: "visible", // CHANGED: don't clip children

  offsetPath: `path("M -40 -30 L 380 160")`,
  offsetRotate: "auto",          // CHANGED: match slope automatically
  offsetAnchor: "50% 50%",       // CHANGED: center-ish is safest
  offsetDistance: "0%",

  willChange: "offset-distance",
  // animation: `hson_star_move ${starTimeNum}ms linear ${starDelayString} 1 forwards`,
};
export const STAR_WRAP_CSS: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  width: "0",
  height: "0",

  // CHANGED: remove rotate, carrier handles it
  transform: "none",
  transformOrigin: "0 0",
};
export const STAR_HEAD_CSS: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  width: "6px",
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.95)",
  boxShadow: "0 0 10px rgba(255,255,255,0.6)",
  transform: "translate(-50%, -50%)",

  opacity: "0",
  willChange: "opacity",

  // CHANGED: no steps()
  // animation: `hson_star_head ${starTimeNum}ms linear ${starDelayString} 1 forwards`,
};
const TAIL_BASE: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",

  // CHANGED: longer base so scaleX can be smaller + smoother
  width: "360px",

  borderRadius: "999px",

  transformOrigin: "100% 50%", // head at RIGHT edge
  transform: "translate(-100%, -50%) scaleX(0.01)",

  willChange: "transform, opacity",
};

export const STAR_TAIL_A_CSS: CssMap = {
  ...TAIL_BASE,
  height: "2px",                       // core stays thin
  // CHANGED: more “core-y” (bright near head/right edge)
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))",
  filter: "blur(0.05px)",              // CHANGED: almost sharp
  opacity: "0",
};

export const STAR_TAIL_B_CSS: CssMap = {
  ...TAIL_BASE,
  height: "5px",                       // CHANGED: noticeably thicker
  // CHANGED: broader, softer glow
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(210,235,255,0.45))",
  filter: "blur(1.2px)",               // CHANGED: blur more than before
  opacity: "0",
};

export const STAR_TAIL_C_CSS: CssMap = {
  ...TAIL_BASE,
  height: "9px",                       // CHANGED: thick afterglow
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(180,220,255,0.22))",
  filter: "blur(2.4px)",               // CHANGED: most blur
  opacity: "0",
};