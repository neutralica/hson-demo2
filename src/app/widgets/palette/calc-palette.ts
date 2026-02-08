// palette.ts
// Seeded OKLCH palette: “terminal_gothic” vibes with a volatility knob.
// - No deps
// - Deterministic from a 4-digit seed (or any string)

import { _clamp01, _clampN1P1, _lerp, _wrap360 } from "../../utils/helpers";
import { make_rng } from "../../utils/rng";

export type PaletteOpts = Readonly<{
  volatility?: number; // 0..1  (hue wander + chroma punch)
  baselineLight?: number;      // 0..1  baseline dark lightness
  baselineDark?: number;     // 0..1  baseline light lightness
  grayWarmth?: number; // -1..1 warm/cool tint of grays
}>;

export type Oklch = Readonly<{ l: number; c: number; h: number; a?: number }>;

export type Palette = Readonly<{
  seed: string;
  opts: Required<PaletteOpts>;

  // 8 dark + 8 light “general purpose”
  lightMode: readonly string[];
  darkMode: readonly string[];

  // 4 grays (with slight warmth tint)
  grays: readonly string[];

  // Text + backgrounds
  textOnDark: string;
  textOnLight: string;
  bgDark: string;
  bgLight: string;

  // 4 accents (for UI emphasis)
  accents: readonly string[];

  // Convenience: flat list for dashboards
  all: ReadonlyArray<Readonly<{ name: string; value: string }>>;
}>;

// ----------------------------
// Public API
// ----------------------------

export function make_palette(seedRaw: string, optsRaw: PaletteOpts = {}): Palette {
  const seed = seedRaw.trim() || "0000";

  const opts: Required<PaletteOpts> = {
    volatility: _clamp01(optsRaw.volatility ?? 0.55),
    baselineLight: _clamp01(optsRaw.baselineLight ?? 0.22),
    baselineDark: _clamp01(optsRaw.baselineDark ?? 0.82),
    grayWarmth: _clampN1P1(optsRaw.grayWarmth ?? 0.25),
  };

  const rng = make_rng(hash32(seed));

  // Base hue anchored by seed; volatility controls how much we roam.
  const baseHue = randRange(rng, 0, 360);

  // “Terminal gothic” tends to like restrained chroma + occasional punch.
  const v = opts.volatility;
  const hueSpread = _lerp(12, 130, v);      // how far hues wander from base
  const chromaBase = _lerp(0.06, 0.16, v); // overall saturation level

  const jitter = _lerp(2, 18, v); // volatility controls wobble
  const dimHuesForLightMode = ring_hues(rng, 8, baseHue, jitter, 0);
  const brightHuesForDarkMode = [...ring_hues(rng, 8, baseHue, jitter, 360 / 16)] as number[]; // 22.5° shift
  // --- Light ramp anchors: force distinct blue + distinct neighbor ---

  // Pick a "true blue" anchor. 255–265 is a solid modern UI blue region in OKLCH.
  const BLUE = _wrap360(260 + randRange(rng, -8, 8)); // tiny seed wobble

  // Make light1 a clear blue.
  brightHuesForDarkMode[0] = BLUE;

  // Make light2 *not* nearby: push it at least 50° away from BLUE.
  const h1 = brightHuesForDarkMode[1] ?? _wrap360(BLUE + 60);
  const sepMin = 55;
  const delta = wrapHue(h1 - BLUE);
  brightHuesForDarkMode[1] = Math.abs(delta) < sepMin
    ? _wrap360(BLUE + (delta >= 0 ? sepMin : -sepMin))
    : h1;
  // bias two slots away from warm-neutral mush
  // keep your existing nudges if you want, but replace them with this:
  brightHuesForDarkMode[0] = _wrap360(baseHue);          // light4 stays warm-ish
  brightHuesForDarkMode[1] = _wrap360(baseHue + 50);          // light4 stays warm-ish
  brightHuesForDarkMode[3] = _wrap360(baseHue + 178);          // light4 stays warm-ish
  brightHuesForDarkMode[4] = _wrap360(baseHue - 290);         // light5 forced violet/purple
  brightHuesForDarkMode[6] = _wrap360(baseHue - 140);         // light5 forced violet/purple
  
  const lightModeColorway = build_ramp({
  rng,
  count: 8,
  hues: dimHuesForLightMode,

  // Brighter base, but keep jitter moderate so they feel like a set.
  l0: _clamp01(opts.baselineLight + _lerp(0.05, 0.10, v))+.2,
  lJitter: _lerp(0.02, 0.06, v),

  // Dust: reduce chroma overall and reduce jitter.
  c0: chromaBase * 0.45,
  cJitter: _lerp(0.02, 0.06, v),

  alpha: 1,
  });
  
  const darkModeColorway = build_ramp({
  rng,
  count: 8,
  hues: brightHuesForDarkMode,

  // darker than before, less "easter"
  l0: _clamp01(opts.baselineDark - _lerp(0.06, 0.10, v))-.05,
  lJitter: _lerp(0.015, 0.045, v),

  // much less chroma (this is the big one)
  c0: chromaBase * 0.65,
  cJitter: _lerp(0.008, 0.025, v),

  alpha: 1,
});
  // Grays: tiny chroma + slight warm/cool hue bias.
  const grays = build_grays(rng, opts.grayWarmth);

  // Backgrounds: very low chroma so content pops.
  const bgDark = fmt_oklch({ l: 0.10, c: 0.02, h: warm_hue(opts.grayWarmth) });
  const bgLight = fmt_oklch({ l: 0.95, c: 0.015, h: warm_hue(opts.grayWarmth) });

  // Text colors (don’t go pure white/black; it’s harsher than you want).
  const textOnDark = fmt_oklch({ l: 0.92, c: 0.02, h: 260 });
  const textOnLight = fmt_oklch({ l: 0.18, c: 0.02, h: 260 });

  // Accents: 4 spaced hues (seeded rotation), slightly punchier chroma.
  const accents = build_accents(rng, baseHue, v);

  const all = [
    ...lightModeColorway.map((value, i) => ({ name: `dark${i + 1}`, value })),
    ...darkModeColorway.map((value, i) => ({ name: `light${i + 1}`, value })),
    ...grays.map((value, i) => ({ name: `gray${i + 1}`, value })),
    { name: "bgDark", value: bgDark },
    { name: "bgLight", value: bgLight },
    { name: "textOnDark", value: textOnDark },
    { name: "textOnLight", value: textOnLight },
    ...accents.map((value, i) => ({ name: `accent${i + 1}`, value })),
  ] as const;

  return {
    seed,
    opts,
    lightMode: lightModeColorway,
    darkMode: darkModeColorway,
    grays,
    textOnDark,
    textOnLight,
    bgDark,
    bgLight,
    accents,
    all,
  };
}

