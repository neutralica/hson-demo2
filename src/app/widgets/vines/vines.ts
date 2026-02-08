// vines.ts

import { _clamp01, _lerp } from "../../utils/helpers";
import { make_rng } from "../../utils/rng";

type Threshold<T> = Readonly<{ min: number; value: T }>;

export type VineOpts = {
  width: number;     // characters
  rows: number;      // lines
  seed: number;
  ornate?: number;   // 0..1 (clamped by nrmlz_ornate)
};

// ----------------------------
// Safer glyph sets (ASCII-only)
// ----------------------------

// rail is safe ASCII only
const railThresholds: readonly Threshold<string>[] = [
  { min: 0.00, value: "-" },
  { min: 0.50, value: "=" },
  { min: 0.80, value: "#" }, // "thick rail" but monospace-safe
];

// trunk characters are single-column ASCII
const trunkThresholds: readonly Threshold<readonly string[]>[] = [
  { min: 0.00, value: [".", ",", "'", "`"] },        // wispy / endpoints
  { min: 0.35, value: ["|", ":", ";", "!"] },        // medium
  { min: 0.70, value: ["|", "!", "I", "H", "#"] },   // thick near rail
];

// leaves are single-column ASCII.
// NOTE: keep these subtle; too many makes “confetti.”
const leafThresholds: readonly Threshold<readonly string[]>[] = [
  { min: 0.00, value: [".", "o"] },
  { min: 0.45, value: ["o", "*", "+"] },
  { min: 0.80, value: ["*", "+", "x"] },
];

// hooks are single-column ASCII, used at termination
const hookThresholds: readonly Threshold<readonly string[]>[] = [
  { min: 0.00, value: ["'", ".", ","] },
  { min: 0.45, value: [")", "(", "\\", "/"] },
  { min: 0.80, value: ["J", "L", ")", "("] },
];

// ----------------------------
// helpers (yours + a few tiny new ones)
// ----------------------------

function pick<T extends readonly string[]>(arr: T, rnd: () => number): T[number] {
  const ix = Math.floor(rnd() * arr.length);
  return arr[ix]!;
}

function pick_threshold<T>(spec: readonly Threshold<T>[], tRaw: number): T {
  const t = _clamp01(tRaw);
  let out = spec[0]!.value;
  for (const { min, value } of spec) {
    if (t >= min) out = value;
    else break;
  }
  return out;
}

function set_cell(grid: string[][], y: number, x: number, v: string): void {
  const row = grid[y];
  if (!row) return;
  if (x < 0 || x >= row.length) return;
  row[x] = v;
}

// avoid overwriting something already “stronger”
function try_set_cell(grid: string[][], y: number, x: number, v: string): void {
  const row = grid[y];
  if (!row) return;
  if (x < 0 || x >= row.length) return;
  if (row[x] !== " ") return;
  row[x] = v;
}

function nrmlz_ornate(raw01: number): number {
  return _lerp(0.1, 1, _clamp01(raw01));
}

// local ornamentation falls off down the strand (thick at top, thin at bottom)
function falloff_orn(orn: number, t01: number): number {
  // t01: 0 at top -> 1 at bottom
  const k = 1.6; // tune: higher = faster thinning
  return orn * Math.pow(1 - _clamp01(t01), k);
}

// ----------------------------
// New strand model
// ----------------------------

type Strand = {
  x: number;
  yEnd: number;
  alive: boolean;
  dx: -1 | 0 | 1;     // “momentum”
  orn0: number;       // strand-specific intensity (adds variation)
};

