import { CssManager, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId } from "../../../utils/makers";
import { mulberry32 } from "../../../utils/rng";
import { CLOUD_LAYER_BASE_CSS } from "../../phases/logo-splash-2/splash.css";
import { $COL, _bckRGB, _setBckgdAlpha } from "../../consts/colors.consts";
import { CLOUD_TILE_W, CLOUD_DURnum } from "../../phases/logo-splash-2/splash.consts";


const FADE_SOLID_PCT = 0;    // solid mask until here
const FADE_MID_PCT = 10;      // start thinning here
const FADE_MID_ALPHA = 0.65;  // how strong mid-fade is
const fade = `linear-gradient(to top,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,1) ${FADE_SOLID_PCT}%,
  ${$COL._bckgd} ${FADE_MID_PCT}%,
  ${$COL._bckgd} 100%
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
  alpha: number;   // currently unused 
  blur?: number;
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


export function create_clouds(tree: LiveTree, tune?: Partial<CloudTune>): LiveTree {
  const t: CloudTune = {
    layers: 15,
    seed: 1919,

    // NOTE: alpha values not used inside SVG anymore (mask-only),
    // but keeping them in tune is fine.
    alphaTop: 0.04,
    alphaBottom: 0.12,

    blurTop: 1,
    blurBottom: 0,

    w: CLOUD_TILE_W,     // IMPORTANT: should equal CLOUD_TILE_W
    h: 220,

    circlesMin: 22,
    circlesMax: 34,
    ...tune,
  };

  const wrapper = makeDivId(tree, "cloud-wrapper");

  for (let i = 0; i < t.layers; i++) {
    const u = i / Math.max(1, t.layers - 1);
    const seed = (t.seed ^ (i * 0x9e3779b9)) >>> 0;
    // CHANGED: keep band placement in 0..100 range (percent)
    const yBandPct = lerp(15, 95, u);
    const ySpreadPct = lerp(16, 34, u);

    const circles = Math.round(lerp(80, 140, 1 - u));
    const blur = lerp(t.blurTop, t.blurBottom, u);

    const bg = make_cloud_svg_data_uri({
      seed,
      w: t.w,
      h: t.h,
      circles,
      yBandPct,
      ySpreadPct,
      rMin: lerp(10, 18, u),
      rMax: lerp(28, 52, u),
      alpha: 1, // mask-only
      blur,
    });

    const layer = makeDivClass(wrapper, ["cloud-layer", `cloud-${i}`]);

    // CHANGED: deterministic phase per layer; var lives on parent
    const phasePx = Math.round(mulberry32(seed)() * t.w);
    layer.css.set.var("--cloud-phase-px", `${phasePx}px`);

    // CHANGED: expose per-layer max opacity to mount_splash (hyphen key)
    // (bottom stronger, top weaker)
    const maxAlpha = lerp(0.02, 0.28, u);
    // per-layer static strength (you already compute this)
    layer.data.set("cloud-max", maxAlpha.toFixed(3));
    layer.css.setMany({
      "--layer-max": maxAlpha.toFixed(3),
      "--layer-fade": "1",
      /*  *ONLY SET OPACITY HERE* */
      opacity: "calc(var(--layer-max) * var(--layer-fade))",


      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: String(35 + i),
      willChange: "opacity, bottom",
    });

    const cloudDropPct = 25;

    // Child does the mask scud and holds the “ink” color
    const paintIxClass = `cloud-paint-${i}`;
    const paint = makeDivClass(layer, paintIxClass)
    paint.css.setMany({
      position: "absolute",
      inset: "0",
      height: `${100 + cloudDropPct}%`,
      backgroundColor: $COL._bckgd,
      transform: `translateY(${cloudDropPct}%)`,
      backgroundImage: [
        `linear-gradient(${$COL._bckgd}, ${$COL._bckgd})`,
        `linear-gradient(` +
        `to top, ` +
        `rgba(${_bckRGB.r}, ${_bckRGB.g}, ${_bckRGB.b}, calc(0.00 + 0.10 * var(--sun-kiss))) 0%, ` +
        `rgba(${_bckRGB.r}, ${_bckRGB.g}, ${_bckRGB.b}, calc(0.00 + 0.06 * var(--sun-kiss))) 55%, ` +
        `rgba(${_bckRGB.r}, ${_bckRGB.g}, ${_bckRGB.b},  0) 100%` +
        `)`,
      ].join(", "),
      mixBlendMode: "normal",
      filter: "none",
      willChange: "mask-position, -webkit-mask-position",
    });

    // Work around WebKit-prefixed mask properties being canonicalized incorrectly
    // by pushing the mask declarations through raw global CSS text.
    const cssgl = CssManager.globals.invoke()
    cssgl.sel(`.${paintIxClass}`)
      .setMany({
        maskImage: `${bg}, ${fade}`,
        WebkitMaskImage: `${bg}, ${fade}`,

        maskRepeat: "repeat-x, no-repeat",
        WebkitMaskRepeat: "repeat-x, no-repeat",

        maskPosition: "var(--cloud-phase-px) 100%, 0px 100%",
        WebkitMaskPosition: "var(--cloud-phase-px) 100%, 0px 100%",

        maskSize: `${t.w}px 100%, 100% 100%`,
        WebkitMaskSize: `${t.w}px 100%, 100% 100%`,

        // NOTE: these are “weird” across engines; keep exactly what worked.
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      });

    const far = 1 - u;

    // easeOut-ish curve (adjust exponent 1.6–3.0)
    const curved = Math.pow(far, 1.2);
    const perLayerBase = 1 / t.layers;               // keeps total energy sane
    const gain = 2.8;                               // tune
    const opacity = Math.min(1, perLayerBase * gain * (0.35 + 0.65 * curved));

    const slowMul = 1.1;
    const fastMul = .01;
    const mul = fastMul + (slowMul - fastMul) * curved;

    const bandDurationMs = Math.round(CLOUD_DURnum * mul);
    // layer.css.set.opacity(opacity.toFixed(3));
    cssgl.sel(`.${paintIxClass}`)
      .setMany({
        animationName: "cloud-band-loop",
        animationDuration: `${bandDurationMs}ms`,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        animationFillMode: "both",
        animationDelay: "0s",
      });

    // OPTIONAL: if you want easy access later
    paint.data?.set?.("is-cloud-paint", "1"); // only if you have data on all nodes
  }

  return wrapper;
}
