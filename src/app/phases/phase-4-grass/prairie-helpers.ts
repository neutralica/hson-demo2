import type { PrairieConfig, PrairieRowStatic } from "./prairie.types";

/**
 * default  config
 **/

export function default_prairie_config(width: number, height: number): PrairieConfig {
  return {
    width,
    height,
    horizonY: Math.round(height * 0.34),

    rowCount: 56,

    nearBladeHeight: 75,
    farBladeHeight: 1.5,

    nearSampleStep: 2,
    farSampleStep: 1,

    nearSwayAmp: 17,
    farSwayAmp: 0.8,

    curvePower: 2.8,

    hueBase: 108,
    hueJitter: 10,
    satNear: 56,
    satFar: 6,
    lightNear: 44,
    lightFar: 12,

    flowerChance: 10.35,

    flowerRadiusNear: 2,
    flowerRadiusFar: 0.5,

    flowerSwayNear: 1.1,
    flowerSwayFar: 0.3,

    flowerBloomWindowSec: 1,

    seed: 1337,
  };
}
// -----------------------------
// tiny math helpers
// -----------------------------
// CHANGED: stronger compression toward horizon => curved-slope feel
export function depth_ease(t: number, power: number): number {
  return 1 - Math.pow(1 - t, power);
}
export function hsl(h: number, s: number, l: number): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

export function row_wind_x(row: PrairieRowStatic, x: number, timeSec: number): number {
  const windA =
    Math.sin(timeSec * row.swaySpeed + x * row.swayFreq + row.phase) * row.swayAmp;

  const windB =
    Math.sin(
      timeSec * (row.swaySpeed * 0.63) +
      x * (row.swayFreq * 1.8) +
      row.phase * 0.7
    ) * (row.swayAmp * 0.35);

  return windA + windB;
}

