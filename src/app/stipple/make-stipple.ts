// stipple.drift.ts
import type { CssMap } from "hson-live/types";

/**
 * CHANGED: optional SVG noise layer + independent drift vector for it.
 * - noise sits UNDER the dots by default
 * - all drift distances are multiples of each layer's bgSize so loops are seamless
 */
export function make_stipple_drift_css(opts?: {
  speed?: number;      // higher = faster overall
  noise?: boolean;     // add SVG noise layer
  noiseOpacity?: number;
  noiseTilePx?: number; // size of noise tile (bigger = less obvious tiling)
}): CssMap {
  const speed = opts?.speed ?? 10;
  const dur = Math.max(40, Math.round(420 / speed));

  const useNoise = opts?.noise ?? false;
  const noiseOpacity = opts?.noiseOpacity ?? 0.10;
  const noiseTilePx = opts?.noiseTilePx ?? 320;

  // CHANGED: keep sizes in one place so keyframes can match them
  const s0 = { w: 53, h: 19 };
  const s1 = { w: 41, h: 37 };
  const s2 = { w: 49, h: 41 };
  const s3 = { w: 53, h: 67 };

  // CHANGED: generate *seamless* end positions:
  // end positions are integer multiples of background-size.
  const end0 = `${-10 * s0.w}px ${+10 * s0.h}px`;
  const end1 = `${-9 * s1.w}px ${-8 * s1.h}px`;
  const end2 = `${-7 * s2.w}px ${+5 * s2.h}px`;
  const end3 = `${-6 * s3.w}px ${-3 * s3.h}px`;

  // ---- dot layers ----
  const dotImgs = [
    "radial-gradient(circle at 2px 2px, rgba(56, 100, 144, 0.41) 0 0.6px, transparent 2.8px)",
    "radial-gradient(circle at 6px 5px, rgba(123, 69, 69, 0.40) 0 0.9px, transparent 4.1px)",
    "radial-gradient(circle at 3px 3px, rgba(196, 199, 158, 0.25) 0 0.7px, transparent 4.6px)",
    "radial-gradient(circle at 5px 7px, rgba(53, 86, 136, 0.42) 0 1.1px, transparent 5.4px)",
  ];

  const dotSizes = [
    `${s0.w}px ${s0.h}px`,
    `${s1.w}px ${s1.h}px`,
    `${s2.w}px ${s2.h}px`,
    `${s3.w}px ${s3.h}px`,
  ];

  const dotRepeats = ["repeat", "repeat", "repeat", "repeat"];
  const dotPositions0 = ["0px 0px", "0px 0px", "0px 0px", "0px 0px"];
  const dotPositions1 = [end0, end1, end2, end3];

  // ---- optional noise layer (SVG data URL) ----
  // NOTE: this is a placeholder hook. Replace make_noise_svg_data() with your real one.
  // It must return `url("data:image/svg+xml;utf8,...")` or similar.
  const noiseImg = null;

  // CHANGED: build per-layer lists consistently
  const backgroundImage = [
    ...(noiseImg ? [noiseImg] : []),
    ...dotImgs,
  ].join(", ");

  const backgroundSize = [
    ...(noiseImg ? [`${noiseTilePx}px ${noiseTilePx}px`] : []),
    ...dotSizes,
  ].join(", ");

  const backgroundRepeat = [
    ...(noiseImg ? ["repeat"] : []),
    ...dotRepeats,
  ].join(", ");

  const backgroundPosition0 = [
    ...(noiseImg ? ["0px 0px"] : []),
    ...dotPositions0,
  ].join(", ");

  const backgroundPosition1 = [
    ...(noiseImg ? [`${-2 * noiseTilePx}px ${+1 * noiseTilePx}px`] : []), // CHANGED: noise drifts too
    ...dotPositions1,
  ].join(", ");

  // CHANGED: animation uses a single keyframes name; you set the keyframes below.
  // We keep rotate separate (optional) by letting caller add it in `animation` stack.
  return {
    backgroundImage,
    backgroundRepeat,
    backgroundSize,
    backgroundPosition: backgroundPosition0,
    animation: `stipple_bgpos_all ${dur}s linear infinite`,
    willChange: "background-position, transform",

    // CHANGED: expose end position as CSS vars if you prefer, but we keep it simple here.
    // If you want, you can store `backgroundPosition1` somewhere and use it when building keyframes.
    "--stipple_end": backgroundPosition1,
  } as unknown as CssMap; // CHANGED: CssMap may not include custom props; keep if your type allows it.
}

/**
 * Drop-in keyframes for the single animation.
 * CHANGED: uses the `--stipple_end` var so you don't have to duplicate numbers.
 * If your keyframe system doesn't allow CSS vars, use the "hardcoded" variant below.
 */
export const KF_STIPPLE_BGPOS_ALL = {
  name: "stipple_bgpos_all",
  steps: {
    "0%": {
      backgroundPosition: "0px 0px",
    },
    "100%": {
      backgroundPosition: "var(--stipple_end, 0px 0px)",
    },
  },
} as const;

/**
 * Optional slow rotation (keep it separate so bgpos loop stays seamless).
 */
export const KF_STIPPLE_ROTATE_SLOW = {
  name: "stipple_rotate_slow",
  steps: {
    "0%": { transform: "rotate(0deg) scale(1.02)" },
    "100%": { transform: "rotate(360deg) scale(1.02)" },
  },
} as const;

// /**
//  * CHANGED: minimal placeholder for noise generator.
//  * Replace with your real make_noise_svg_data().
//  */
// function make_noise_svg_data(opts: { size: number; opacity: number }): string {
//   const { size, opacity } = opts;

//   const svg =
//     `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
//     `<filter id="n">` +
//     `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>` +
//     `<feColorMatrix type="matrix" values="` +
//     `1 0 0 0 0 ` +
//     `0 1 0 0 0 ` +
//     `0 0 1 0 0 ` +
//     `0 0 0 ${opacity} 0` +
//     `"/>` +
//     `</filter>` +
//     `<rect width="100%" height="100%" filter="url(#n)"/>` +
//     `</svg>`;

//   // CHANGED: encode for data URL
//   const enc = encodeURIComponent(svg)
//     .replace(/'/g, "%27")
//     .replace(/"/g, "%22");

//   return `url("data:image/svg+xml,${enc}")`;
// }