export function make_vines(opts: VineOpts): string {
  const width = Math.max(0, Math.floor(opts.width));
  const rows = Math.max(0, Math.floor(opts.rows));

  // NOTE: you said non-determinism is intentional.
  const seed = Math.random() * opts.seed;
  const rnd = make_rng(seed);

  const orn = opts.ornate != null ? nrmlz_ornate(opts.ornate) : 0.3;

  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: width }, () => " ")
  );

  if (rows === 0 || width === 0) return "";

  // top rail
  const rCh = pick_threshold(railThresholds, orn);
  for (let x = 0; x < width; x++) set_cell(grid, 0, x, rCh);

  // strand count depends on width + orn (but bounded)
  const baseStrands = Math.max(3, Math.floor(width / 10));
  const extra = Math.floor(orn * Math.max(1, width / 14));
  const strandCount = Math.min(width, baseStrands + extra);

  // pre-build stateful strands
  const strands: Strand[] = Array.from({ length: strandCount }, () => {
    const x = Math.floor(rnd() * width);

    // lengths: bias toward “long” with orn, but keep variety
    const minLen = Math.max(2, Math.floor(rows * _lerp(0.15, 0.30, orn)));
    const maxLen = Math.max(minLen + 1, Math.floor(rows * _lerp(0.55, 0.95, orn)));
    const yEnd = Math.min(rows - 1, minLen + Math.floor(rnd() * (maxLen - minLen + 1)));

    // strand-specific strength so not everything hits the same thresholds
    const orn0 = _clamp01(orn * _lerp(0.75, 1.15, rnd()));

    return {
      x,
      yEnd,
      alive: true,
      dx: 0,
      orn0,
    };
  });

  // render row-by-row so continuity is stable and “floating” junk is reduced
  for (let y = 1; y < rows; y++) {
    for (const s of strands) {
      if (!s.alive) continue;
      if (y > s.yEnd) {
        s.alive = false;
        continue;
      }

      // gentle drift with momentum (prevents rigid straight lines, avoids chaos)
      // - mostly vertical (dx=0)
      // - occasional step left/right
      // - momentum sometimes persists
      const driftChance = 0.08 + 0.12 * orn;       // more ornate -> more movement
      const keepMomentum = 0.55;                   // tune: higher = smoother curves

      if (rnd() < driftChance) {
        if (rnd() < keepMomentum) {
          // keep s.dx
        } else {
          const r = rnd();
          s.dx = r < 0.33 ? -1 : r < 0.66 ? 0 : 1;
        }
      } else {
        s.dx = 0;
      }

      s.x = Math.max(0, Math.min(width - 1, s.x + s.dx));

      // thickness falls off with depth
      const t = s.yEnd <= 1 ? 1 : (y - 1) / (s.yEnd - 1); // 0..1 over the strand
      const localOrn = falloff_orn(s.orn0, t);

      // trunk
      const trunkSet = pick_threshold(trunkThresholds, localOrn);
      const trunkCh = pick(trunkSet as readonly string[], rnd);
      set_cell(grid, y, s.x, trunkCh);

      // leaves: only if trunk exists (it does), and bias toward mid-strand
      // fewer leaves near the rail and at the very tip
      const midBias = 1 - Math.abs(t - 0.55) / 0.55; // peak near middle
      const leafChance = (0.05 + 0.18 * localOrn) * (0.35 + 0.65 * midBias);

      if (rnd() < leafChance) {
        const leafSet = pick_threshold(leafThresholds, localOrn);
        const leafCh = pick(leafSet as readonly string[], rnd);
        const side = rnd() < 0.5 ? -1 : 1;
        try_set_cell(grid, y, s.x + side, leafCh);
      }

      // termination hook: only at the end
      if (y === s.yEnd) {
        const hookSet = pick_threshold(hookThresholds, s.orn0);
        const hookCh = pick(hookSet as readonly string[], rnd);

        // prefer placing hook on the strand cell if it’s light, otherwise adjacent
        const placeOnTrunk = rnd() < 0.55;
        if (placeOnTrunk) {
          set_cell(grid, y, s.x, hookCh);
        } else {
          const side = rnd() < 0.5 ? -1 : 1;
          try_set_cell(grid, y, s.x + side, hookCh);
        }

        s.alive = false;
      }
    }
  }

  return grid.map(row => row.join("")).join("\n");
}