import type { LiveTree } from "hson-live/livetree";
import type { LetterKey } from "../../core/types/core.types";

export type WordmarkParts = {
  frame: LiveTree;
  wordbox: LiveTree;
  letters: Record<LetterKey, LiveTree>;
  cells: Record<LetterKey, LiveTree>;
  letterList: readonly LiveTree[];
  cellList: readonly LiveTree[];
  ver: LiveTree;
  ver6: LiveTree;
};