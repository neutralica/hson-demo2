// css.consts.ts

import type { CssMap } from "hson-live/types";

// export const starDelayString = `${skyTimeNum + 2000}ms`

export const HSON_LETTERS = ["H", "S", "O", "N"] as const;
export const sunColor = "rgb(255, 196, 84)"
export const sunFade = "rgb(255, 196, 84, 0.55)"
export const bckColor = "black";
export const skyGradient = "linear-gradient(30deg, transparent 0%,transparent 10%, white 100%)";

export const STAGE_CSS: CssMap = {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100vw",
  height: "100vh",
  backgroundColor: bckColor
}

export const SKY_CSS = {
  position: "relative",
  width: "100%",
  minHeight: "calc(var(--frameSize) * 2)",
  overflow: "hidden",
  "--frameSize": "min(15rem, 520px)",
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
};

export const SUN_CSS: CssMap = {
  width: "5.25em",
  height: "5.25em",
  borderRadius: "999px",
  background: sunColor,
  boxShadow:`0 0 28px ${sunFade}`,
  opacity: "0",
  transform: "scale(1.06)",
  willChange: "transform, opacity",
};
export const FLARE_BOX_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "32%",
  transform: "translate(-50%, -50%)",

  width: "calc(var(--frameSize) * 2)",
  height: "calc(var(--frameSize) * 2)",

  pointerEvents: "none",
  overflow: "visible",
  zIndex: "50",

};
export const FLARE_CSS: CssMap = {
  position: "absolute",
  inset: "0",                    // keep: ensures real size
  pointerEvents: "none",
  opacity: "0",
  mixBlendMode: "screen",
  willChange: "transform, opacity",
  background: `
    linear-gradient(
      120deg,
      transparent 45%,
      rgba(255,255,255,0.25) 50%,
      transparent 55%
    ),
    radial-gradient(
      circle at 50% 50%,
      rgba(255,255,255,0.35),
      transparent 60%
    )
  `,
};

export const FRAME_CSS: CssMap = {
  position: "absolute",
  left: "50%",
  top: "32%",
  transform: "translate(-50%, -50%)",

  // CHANGED: use the shared var
  width: "var(--frameSize)",
  height: "var(--frameSize)",
  background: bckColor,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  willChange: ""
};

export const GRADIENT_CSS: CssMap = {
  position: "absolute",
  left: "0%",
  top: "0%",
  width: "100%",
  height: "100%",
  zIndex: 30,
  opacity: 0,
  willChange: "opacity",
  background: skyGradient,
}

export const WORD_CSS: CssMap = {
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
  fontSize: "1rem",
  fontWeight: "700",
  letterSpacing: "-0.19em",
  color: "white",
  opacity: "0",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

export const STAR_CARRIER_CSS: CssMap = {
  position: "absolute",

  left: "0",
  top: "0",
  /* anchor is a point */
  width: "0",
  height: "0",

  pointerEvents: "none",
  zIndex: "100",
  overflow: "visible",

  offsetPath: `path("M -40 -30 L 380 160")`,
  offsetRotate: "auto",
  offsetAnchor: "50% 50%",
  offsetDistance: "0%",

  willChange: "offset-distance",
};
export const STAR_WRAP_CSS: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",
  width: "0",
  height: "0",
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

};
const TAIL_BASE: CssMap = {
  position: "absolute",
  left: "0",
  top: "0",

  width: "360px",

  borderRadius: "999px",

  /* head at RIGHT edge */
  transformOrigin: "100% 50%",
  transform: "translate(-100%, -50%) scaleX(0.01)",

  willChange: "transform, opacity",
};

export const STAR_TAIL_A_CSS: CssMap = {
  ...TAIL_BASE,
  height: "2px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))",
  filter: "blur(01.05px)",
  opacity: "0",
};

export const STAR_TAIL_B_CSS: CssMap = {
  ...TAIL_BASE,
  height: "5px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(210,235,255,0.45))",
  filter: "blur(6.2px)",
  opacity: "0",
};

export const STAR_TAIL_C_CSS: CssMap = {
  ...TAIL_BASE,
  height: "9px",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(180,220,255,0.22))",
  filter: "blur(14.4px)",
  opacity: "0",
};