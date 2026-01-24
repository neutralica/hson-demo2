// cols.ts

import { mulberry32 } from "../../../utils/rng";

export type FlutingOpts = {
  width: number;
  rows: number;
  seed: number;

  lightPos?: number;     // 0..1
  flutes?: number;
  grooveWidth?: number;

  ink?: number;          // 0..1  (NEW) minimum fill / density
  speckle?: number;      // 0..1  (NEW) tiny deterministic dither
  grooveDepth?: number;  // 0..1  (NEW) how dark grooves go
};

export function make_fluting(opts: FlutingOpts): string {
  const width = Math.max(8, Math.floor(opts.width));
  const rows = Math.max(6, Math.floor(opts.rows));
  const rnd = mulberry32(opts.seed);

  const lightPos = clamp01(opts.lightPos ?? 0.75);
  const flutes = Math.max(2, Math.floor(opts.flutes ?? Math.floor(width / 9)));
  const grooveWidth = Math.max(1, Math.floor(opts.grooveWidth ?? 1));

  const ink = clamp01(opts.ink ?? 0.92);             // start here for “less empty”
  const speckle = clamp01(opts.speckle ?? 0.90);     // subtle texture
  const grooveDepth = clamp01(opts.grooveDepth ?? 0.55);

  // Dark -> light, but IMPORTANT: lowest is NOT a space.
  // This alone makes a huge difference.
  const RAMP = [" ", " ", ".", ",", ";", ":", "|", "│", "┃"];

  // Groove mask across X
  const grooveMask: boolean[] = new Array(width).fill(false);
  for (let i = 0; i < flutes; i++) {
    const center = Math.round(((i + 0.5) / flutes) * (width - 1));
    for (let dx = -grooveWidth; dx <= grooveWidth; dx++) {
      const x = center + dx;
      if (x >= 0 && x < width) grooveMask[x] = true;
    }
  }

  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    const row: string[] = new Array(width);

    // coherent, tiny vertical variation (keeps it alive but not noisy)
    const yWobble = (rnd() - 0.5) * 0.06;

    for (let x = 0; x < width; x++) {
      // normalize x in [-1..1]
      const nx = (x / (width - 1)) * 2 - 1;
      const lx = lightPos * 2 - 1;

      // “reads like a cylinder” bump around the highlight position
      const dist = Math.abs(nx - lx);
      let b = 1 - dist;            // 0..1-ish
      b = clamp01(b + yWobble);

      // Ink floor (density knob): prevent big blank deserts
      b = clamp01(ink + (1 - ink) * b);

      // Grooves: darker, but still respect ink floor
      const inGroove = grooveMask[x];
      if (inGroove) {
        // pull brightness down toward ink, by grooveDepth
        b = clamp01(b * (1 - grooveDepth));
        b = clamp01(ink + (1 - ink) * b);
      }

      // Optional speckle: deterministic micro-variation
      // Uses a “mostly off” dither so it doesn’t become fuzz.
      if (speckle > 0) {
        const j = (rnd() - 0.5) * (0.22 * speckle);
        b = clamp01(b + j);
      }

      // Structure: hard rails so it frames as a column
      const isEdge = x === 0 || x === width - 1;
      row[x] = isEdge ? "│" : rampPick(RAMP, b);
    }

    lines.push(row.join(""));
  }

  return lines.join("\n");
}

// -------------------- helpers --------------------

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function rampPick(ramp: readonly string[], b: number): string {
  const last = ramp.length - 1;
  const ix = Math.max(0, Math.min(last, Math.round(b * last)));
  return ramp[ix] ?? ramp[last] ?? ramp[0] ?? ".";
}
