import type { LiveTree } from "hson-live";
import type { LetterKey } from "../core/types/core.types";

// utils/keys-of.ts
export function keys_of<T extends object>(o: T): Array<keyof T> {
  return Object.keys(o) as Array<keyof T>;
}
export function get_letter_key(l: LiveTree): LetterKey | null {
  if (l.classlist.has("H")) return "h";
  if (l.classlist.has("S")) return "s";
  if (l.classlist.has("O")) return "o";
  if (l.classlist.has("N")) return "n";
  return null;
}

export function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function _clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
export function _clampLoHi(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function _clampN1P1(n: number): number {
  return n < -1 ? -1 : n > 1 ? 1 : n;
}

export function _wrap360(h: number): number {
  const x = h % 360;
  return x < 0 ? x + 360 : x;
}

export function _lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Tiny deterministic hash -> [0,1)
export const _hash01 = (n: number): number => {
  // integer hash (stable, cheap)
  let x = n | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  // to [0,1)
  return (x >>> 0) / 0xffffffff;
};

// ADDED: deterministic RNG (xorshift32)
export function _rng_xs32(seed: number): () => number {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // normalize to [0,1)
    return ((x >>> 0) / 0x1_0000_0000);
  };
}


export function _snip(s: string, max = 2000): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function kb_txt(s: string): string {
  if (!s) return "0.0";
  const bytes = new TextEncoder().encode(s).length;
  return (bytes / 1024).toFixed(1);
}

// FNV-1a 32-bit (fast, deterministic)
export function hash32_fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>>0 => unsigned
  return (h >>> 0).toString(16).padStart(8, "0");
}