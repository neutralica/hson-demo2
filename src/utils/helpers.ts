import type { LiveTree } from "hson-live";
import type { LETTER_COLOR } from "../app/consts/core-css.consts";

export type LetterKey = keyof typeof LETTER_COLOR; // "H" | "S" | "O" | "N"

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
