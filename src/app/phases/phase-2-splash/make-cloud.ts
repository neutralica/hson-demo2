import { CssManager, type LiveTree } from "hson-live";
import { mk_div_cls, mk_div_id } from "../../utils/makers";
import { CLOUD_TILE_W, CLOUD_DURnum, CLOUD_BAND_LOOPstr, CLOUD_SUN_KISSstr } from "./splash.consts";
import { _hash01, _lerp } from "../../utils/helpers";
import { make_rng } from "../../utils/rng";
import { _colors } from "../../core/consts/colors.consts";


export type CloudSvgOpts = {
  seed: number;
  w: number;
  h: number;
  circles: number;
  yBandPct: number;
  ySpreadPct: number;
  rMin: number;
  rMax: number;
  alpha: number;
  blur?: number;
  fillBelowPct?: number;
};

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

const FADE_SOLID_PCT = 0;    // solid mask until here
const FADE_MID_PCT = 90;      // start thinning here
const fade = `linear-gradient(to top,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,1) ${FADE_SOLID_PCT}%,
  oklch(0.1303 0.0073 285.34) ${FADE_MID_PCT}%,
  oklch(0.1303 0.0073 285.34) 100%
)`;

const CLOUD_INK_TOP = "7, 7, 10";
const CLOUD_SINK_DUR_MS = Math.round(CLOUD_DURnum * 0.92);

function cloudSinkName(layerIndex: number): string {
  return `hson-cloud-sink-${layerIndex}`;
}


function svgAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function svgDataUri(svgMarkup: string): string {
  const encoded = encodeURIComponent(svgMarkup)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `url("data:image/svg+xml,${encoded}")`;
}

export function make_cloud_svg_data_uri(o: CloudSvgOpts): string {
  const rnd = make_rng(o.seed);

  const w = o.w;
  const h = o.h;
  const BLEED_PX = 2;
  const TOP_BLEED_PX = 84;
  const wBleed = w + BLEED_PX;
  const hBleed = h + TOP_BLEED_PX;
  const xMin = -BLEED_PX / 2;
  const yMin = -TOP_BLEED_PX;

  const yMid = (o.yBandPct / 100) * h;
  const ySpan = (o.ySpreadPct / 100) * h;
  const blur = o.blur ?? 0;
  const circles: string[] = [];

  for (let i = 0; i < o.circles; i += 1) {
    const r = o.rMin + rnd() * (o.rMax - o.rMin);
    const x = xMin + rnd() * (wBleed + r * 2) - r;
    const y = yMid + (rnd() - 0.5) * ySpan;

    const circleMarkup = (cx: number): string =>
      `<circle cx="${svgAttr(cx.toFixed(2))}" cy="${svgAttr(y.toFixed(2))}" r="${svgAttr(r.toFixed(2))}" fill="white"/>`;

    circles.push(circleMarkup(x));

    if (x - r < xMin) circles.push(circleMarkup(x + wBleed));
    if (x + r > xMin + wBleed) circles.push(circleMarkup(x - wBleed));
  }

  const bulkRadius = o.rMin + 0.55 * (o.rMax - o.rMin);
  const fillStartY = Math.min(
    h,
    Math.max(
      0,
      (yMid + ySpan * 0.25) - bulkRadius * 0.20,
    ),
  );

  const slab = `<rect x="${svgAttr(xMin.toFixed(2))}" y="${svgAttr(fillStartY.toFixed(2))}" width="${svgAttr(wBleed)}" height="${svgAttr((h - fillStartY).toFixed(2))}" fill="white"/>`;

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgAttr(wBleed)}" height="${svgAttr(h)}" viewBox="${svgAttr(`${xMin} ${yMin} ${wBleed} ${hBleed}`)}" preserveAspectRatio="none">
<defs>
  <filter id="cloud" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${svgAttr(blur.toFixed(2))}" result="b"/>
    <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -12" result="t"/>
    <feComposite in="t" in2="t" operator="over"/>
  </filter>
