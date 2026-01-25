// stipple.system.ts
import type { LiveTree } from "hson-live";
import { mulberry32 } from "../../../utils/rng";
import type { KeyframesInput } from "hson-live/types";

/************************
 *  abandoned for now  *
 ************************/


// ============================
// 1) Single tuning object
// ============================

type StippleTune = {
  seed: number;

  planes: {
    count: number;          // <-- change this, get N planes
    opacityMaster: number;  // overall multiplier
    insetPct: number;       // overscan so edges never reveal during drift/rot
    pointerEvents: "none";
    blendMode?: string;     // e.g. "screen" | "overlay" | "soft-light" | "normal"
  };

  // Dot field generation (per plane)
  dots: {
    tileMinPx: number;      // median tile size range (w/h picked independently)
    tileMaxPx: number;

    // where inside the tile the dot center can land
    centerPadPx: number;    // keep away from tile edges to avoid clipping
    radiusMinPx: number;    // solid core radius
    radiusMaxPx: number;
    featherMinPx: number;   // fade thickness
    featherMaxPx: number;

    // Color model (generated, not picked from palette)
    satMin: number;         // 0..1
    satMax: number;
    litMin: number;         // 0..1
    litMax: number;
    hueAnchors: readonly number[]; // 0..360

    // Contrast / exposure-ish control
    alphaMin: number;       // 0..1
    alphaMax: number;

    // Complement behavior
    complementChance: number; // 0..1 (chance hue is shifted ~180)
    hueJitterDeg: number;     // +/- jitter around base hue (0..180)
    sparkleChance: number;   // 0..1
    sparkleLightBoost: number; // +0..100 (clamped)
    sparkleAlphaBoost: number; // +0..1 (clamped)
  };

  motion: {
    // Drift (seamless): we move by k * tileSize for each plane.
    // Larger k => more travel per loop.
    tileStepsMin: number;
    tileStepsMax: number;

    // Direction range (degrees). If you want “mostly left”, keep near 180.
    dirCenterDeg: number;
    dirSpreadDeg: number;

    // Speed control: per plane duration range (seconds)
    durMinS: number;
    durMaxS: number;

    // Rotation control (separate animation on wrapper)
    rotEnabled: boolean;
    rotDurMinS: number;
    rotDurMaxS: number;
    rotSpanDeg: number; // +/- around 0 (each plane gets its own span)
    scale: number;      // slight scale to hide rotation corners
  };
};

// Edit *only* this object most of the time.
export const STIPPLE_TUNE: StippleTune = {
  seed: 1919,

  planes: {
    count: 10,
    opacityMaster: 1,
    insetPct: 52,
    pointerEvents: "none",
    blendMode: "screen",
  },

  dots: {
    tileMinPx: 50,
    tileMaxPx: 260,

    centerPadPx: 6,

    satMin: 0.88,
    satMax: 100,
    litMin: 0.82,
    litMax: 1,
    alphaMin: 0.68,
    alphaMax: 0.99,

    radiusMinPx: 0.8,
    radiusMaxPx: 3.4,
    featherMinPx: 1.0,
    featherMaxPx: 2.0,
    complementChance: 1,
    hueAnchors: [195, 305, 120, 35] as const, // cyan/blue, magenta, green, amber
    hueJitterDeg: 14,

    sparkleChance: 0.9,
    sparkleLightBoost: 100,
    sparkleAlphaBoost: 0.9,
  },

  motion: {
    tileStepsMin: 6,
    tileStepsMax: 14,

    dirCenterDeg: 90,
    dirSpreadDeg: 0,

    durMinS: 120,
    durMaxS: 280,

    rotEnabled: true,
    rotDurMinS: 220,
    rotDurMaxS: 520,
    rotSpanDeg: 0,
    scale: 1.06,
  },
};

// ============================
// 2) Public API: one call
// ============================

/**
 * Creates a stipple system under `host`.
 * Returns the container node (so you can keep a handle if you want).
 *
 * Callsite stays clean:
 *   create_stipple(screenFx);
 */
export function create_stipple(host: LiveTree, patch?: Partial<StippleTune>): LiveTree {
  // CHANGED: patch merge; if patch is undefined this is still fine.
  const t: StippleTune = { ...STIPPLE_TUNE, ...patch };

  ensure_stipple_keyframes(host, t);

  const container = host.create.div();
  container.id.set("stipple-system");
  container.classlist.add("stipple-system");

  container.css.setMany({
    position: "absolute",
    inset: "0",
    pointerEvents: t.planes.pointerEvents,
    overflow: "hidden",
    // keep it in its own paint box; reduces weird stacking surprises
    isolation: "isolate",
  });

  const rnd = mulberry32(t.seed);
  const n = Math.max(1, Math.floor(t.planes.count));

  for (let i = 0; i < n; i++) {
    const plane = build_plane(container, t, rnd, i);
    // no-op: plane already appended by builder
    void plane;
  }

  return container;
}

