import type { LiveTree } from "hson-live";
import { makeDivClass, makeDivId } from "../../../utils/makers";
import { mulberry32 } from "../../../utils/rng";
import { CLOUD_LAYER_BASE_CSS } from "../../phases/logo-splash-2/splash.css";
import { $COL } from "../../consts/colors.consts";
import { CLOUD_TILE_W } from "../../phases/logo-splash-2/splash.anim-keys";

// const CLOUD_PX_PER_SEC = 220; // push this hard for debugging
// const cloudDurSec = Math.max(3, CLOUD_TILE_W / CLOUD_PX_PER_SEC);
// const cloudtimeStr = `${cloudDurSec.toFixed(2)}s`;

const BASE_BOTTOM_PCT = -20;   // where the lowest cloud band sits
const STEP_BOTTOM_PCT = 10;    // vertical separation between bands

const FADE_SOLID_PCT = 72;    // solid mask until here
const FADE_MID_PCT = 86;      // start thinning here
const FADE_MID_ALPHA = 0.65;  // how strong mid-fade is
const fade = `linear-gradient(to top,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,1) ${FADE_SOLID_PCT}%,
  rgba(255,255,255,${FADE_MID_ALPHA}) ${FADE_MID_PCT}%,
  rgba(255,255,255,0) 100%
)`;
export type CloudSvgOpts = {
  seed: number;
  w: number;
  h: number;
  circles: number;
  yBandPct: number;
  ySpreadPct: number;
  rMin: number;
  rMax: number;
  alpha: number;   // currently unused for mask-only; keep if you want later
  blur?: number;
  // ADDED:
  fillBelowPct?: number;
};