// ----------------------------
// Internal helpers
// ----------------------------

type BuildRampArgs = {
  rng: () => number;
  count: number;
  baseHue?: number;
  hueSpread?: number;
  hues?: readonly number[];

  l0: number;
  lJitter: number;
  c0: number;
  cJitter: number;
  alpha: number;

  // ADDED
  wash?: number;                 // 0..1
  slotBoostL?: readonly number[]; // tiny per-index L offsets (optional)
};

function build_ramp(args: BuildRampArgs): string[] {
  const {
    rng,
    count,
    hues,
    baseHue,
    hueSpread,
    l0,
    lJitter,
    c0,
    cJitter,
    alpha,
    wash,
    slotBoostL,
  } = args;

  return Array.from({ length: count }, (_, i) => {
    const h =
      hues?.[i] ??
      wrapHue((baseHue ?? 0) + (rng() * 2 - 1) * (hueSpread ?? 0));

    let l = _clamp01(l0 + (rng() * 2 - 1) * lJitter);
    let c = Math.max(0, c0 + (rng() * 2 - 1) * cJitter);

    // ADDED: deterministic per-slot nudge to break “pairs”
    if (slotBoostL?.[i] != null) l = _clamp01(l + slotBoostL[i]!);

    // ADDED: wash/compress step
    const o = wash_oklch({ l, c, h, a: alpha }, wash ?? 0);

    return fmt_oklch(o);
  });
}

function build_grays(rng: () => number, warmth: number): readonly string[] {
  const h = warm_hue(warmth);
  const c = 0.01 + Math.abs(warmth) * 0.01;

  // lift the floor so gray1 isn’t basically bgDark
  // (You hard-code bgDark at l=0.10.)
  return [
    fmt_oklch({ l: 0.22, c, h }),
    fmt_oklch({ l: 0.34, c, h }),
    fmt_oklch({ l: 0.58, c, h }),
    fmt_oklch({ l: 0.82, c, h }),
  ] as const;
}

function build_accents(rng: () => number, baseHue: number, v: number): readonly string[] {
  // avoid [0,90,180,270] symmetry (it reads “paired”).
  // Use uneven, but well-separated offsets + small seeded wobble.
  const rot = randRange(rng, -12, 12);
  const hs = [0, 72, 155, 245].map(d => _wrap360(baseHue + d + rot));

  // slightly less punch by default; volatility still increases it.
  const punch = _lerp(0.14, 0.22, v);

  // Optional: give accents a mild L variation so they’re not all the same “weight”.
  return [
    fmt_oklch({ l: 0.66, c: punch* 0.53, h: hs[0] as number }),
    fmt_oklch({ l: 0.70, c: punch * 0.52, h: hs[1] as number }),
    fmt_oklch({ l: 0.62, c: punch * 0.58, h: hs[2] as number }),
    fmt_oklch({ l: 0.72, c: punch * 0.54, h: hs[3] as number }),
  ] as const;
}

