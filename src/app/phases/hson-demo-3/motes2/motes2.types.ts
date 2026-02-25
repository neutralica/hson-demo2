import type { LiveTree } from "hson-live";

export type MotesOpts = Readonly<{
  char: string;

  colors: readonly string[];
  sizePx: readonly [number, number];
  opacity: readonly [number, number];
  blurPx: readonly [number, number];

  densityPerKpx2: number;
  maxMotes: number;
  spawnBatch: number;

  riseDurMs: readonly [number, number];
  swayDurMs: readonly [number, number];
  spinDurMs: readonly [number, number];

  spinTurns: readonly [number, number];
  swayAmpPx: readonly [number, number];

  repelRadiusPx: number;
  repelStrengthPx: number;
  killRadiusPx: number;
  repelOnlyBelowMouse: boolean;
  killOnHit: boolean;
  pointerEvents: "none" | "auto";
}>;

export type Mote = {
  wrap: LiveTree; 
  rise: LiveTree; // owns rise
  sway: LiveTree; // owns l-r
  ink: LiveTree; // owns spin
   fall: LiveTree;   // death drop anim (separate transform channel)
  dead: boolean;
};
// You likely already have these types in your motes2 module.

export type MoteStyle = Readonly<{
  xPx: number;
  sizePx: number;
  opacity: number;
  color: string;
  blurPx: number;

  riseMs: number;
  riseDelayMs: number; // negative allowed (prefill)
  swayMs: number;
  swayDelayMs: number; // negative allowed (prefill)
  spinMs: number;
  spinDir: "cw" | "ccw";
}>;

export type MoteSpinDir = "cw" | "ccw";

export type MotesRig = Readonly<{
  root: LiveTree;
  layer: LiveTree;
  dispose: () => void;
}>;