export function make_cloud_svg_data_uri(o: CloudSvgOpts): string {
  const rnd = mulberry32(o.seed);

  const w = o.w;
  const h = o.h;
  const BLEED_PX = 2;
  const wBleed = w + BLEED_PX;
  const xMin = -BLEED_PX / 2;

  const yMid = (o.yBandPct / 100) * h;
  const ySpan = (o.ySpreadPct / 100) * h;
  const blur = o.blur ?? 0;

  const filter = `
  <filter id="cloud" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur.toFixed(2)}" result="b"/>
    <feColorMatrix in="b" type="matrix"
      values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 35 -12
      " result="t"/>
    <feComposite in="t" in2="t" operator="over"/>
  </filter>
`;

  // CHANGED: mask-only clouds (white = coverage)
  let circles = "";
  for (let i = 0; i < o.circles; i++) {
    const r = o.rMin + rnd() * (o.rMax - o.rMin);
    const x = xMin + rnd() * (wBleed + r * 2) - r;
    const y = yMid + (rnd() - 0.5) * ySpan;
    circles += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="white"/>`;
  }

  // ADDED: solid slab fill under the cloud line
  // Default start: a little above the band so you don’t get a thin “gap” under some silhouettes.
  // ADDED: solid slab fill under the cloud line
  // CHANGED: derive from band geometry instead of a percent knob.
  const bulkRadius = o.rMin + 0.55 * (o.rMax - o.rMin);     // “typical” circle size
  const fillStartY =
    Math.min(
      h,
      Math.max(
        0,
        // start just below the densest part of the band
        (yMid + ySpan * 0.25) - bulkRadius * 0.20
      )
    );

  const slab = `<rect x="${xMin}" y="${fillStartY.toFixed(2)}" width="${wBleed}" height="${(h - fillStartY).toFixed(2)}" fill="white"/>`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${wBleed}" height="${h}"
     viewBox="${xMin} 0 ${wBleed} ${h}"
     preserveAspectRatio="none">  <!-- CHANGED: avoid aspect surprises -->
  ${filter}
  <g filter="url(#cloud)">
    ${circles}
    ${slab}  <!-- CHANGED: use slab var, don’t re-inline a second rect -->
  </g>
</svg>`;

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `url("data:image/svg+xml,${encoded}")`;
}

type CloudTune = {
  layers: number;           // e.g. 5
  seed: number;             // base seed
  // darker at bottom; lighter at top
  alphaTop: number;         // e.g. 0.12
  alphaBottom: number;      // e.g. 0.55
  blurTop: number;          // e.g. 0.4
  blurBottom: number;       // e.g. 1.3
  // geometry
  w: number;                // svg viewbox width, e.g. 900
  h: number;                // svg viewbox height, e.g. 340
  circlesMin: number;       // e.g. 22
  circlesMax: number;       // e.g. 34
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Tiny deterministic hash -> [0,1)
const hash01 = (n: number): number => {
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

// 1D value noise: smooth between hashed lattice points.
const noise1d = (x: number, period: number, seed: number): number => {
  // x in pixels; period in pixels
  const t = x / period;
  const i0 = Math.floor(t);
  const f = t - i0;

  const a = hash01(i0 + seed * 1013);
  const b = hash01(i0 + 1 + seed * 1013);

  // smoothstep (cubic)
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u); // [0,1]
};

export function create_cloud_river(
  tree: LiveTree,
  tune?: Partial<CloudTune>
): LiveTree {
  console.log('create cloud river')
  const t: CloudTune = {
    layers: 15,
    seed: 1919,
    alphaTop: 0.04,
    alphaBottom: 0.12,
    blurTop: 0/* 0.45 */,
    blurBottom: 0/* 1.25 */,
    w: 900,
    h: 220,
    circlesMin: 22,
    circlesMax: 34,
    ...tune,
  };

  const layers: LiveTree = makeDivId(tree, 'cloud-layer');
  for (let i = 0; i < t.layers; i++) {
    const u = i / Math.max(1, t.layers - 1);

    const seed = (t.seed ^ (i * 0x9e3779b9)) >>> 0;
   
    const circles = Math.round(lerp(80, 140, 1 - u)); // fewer than 200–270; looks cleaner

    const alpha = lerp(t.alphaTop, t.alphaBottom, u);
    const maxAlpha = lerp(0.22, 0.08, u); // bottom=0.22, top=0.08

    const blur = lerp(t.blurTop, t.blurBottom, u);
    // CHANGED: top layer much higher; bottom layer much lower
    const yBandPct = lerp(18, 88, u);

    // CHANGED: thickness can still grow downward
    const ySpreadPct = lerp(16, 34, u);

    // OPTIONAL: if you keep fillBelowPct at all, make it track the band
    const fillBelowPct = yBandPct + lerp(2, 6, u);
    const bg = make_cloud_svg_data_uri({
      seed,
      w: t.w,
      h: t.h,
      circles,
      yBandPct,
      ySpreadPct,      // thickness
      rMin: lerp(10, 18, u),
      rMax: lerp(28, 52, u),
      alpha,
      blur,
      fillBelowPct
    });
    const layer = makeDivClass(layers, ["cloud-layer", `cloud-${i}`]);
    const phasePx = Math.round(mulberry32(seed)() * t.w);
    layer.css.setMany(CLOUD_LAYER_BASE_CSS);
    const baseOpacity = lerp(0.10, 0.22, u).toFixed(3);

    layer.css.setMany({
      "--cloud_phase_px": `${phasePx}px`,
      // vertical stacking
      bottom: "0%",
      height: "100%",
      left: "0",
      width: "100%",
      zIndex: String(35 + i),
      // per-layer max strength
      "--cloud_max": maxAlpha.toFixed(3),

      // start hidden; fade anim will drive this
      "--cloud_fade": "0",
      opacity: baseOpacity,

      backgroundColor: $COL._bckgd,

      maskImage: bg,
      WebkitMaskImage: bg,

      maskRepeat: "repeat-x",
      WebkitMaskRepeat: "repeat-x",

      maskPosition: "var(--cloud_phase_px) 100%",
      WebkitMaskPosition: "var(--cloud_phase_px) 100%",

      maskSize: `${t.w}px 100%`,
      WebkitMaskSize: `${t.w}px 100%`,

      backgroundImage: "none",
      backgroundRepeat: "no-repeat",
      backgroundSize: "auto",
      backgroundPosition: "0% 0%",
      // ---- MASK COMPOSITION ----
      // 1) SVG silhouette
      // 2) vertical fade

      // intersect the two masks
      // maskComposite: "intersect",
      // WebkitMaskComposite: "source-in",

      // eliminate color surprises
      mixBlendMode: "normal",
      filter: "none",
    });
  }
  return layers;
}