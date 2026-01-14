import type { LiveTree } from "hson-live";
import type { LETTER_COLOR } from "../app/consts/core-css.consts";

type LetterKey = keyof typeof LETTER_COLOR; // "H" | "S" | "O" | "N"

export function get_letter_key(l: LiveTree): LetterKey | null {
  if (l.classlist.has("H")) return "H";
  if (l.classlist.has("S")) return "S";
  if (l.classlist.has("O")) return "O";
  if (l.classlist.has("N")) return "N";
  return null;
}

export function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export const makeDivClass = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const makeDivId = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const makeSpanClass = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const makeSection = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);
