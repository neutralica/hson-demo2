import type { LiveTree } from "hson-live";
import type { LetterKey } from "../../types/core.types";
import type { WordmarkParts } from "./wordmark.types";
import { makeDivClass, makeSpanClass } from "../utils/makers";


export function build_wordmark(parent: LiveTree): WordmarkParts {
  const frame = makeDivClass(parent, "frame");
  const wordbox = makeDivClass(frame, "wordmark");

  const mk = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
    const cell = makeSpanClass(wordbox, ["cell", ltr]);
    const letter = makeSpanClass(cell, ["letter", ltr]).text.set(ltr);
    return [letter, cell] as const;
  };

  const [h, hCell] = mk("h");
  const [s, sCell] = mk("s");
  const [o, oCell] = mk("o");
  const [n, nCell] = mk("n");

  const letters = { h: h, s: s, o: o, n: n } as const;
  const cells = { h: hCell, s: sCell, o: oCell, n: nCell } as const;
  const ver = makeSpanClass(nCell, ["ver"]);
  makeSpanClass(ver, "ver-a").text.set("2.0.2");
  const ver6 = makeSpanClass(ver, "ver-6").text.set("6");
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

