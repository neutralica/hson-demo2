import type { LiveTree } from "hson-live";
import type { LetterKey } from "../../types/core.types";
import type { WordmarkParts } from "./wordmark.types";
import { makeDivClass, makeSpanClass } from "../../utils/makers";


export function build_wordmark(parent: LiveTree): WordmarkParts {
  const frame = makeDivClass(parent, "frame");
  const wordbox = makeDivClass(frame, "wordmark");

  const mk = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
    const cell = makeSpanClass(wordbox, ["cell", ltr]);
    const letter = makeSpanClass(cell, ["letter", ltr]).setText(ltr);
    return [letter, cell] as const;
  };

  const [h, hCell] = mk("H");
  const [s, sCell] = mk("S");
  const [o, oCell] = mk("O");
  const [n, nCell] = mk("N");

  const letters = { H: h, S: s, O: o, N: n } as const;
  const cells = { H: hCell, S: sCell, O: oCell, N: nCell } as const;
  const ver = makeSpanClass(nCell, ["ver"]);
  makeSpanClass(ver, "ver-a").setText("2.0.2");
  const ver6 = makeSpanClass(ver, "ver-6").setText("6");
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

