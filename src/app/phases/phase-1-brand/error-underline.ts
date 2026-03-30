// error-underline.ts

import { hson, type LiveTree } from "hson-live";
import type { SvgLiveTree } from "../../../../../hson-live/dist/types/svg.types";

export const ERROR_UNDERLINE_PRESET = {
  amplitude: 6,
  step: 6,
  baselineOffset: 2,
  strokeWidth: 2,
  stroke: "#e51400",
  pad: 1.75, // NEW
} as const;

function calcZigzagPath(opts: {
  x0?: number;       // default 0
  x1: number;        // total width end (required)
  baselineY: number; // baseline y in the svg viewBox
  amplitude: number; // peak height (pixels)
  step: number;      // horizontal step per tooth (pixels)
}): string {
  const x0 = opts.x0 ?? 0;
  const x1 = Math.max(x0 + 1, opts.x1);
  const y0 = opts.baselineY;
  const a = Math.max(0.5, opts.amplitude);
  const s = Math.max(2, opts.step);

  let d = `M ${x0} ${y0}`;

  // Start with an "up" so the first tooth reads immediately.
  let up = true;
  let x = x0;

  // Walk until we reach/past x1, then clamp to end cleanly.
  while (x < x1) {
    x = Math.min(x + s, x1);
    const y = up ? (y0 - a) : y0;
    d += ` L ${x} ${y}`;
    up = !up;
  }

  // If we ended on a peak, drop back to baseline at the end for a nicer finish.
  if (!up) {
    d += ` L ${x1} ${y0}`;
  }

  return d;
}

export function makeSvgErrUnderline(opts: {
  width: number;
  amplitude: number;
  step: number;
  baselineOffset: number;
  stroke: string;
  strokeWidth: number;
  pad?: number;
}): SvgLiveTree {
  const w = Math.max(1, Math.ceil(opts.width));
  const h = Math.max(3, Math.ceil(opts.amplitude + opts.baselineOffset + 2));
  const baselineY = h - 1;

  const pad = Math.max(0, Math.min((opts.pad ?? 1.25), (h - 1) / 2));

  const d = calcZigzagPath({
    x1: w,
    baselineY,
    amplitude: opts.amplitude,
    step: opts.step,
  });

  //  keep IDs simple and DOM-safe
  const clipId = `errClip${Math.floor(Math.random() * 1e9)}`;

  const clipY = pad;
  const clipH = Math.max(1, h - pad * 2);

  //  create a detached svg root directly
  const svg = hson.liveTree.create.svg();

  svg.attr.setMany({
    xmlns: "http://www.w3.org/2000/svg",
    width: String(w),
    height: String(h),
    viewBox: `0 0 ${w} ${h}`,
    overflow: "hidden",
    "aria-hidden": "true",
    focusable: "false",
  });

  //  build defs/clipPath/rect natively
  const defs = svg.create.defs();
  const clipPath = defs.create.clipPath().attr.setMany({
    id: clipId,
    clipPathUnits: "userSpaceOnUse",
  });

  clipPath.create.rect().attr.setMany({
    x: "0",
    y: String(clipY + 2),
    width: String(w),
    height: String(Math.max(1, clipH - 2)),
  });

  //  build underline path natively
  svg.create.path().attr.setMany({
    d,
    "clip-path": `url(#${clipId})`,
    fill: "none",
    stroke: opts.stroke,
    "stroke-width": String(opts.strokeWidth),
    "vector-effect": "non-scaling-stroke",
    "stroke-linejoin": "miter",
    "stroke-linecap": "butt",
  });

  return svg;
}

export function attach_error_underline(host: LiveTree, preset = ERROR_UNDERLINE_PRESET): void {

  const el = host.dom.must.el();
  const w = Math.ceil(host.dom.must.rect().width);
  const svgHTML = makeSvgErrUnderline({
    width: w,
    ...preset,
  });

  const box = host.create.span()
    .id.set('error-underline')
    .classlist.set("error-underline")
  box.css.setMany({
    position: "absolute",
    left: "0",
    bottom: `11px`,
    pointerEvents: "none",
    width: `${Math.ceil(w)}px`,
    height: `${preset.amplitude + preset.baselineOffset + 2}px`,
    overflow: "hidden",

    display: "grid",
    placeItems: "center",
  });

  box.append(svgHTML);
}