// ui/prng.ts
export function normalize_seed(seed: number): number {
  return (seed >>> 0);
}

// mulberry32 PRNG (fast, deterministic, good enough for test gen)
export function make_rng(seed: number): () => number {
  let a = normalize_seed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}