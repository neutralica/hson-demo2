
// style-wordmark.demo.ts
import { get_letter_key } from "../../../utils/helpers";
import { LETTER_COLOR_DEMO, LETTER_CSS_DEMO, VER6_CSS_DEMO, VER_CSS_DEMO, WORD_CSS_DEMO } from "../../phases/demo/demo.wordmark.css";
import { FRAME_CSS } from "../../phases/splash/splash.css";
import { CELL_CSS } from "../wordmark.css";
import { O_ROT } from "../wordmark.css";
import type { WordmarkParts } from "../wordmark.types"; // CHANGE: adjust path

export function style_wordmark_demo(parts: WordmarkParts): WordmarkParts {
  // CHANGE: style the word container you actually have
  parts.frame.css.setMany(FRAME_CSS)
  parts.wordbox.css.setMany(WORD_CSS_DEMO);
  // CHANGE: list iteration is simplest + preserves intended order
  for (const c of parts.cellList) {
    c.css.setMany(CELL_CSS);
  }

  for (const l of parts.letterList) {
    l.css.setMany(LETTER_CSS_DEMO);

    const k = get_letter_key(l);
    if (!k) continue;

    const col = LETTER_COLOR_DEMO[k];
    l.css.set.var("--final", col);
    // TODO -- remove these vestigial animation calls from the demo css
    l.css.set.var("--glow", col);
    l.css.set.var("--starshine", col);
  }

  // CHANGE: demo nudges (optional)
  parts.letters.H.css.set.transform("translateX(13px)");
  parts.letters.S.css.set.transform("translateX(6px)");
  parts.letters.O.css.setMany(O_ROT);

  parts.ver.css.setMany(VER_CSS_DEMO);
  parts.ver6.css.setMany(VER6_CSS_DEMO);

  return parts;
}