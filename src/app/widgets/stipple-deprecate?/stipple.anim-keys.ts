import type { KeyframesInput } from "hson-live/types";



export const KF_STIPPLE_PLANE_DRIFT: KeyframesInput = {
  name: "stipple_plane_drift",
  steps: {
    "0%": {
      transform:
        "translate3d(var(--sx, 0px), var(--sy, 0px), 0) rotate(var(--r0, 0deg)) scale(var(--sc, 1.06))",
    },
    "100%": {
      transform:
        "translate3d(var(--ex, 0px), var(--ey, 0px), 0) rotate(var(--r1, 0deg)) scale(var(--sc, 1.06))",
    },
  },
} as const;

/**
 * Rotation keyframes factory: register one per layer count you use.
 * Use small scale to avoid edge “leaving screen” vibes.
 */
export function make_kf_stipple_rot(ix: number, degSpan = 360): KeyframesInput {
  return {
    name: `stipple_rot_${ix}`,
    steps: {
      "0%": { transform: "rotate(0deg) scale(1.02)" },
      "100%": { transform: `rotate(${degSpan}deg) scale(1.02)` },
    },
  } as const;
}