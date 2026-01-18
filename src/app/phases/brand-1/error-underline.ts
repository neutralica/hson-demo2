// error-underline.ts

import { hson, type LiveTree } from "hson-live";

export const ERROR_UNDERLINE_PRESET = {
  amplitude: 6,
  step: 6,
  baselineOffset: 2,
  strokeWidth: 1.5,
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

function makeSvgErrUnderline(opts: {
  width: number;
  amplitude: number;
  step: number;
  baselineOffset: number;
  stroke: string;
  strokeWidth: number;
  pad?: number;
}): string {
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

  // IMPORTANT: keep IDs super boring: letters + digits only
  const clipId = `errClip${Math.floor(Math.random() * 1e9)}`;

  const clipY = pad;
  const clipH = Math.max(1, h - pad * 2);

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${w}" height="${h}"
     viewBox="0 0 ${w} ${h}"
     overflow="hidden"
     aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">
      <rect x="0" y="${clipY + 2}" width="${w}" height="${clipH - 2}" />
    </clipPath>
  </defs>

  <path d="${d}"
        clip-path="url(#${clipId})"
        fill="none"
        stroke="${opts.stroke}"
        stroke-width="${opts.strokeWidth}"
        vector-effect="non-scaling-stroke"
        stroke-linejoin="miter"
        stroke-linecap="butt" />
</svg>`.trim();
}

export function attach_error_underline(host: LiveTree, preset = ERROR_UNDERLINE_PRESET): void {
  // ensure host is positioning context
  // host.css.set.position("relative");

  const el = host.asDomElement() as HTMLElement;
  const w = Math.ceil(el.getBoundingClientRect().width);
  const svgHTML = makeSvgErrUnderline({
    width: w,
    ...preset,
  });
  const svgBranch = hson.fromTrustedHtml(svgHTML).liveTree().asBranch();

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

  box.append(svgBranch);
}
function calcZigzagPathSegmented(opts: {
  x0?: number;
  x1: number;
  baselineY: number;
  amplitude: number;
  step: number;
  trim: number; // px shaved off near corners (try 0.75–1.5)
}): string {
  const x0 = opts.x0 ?? 0;
  const x1 = Math.max(x0 + 1, opts.x1);
  const y0 = opts.baselineY;
  const a = Math.max(0.5, opts.amplitude);
  const s = Math.max(2, opts.step);
  const trim = Math.max(0, opts.trim);

  // --- 1) raw zigzag points ---
  const pts: Array<{ x: number; y: number }> = [];
  let x = x0;
  let up = true;
  pts.push({ x, y: y0 });

  while (x < x1) {
    x = Math.min(x + s, x1);
    pts.push({ x, y: up ? (y0 - a) : y0 });
    up = !up;
  }

  // drop back to baseline if we ended on a peak
  const last = pts[pts.length - 1]!;
  if (last.y !== y0) pts.push({ x: last.x, y: y0 });

  if (pts.length < 2) return `M ${x0} ${y0}`;

  // --- 2) emit independent trimmed segments ---
  let d = "";

  for (let i = 0; i < pts.length - 1; i += 1) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    // don’t trim the very start/end so we don’t “float” off the bounds
    const t0 = (i === 0) ? 0 : Math.min(trim, len * 0.45);
    const t1 = (i === pts.length - 2) ? 0 : Math.min(trim, len * 0.45);

    const sx = p.x + ux * t0;
    const sy = p.y + uy * t0;
    const ex = q.x - ux * t1;
    const ey = q.y - uy * t1;

    // skip degenerate segments
    if (Math.hypot(ex - sx, ey - sy) < 0.25) continue;

    d += `M ${sx} ${sy} L ${ex} ${ey} `;
  }

  return d.trim();
}