// vines.ts

import { mulberry32 } from "../../../utils/rng";



export type FlourishOpts = {
  width: number;     // characters
  rows: number;      // lines
  seed: number;
};

const VINES = ["|", ":", ".", "'", "`"] as const;
const LEAVES = ["*", "+", "o", "x", "~"] as const;
const HOOKS = ["\\", "/", "(", ")", "{", "}", "<", ">"] as const;

function pick<T extends readonly string[]>(arr: T, rnd: () => number): T[number] {
  // CHANGED: index is always in-bounds, so return is never undefined
  const ix = Math.floor(rnd() * arr.length);
  return arr[ix]!;
}

// CHANGED: bounds-checked write helper (fixes all "possibly undefined" issues)
function set_cell(grid: string[][], y: number, x: number, v: string): void {
  const row = grid[y];
  if (!row) return;
  if (x < 0 || x >= row.length) return;
  row[x] = v;
}

export function make_vines(opts: FlourishOpts): string {
  console.log('m,aking vines')
    const width = Math.max(0, Math.floor(opts.width));
  const rows = Math.max(0, Math.floor(opts.rows));
  const rnd = mulberry32(opts.seed);

  // CHANGED: build grid safely (never ragged)
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: width }, () => " ")
  );

  // CHANGED: guard empty cases
  if (rows === 0 || width === 0) return "";

  // top rail
  for (let x = 0; x < width; x++) set_cell(grid, 0, x, "─");

  // hanging vines
  const strands = Math.max(3, Math.floor(width / 10));

  for (let i = 0; i < strands; i++) {
    const sx = Math.floor(rnd() * width);
    const len = 2 + Math.floor(rnd() * Math.max(1, rows - 1)); // CHANGED: avoid 0

    for (let y = 1; y < rows; y++) {
      if (y > len) break;

      // CHANGED: simple sway, deterministic
      const sway = Math.round(Math.sin((y + sx) * 0.6) * (rnd() < 0.5 ? 1 : 0));
      const x = Math.min(width - 1, Math.max(0, sx + sway));

      set_cell(grid, y, x, rnd() < 0.75 ? pick(VINES, rnd) : "│");

      // occasional leaves/hooks
      if (rnd() < 0.20) set_cell(grid, y, x + 1, pick(LEAVES, rnd));
      if (rnd() < 0.15) set_cell(grid, y, x - 1, pick(HOOKS, rnd));
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}