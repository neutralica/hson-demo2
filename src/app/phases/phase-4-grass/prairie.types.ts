import type { LiveTree } from "hson-live";
import type { SvgLiveTree } from "../../../../../hson-live/dist/types/svg.types";

export type PrairieConfig = Readonly<{
  width: number;
  height: number;

  // CHANGED: horizon is where the field "ends" visually
  horizonY: number;

  // CHANGED: number of horizontal grass strips
  rowCount: number;

  // CHANGED: row silhouette height near vs far
  nearBladeHeight: number;
  farBladeHeight: number;

  // CHANGED: x sampling density near vs far
  nearSampleStep: number;
  farSampleStep: number;

  // CHANGED: wind amplitude near vs far
  nearSwayAmp: number;
  farSwayAmp: number;

  // CHANGED: how aggressively rows compress toward horizon
  curvePower: number;

  // CHANGED: color tuning
  hueBase: number;
  hueJitter: number;
  satNear: number;
  satFar: number;
  lightNear: number;
  lightFar: number;

  // CHANGED: deterministic seed
  seed: number;
}>;
export type PrairieRowStatic = Readonly<{
  rowIndex: number;
  t: number; // 0 = near, 1 = far


  // CHANGED: baseline y for this row
  yBase: number;

  // CHANGED: blade/saw profile magnitude
  bladeHeight: number;

  // CHANGED: x sample spacing
  sampleStep: number;

  // CHANGED: wind params
  swayAmp: number;
  swayFreq: number;
  swaySpeed: number;
  phase: number;

  // CHANGED: cached per-sample noise, one value per x point
  jitter: readonly number[];

  // CHANGED: cached x positions
  xs: readonly number[];

  // CHANGED: paint
  fill: string;
}>;
export type PrairieRuntime = Readonly<{
  host: LiveTree;
  svg: SvgLiveTree;
  paths: SvgLiveTree[];
  rows: PrairieRowStatic[];
  config: PrairieConfig;
  stop: () => void;
}>;