// ============================
// 3) Keyframes registration
// ============================

function ensure_stipple_keyframes(host: LiveTree, t: StippleTune): void {
  // CHANGED: register a single “rotate wrapper” keyframes.
  // Drift keyframes are per-plane because each plane needs different end positions.
  // We register drift keyframes in build_plane() where we know the end positions.

  if (!t.motion.rotEnabled) return;

  // If your keyframe manager has `.has()`, use it; otherwise `.set()` is usually idempotent.
  const kf: KeyframesInput = {
    name: "stipple_rot_slow",
    steps: {
      "0%": { transform: `rotate(0deg) scale(${t.motion.scale})` },
      "100%": { transform: `rotate(360deg) scale(${t.motion.scale})` },
    },
  } as const;

  host.css.keyframes.set(kf);
}

// ============================
// 4) Plane builder (procedural)
// ============================

function build_plane(parent: LiveTree, t: StippleTune, rnd: () => number, ix: number): LiveTree {
  const inset = `${t.planes.insetPct}%`;

  // Wrapper: rotates (transform-only)
  const wrap = parent.create.div();
  wrap.classlist.add("stipple-wrap");
  wrap.data.set("role", `stipple-wrap-${ix}`);

  wrap.css.setMany({
    position: "absolute",
    inset: `-${inset}`,
    pointerEvents: "none",
    willChange: "transform",
    transformOrigin: "50% 50%",
    // optional: helps blend multiple planes visually
    mixBlendMode: t.planes.blendMode ?? "normal",
    opacity: 1,
  });

  // Plane: drifts (background-position-only)
  const plane = wrap.create.div();
  plane.classlist.add("stipple-plane");
  plane.data.set("role", `stipple-plane-${ix}`);

  plane.css.setMany({
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    willChange: "background-position",
    opacity: `${clamp01(t.planes.opacityMaster * plane_opacity(rnd, t, ix))}`, // keep master here

  });

  // --- generate tile size ---
  const tileW = rand_int(rnd, t.dots.tileMinPx, t.dots.tileMaxPx);
  const tileH = rand_int(rnd, t.dots.tileMinPx, t.dots.tileMaxPx);

  // --- generate dot center & radii ---
  const pad = Math.max(0, t.dots.centerPadPx);
  const cx = rand_int(rnd, pad, Math.max(pad, tileW - pad));
  const cy = rand_int(rnd, pad, Math.max(pad, tileH - pad));

  const coreR = rand_float(rnd, t.dots.radiusMinPx, t.dots.radiusMaxPx);
  const feather = rand_float(rnd, t.dots.featherMinPx, t.dots.featherMaxPx);

  // --- generate color (HSL + complementary) ---

  // --- build gradient string (single dot per tile, repeated) ---
  // NOTE: "rgba(...) Apx Bpx, transparent Cpx" means:
  // - solid-ish from A..B
  // - then fade to transparent by C
  const solid0 = 0;                     // you can tune if desired
  const solid1 = coreR;                 // core
  const fadeEnd = coreR + feather;      // feathered edge
  const col = make_dot_hsla(rnd, t, 0);

  const gradient =
    `radial-gradient(circle at ${cx}px ${cy}px, ` +
    `${col} ${solid0}px ${solid1}px, transparent ${fadeEnd}px)`;

  plane.css.setMany({
    backgroundImage: gradient,
    backgroundRepeat: "repeat",
    backgroundSize: `${tileW}px ${tileH}px`,
    backgroundPosition: "0px 0px",
    opacity: `${clamp01(t.planes.opacityMaster * plane_opacity(rnd, t, ix))}`,
  });

  // --- motion: seamless drift end positions (integer multiples of tile size) ---
  const steps = rand_int(rnd, t.motion.tileStepsMin, t.motion.tileStepsMax);

  const dir = rand_float(rnd,
    t.motion.dirCenterDeg - t.motion.dirSpreadDeg,
    t.motion.dirCenterDeg + t.motion.dirSpreadDeg
  );

  // Use trig in TS (fine) to choose direction; CSS can’t.
  const rad = (dir * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);

  // dx/dy in pixels: integer * tile size (seamless)
  // We quantize to tileW/tileH so the loop doesn’t jump / reveal edges.
  const endX = Math.round(ux) * steps * tileW;
  const endY = Math.round(uy) * steps * tileH;

  const dur = rand_float(rnd, t.motion.durMinS, t.motion.durMaxS);

  const driftName = `stipple_drift_${ix}`;
  const driftKf: KeyframesInput = make_kf_stipple_drift(driftName, endX, endY);
  parent.css.keyframes.set(driftKf);

  plane.css.setMany({
    animation: `${driftName} ${dur.toFixed(2)}s linear infinite`,
  });

  // rotation (wrapper)
  if (t.motion.rotEnabled) {
    const rotDur = rand_float(rnd, t.motion.rotDurMinS, t.motion.rotDurMaxS);
    const rotSpan = rand_float(rnd, -t.motion.rotSpanDeg, +t.motion.rotSpanDeg);

    // CHANGED: each wrapper gets a static “bias” rotation plus slow spin,
    // so planes don’t all share the same axis-aligned grid.
    wrap.css.setMany({
      transform: `rotate(${rotSpan.toFixed(3)}deg) scale(${t.motion.scale})`,
      animation: `stipple_rot_slow ${rotDur.toFixed(2)}s linear infinite`,
    });
  }

  return wrap;
}

