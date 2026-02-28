import type { LiveTree } from "hson-live";
import type { LetterKey } from "../../types/core.types";
import type { WordmarkParts } from "./wordmark.types";
import { make_div_class, make_span_class } from "../utils/makers";


export function build_wordmark(parent: LiveTree): WordmarkParts {
  const frame = make_div_class(parent, "frame");
  const wordbox = make_div_class(frame, "wordmark");

  const mk = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
    const cell = make_span_class(wordbox, ["cell", ltr]);
    const letter = make_span_class(cell, ["letter", ltr]).text.set(ltr);
    return [letter, cell] as const;
  };

  const [h, hCell] = mk("h");
  const [s, sCell] = mk("s");
  const [o, oCell] = mk("o");
  const [n, nCell] = mk("n");

  const letters = { h: h, s: s, o: o, n: n } as const;
  const cells = { h: hCell, s: sCell, o: oCell, n: nCell } as const;
  const ver = make_span_class(nCell, ["ver"]);
  make_span_class(ver, "ver-a").text.set("2.0.2");
  const ver6 = make_span_class(ver, "ver-6").text.set("6");
  return {
    frame,
    wordbox,
    letters,
    cells,
    ver,
    ver6,
    letterList: [h, s, o, n],
    cellList: [hCell, sCell, oCell, nCell],
  };
}

