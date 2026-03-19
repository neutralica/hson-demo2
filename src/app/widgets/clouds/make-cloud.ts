import { CssManager, type LiveTree } from "hson-live";
import { mk_div_cls, mk_div_id } from "../../utils/makers";
import { CLOUD_LAYER_BASE_CSS } from "../../phases/phase-2-splash/splash.css";
import { CLOUD_TILE_W, CLOUD_DURnum, CLOUD_BAND_LOOPstr, CLOUD_SUN_KISSstr } from "../../phases/phase-2-splash/splash.consts";
import { _hash01, _lerp } from "../../utils/helpers";
import { make_rng } from "../../utils/rng";
import { $cols_, bckRGB } from "../../core/consts/colors.consts";


const FADE_SOLID_PCT = 0;    // solid mask until here
const FADE_MID_PCT = 10;      // start thinning here
const fade = `linear-gradient(to top,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,1) ${FADE_SOLID_PCT}%,
  ${$cols_.bckgd} ${FADE_MID_PCT}%,
  ${$cols_.bckgd} 100%
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
  const rnd = make_rng(o.seed);

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

  // mask-only clouds (white = coverage)
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
  // derive from band geometry instead of a percent knob.
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
     preserveAspectRatio="none">  <!-- avoid aspect surprises -->
  ${filter}
  <g filter="url(#cloud)">
    ${circles}
    ${slab}  <!--  use slab var, don’t re-inline a second rect -->
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

  const wrapper = mk_div_id(tree, "cloud-wrapper");

  for (let i = 0; i < t.layers; i++) {
    const u = i / Math.max(1, t.layers - 1);
    const seed = (t.seed ^ (i * 0x9e3779b9)) >>> 0;
    // keep band placement in 0..100 range (percent)
    const yBandPct = _lerp(15, 95, u);
    const ySpreadPct = _lerp(16, 34, u);

    const circles = Math.round(_lerp(80, 140, 1 - u));
    const blur = _lerp(t.blurTop, t.blurBottom, u);

    const bg = make_cloud_svg_data_uri({
      seed,
      w: t.w,
      h: t.h,
      circles,
      yBandPct,
      ySpreadPct,
      rMin: _lerp(10, 18, u),
      rMax: _lerp(28, 52, u),
      alpha: 1, // mask-only
      blur,
    });

    const layer = mk_div_cls(wrapper, ["cloud-layer", `cloud-${i}`]);

    // deterministic phase per layer; var lives on parent
    const phasePx = Math.round(make_rng(seed)() * t.w);
    layer.css.set.var("--cloud-phase-px", `${phasePx}px`);

    // expose per-layer max opacity to mount_splash (hyphen key)
    // (bottom stronger, top weaker)
    const maxAlpha = _lerp(0.02, 0.28, u);
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
    const paint = mk_div_cls(layer, paintIxClass)
    paint.css.setMany({
      position: "absolute",
      inset: "0",
      height: `${100 + cloudDropPct}%`,
      transform: `translateY(${cloudDropPct}%)`,
      backgroundImage: [
        `linear-gradient(rgba(12, 19, 26, var(--kiss)), rgba(215, 215, 215,var(--kiss)))`,
        `linear-gradient(to bottom,
     rgba(${bckRGB.r}, ${bckRGB.g}, ${bckRGB.b}, 1) 0%,
     rgba(${bckRGB.r}, ${bckRGB.g}, ${bckRGB.b}, 1) 55%,
     rgba(${bckRGB.r}, ${bckRGB.g}, ${bckRGB.b}, 1) 100%)`,
      ].join(", "),
      mixBlendMode: "normal",
      filter: "none",
      willChange: "mask-position, -webkit-mask-position, opacity, bottom",
      
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

    cssgl.sel(`.${paintIxClass}`)
      .setMany({
        animationName: `${CLOUD_BAND_LOOPstr}, ${CLOUD_SUN_KISSstr}`,
        animationDuration: `${CLOUD_DURnum}ms, ${CLOUD_DURnum}ms`,
        animationTimingFunction: "linear, linear",
        animationIterationCount: "infinite, 1",
        animationFillMode: "both, both",
        animationDelay: "0s, 0s",
      });
    paint.css.setMany({ backgroundColor: `rgba(255,0,255,var(--kiss))` });
    // OPTIONAL: if you want easy access later
    paint.data?.set?.("is-cloud-paint", "1"); // only if you have data on all nodes
  }

  return wrapper;
}
