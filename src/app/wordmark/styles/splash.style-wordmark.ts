import type { LiveTree } from "hson-live";
import type { LetterKey } from "../../../types/core.types";
import { CELL_CSS, O_ROT } from "../wordmark.css";
import { LETTER_COLOR_std } from "../../consts/colors.consts";
import { FRAME_CSS_SPLASH } from "../../phases/logo-splash-2/splash.css";
import type { WordmarkParts } from "../wordmark.types";


export function style_wordmark_splash(parts: WordmarkParts): void {
  const { frame, letters, cellList } = parts;

  frame.css.setMany(FRAME_CSS_SPLASH);

  for (const c of cellList) c.css.setMany(CELL_CSS);

  (Object.keys(letters) as LetterKey[]).forEach((k) => {
    const l = letters[k];
    const col = LETTER_COLOR_std[k];
    l.css.set.var("--glow", col);
    l.css.set.var("--final", col);
    l.css.set.var("--starshine", col);
  });

  letters.H.css.set.transform("translateX(13px)");
  letters.S.css.set.transform("translateX(6px)");
  letters.O.css.setMany(O_ROT);
}
// wordmark-keyframes-splash.ts

export const WORD_KFs_SPLASH = [
  {
    name: "neon_flicker",
    steps: {
      "0%":   { opacity: "0",   filter: "brightness(0.6)" },
      "10%":  { opacity: "1",   filter: "brightness(1.4)" },
      "20%":  { opacity: "0.4" },
      "30%":  { opacity: "1" },
      "45%":  { opacity: "0.7" },
      "60%":  { opacity: "1" },                 // (don’t use 1.1)
      "100%": { opacity: "1",   filter: "brightness(1)" },
    }
  },
  {
    name: "starshine",
    steps: {
      "0%":   { textShadow: "0 0 0 var(--starshine)",  filter: "brightness(1)" },
      "40%":  { textShadow: "0 0 14px var(--starshine)", filter: "brightness(1.6)" },
      "100%": { textShadow: "0 0 4px var(--starshine)",  filter: "brightness(1.1)" }
    }
  },
  {
    name: "settle",
    steps: {
      "0%":   { transform: "translateY(0)" },
      "100%": { transform: "translateY(0)" },
    }
  }
];/**
 * Register splash keyframes for the wordmark.
 * Call once, early (e.g. inside mount_splash).
 */

export function word_keyframes_splash(wordmark: LiveTree): void {
  const css = wordmark.css;

  css.keyframes.setMany(WORD_KFs_SPLASH);
}