function fmt_oklch(x: Oklch): string {
  // CSS okLCH is commonly written as: oklch(<L%> <C> <H> / <A>)
  const L = Math.round(_clamp01(x.l) * 1000) / 10; // 1 decimal %
  const C = Math.round(_clamp01(x.c) * 1000) / 1000;
  const H = Math.round(_wrap360(x.h) * 10) / 10;

  if (x.a == null) return `oklch(${L}% ${C} ${H})`;

  const A = Math.round(_clamp01(x.a) * 1000) / 1000;
  return `oklch(${L}% ${C} ${H} / ${A})`;
}

function warm_hue(w: number): number {
  // Warm: ~60° (amber). Cool: ~250° (blue-violet). Neutral splits the diff.
  return _lerp(250, 60, (_clampN1P1(w) + 1) / 2);
}

function randRange(rng: () => number, a: number, b: number): number {
  return a + (b - a) * rng();
}
function randSigned(rng: () => number): number {
  return rng() * 2 - 1;
}

// Hash any string to u32 (good enough; stable)
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ADDED: hue helpers (spread-out, deterministic, low repetition)
const TAU = 360;
const GOLDEN_ANGLE = 137.50776405003785; // degrees

function wrapHue(h: number): number {
  const x = h % TAU;
  return x < 0 ? x + TAU : x;
}

// circular distance in degrees (0..180)
function hueDist(a: number, b: number): number {
  const d = Math.abs(wrapHue(a) - wrapHue(b));
  return Math.min(d, TAU - d);
}

/**
 * Generate `count` hues that are spread out, then lightly jittered.
 * - baseHue anchors the “theme”
 * - hueSpread controls max deviation from baseHue
 * - minSep prevents near-duplicates
 */
function spaced_hues(
  rng: () => number,
  count: number,
  baseHue: number,
  hueSpread: number,
  minSep: number,
  rotateDeg = 0
): number[] {
  const out: number[] = [];

  // Low-discrepancy sequence around the color wheel, centered on baseHue.
  for (let i = 0; i < count; i++) {
    // deterministic spread instead of rolling random hue
    const core = baseHue + rotateDeg + i * GOLDEN_ANGLE;

    // Pull it back toward baseHue within hueSpread (keeps “theme” coherent)
    // We do that by taking an offset in [-hueSpread, +hueSpread] based on i.
    const t = (i + 0.5) / count; // 0..1
    const themed = baseHue + rotateDeg + (t * 2 - 1) * hueSpread;

    // Blend “wheel roam” + “themed band”
    const blended = themed + (core - themed) * 0.35;

    // Small jitter, proportional to spread (prevents looking “too evenly spaced”)
    const jitter = (rng() * 2 - 1) * Math.max(2, hueSpread * 0.12);
    let h = wrapHue(blended + jitter);

    // Enforce minimum separation (cheap local rejection)
    let guard = 0;
    while (out.some(prev => hueDist(prev, h) < minSep) && guard++ < 20) {
      h = wrapHue(h + minSep * 0.85); // nudge
    }

    out.push(h);
  }

  return out;
}

function hue_dist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function pick_hues(
  rng: () => number,
  count: number,
  centerHue: number,
  spread: number,
  minDist: number,
  maxTries = 2000,
): number[] {
  const out: number[] = [];
  for (let tries = 0; out.length < count && tries < maxTries; tries++) {
    const cand = wrapHue(centerHue + (rng() * 2 - 1) * spread);
    if (out.every(h => hue_dist(h, cand) >= minDist)) out.push(cand);
  }

  // Fallback: if we failed to fill (rare), fill evenly.
  while (out.length < count) {
    out.push(wrapHue(centerHue + (360 / count) * out.length));
  }

  return out;
}

function ring_hues(
  rng: () => number,
  count: number,
  baseHue: number,
  jitterDeg: number,
  rotateDeg: number
): number[] {
  const step = 360 / count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const jitter = (rng() * 2 - 1) * jitterDeg;
    out.push(_wrap360(baseHue + rotateDeg + i * step + jitter));
  }
  return out;
}

// ADDED: compress chroma + slightly lift lightness to get "ghost pastel".
// wash=0 => no change, wash=1 => heavy wash.
function wash_oklch(x: Oklch, washRaw: number): Oklch {
  const wash = _clamp01(washRaw);

  // Lift lightness a bit (phosphor / airy)
  const l = _clamp01(x.l + wash * 0.06);

  // Compress chroma toward a modest target band instead of scaling.
  const targetC = 0.11;
  const maxC = _lerp(0.26, 0.18, wash);

  const cToward = x.c + (targetC - x.c) * (wash * 0.85);
  const c = Math.min(maxC, Math.max(0, cToward));

  return { ...x, l, c };
}