function make_kf_stipple_drift(name: string, endX: number, endY: number): KeyframesInput {
  return {
    name,
    steps: {
      "0%": { backgroundPosition: "0px 0px" },
      "100%": { backgroundPosition: `${endX}px ${endY}px` },
    },
  } as const;
}

// ============================
// 5) Color helpers (range-based)
// ============================

function make_rgba_complementish(rnd: () => number, t: StippleTune, ix: number): string {
  // base hue 0..360
  let h = rand_float(rnd, 0, 360);

  // sometimes shift ~180 (complement-ish), with jitter
  if (rnd() < t.dots.complementChance) h = (h + 180) % 360;

  // jitter around that
  h = (h + rand_float(rnd, -t.dots.hueJitterDeg, +t.dots.hueJitterDeg) + 360) % 360;

  const s = rand_float(rnd, t.dots.satMin, t.dots.satMax);
  const l = rand_float(rnd, t.dots.litMin, t.dots.litMax);

  const a = rand_float(rnd, t.dots.alphaMin, t.dots.alphaMax);

  const [r, g, b] = hsl_to_rgb255(h, s, l);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// Standard HSL->RGB conversion (no deps)
function hsl_to_rgb255(hDeg: number, s: number, l: number): [number, number, number] {
  const h = ((hDeg % 360) + 360) % 360 / 360;

  if (s <= 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue_to_rgb(p, q, h + 1 / 3);
  const g = hue_to_rgb(p, q, h);
  const b = hue_to_rgb(p, q, h - 1 / 3);

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue_to_rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

// ============================
// 6) Misc helpers
// ============================

function rand_int(rnd: () => number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function rand_float(rnd: () => number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + rnd() * (hi - lo);
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function wrapHue(deg: number): number {
  let h = deg % 360;
  if (h < 0) h += 360;
  return h;
}

function jitter(rnd: () => number, span: number): number {
  // [-span, +span]
  return (rnd() * 2 - 1) * span;
}

// Returns a CSS color string: hsla(h,s%,l%,a)
function make_dot_hsla(rnd: () => number, t: typeof STIPPLE_TUNE, vol01: number): string {
  const c = t.dots;

  // Choose a hue lane, then jitter it a bit.
  const hueBase = pick(rnd, c.hueAnchors);
  const hue = wrapHue(hueBase + jitter(rnd, c.hueJitterDeg * ( vol01)));

  // High saturation, with volatility widening range slightly.
  const sat = lerp(c.satMin, c.satMax, rnd() ** (0.65 - 0.25 * vol01));

  // Lightness: keep it “above mud”; volatility nudges it around.
  const light = lerp(c.litMin, c.litMax, rnd() ** (0.75 - 0.30 * vol01));

  // Alpha: still your dot alpha range; volatility can widen a touch.
  const a0 = lerp(t.dots.alphaMin, t.dots.alphaMax, rnd() ** (1 * vol01));
  let a = 1;

  // Rare “sparkle” accents: higher lightness + alpha
  if (rnd() < c.sparkleChance) {
    const l2 = Math.min(92, light + c.sparkleLightBoost);
    const a2 = clamp01(a + c.sparkleAlphaBoost);
    return `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${l2.toFixed(1)}%, ${a2.toFixed(3)})`;
  }

  return `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%, ${a.toFixed(3)})`;
}

function plane_opacity(rnd: () => number, t: StippleTune, ix: number): number {
  // CHANGED: keep it mild; master opacity already exists.
  // You can delete this if you want strictly uniform planes.
  const wobble = 0.72 + rnd() * 0.56; // 0.72..1.28
  const base = 0.22;                  // typical plane contribution
  return clamp01(base * wobble);
}