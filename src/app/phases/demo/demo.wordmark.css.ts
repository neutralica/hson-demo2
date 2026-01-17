// demo.css.ts

import type { CssMap } from "hson-live/types";
import { LETTER_CSS, WORD_CSS } from "../../wordmark/wordmark.css";

// “home page” palette: mostly grayscale, small accent per letter (optional)
export const LETTER_COLOR_DEMO = {
  H: "rgb(230,230,235)",
  S: "rgb(220,220,226)",
  O: "rgb(235,235,240)",
  N: "rgb(225,225,232)",
} as const;

// If you still want per-letter accents, make them *subtle* and use as --glow
export const LETTER_ACCENT_DEMO = {
  H: "rgba(80,200,255,0.55)",
  S: "rgba(255,210,80,0.45)",
  O: "rgba(120,255,180,0.40)",
  N: "rgba(255,140,200,0.40)",
} as const;

export const WORD_CSS_DEMO: CssMap = {
  // keep your WORD_CSS geometry, but let demo layer own z-index
  ...WORD_CSS,
  zIndex: "10",
};

export const LETTER_CSS_DEMO: CssMap = {
  ...LETTER_CSS,
  // calmer base
  color: "var(--final)",
  filter: "brightness(1)"
};

export const LETTER_CSS_DEMO_HOVER: CssMap = {
  // small, readable “alive” effect
  filter: "brightness(1.15)",
  textShadow:
    "0 1px 0 rgba(0,0,0,0.55), 0 0 12px rgba(0,0,0,0.35), 0 0 10px var(--glow)",
};
// demo.css.ts (additions)

export const VER_CSS_DEMO: CssMap = {
  position: "absolute",
  right: "8px",
  bottom: "5px",

  fontFamily: "monospace",
  fontSize: "0.9rem",
  fontWeight: "700",
  letterSpacing: "-0.12em",

  color: "rgba(230,230,235,0.85)",
  opacity: "1",

  whiteSpace: "nowrap",
  pointerEvents: "none",

  textShadow: "0 1px 0 rgba(0,0,0,0.65)",
};

export const VER6_CSS_DEMO: CssMap = {
  display: "inline-block",
  transform: "translateX(0.11em)",
};

