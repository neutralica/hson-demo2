// snap-helpers.ts

import type { LiveTree } from "hson-live";

export type SnapUnit = number; // pixels

type RectPx = { x: number; y: number; w?: number; h?: number };

export const SNAP_2: SnapUnit = 2;
/** Snap a number to the nearest multiple of `unit` (default 2px). */
export function snap(n: number, unit: SnapUnit = SNAP_2): number {
  return Math.round(n / unit) * unit;
}

/** Snap down (useful for sizes so you don't accidentally grow). */
export function snap_floor(n: number, unit: SnapUnit = SNAP_2): number {
  return Math.floor(n / unit) * unit;
}

/** Snap up (useful for sizes so you don't accidentally shrink). */
export function snap_ceil(n: number, unit: SnapUnit = SNAP_2): number {
  return Math.ceil(n / unit) * unit;
}

/** "12px" -> 12, "1.25rem" -> NaN (only handles px). */
export function parse_px(v: string | null | undefined): number {
  if (!v) return NaN;
  const m = v.trim().match(/^(-?\d+(\.\d+)?)px$/);
  return m ? Number(m[1]) : NaN;
}

export function px(n: number): string {
  return `${n}px`;
}

/** Snap a px string, leave non-px values untouched. */
export function snap_css_px(v: string, unit: SnapUnit = SNAP_2): string {
  const n = parse_px(v);
  return Number.isFinite(n) ? px(snap(n, unit)) : v;
}



export function set_rect_snapped(
  el: LiveTree,
  r: RectPx,
  unit: number = SNAP_2,
): void {
  el.css.setMany({
    left: px(snap(r.x, unit)),
    top: px(snap(r.y, unit)),
    ...(r.w !== undefined ? { width: px(snap(r.w, unit)) } : null),
    ...(r.h !== undefined ? { height: px(snap(r.h, unit)) } : null),
  });
}