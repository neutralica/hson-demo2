// zalgo.ts

export type ZConfig = {
  // explicit knobs instead of a single “intensity”
  above: number;   // marks per char (0..)
  below: number;
  mid: number;
  seed?: number;   // optional deterministic output
  skipChars?: RegExp; // optional: don’t zalgo these
};

// curated combining mark sets (above/below/mid)
const COMB_ABOVE = [
  "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307", "\u0308", "\u030A",
  "\u030B", "\u030C", "\u030D", "\u030E", "\u0310", "\u0311", "\u0312", "\u0313", "\u0314", "\u033D",
  "\u033E", "\u033F", 
] as const;

const COMB_BELOW = [
  "\u0316", "\u0317", "\u0318", "\u0319", "\u031A", "\u031C", "\u031D", "\u031E", "\u031F", "\u0320",
  "\u0323", "\u0324", "\u0325", "\u0326", "\u0327", "\u0328", "\u0329", "\u032A", "\u032B", "\u032C",
  "\u032D", "\u032E", "\u032F", "\u0330", "\u0331", "\u0332", "\u0333", "\u0339", "\u033A", "\u033B", "\u033C",
] as const;

const COMB_MID = [
  "\u0334", "\u0335", "\u0336", "\u0337", "\u0338",
] as const;

// tiny deterministic PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function addMarks(count: number, marks: readonly string[], rand: () => number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) out += pick(marks, rand);
  return out;
}

export function zalgo_unicode(input: string, s: ZConfig): string {
  const rand = s.seed === undefined ? Math.random : mulberry32(s.seed);

  const skip = s.skipChars ?? /[\s]/; // default skip whitespace only

  let out = "";
  for (const ch of input) {
    if (skip.test(ch)) {
      out += ch;
      continue;
    }
    out += ch;
    out += addMarks(s.mid, COMB_MID, rand);
    out += addMarks(s.above, COMB_ABOVE, rand);
    out += addMarks(s.below, COMB_BELOW, rand);
  }
  return out;
}

