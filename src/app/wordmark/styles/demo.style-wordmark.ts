
// style-wordmark.demo.ts
import { get_letter_key } from "../../../utils/helpers";
import { CELL_CSS_DEMO, FRAME_CSS_DEMO, LETTER_ACCENT_DEMO, LETTER_COLOR_DEMO, LETTER_CSS_DEMO, LETTER_HALO_DEMO, LETTER_INK_DEMO, VER6_CSS_DEMO, VER_CSS_DEMO, WORD_CSS_DEMO } from "../../phases/hson-demo-3/demo.css";
import { FRAME_CSS_SPLASH } from "../../phases/logo-splash-2/splash.css";
import { CELL_CSS } from "../wordmark.css";
import { O_ROT } from "../wordmark.css";
import type { WordmarkParts } from "../wordmark.types"; // CHANGE: adjust path

export function style_wordmark_demo(parts: WordmarkParts): WordmarkParts {
  parts.frame.css.setMany(FRAME_CSS_DEMO);
  parts.wordbox.css.setMany(WORD_CSS_DEMO);

  for (const c of parts.cellList) c.css.setMany(CELL_CSS_DEMO);
  for (const l of parts.letterList) {
    l.css.setMany(LETTER_CSS_DEMO);

    const k = get_letter_key(l);
    if (!k) continue;

    l.css.set.var("--ink", LETTER_INK_DEMO[k]);
    l.css.set.var("--halo", LETTER_HALO_DEMO[k]);

    // hard edge + faint bloom, no modern polish
    l.css.set.color("var(--ink)");
    l.css.set.textShadow([
      // crisp “ink trap” edge
      // "0 1px 0 rgba(0,0,0,0.65)",
      // "1px 0 0 rgba(0,0,0,0.45)",
      // "-1px 0 0 rgba(0,0,0,0.35)",

      // tiny specular scrape (keeps it “computer-printed”)
      "0 -1px 0 rgba(255,255,255,0.10)",

      // faint halo (not glow)
      "0 0 14px var(--halo)",
    ].join(", "));

    // kill the “too modern” smoothness
    // l.css.set.filter("grayscale(1) contrast(1.08)");
    l.css.set.opacity("0.82"); // watermark vibe
  }
  parts.letters.H.css.set.transform("translateX(13px)");
  parts.letters.S.css.set.transform("translateX(6px)");
  parts.letters.O.css.setMany(O_ROT);

  parts.ver.css.setMany(VER_CSS_DEMO);
  parts.ver6.css.setMany(VER6_CSS_DEMO);
  parts.wordbox.css.set.opacity("0.68");
  parts.wordbox.css.set.transform("scale(0.92)");
  return parts;
}