</defs>
<g filter="url(#cloud)">
${circles.join("\n")}
${slab}
</g>
</svg>`;

  return svgDataUri(svgMarkup);
}

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
    // Perspective distribution: far/high rows are compressed and smaller;
    // near/low rows are larger and spaced farther apart.
    const depth = Math.pow(u, 2.55);
    const scaleDepth = Math.pow(u, 2.10);
    const yBandPct = _lerp(4, 94, depth);
    const ySpreadPct = _lerp(24, 84, scaleDepth);
    const circles = Math.round(_lerp(212, 60, scaleDepth));
    const blur = _lerp(t.blurTop, t.blurBottom, u);

    const seed = (t.seed ^ (i * 0x9e3779b9)) >>> 0;

    const bg = make_cloud_svg_data_uri({
      seed,
      w: t.w,
      h: t.h,
      circles,
      yBandPct,
      ySpreadPct,
      rMin: _lerp(3, 44, scaleDepth),
      rMax: _lerp(9, 128, scaleDepth),
      alpha: 1, // mask-only
      blur,
    });

    const layer = mk_div_cls(wrapper, ["cloud-layer", `cloud-${i}`]);

    // deterministic phase per layer; var lives on parent
    const phasePx = Math.round(make_rng(seed)() * t.w);
    layer.css.set.var("--cloud-phase-px", `${phasePx}px`);

    // expose per-layer max opacity to mount_splash (hyphen key)
    // bottom-weighted: keep upper sky thin, make the lower cloud bank broodier.
    const density = Math.pow(u, 1.95);
    const maxAlpha = _lerp(0.008, 0.72, density);
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

    const cloudDropPct = _lerp(0, 12, Math.pow(u, 1.35));

    // Child does the mask scud and holds the “ink” color
    const paintIxClass = `cloud-paint-${i}`;
    const paint = mk_div_cls(layer, paintIxClass);

    paint.css.setMany({
      // "--kiss": "0",
      "--cloud-ink-alpha": "calc(1 - calc(var(--kiss, 0)))",
      position: "absolute",
      inset: "0",
      height: `${100 + cloudDropPct}%`,
      transform: `translateY(${cloudDropPct}%)`,
      backgroundImage:
        `linear-gradient(to bottom,
      rgba(210, 229, 255, calc(var(--kiss, 0) * 0.68)) 0%,
      rgba(210, 229, 255, calc(var(--kiss, 0) * 0.34)) 18%,
      rgba(210, 229, 255, calc(var(--kiss, 0) * 0.19)) 42%,
      rgba(210, 229, 255, calc(var(--kiss, 0) * 0.09)) 68%,
      rgb(7, 7, 10, 0) 100%
    ),
        linear-gradient(to bottom,
    rgba(${CLOUD_INK_TOP}, calc(var(--cloud-ink-alpha, 1) * 0.5)) 1%,
    rgba(${CLOUD_INK_TOP}, var(--cloud-ink-alpha, 1)) 100%
  )`,
      mixBlendMode: "normal",
      filter: "none",
      willChange: "mask-position, -webkit-mask-position, opacity, bottom",
    });

    // Work around WebKit-prefixed mask properties being canonicalized incorrectly
    // by pushing the mask declarations through raw global CSS text.
    const gcss = CssManager.api();
    gcss.sel(`.${paintIxClass}`)
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

    const sinkName = cloudSinkName(i);
    const fadeDepth = Math.pow(u, 1.75);
    const sinkDelayMs = 1000;//Math.round(_lerp(0, 110, u));
    const fadeHoldPct = Math.round(_lerp(0, 7, u));
    const midFade = _lerp(0.000, 0.18, fadeDepth).toFixed(3);
    const lateFade = _lerp(0.000, 0.025, fadeDepth).toFixed(3);
    const sinkOpacityDurMs = Math.round(CLOUD_SINK_DUR_MS * _lerp(0.16, 0.50, u));
    const sinkPx = Math.round(_lerp(106, 28, Math.pow(u, 0.70)));
    const sinkMotionDurMs = Math.round(sinkOpacityDurMs * 1.56);
    const bandLoopDurMs = Math.round(CLOUD_DURnum * _lerp(1.85, 0.58, Math.pow(u, 0.85)));
    const sinkOpacityName = `${sinkName}-opacity`;
    const sinkMotionName = `${sinkName}-motion`;

    gcss.keyframes.set({
      name: sinkOpacityName,
      source: "global",
      steps: {
        "0%": { opacity: "calc(var(--layer-max) * var(--layer-fade))" },
        [`${fadeHoldPct}%`]: { opacity: "calc(var(--layer-max) * var(--layer-fade))" },
        "46%": { opacity: `calc(var(--layer-max) * var(--layer-fade) * ${midFade})` },
        "72%": { opacity: `calc(var(--layer-max) * var(--layer-fade) * ${lateFade})` },
        "100%": { opacity: "0" },
      }
    });

    gcss.keyframes.set({
      name: sinkMotionName,
      source: "global",
      steps: {
        "0%": { transform: `translateY(${cloudDropPct}%)` },
        "100%": { transform: `translateY(calc(${cloudDropPct}% + (${sinkPx}px )))` },
      }
    });

    gcss.sel(`.cloud-${i}`)
      .setMany({
        animationName: sinkOpacityName,
        animationDuration: `${sinkOpacityDurMs}ms`,
        animationTimingFunction: "linear",
        animationIterationCount: "1",
        animationFillMode: "forwards",
        animationDelay: `${sinkDelayMs}ms`,
      });

    gcss.sel(`.${paintIxClass}`)
      .setMany({
        animationName: `${CLOUD_BAND_LOOPstr}, ${CLOUD_SUN_KISSstr}, ${sinkMotionName}`,
        animationDuration: `${bandLoopDurMs}ms, ${CLOUD_DURnum}ms, ${sinkMotionDurMs}ms`,
        animationTimingFunction: "linear, linear, linear",
        animationIterationCount: "infinite, 1, 1",
        animationFillMode: "both, both, forwards",
        animationDelay: `0s, 0s, ${sinkDelayMs}ms`,
      });
    // paint.css.setMany({ backgroundColor: `rgba(255,0,255,var(--kiss))` });

    paint.data?.set?.("is-cloud-paint", "1"); // only if data on all nodes


  }

  return wrapper;
}
